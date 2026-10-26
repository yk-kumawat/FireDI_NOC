import {
  IValidationRule,
  ValidationRuleContext,
  IValidationFinding,
  ValidationFindingStatus,
  ComparisonMethod,
  ValidationRuleSetId,
} from "./findings.js";
import {
  normalizeString,
  normalizeStringCaseInsensitive,
  normalizeBuildingName,
  normalizeAddress,
  compareAddresses,
  normalizeDate,
  compareDates,
  normalizeRegistrationNumber,
  compareRegistrationNumbers,
  compareQuantities,
  compareBooleans,
  normalizeBoolean,
  isMissing,
  getExtractedFieldValue,
} from "./normalization.js";

/**
 * Generate a unique finding ID
 */
function generateFindingId(): string {
  // Use randomUUID if available (Node.js 14.17+), otherwise fallback
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  return `finding-${uuid.slice(0, 8)}`;
}

/**
 * Create a validation finding
 */
function createFinding(params: {
  fieldName: string;
  description: string;
  ruleId: string;
  status: ValidationFindingStatus;
  comparisonMethod: ComparisonMethod;
  documentValue: string | number | boolean | null | undefined;
  applicationValue: string | number | boolean | null | undefined;
  normalizedDocumentValue?: string | number | boolean | null;
  normalizedApplicationValue?: string | number | boolean | null;
  explanation: string;
  confidence?: number;
  isRequired: boolean;
  metadata?: Record<string, unknown>;
}): IValidationFinding {
  return {
    findingId: generateFindingId(),
    fieldName: params.fieldName,
    description: params.description,
    ruleId: params.ruleId,
    status: params.status,
    comparisonMethod: params.comparisonMethod,
    documentValue: params.documentValue ?? null,
    applicationValue: params.applicationValue ?? null,
    normalizedDocumentValue: params.normalizedDocumentValue ?? null,
    normalizedApplicationValue: params.normalizedApplicationValue ?? null,
    explanation: params.explanation,
    confidence: params.confidence,
    isRequired: params.isRequired,
    metadata: params.metadata,
  };
}

/**
 * Occupancy Certificate Validation Rules
 * Requirement ID: REQ_OCCUPANCY_CERTIFICATE
 */
export const occupancyCertificateRules: IValidationRule[] = [
  {
    ruleId: "OC_BUILDING_NAME",
    name: "Building Name Match",
    description: "Compare building name on occupancy certificate with application building name",
    applicableRequirementIds: ["REQ_OCCUPANCY_CERTIFICATE"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification, checklistItem } = context;
      const docBuildingName = getExtractedFieldValue(classification?.extractedFields || [], "buildingName")?.value;
      const appBuildingName = application.buildingDetails?.buildingName;

      if (isMissing(docBuildingName) && isMissing(appBuildingName)) {
        return createFinding({
          fieldName: "Building Name",
          description: "Building name on occupancy certificate vs application",
          ruleId: "OC_BUILDING_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docBuildingName,
          applicationValue: appBuildingName,
          explanation: "Both building names are missing",
          isRequired: true,
        });
      }

      if (isMissing(docBuildingName)) {
        return createFinding({
          fieldName: "Building Name",
          description: "Building name on occupancy certificate vs application",
          ruleId: "OC_BUILDING_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docBuildingName,
          applicationValue: appBuildingName,
          explanation: "Building name not found in document extraction",
          isRequired: true,
        });
      }

      if (isMissing(appBuildingName)) {
        return createFinding({
          fieldName: "Building Name",
          description: "Building name on occupancy certificate vs application",
          ruleId: "OC_BUILDING_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docBuildingName,
          applicationValue: appBuildingName,
          explanation: "Building name not provided in application",
          isRequired: true,
        });
      }

      const docNorm = normalizeBuildingName(docBuildingName as string);
      const appNorm = normalizeBuildingName(appBuildingName as string);

      if (docNorm.normalized && appNorm.normalized && docNorm.normalized === appNorm.normalized) {
        return createFinding({
          fieldName: "Building Name",
          description: "Building name on occupancy certificate vs application",
          ruleId: "OC_BUILDING_NAME",
          status: "passed",
          comparisonMethod: "normalized",
          documentValue: docBuildingName,
          applicationValue: appBuildingName,
          normalizedDocumentValue: docNorm.normalized,
          normalizedApplicationValue: appNorm.normalized,
          explanation: "Building names match after normalization",
          confidence: 95,
          isRequired: true,
        });
      }

      // Check fuzzy similarity
      const docTokens = (docNorm.normalized || "").split(/\s+/).filter(t => t.length > 2);
      const appTokens = (appNorm.normalized || "").split(/\s+/).filter(t => t.length > 2);
      const intersection = docTokens.filter(t => appTokens.includes(t));
      const overlapRatio = docTokens.length > 0 && appTokens.length > 0
        ? intersection.length / Math.max(docTokens.length, appTokens.length)
        : 0;

      if (overlapRatio >= 0.6) {
        return createFinding({
          fieldName: "Building Name",
          description: "Building name on occupancy certificate vs application",
          ruleId: "OC_BUILDING_NAME",
          status: "needs_review",
          comparisonMethod: "fuzzy_similarity",
          documentValue: docBuildingName,
          applicationValue: appBuildingName,
          normalizedDocumentValue: docNorm.normalized,
          normalizedApplicationValue: appNorm.normalized,
          explanation: `Building names share ${Math.round(overlapRatio * 100)}% key tokens - review recommended`,
          confidence: 60,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Building Name",
        description: "Building name on occupancy certificate vs application",
        ruleId: "OC_BUILDING_NAME",
        status: "mismatch_found",
        comparisonMethod: "normalized",
        documentValue: docBuildingName,
        applicationValue: appBuildingName,
        normalizedDocumentValue: docNorm.normalized,
        normalizedApplicationValue: appNorm.normalized,
        explanation: "Building names differ significantly",
        confidence: 85,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "OC_BUILDING_ADDRESS",
    name: "Building Address Match",
    description: "Compare address on occupancy certificate with application building address",
    applicableRequirementIds: ["REQ_OCCUPANCY_CERTIFICATE"],
    isMandatory: true,
    priority: 2,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docAddress = getExtractedFieldValue(classification?.extractedFields || [], "buildingAddress")?.value;
      const appLocation = application.buildingDetails?.location;
      const appAddress = appLocation ? `${appLocation.address}, ${appLocation.district}, ${appLocation.state} - ${appLocation.pincode}` : null;

      if (isMissing(docAddress) && isMissing(appAddress)) {
        return createFinding({
          fieldName: "Building Address",
          description: "Address on occupancy certificate vs application building address",
          ruleId: "OC_BUILDING_ADDRESS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docAddress,
          applicationValue: appAddress,
          explanation: "Both addresses are missing",
          isRequired: true,
        });
      }

      if (isMissing(docAddress)) {
        return createFinding({
          fieldName: "Building Address",
          description: "Address on occupancy certificate vs application building address",
          ruleId: "OC_BUILDING_ADDRESS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docAddress,
          applicationValue: appAddress,
          explanation: "Address not found in document extraction",
          isRequired: true,
        });
      }

      if (isMissing(appAddress)) {
        return createFinding({
          fieldName: "Building Address",
          description: "Address on occupancy certificate vs application building address",
          ruleId: "OC_BUILDING_ADDRESS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docAddress,
          applicationValue: appAddress,
          explanation: "Building address not provided in application",
          isRequired: true,
        });
      }

      const comparison = compareAddresses(docAddress as string, appAddress as string);

      return createFinding({
        fieldName: "Building Address",
        description: "Address on occupancy certificate vs application building address",
        ruleId: "OC_BUILDING_ADDRESS",
        status: comparison.status === "normalized_match" ? "passed"
          : comparison.status === "fuzzy_similar" ? "needs_review"
          : comparison.status === "mismatch" ? "mismatch_found"
          : "insufficient_data",
        comparisonMethod: comparison.status === "normalized_match" ? "normalized"
          : comparison.status === "fuzzy_similar" ? "fuzzy_similarity"
          : "address_comparison",
        documentValue: docAddress,
        applicationValue: appAddress,
        explanation: comparison.explanation,
        confidence: comparison.confidence,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "OC_CERTIFICATE_NUMBER",
    name: "Certificate Number Presence",
    description: "Check if occupancy certificate has a certificate/reference number",
    applicableRequirementIds: ["REQ_OCCUPANCY_CERTIFICATE"],
    isMandatory: true,
    priority: 3,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification } = context;
      const certNumber = getExtractedFieldValue(classification?.extractedFields || [], "certificateNumber")?.value;

      if (isMissing(certNumber)) {
        return createFinding({
          fieldName: "Certificate Number",
          description: "Presence of certificate/reference number on occupancy certificate",
          ruleId: "OC_CERTIFICATE_NUMBER",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: certNumber,
          applicationValue: null,
          explanation: "Certificate number not found in document extraction",
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Certificate Number",
        description: "Presence of certificate/reference number on occupancy certificate",
        ruleId: "OC_CERTIFICATE_NUMBER",
        status: "passed",
        comparisonMethod: "exact",
        documentValue: certNumber,
        applicationValue: null,
        explanation: `Certificate number found: ${certNumber}`,
        confidence: 90,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "OC_ISSUE_DATE",
    name: "Certificate Issue Date Validation",
    description: "Validate issue date format and plausibility",
    applicableRequirementIds: ["REQ_OCCUPANCY_CERTIFICATE"],
    isMandatory: true,
    priority: 4,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification } = context;
      const issueDate = getExtractedFieldValue(classification?.extractedFields || [], "issueDate")?.value;

      if (isMissing(issueDate)) {
        return createFinding({
          fieldName: "Issue Date",
          description: "Issue date on occupancy certificate",
          ruleId: "OC_ISSUE_DATE",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: issueDate,
          applicationValue: null,
          explanation: "Issue date not found in document extraction",
          isRequired: true,
        });
      }

      const dateNorm = normalizeDate(issueDate as string);

      if (!dateNorm.normalized) {
        return createFinding({
          fieldName: "Issue Date",
          description: "Issue date on occupancy certificate - format validation",
          ruleId: "OC_ISSUE_DATE",
          status: "needs_review",
          comparisonMethod: "not_compared",
          documentValue: issueDate,
          applicationValue: null,
          explanation: `Date format could not be parsed: "${issueDate}"`,
          confidence: 30,
          isRequired: true,
          metadata: { originalFormat: issueDate },
        });
      }

      // Check if date is plausible (not in future, not too old)
      const certDate = new Date(dateNorm.normalized);
      const now = new Date();
      const hundredYearsAgo = new Date(now.getFullYear() - 100, 0, 1);

      if (certDate > now) {
        return createFinding({
          fieldName: "Issue Date",
          description: "Issue date on occupancy certificate - plausibility check",
          ruleId: "OC_ISSUE_DATE",
          status: "needs_review",
          comparisonMethod: "date_comparison",
          documentValue: issueDate,
          applicationValue: null,
          normalizedDocumentValue: dateNorm.normalized,
          explanation: `Issue date (${dateNorm.normalized}) is in the future - please verify`,
          confidence: 40,
          isRequired: true,
        });
      }

      if (certDate < hundredYearsAgo) {
        return createFinding({
          fieldName: "Issue Date",
          description: "Issue date on occupancy certificate - plausibility check",
          ruleId: "OC_ISSUE_DATE",
          status: "needs_review",
          comparisonMethod: "date_comparison",
          documentValue: issueDate,
          applicationValue: null,
          normalizedDocumentValue: dateNorm.normalized,
          explanation: `Issue date (${dateNorm.normalized}) is over 100 years old - please verify`,
          confidence: 40,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Issue Date",
        description: "Issue date on occupancy certificate - format and plausibility",
        ruleId: "OC_ISSUE_DATE",
        status: "passed",
        comparisonMethod: "date_comparison",
        documentValue: issueDate,
        applicationValue: null,
        normalizedDocumentValue: dateNorm.normalized,
        explanation: `Issue date parsed successfully: ${dateNorm.normalized}`,
        confidence: 90,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "OC_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_OCCUPANCY_CERTIFICATE"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "OC_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "OC_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} (${classification.predictedRequirementId}) but expected ${checklistItem.name} (${checklistItem.requirementId})`,
        confidence: classification.confidence,
        isRequired: true,
        metadata: { classificationConfidence: classification.confidence },
      });
    },
  },
];

/**
 * Company Registration Certificate Validation Rules
 * Requirement ID: REQ_COMPANY_REGISTRATION
 */
export const companyRegistrationRules: IValidationRule[] = [
  {
    ruleId: "CR_COMPANY_NAME",
    name: "Company Name Match",
    description: "Compare company name on registration certificate with application/applicant details",
    applicableRequirementIds: ["REQ_COMPANY_REGISTRATION"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docCompanyName = getExtractedFieldValue(classification?.extractedFields || [], "companyName")?.value;
      // Application may have company name in applicantDetails or buildingDetails
      const appCompanyName = application.applicantDetails?.name || application.buildingDetails?.buildingName;

      if (isMissing(docCompanyName) && isMissing(appCompanyName)) {
        return createFinding({
          fieldName: "Company Name",
          description: "Company name on registration certificate vs application",
          ruleId: "CR_COMPANY_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docCompanyName,
          applicationValue: appCompanyName,
          explanation: "Both company names are missing",
          isRequired: true,
        });
      }

      if (isMissing(docCompanyName)) {
        return createFinding({
          fieldName: "Company Name",
          description: "Company name on registration certificate vs application",
          ruleId: "CR_COMPANY_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docCompanyName,
          applicationValue: appCompanyName,
          explanation: "Company name not found in document extraction",
          isRequired: true,
        });
      }

      if (isMissing(appCompanyName)) {
        return createFinding({
          fieldName: "Company Name",
          description: "Company name on registration certificate vs application",
          ruleId: "CR_COMPANY_NAME",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docCompanyName,
          applicationValue: appCompanyName,
          explanation: "Company/applicant name not provided in application",
          isRequired: true,
        });
      }

      const docNorm = normalizeBuildingName(docCompanyName as string);
      const appNorm = normalizeBuildingName(appCompanyName as string);

      if (docNorm.normalized && appNorm.normalized && docNorm.normalized === appNorm.normalized) {
        return createFinding({
          fieldName: "Company Name",
          description: "Company name on registration certificate vs application",
          ruleId: "CR_COMPANY_NAME",
          status: "passed",
          comparisonMethod: "normalized",
          documentValue: docCompanyName,
          applicationValue: appCompanyName,
          normalizedDocumentValue: docNorm.normalized,
          normalizedApplicationValue: appNorm.normalized,
          explanation: "Company names match after normalization",
          confidence: 95,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Company Name",
        description: "Company name on registration certificate vs application",
        ruleId: "CR_COMPANY_NAME",
        status: "needs_review",
        comparisonMethod: "fuzzy_similarity",
        documentValue: docCompanyName,
        applicationValue: appCompanyName,
        normalizedDocumentValue: docNorm.normalized,
        normalizedApplicationValue: appNorm.normalized,
        explanation: "Company names differ - review recommended",
        confidence: 50,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "CR_REGISTRATION_NUMBER",
    name: "Registration Number Match",
    description: "Compare registration/CIN number when authoritative value exists",
    applicableRequirementIds: ["REQ_COMPANY_REGISTRATION"],
    isMandatory: false, // Only validate when application has the number
    priority: 2,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docRegNumber = getExtractedFieldValue(classification?.extractedFields || [], "registrationNumber")?.value;
      // Application doesn't currently store registration number - this would be an enhancement
      // For now, we can only check presence in document
      const appRegNumber = null; // Would come from application if stored

      if (isMissing(docRegNumber)) {
        return createFinding({
          fieldName: "Registration Number",
          description: "Registration/CIN number on company registration certificate",
          ruleId: "CR_REGISTRATION_NUMBER",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docRegNumber,
          applicationValue: appRegNumber,
          explanation: "Registration number not found in document extraction",
          isRequired: false,
        });
      }

      // If we have application reference, compare
      if (!isMissing(appRegNumber) && !isMissing(docRegNumber)) {
        const comparison = compareRegistrationNumbers(docRegNumber, appRegNumber);
        return createFinding({
          fieldName: "Registration Number",
          description: "Registration/CIN number on certificate vs application record",
          ruleId: "CR_REGISTRATION_NUMBER",
          status: comparison.status === "normalized_match" ? "passed" : "mismatch_found",
          comparisonMethod: "registration_number",
          documentValue: docRegNumber,
          applicationValue: appRegNumber,
          explanation: comparison.explanation,
          confidence: comparison.confidence,
          isRequired: false,
        });
      }

      // No application reference - just verify presence
      return createFinding({
        fieldName: "Registration Number",
        description: "Registration/CIN number on company registration certificate",
        ruleId: "CR_REGISTRATION_NUMBER",
        status: "passed",
        comparisonMethod: "exact",
        documentValue: docRegNumber,
        applicationValue: null,
        explanation: `Registration number found in document: ${docRegNumber}`,
        confidence: 85,
        isRequired: false,
      });
    },
  },
  {
    ruleId: "CR_ADDRESS",
    name: "Registered Address Match",
    description: "Compare registered address with application address when same type",
    applicableRequirementIds: ["REQ_COMPANY_REGISTRATION"],
    isMandatory: false,
    priority: 3,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docAddress = getExtractedFieldValue(classification?.extractedFields || [], "registeredAddress")?.value;
      const appLocation = application.buildingDetails?.location;
      const appAddress = appLocation ? `${appLocation.address}, ${appLocation.district}, ${appLocation.state} - ${appLocation.pincode}` : null;

      if (isMissing(docAddress) || isMissing(appAddress)) {
        return createFinding({
          fieldName: "Registered Address",
          description: "Registered address on certificate vs application building address",
          ruleId: "CR_ADDRESS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docAddress,
          applicationValue: appAddress,
          explanation: isMissing(docAddress) ? "Registered address not found in document" : "Application address not available",
          isRequired: false,
        });
      }

      const comparison = compareAddresses(docAddress as string, appAddress as string);

      return createFinding({
        fieldName: "Registered Address",
        description: "Registered address on certificate vs application building address",
        ruleId: "CR_ADDRESS",
        status: comparison.status === "normalized_match" ? "passed"
          : comparison.status === "fuzzy_similar" ? "needs_review"
          : "mismatch_found",
        comparisonMethod: "address_comparison",
        documentValue: docAddress,
        applicationValue: appAddress,
        explanation: comparison.explanation,
        confidence: comparison.confidence,
        isRequired: false,
      });
    },
  },
  {
    ruleId: "CR_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_COMPANY_REGISTRATION"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "CR_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "CR_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * Architect Certificate Validation Rules
 * Requirement ID: REQ_ARCHITECT_CERTIFICATE
 */
export const architectCertificateRules: IValidationRule[] = [
  {
    ruleId: "AC_PROJECT_DETAILS",
    name: "Project/Building Details Match",
    description: "Compare project/building name on architect certificate with application",
    applicableRequirementIds: ["REQ_ARCHITECT_CERTIFICATE"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docProjectName = getExtractedFieldValue(classification?.extractedFields || [], "projectName")?.value;
      const appBuildingName = application.buildingDetails?.buildingName;

      if (isMissing(docProjectName) && isMissing(appBuildingName)) {
        return createFinding({
          fieldName: "Project/Building Name",
          description: "Project name on architect certificate vs application building name",
          ruleId: "AC_PROJECT_DETAILS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docProjectName,
          applicationValue: appBuildingName,
          explanation: "Both project/building names are missing",
          isRequired: true,
        });
      }

      if (isMissing(docProjectName)) {
        return createFinding({
          fieldName: "Project/Building Name",
          description: "Project name on architect certificate vs application building name",
          ruleId: "AC_PROJECT_DETAILS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docProjectName,
          applicationValue: appBuildingName,
          explanation: "Project name not found in document extraction",
          isRequired: true,
        });
      }

      if (isMissing(appBuildingName)) {
        return createFinding({
          fieldName: "Project/Building Name",
          description: "Project name on architect certificate vs application building name",
          ruleId: "AC_PROJECT_DETAILS",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docProjectName,
          applicationValue: appBuildingName,
          explanation: "Building name not provided in application",
          isRequired: true,
        });
      }

      const docNorm = normalizeBuildingName(docProjectName as string);
      const appNorm = normalizeBuildingName(appBuildingName as string);

      if (docNorm.normalized && appNorm.normalized && docNorm.normalized === appNorm.normalized) {
        return createFinding({
          fieldName: "Project/Building Name",
          description: "Project name on architect certificate vs application building name",
          ruleId: "AC_PROJECT_DETAILS",
          status: "passed",
          comparisonMethod: "normalized",
          documentValue: docProjectName,
          applicationValue: appBuildingName,
          normalizedDocumentValue: docNorm.normalized,
          normalizedApplicationValue: appNorm.normalized,
          explanation: "Project/building names match after normalization",
          confidence: 95,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Project/Building Name",
        description: "Project name on architect certificate vs application building name",
        ruleId: "AC_PROJECT_DETAILS",
        status: "needs_review",
        comparisonMethod: "fuzzy_similarity",
        documentValue: docProjectName,
        applicationValue: appBuildingName,
        normalizedDocumentValue: docNorm.normalized,
        normalizedApplicationValue: appNorm.normalized,
        explanation: "Project/building names differ - review recommended",
        confidence: 50,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "AC_ARCHITECT_IDENTITY",
    name: "Architect Identity Match",
    description: "Compare architect name and registration number when authoritative data exists",
    applicableRequirementIds: ["REQ_ARCHITECT_CERTIFICATE"],
    isMandatory: false,
    priority: 2,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification } = context;
      const docArchitectName = getExtractedFieldValue(classification?.extractedFields || [], "architectName")?.value;
      const docRegNumber = getExtractedFieldValue(classification?.extractedFields || [], "registrationNumber")?.value;
      const appArchitectName = application.architectDetails?.name;
      const appRegNumber = application.architectDetails?.registrationNumber;

      const findings: IValidationFinding[] = [];

      // Name comparison
      if (!isMissing(docArchitectName) && !isMissing(appArchitectName)) {
        const docNorm = normalizeString(docArchitectName as string);
        const appNorm = normalizeString(appArchitectName as string);

        if (docNorm.normalized && appNorm.normalized && docNorm.normalized.toLowerCase() === appNorm.normalized.toLowerCase()) {
          findings.push(createFinding({
            fieldName: "Architect Name",
            description: "Architect name on certificate vs application",
            ruleId: "AC_ARCHITECT_IDENTITY",
            status: "passed",
            comparisonMethod: "normalized",
            documentValue: docArchitectName,
            applicationValue: appArchitectName,
            normalizedDocumentValue: docNorm.normalized,
            normalizedApplicationValue: appNorm.normalized,
            explanation: "Architect names match",
            confidence: 90,
            isRequired: false,
          }));
        } else {
          findings.push(createFinding({
            fieldName: "Architect Name",
            description: "Architect name on certificate vs application",
            ruleId: "AC_ARCHITECT_IDENTITY",
            status: "needs_review",
            comparisonMethod: "fuzzy_similarity",
            documentValue: docArchitectName,
            applicationValue: appArchitectName,
            normalizedDocumentValue: docNorm.normalized,
            normalizedApplicationValue: appNorm.normalized,
            explanation: "Architect names differ - review recommended",
            confidence: 50,
            isRequired: false,
          }));
        }
      } else if (isMissing(docArchitectName)) {
        findings.push(createFinding({
          fieldName: "Architect Name",
          description: "Architect name on certificate vs application",
          ruleId: "AC_ARCHITECT_IDENTITY",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docArchitectName,
          applicationValue: appArchitectName,
          explanation: "Architect name not found in document extraction",
          isRequired: false,
        }));
      }

      // Registration number comparison
      if (!isMissing(docRegNumber) && !isMissing(appRegNumber)) {
        const comparison = compareRegistrationNumbers(docRegNumber as string, appRegNumber as string);
        findings.push(createFinding({
          fieldName: "Architect Registration Number",
          description: "Architect registration number on certificate vs application",
          ruleId: "AC_ARCHITECT_IDENTITY",
          status: comparison.status === "normalized_match" ? "passed" : "mismatch_found",
          comparisonMethod: "registration_number",
          documentValue: docRegNumber,
          applicationValue: appRegNumber,
          explanation: comparison.explanation,
          confidence: comparison.confidence,
          isRequired: false,
        }));
      } else if (isMissing(docRegNumber)) {
        findings.push(createFinding({
          fieldName: "Architect Registration Number",
          description: "Architect registration number on certificate vs application",
          ruleId: "AC_ARCHITECT_IDENTITY",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: docRegNumber,
          applicationValue: appRegNumber,
          explanation: "Registration number not found in document extraction",
          isRequired: false,
        }));
      }

      // Return the first finding (or a combined one)
      return findings[0] || createFinding({
        fieldName: "Architect Identity",
        description: "Architect identity and registration verification",
        ruleId: "AC_ARCHITECT_IDENTITY",
        status: "insufficient_data",
        comparisonMethod: "not_compared",
        documentValue: null,
        applicationValue: null,
        explanation: "No architect identity data available for comparison",
        isRequired: false,
      });
    },
  },
  {
    ruleId: "AC_NBC_COMPLIANCE",
    name: "NBC Compliance Certification",
    description: "Check if NBC-2005 compliance is certified on the document",
    applicableRequirementIds: ["REQ_ARCHITECT_CERTIFICATE"],
    isMandatory: true,
    priority: 3,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification } = context;
      const nbcCompliance = getExtractedFieldValue(classification?.extractedFields || [], "nbcCompliance")?.value;

      if (isMissing(nbcCompliance)) {
        return createFinding({
          fieldName: "NBC Compliance",
          description: "NBC-2005 compliance certification on architect certificate",
          ruleId: "AC_NBC_COMPLIANCE",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: nbcCompliance,
          applicationValue: null,
          explanation: "NBC compliance field not found in document extraction",
          isRequired: true,
        });
      }

      const boolNorm = normalizeBoolean(nbcCompliance);
      if (boolNorm.normalized === true) {
        return createFinding({
          fieldName: "NBC Compliance",
          description: "NBC-2005 compliance certification on architect certificate",
          ruleId: "AC_NBC_COMPLIANCE",
          status: "passed",
          comparisonMethod: "boolean_match",
          documentValue: nbcCompliance,
          applicationValue: null,
          explanation: "NBC-2005 compliance certified on document",
          confidence: 90,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "NBC Compliance",
        description: "NBC-2005 compliance certification on architect certificate",
        ruleId: "AC_NBC_COMPLIANCE",
        status: "mismatch_found",
        comparisonMethod: "boolean_match",
        documentValue: nbcCompliance,
        applicationValue: null,
        explanation: `NBC compliance not certified or explicitly negative: ${nbcCompliance}`,
        confidence: 80,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "AC_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_ARCHITECT_CERTIFICATE"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "AC_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "AC_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * Raw Materials Details Validation Rules
 * Requirement ID: REQ_RAW_MATERIALS
 */
export const rawMaterialsRules: IValidationRule[] = [
  {
    ruleId: "RM_MATERIALS_PRESENT",
    name: "Raw Materials List Presence",
    description: "Check if raw materials list with required fields is present",
    applicableRequirementIds: ["REQ_RAW_MATERIALS"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;
      const materials = getExtractedFieldValue(classification?.extractedFields || [], "materials")?.value;

      // Also check checklist response (applicant-provided data)
      const applicantMaterials = checklistItem.response?.materials;

      if (isMissing(materials) && (!applicantMaterials || applicantMaterials.length === 0)) {
        return createFinding({
          fieldName: "Raw Materials List",
          description: "Presence of raw materials list with name, quantity, unit, storage location",
          ruleId: "RM_MATERIALS_PRESENT",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: materials,
          applicationValue: applicantMaterials?.length || 0,
          explanation: "No raw materials found in document extraction or applicant response",
          isRequired: true,
        });
      }

      // If we have applicant-provided materials, use that as reference
      const hasMaterials = (!isMissing(materials) && Array.isArray(materials) && materials.length > 0)
        || (applicantMaterials && applicantMaterials.length > 0);

      return createFinding({
        fieldName: "Raw Materials List",
        description: "Presence of raw materials list with required fields",
        ruleId: "RM_MATERIALS_PRESENT",
        status: hasMaterials ? "passed" : "insufficient_data",
        comparisonMethod: "exact",
        documentValue: materials,
        applicationValue: applicantMaterials?.length || 0,
        explanation: hasMaterials
          ? `Raw materials list present (${Array.isArray(materials) ? materials.length : applicantMaterials?.length} items)`
          : "Raw materials list missing or empty",
        confidence: hasMaterials ? 90 : 30,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "RM_HAZARDOUS_DECLARATION",
    name: "Hazardous Materials Declaration Consistency",
    description: "Check if hazardous material declarations match application",
    applicableRequirementIds: ["REQ_RAW_MATERIALS"],
    isMandatory: true,
    priority: 2,
    execute: async (context): Promise<IValidationFinding> => {
      const { application, classification, checklistItem } = context;
      const appHasHazardous = application.buildingDetails?.hasHazardousMaterials === true;
      const appHazardousDesc = application.buildingDetails?.hazardousMaterialsDescription;

      // Check extracted materials for hazardous flags
      const materials = getExtractedFieldValue(classification?.extractedFields || [], "materials")?.value;
      let docHasHazardous = false;
      if (Array.isArray(materials)) {
        docHasHazardous = materials.some((m: any) => m.isHazardous === true);
      }

      // Also check applicant-provided response
      const applicantMaterials = checklistItem.response?.materials;
      let applicantHasHazardous = false;
      if (applicantMaterials) {
        applicantHasHazardous = applicantMaterials.some(m => m.name?.toLowerCase().includes("hazardous")
          || m.name?.toLowerCase().includes("chemical")
          || m.name?.toLowerCase().includes("solvent")
          || m.name?.toLowerCase().includes("fuel")
          || m.name?.toLowerCase().includes("lpg")
          || m.name?.toLowerCase().includes("diesel"));
      }

      if (!appHasHazardous && !docHasHazardous && !applicantHasHazardous) {
        return createFinding({
          fieldName: "Hazardous Materials Declaration",
          description: "Consistency of hazardous materials declaration",
          ruleId: "RM_HAZARDOUS_DECLARATION",
          status: "passed",
          comparisonMethod: "boolean_match",
          documentValue: docHasHazardous,
          applicationValue: appHasHazardous,
          explanation: "No hazardous materials declared in application, document, or applicant response",
          confidence: 95,
          isRequired: true,
        });
      }

      if (appHasHazardous && (docHasHazardous || applicantHasHazardous)) {
        return createFinding({
          fieldName: "Hazardous Materials Declaration",
          description: "Consistency of hazardous materials declaration",
          ruleId: "RM_HAZARDOUS_DECLARATION",
          status: "passed",
          comparisonMethod: "boolean_match",
          documentValue: docHasHazardous,
          applicationValue: appHasHazardous,
          explanation: "Hazardous materials declared in application and reflected in document/applicant response",
          confidence: 90,
          isRequired: true,
        });
      }

      if (appHasHazardous && !docHasHazardous && !applicantHasHazardous) {
        return createFinding({
          fieldName: "Hazardous Materials Declaration",
          description: "Consistency of hazardous materials declaration",
          ruleId: "RM_HAZARDOUS_DECLARATION",
          status: "mismatch_found",
          comparisonMethod: "boolean_match",
          documentValue: docHasHazardous,
          applicationValue: appHasHazardous,
          explanation: `Application declares hazardous materials (${appHazardousDesc || "details not provided"}) but document/applicant response does not reflect this`,
          confidence: 80,
          isRequired: true,
        });
      }

      if (!appHasHazardous && (docHasHazardous || applicantHasHazardous)) {
        return createFinding({
          fieldName: "Hazardous Materials Declaration",
          description: "Consistency of hazardous materials declaration",
          ruleId: "RM_HAZARDOUS_DECLARATION",
          status: "needs_review",
          comparisonMethod: "boolean_match",
          documentValue: docHasHazardous,
          applicationValue: appHasHazardous,
          explanation: "Document/applicant response indicates hazardous materials but application does not declare them - review required",
          confidence: 60,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Hazardous Materials Declaration",
        description: "Consistency of hazardous materials declaration",
        ruleId: "RM_HAZARDOUS_DECLARATION",
        status: "insufficient_data",
        comparisonMethod: "not_compared",
        documentValue: null,
        applicationValue: null,
        explanation: "Unable to determine hazardous materials consistency",
        isRequired: true,
      });
    },
  },
  {
    ruleId: "RM_QUANTITIES_VALID",
    name: "Quantity and Unit Validation",
    description: "Check numeric quantities for valid values and units",
    applicableRequirementIds: ["REQ_RAW_MATERIALS"],
    isMandatory: true,
    priority: 3,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;
      const materials = getExtractedFieldValue(classification?.extractedFields || [], "materials")?.value;
      const applicantMaterials = checklistItem.response?.materials;

      const allMaterials = Array.isArray(materials) ? materials : (applicantMaterials || []);

      if (!allMaterials || allMaterials.length === 0) {
        return createFinding({
          fieldName: "Material Quantities & Units",
          description: "Validation of quantities and units for raw materials",
          ruleId: "RM_QUANTITIES_VALID",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: null,
          applicationValue: null,
          explanation: "No materials data available for quantity validation",
          isRequired: true,
        });
      }

      let validCount = 0;
      let totalCount = 0;
      const issues: string[] = [];

      for (const material of allMaterials) {
        totalCount++;
        const qty = material.quantity;
        const unit = material.unit;
        const name = material.name;

        if (isMissing(qty)) {
          issues.push(`${name}: missing quantity`);
          continue;
        }
        if (typeof qty !== "number" || qty < 0) {
          issues.push(`${name}: invalid quantity (${qty})`);
          continue;
        }
        if (isMissing(unit) || String(unit).trim() === "") {
          issues.push(`${name}: missing unit`);
          continue;
        }
        validCount++;
      }

      if (totalCount === 0) {
        return createFinding({
          fieldName: "Material Quantities & Units",
          description: "Validation of quantities and units for raw materials",
          ruleId: "RM_QUANTITIES_VALID",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: null,
          applicationValue: null,
          explanation: "No materials to validate",
          isRequired: true,
        });
      }

      if (validCount === totalCount) {
        return createFinding({
          fieldName: "Material Quantities & Units",
          description: "Validation of quantities and units for raw materials",
          ruleId: "RM_QUANTITIES_VALID",
          status: "passed",
          comparisonMethod: "numeric_comparison",
          documentValue: `${validCount}/${totalCount} valid`,
          applicationValue: null,
          explanation: "All material quantities and units are valid",
          confidence: 95,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Material Quantities & Units",
        description: "Validation of quantities and units for raw materials",
        ruleId: "RM_QUANTITIES_VALID",
        status: "mismatch_found",
        comparisonMethod: "numeric_comparison",
        documentValue: `${validCount}/${totalCount} valid`,
        applicationValue: null,
        explanation: `${totalCount - validCount} of ${totalCount} materials have invalid quantities or missing units: ${issues.join("; ")}`,
        confidence: 85,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "RM_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_RAW_MATERIALS"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "RM_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "RM_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * Finished Goods Details Validation Rules
 * Requirement ID: REQ_FINISHED_GOODS
 */
export const finishedGoodsRules: IValidationRule[] = [
  {
    ruleId: "FG_GOODS_PRESENT",
    name: "Finished Goods List Presence",
    description: "Check if finished goods list with required fields is present",
    applicableRequirementIds: ["REQ_FINISHED_GOODS"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;
      const goods = getExtractedFieldValue(classification?.extractedFields || [], "goods")?.value;
      const applicantGoods = checklistItem.response?.goods;

      if (isMissing(goods) && (!applicantGoods || applicantGoods.length === 0)) {
        return createFinding({
          fieldName: "Finished Goods List",
          description: "Presence of finished goods list with name, quantity, unit, storage location",
          ruleId: "FG_GOODS_PRESENT",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: goods,
          applicationValue: applicantGoods?.length || 0,
          explanation: "No finished goods found in document extraction or applicant response",
          isRequired: true,
        });
      }

      const hasGoods = (!isMissing(goods) && Array.isArray(goods) && goods.length > 0)
        || (applicantGoods && applicantGoods.length > 0);

      return createFinding({
        fieldName: "Finished Goods List",
        description: "Presence of finished goods list with required fields",
        ruleId: "FG_GOODS_PRESENT",
        status: hasGoods ? "passed" : "insufficient_data",
        comparisonMethod: "exact",
        documentValue: goods,
        applicationValue: applicantGoods?.length || 0,
        explanation: hasGoods
          ? `Finished goods list present (${Array.isArray(goods) ? goods.length : applicantGoods?.length} items)`
          : "Finished goods list missing or empty",
        confidence: hasGoods ? 90 : 30,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "FG_QUANTITIES_VALID",
    name: "Quantity and Unit Validation",
    description: "Check numeric quantities for valid values and units",
    applicableRequirementIds: ["REQ_FINISHED_GOODS"],
    isMandatory: true,
    priority: 2,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;
      const goods = getExtractedFieldValue(classification?.extractedFields || [], "goods")?.value;
      const applicantGoods = checklistItem.response?.goods;

      const allGoods = Array.isArray(goods) ? goods : (applicantGoods || []);

      if (!allGoods || allGoods.length === 0) {
        return createFinding({
          fieldName: "Goods Quantities & Units",
          description: "Validation of quantities and units for finished goods",
          ruleId: "FG_QUANTITIES_VALID",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: null,
          applicationValue: null,
          explanation: "No goods data available for quantity validation",
          isRequired: true,
        });
      }

      let validCount = 0;
      let totalCount = 0;
      const issues: string[] = [];

      for (const good of allGoods) {
        totalCount++;
        const qty = good.quantity;
        const unit = good.unit;
        const name = good.name;

        if (isMissing(qty)) {
          issues.push(`${name}: missing quantity`);
          continue;
        }
        if (typeof qty !== "number" || qty < 0) {
          issues.push(`${name}: invalid quantity (${qty})`);
          continue;
        }
        if (isMissing(unit) || String(unit).trim() === "") {
          issues.push(`${name}: missing unit`);
          continue;
        }
        validCount++;
      }

      if (validCount === totalCount) {
        return createFinding({
          fieldName: "Goods Quantities & Units",
          description: "Validation of quantities and units for finished goods",
          ruleId: "FG_QUANTITIES_VALID",
          status: "passed",
          comparisonMethod: "numeric_comparison",
          documentValue: `${validCount}/${totalCount} valid`,
          applicationValue: null,
          explanation: "All goods quantities and units are valid",
          confidence: 95,
          isRequired: true,
        });
      }

      return createFinding({
        fieldName: "Goods Quantities & Units",
        description: "Validation of quantities and units for finished goods",
        ruleId: "FG_QUANTITIES_VALID",
        status: "mismatch_found",
        comparisonMethod: "numeric_comparison",
        documentValue: `${validCount}/${totalCount} valid`,
        applicationValue: null,
        explanation: `${totalCount - validCount} of ${totalCount} goods have invalid quantities or missing units: ${issues.join("; ")}`,
        confidence: 85,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "FG_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_FINISHED_GOODS"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "FG_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "FG_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * Existing Fire Protection System Details Validation Rules
 * Requirement ID: REQ_EXISTING_FIRE_PROTECTION
 */
export const existingFireProtectionRules: IValidationRule[] = [
  {
    ruleId: "FP_SYSTEMS_PRESENT",
    name: "Fire Protection Systems Documentation",
    description: "Check if fire protection systems information is present",
    applicableRequirementIds: ["REQ_EXISTING_FIRE_PROTECTION"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification } = context;
      const fireSystems = getExtractedFieldValue(classification?.extractedFields || [], "fireSystems")?.value;
      const pumpCapacities = getExtractedFieldValue(classification?.extractedFields || [], "pumpCapacities")?.value;
      const systemCondition = getExtractedFieldValue(classification?.extractedFields || [], "systemCondition")?.value;

      const hasAnyInfo = !isMissing(fireSystems) || !isMissing(pumpCapacities) || !isMissing(systemCondition);

      if (!hasAnyInfo) {
        return createFinding({
          fieldName: "Fire Protection Systems",
          description: "Presence of fire protection systems information (hydrants, sprinklers, alarms, extinguishers, pump capacities)",
          ruleId: "FP_SYSTEMS_PRESENT",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: null,
          applicationValue: null,
          explanation: "No fire protection systems information found in document extraction",
          isRequired: true,
        });
      }

      const presentFields = [];
      if (!isMissing(fireSystems)) presentFields.push("fire systems");
      if (!isMissing(pumpCapacities)) presentFields.push("pump capacities");
      if (!isMissing(systemCondition)) presentFields.push("system condition");

      return createFinding({
        fieldName: "Fire Protection Systems",
        description: "Presence of fire protection systems information",
        ruleId: "FP_SYSTEMS_PRESENT",
        status: "passed",
        comparisonMethod: "exact",
        documentValue: presentFields.join(", "),
        applicationValue: null,
        explanation: `Fire protection information found: ${presentFields.join(", ")}`,
        confidence: 85,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "FP_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_EXISTING_FIRE_PROTECTION"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "FP_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "FP_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * Hazardous Materials Approvals Validation Rules
 * Requirement ID: REQ_HAZARDOUS_APPROVALS
 */
export const hazardousApprovalsRules: IValidationRule[] = [
  {
    ruleId: "HA_APPROVALS_PRESENT",
    name: "Government Agency Approvals Presence",
    description: "Check if government agency approvals are documented",
    applicableRequirementIds: ["REQ_HAZARDOUS_APPROVALS"],
    isMandatory: true,
    priority: 1,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, application } = context;
      const approvals = getExtractedFieldValue(classification?.extractedFields || [], "agencyApprovals")?.value;
      const appHasHazardous = application.buildingDetails?.hasHazardousMaterials === true;

      if (!appHasHazardous) {
        return createFinding({
          fieldName: "Government Agency Approvals",
          description: "Presence of statutory approvals from government agencies (PESO, MPCB, DISH, etc.)",
          ruleId: "HA_APPROVALS_PRESENT",
          status: "not_applicable",
          comparisonMethod: "not_compared",
          documentValue: approvals,
          applicationValue: appHasHazardous,
          explanation: "Application does not declare hazardous materials - this requirement may not apply",
          isRequired: false,
        });
      }

      if (isMissing(approvals) || (Array.isArray(approvals) && approvals.length === 0)) {
        return createFinding({
          fieldName: "Government Agency Approvals",
          description: "Presence of statutory approvals from government agencies",
          ruleId: "HA_APPROVALS_PRESENT",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: approvals,
          applicationValue: appHasHazardous,
          explanation: "Application declares hazardous materials but no agency approvals found in document",
          isRequired: true,
        });
      }

      const approvalCount = Array.isArray(approvals) ? approvals.length : 1;
      return createFinding({
        fieldName: "Government Agency Approvals",
        description: "Presence of statutory approvals from government agencies",
        ruleId: "HA_APPROVALS_PRESENT",
        status: "passed",
        comparisonMethod: "exact",
        documentValue: `${approvalCount} approval(s) found`,
        applicationValue: appHasHazardous,
        explanation: `Government agency approvals documented (${approvalCount} approval(s))`,
        confidence: 90,
        isRequired: true,
      });
    },
  },
  {
    ruleId: "HA_CATEGORY_MATCH",
    name: "Document Category Match",
    description: "Verify AI classification matches expected checklist requirement",
    applicableRequirementIds: ["REQ_HAZARDOUS_APPROVALS"],
    isMandatory: true,
    priority: 0,
    execute: async (context): Promise<IValidationFinding> => {
      const { classification, checklistItem } = context;

      if (!classification || classification.status !== "COMPLETED") {
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "HA_CATEGORY_MATCH",
          status: "insufficient_data",
          comparisonMethod: "not_compared",
          documentValue: classification?.predictedRequirementId || null,
          applicationValue: checklistItem.requirementId,
          explanation: "AI classification not completed or not available",
          isRequired: true,
        });
      }

      const matches = classification.matchesExpected;

      return createFinding({
        fieldName: "Document Category",
        description: "AI predicted category vs expected checklist requirement",
        ruleId: "HA_CATEGORY_MATCH",
        status: matches ? "passed" : "category_mismatch",
        comparisonMethod: "exact",
        documentValue: classification.predictedRequirementId,
        applicationValue: checklistItem.requirementId,
        explanation: matches
          ? `Document correctly classified as ${classification.predictedRequirementName}`
          : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
        confidence: classification.confidence,
        isRequired: true,
      });
    },
  },
];

/**
 * All validation rules registry
 */
export const VALIDATION_RULES_REGISTRY: Record<ValidationRuleSetId, IValidationRule[]> = {
  REQ_OCCUPANCY_CERTIFICATE: occupancyCertificateRules,
  REQ_COMPANY_REGISTRATION: companyRegistrationRules,
  REQ_ARCHITECT_CERTIFICATE: architectCertificateRules,
  REQ_RAW_MATERIALS: rawMaterialsRules,
  REQ_FINISHED_GOODS: finishedGoodsRules,
  REQ_EXISTING_FIRE_PROTECTION: existingFireProtectionRules,
  REQ_HAZARDOUS_APPROVALS: hazardousApprovalsRules,
  REQ_PROCESS_FLOW_CHART: [
    {
      ruleId: "PF_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_PROCESS_FLOW_CHART"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "PF_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "PF_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
  REQ_CIVIL_AVIATION_NOC: [
    {
      ruleId: "CA_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_CIVIL_AVIATION_NOC"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "CA_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "CA_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
  REQ_APPLICATION_LETTER: [
    {
      ruleId: "AL_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_APPLICATION_LETTER"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "AL_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "AL_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
  REQ_ARCHITECTURAL_DRAWINGS: [
    {
      ruleId: "AD_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_ARCHITECTURAL_DRAWINGS"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "AD_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "AD_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
  REQ_BLOCK_PLAN: [
    {
      ruleId: "BP_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_BLOCK_PLAN"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "BP_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "BP_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
  REQ_ACTIVITY_NOTE: [
    {
      ruleId: "AN_CATEGORY_MATCH",
      name: "Document Category Match",
      description: "Verify AI classification matches expected checklist requirement",
      applicableRequirementIds: ["REQ_ACTIVITY_NOTE"],
      isMandatory: true,
      priority: 0,
      execute: async (context): Promise<IValidationFinding> => {
        const { classification, checklistItem } = context;
        if (!classification || classification.status !== "COMPLETED") {
          return createFinding({
            fieldName: "Document Category",
            description: "AI predicted category vs expected checklist requirement",
            ruleId: "AN_CATEGORY_MATCH",
            status: "insufficient_data",
            comparisonMethod: "not_compared",
            documentValue: classification?.predictedRequirementId || null,
            applicationValue: checklistItem.requirementId,
            explanation: "AI classification not completed or not available",
            isRequired: true,
          });
        }
        const matches = classification.matchesExpected;
        return createFinding({
          fieldName: "Document Category",
          description: "AI predicted category vs expected checklist requirement",
          ruleId: "AN_CATEGORY_MATCH",
          status: matches ? "passed" : "category_mismatch",
          comparisonMethod: "exact",
          documentValue: classification.predictedRequirementId,
          applicationValue: checklistItem.requirementId,
          explanation: matches ? `Document correctly classified as ${classification.predictedRequirementName}` : `Document classified as ${classification.predictedRequirementName} but expected ${checklistItem.name}`,
          confidence: classification.confidence,
          isRequired: true,
        });
      },
    },
  ],
};

/**
 * Get validation rules for a requirement ID
 */
export function getValidationRules(requirementId: string): IValidationRule[] {
  return VALIDATION_RULES_REGISTRY[requirementId as ValidationRuleSetId] || [];
}

/**
 * Get all applicable validation rules for a document
 */
export function getApplicableValidationRules(requirementId: string): IValidationRule[] {
  const rules = getValidationRules(requirementId);
  return rules.sort((a, b) => a.priority - b.priority);
}