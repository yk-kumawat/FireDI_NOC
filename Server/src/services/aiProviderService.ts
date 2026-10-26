import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export interface AIProviderConfig {
  provider: "google" | "mock";
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ClassificationResult {
  predictedRequirementId: string | null;
  predictedRequirementName: string;
  confidence: number; // 0-100
  explanation: string;
  matchesExpected: boolean;
}

export interface ExtractionResult {
  fields: ExtractedField[];
  missingFields: string[];
}

export interface ExtractedField {
  name: string;
  value: string | number | null;
  confidence?: number;
  missing: boolean;
}

export interface AIProvider {
  classify(
    text: string,
    expectedRequirementId: string | null,
    availableRequirements: RequirementOption[]
  ): Promise<ClassificationResult>;

  extract(
    text: string,
    requirementId: string,
    requirementName: string,
    requirementDescription: string
  ): Promise<ExtractionResult>;

  isAvailable(): boolean;
}

export interface RequirementOption {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
}

/**
 * Google Gemini Provider Implementation
 * Uses gemini-3.8-flash (free tier)
 */
export class GoogleProvider implements AIProvider {
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.model = config.model || "gemini-3.8-flash";
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 2000;
  }

  isAvailable(): boolean {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }

  async classify(
    text: string,
    expectedRequirementId: string | null,
    availableRequirements: RequirementOption[]
  ): Promise<ClassificationResult> {
    if (!this.isAvailable()) {
      throw new Error("Google API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY");
    }

    const trimmedText = text.slice(0, 12000); // Limit input size

    const requirementsList = availableRequirements
      .map((r) => `- ${r.id}: ${r.name} (${r.category}) - ${r.description}`)
      .join("\n");

    const expectedContext = expectedRequirementId
      ? `\nExpected requirement (from checklist): ${expectedRequirementId}`
      : "";

    const prompt = `You are a document classification assistant for a Fire Department NOC Management System.

Analyze the following document text and classify it into one of the available requirement categories.

${expectedContext}

Available requirement categories:
${requirementsList}

Document text:
---
${trimmedText}
---

Respond with a JSON object containing:
{
  "predictedRequirementId": "REQ_ID" or null if no match,
  "predictedRequirementName": "Category Name",
  "confidence": 0-100,
  "explanation": "Brief explanation of why this classification was chosen",
  "matchesExpected": true/false (whether predicted matches expected)
}

Only use requirement IDs from the list above. If the document doesn't match any category well, return null for predictedRequirementId and low confidence.`;

    try {
      const { text: responseText } = await generateText({
        model: google(this.model),
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      });

      const result = this.parseJsonResponse(responseText);
      return this.validateClassificationResult(result, availableRequirements);
    } catch (error) {
      throw new Error(`Classification failed: ${error}`);
    }
  }

  async extract(
    text: string,
    requirementId: string,
    requirementName: string,
    requirementDescription: string
  ): Promise<ExtractionResult> {
    if (!this.isAvailable()) {
      throw new Error("Google API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY");
    }

    const trimmedText = text.slice(0, 12000);

    // Get field schema for this requirement
    const fieldSchema = this.getFieldSchemaForRequirement(requirementId);

    const prompt = `You are an information extraction assistant for a Fire Department NOC Management System.

Extract structured information from the following document text. The document is expected to be a "${requirementName}" (${requirementId}).

Requirement description: ${requirementDescription}

Document text:
---
${trimmedText}
---

Extract the following fields and return as JSON:
{
  "fields": [
    {"name": "field_name", "value": "extracted_value_or_null", "confidence": 0-100, "missing": true/false}
  ],
  "missingFields": ["field_names_that_could_not_be_found"]
}

Field definitions for ${requirementId}:
${fieldSchema}

Rules:
- Only extract information explicitly present in the text
- Use null for values not found
- Set missing: true for fields not found
- Confidence should reflect certainty (0-100)
- Do not invent or hallucinate values
- If a field is not applicable to this document type, omit it`;

    try {
      const { text: responseText } = await generateText({
        model: google(this.model),
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      });

      const result = this.parseJsonResponse(responseText);
      return this.validateExtractionResult(result);
    } catch (error) {
      throw new Error(`Extraction failed: ${error}`);
    }
  }

  private getFieldSchemaForRequirement(requirementId: string): string {
    const schemas: Record<string, string> = {
      REQ_OCCUPANCY_CERTIFICATE: `
- buildingName: Building name as stated on certificate
- buildingAddress: Full address of the building
- certificateNumber: Certificate/reference number
- issuingAuthority: Authority that issued the certificate
- issueDate: Date of issuance (DD/MM/YYYY or similar)
- occupancyDetails: Type of occupancy approved`,

      REQ_COMPANY_REGISTRATION: `
- companyName: Legal name of company/society
- registrationNumber: Registration/CIN number
- registeredAddress: Registered office address
- issuingAuthority: Registrar/authority name
- registrationDate: Date of registration
- licenseType: Type of license/registration`,

      REQ_ARCHITECT_CERTIFICATE: `
- architectName: Name of architect/civil engineer
- registrationNumber: COA/registration number
- firmName: Firm/agency name
- projectName: Building/project name
- projectAddress: Project address
- certificationDate: Date of certification
- nbcCompliance: Whether NBC-2005 compliance is certified`,

      REQ_RAW_MATERIALS: `
- materials: Array of {name, quantity, unit, storageLocation, isHazardous}
  Extract each material mentioned with its details`,

      REQ_FINISHED_GOODS: `
- goods: Array of {name, quantity, unit, storageLocation, packagingType}
  Extract each finished good/product mentioned`,

      REQ_ACTIVITY_NOTE: `
- businessActivity: Primary business/industrial activity
- processes: Key processes described
- hazardousOperations: Any hazardous operations explicitly mentioned
- occupancyType: Type of occupancy (industrial/commercial/residential)`,

      REQ_ARCHITECTURAL_DRAWINGS: `
- drawingType: Type of drawings (floor plan, elevation, section, etc.)
- buildingName: Name of building
- numberOfFloors: Number of floors shown
- buildingHeight: Building height if mentioned
- scale: Drawing scale`,

      REQ_BLOCK_PLAN: `
- siteAddress: Site address
- roadWidth: Approach road width
- entranceWidths: Main/secondary entrance widths
- marginalSpaces: Marginal/open spaces around building
- basementDetails: Basement information if present`,

      REQ_EXISTING_FIRE_PROTECTION: `
- fireSystems: Types of systems (hydrants, sprinklers, alarms, extinguishers)
- pumpCapacities: Fire pump capacities
- systemCondition: Condition/status of existing systems`,

      REQ_HAZARDOUS_APPROVALS: `
- agencyApprovals: Array of {agencyName, approvalNumber, approvalDate, validity}
  Extract each government agency approval mentioned`,

      REQ_PROCESS_FLOW_CHART: `
- processStages: Key manufacturing stages
- thermalPoints: Thermal/heat generation points
- chemicalInteractions: Chemical processes mentioned`,

      REQ_CIVIL_AVIATION_NOC: `
- nocNumber: NOC reference number
- issuingAuthority: AAI/DGCA
- heightClearance: Approved height
- issueDate: Date of issuance
- validityPeriod: Validity if mentioned`,

      REQ_APPLICATION_LETTER: `
- applicantName: Name of applicant
- applicantAddress: Applicant address
- siteAddress: Site address for NOC
- nearestFireStation: Nearest fire station mentioned
- authorizedSignatory: Name of signatory`,
    };

    return schemas[requirementId] || `
- keyInformation: Any key information found in the document
- relevantDetails: Details relevant to ${requirementId}
- dates: Any dates mentioned
- referenceNumbers: Any reference/certificate numbers
- authorities: Any issuing authorities mentioned`;
  }

  private parseJsonResponse(text: string): any {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to throw
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  private validateClassificationResult(
    result: any,
    availableRequirements: RequirementOption[]
  ): ClassificationResult {
    const validIds = availableRequirements.map((r) => r.id);
    const predictedId = result.predictedRequirementId;

    if (predictedId && !validIds.includes(predictedId)) {
      return {
        predictedRequirementId: null,
        predictedRequirementName: "Unknown",
        confidence: 0,
        explanation: "AI returned invalid requirement ID",
        matchesExpected: false,
      };
    }

    return {
      predictedRequirementId: predictedId || null,
      predictedRequirementName: result.predictedRequirementName || "Unknown",
      confidence: Math.max(0, Math.min(100, Number(result.confidence) || 0)),
      explanation: result.explanation || "No explanation provided",
      matchesExpected: Boolean(result.matchesExpected),
    };
  }

  private validateExtractionResult(result: any): ExtractionResult {
    const fields: ExtractedField[] = [];

    if (Array.isArray(result.fields)) {
      for (const field of result.fields) {
        if (field && typeof field.name === "string") {
          fields.push({
            name: field.name,
            value:
              field.value !== undefined && field.value !== null ? field.value : null,
            confidence: Math.max(0, Math.min(100, Number(field.confidence) || 0)),
            missing: Boolean(field.missing),
          });
        }
      }
    }

    return {
      fields,
      missingFields: Array.isArray(result.missingFields)
        ? result.missingFields.filter((f: any) => typeof f === "string")
        : [],
    };
  }
}

/**
 * Mock Provider for Testing/Development
 */
export class MockAIProvider implements AIProvider {
  private delay = 500;

  async classify(
    text: string,
    expectedRequirementId: string | null,
    availableRequirements: RequirementOption[]
  ): Promise<ClassificationResult> {
    await new Promise((r) => setTimeout(r, this.delay));

    // Simple keyword-based mock classification
    const lowerText = text.toLowerCase();
    let predictedId = null;
    let confidence = 30;

    if (lowerText.includes("occupancy certificate") || lowerText.includes("fire approval")) {
      predictedId = "REQ_OCCUPANCY_CERTIFICATE";
      confidence = 85;
    } else if (lowerText.includes("company registration") || lowerText.includes("certificate of incorporation")) {
      predictedId = "REQ_COMPANY_REGISTRATION";
      confidence = 85;
    } else if (lowerText.includes("architect") && (lowerText.includes("certificate") || lowerText.includes("compliance"))) {
      predictedId = "REQ_ARCHITECT_CERTIFICATE";
      confidence = 80;
    } else if (lowerText.includes("raw material") || lowerText.includes("solvent") || lowerText.includes("fuel")) {
      predictedId = "REQ_RAW_MATERIALS";
      confidence = 75;
    } else if (lowerText.includes("finished good") || lowerText.includes("product inventory")) {
      predictedId = "REQ_FINISHED_GOODS";
      confidence = 75;
    } else if (lowerText.includes("activity") || lowerText.includes("operation") || lowerText.includes("process")) {
      predictedId = "REQ_ACTIVITY_NOTE";
      confidence = 70;
    } else if (lowerText.includes("architectural drawing") || lowerText.includes("floor plan")) {
      predictedId = "REQ_ARCHITECTURAL_DRAWINGS";
      confidence = 70;
    } else if (lowerText.includes("block plan") || lowerText.includes("site plan")) {
      predictedId = "REQ_BLOCK_PLAN";
      confidence = 70;
    } else if (lowerText.includes("fire protection") || lowerText.includes("hydrant") || lowerText.includes("sprinkler")) {
      predictedId = "REQ_EXISTING_FIRE_PROTECTION";
      confidence = 75;
    } else if (lowerText.includes("pesco") || lowerText.includes("mpcb") || lowerText.includes("dish") || lowerText.includes("explosive")) {
      predictedId = "REQ_HAZARDOUS_APPROVALS";
      confidence = 80;
    } else if (lowerText.includes("process flow") || lowerText.includes("flow chart")) {
      predictedId = "REQ_PROCESS_FLOW_CHART";
      confidence = 75;
    } else if (lowerText.includes("civil aviation") || lowerText.includes("aai") || lowerText.includes("height clearance")) {
      predictedId = "REQ_CIVIL_AVIATION_NOC";
      confidence = 80;
    } else if (lowerText.includes("application") && lowerText.includes("letterhead")) {
      predictedId = "REQ_APPLICATION_LETTER";
      confidence = 70;
    }

    const expectedMatch = predictedId === expectedRequirementId;

    return {
      predictedRequirementId: predictedId,
      predictedRequirementName:
        availableRequirements.find((r) => r.id === predictedId)?.name || "Unknown",
      confidence,
      explanation: predictedId
        ? `Mock classification based on keyword matching. ${expectedMatch ? "Matches expected." : "Does not match expected."}`
        : "No clear document type detected",
      matchesExpected: expectedMatch,
    };
  }

  async extract(
    text: string,
    requirementId: string,
    requirementName: string,
    requirementDescription: string
  ): Promise<ExtractionResult> {
    await new Promise((r) => setTimeout(r, this.delay));

    const lowerText = text.toLowerCase();
    const fields: ExtractedField[] = [];

    // Mock extraction based on requirement type
    switch (requirementId) {
      case "REQ_OCCUPANCY_CERTIFICATE":
        fields.push(
          { name: "buildingName", value: this.extractPattern(text, /building\s*[:\-]\s*([^\n]+)/i) || null, confidence: 70, missing: !lowerText.includes("building") },
          { name: "certificateNumber", value: this.extractPattern(text, /(?:certificate|ref|no)[\s\.:]*([A-Z0-9\-\/]+)/i) || null, confidence: 65, missing: true },
          { name: "issueDate", value: this.extractPattern(text, /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/) || null, confidence: 60, missing: true }
        );
        break;

      case "REQ_COMPANY_REGISTRATION":
        fields.push(
          { name: "companyName", value: this.extractPattern(text, /(?:company|firm|society)[\s\:]*([^\n]+)/i) || null, confidence: 70, missing: !lowerText.includes("company") && !lowerText.includes("firm") },
          { name: "registrationNumber", value: this.extractPattern(text, /(?:cin|reg|registration)[\s\:]*([A-Z0-9]+)/i) || null, confidence: 65, missing: true }
        );
        break;

      case "REQ_ARCHITECT_CERTIFICATE":
        fields.push(
          { name: "architectName", value: this.extractPattern(text, /architect[\s\:]*([^\n]+)/i) || null, confidence: 70, missing: true },
          { name: "registrationNumber", value: this.extractPattern(text, /(?:coa|reg)[\s\:]*([A-Z0-9\/]+)/i) || null, confidence: 65, missing: true }
        );
        break;

      case "REQ_RAW_MATERIALS":
      case "REQ_FINISHED_GOODS":
        // Try to find table-like data
        const items = this.extractListItems(text);
        fields.push(
          { name: "items", value: items.length > 0 ? JSON.stringify(items) : null, confidence: 50, missing: items.length === 0 }
        );
        break;

      default:
        fields.push(
          { name: "keyInformation", value: text.slice(0, 500) || null, confidence: 40, missing: text.length === 0 }
        );
    }

    return {
      fields,
      missingFields: fields.filter((f) => f.missing).map((f) => f.name),
    };
  }

  private extractPattern(text: string, regex: RegExp): string | null {
    const match = text.match(regex);
    return match ? match[1]?.trim() || match[0]?.trim() : null;
  }

  private extractListItems(text: string): any[] {
    const items: any[] = [];
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim().match(/^[\-\•\*]\s+/) || line.match(/^\d+\.\s+/)) {
        items.push({ raw: line.trim() });
      }
    }
    return items.slice(0, 10);
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * Factory function to create AI provider from environment
 */
export function createAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || "mock";

  if (providerType === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new GoogleProvider({
      provider: "google",
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: process.env.AI_MODEL || "gemini-3.8-flash",
      temperature: Number(process.env.AI_TEMPERATURE) || 0.1,
      maxTokens: Number(process.env.AI_MAX_TOKENS) || 2000,
    });
  }

  console.warn("Using Mock AI Provider. Set AI_PROVIDER=google and GOOGLE_GENERATIVE_AI_API_KEY for production.");
  return new MockAIProvider();
}

/**
 * Get available requirement options from the registry
 */
import { REQUIREMENTS_REGISTRY } from "../rules/ruleSet.js";

export function getAvailableRequirements(): RequirementOption[] {
  return Object.values(REQUIREMENTS_REGISTRY).map((req) => ({
    id: req.id,
    name: req.name,
    description: req.description,
    category: req.category,
    type: req.type,
  }));
}