import { IApplication, BuildingStatus, OccupancyCategory } from "../models/Application.js";
import {
  IRequirementDefinition,
  IRuleDefinition,
  IEvaluationResult,
} from "./types.js";

export const ACTIVE_RULESET_VERSION = "1.0.0";

// ─── Requirement Master Registry ─────────────────────────────────────────────
// Derived directly from "Information.docx - Steps for applying Fire Department NoC"
export const REQUIREMENTS_REGISTRY: Record<string, IRequirementDefinition> = {
  // Common Requirements (Rule D)
  REQ_APPLICATION_LETTER: {
    id: "REQ_APPLICATION_LETTER",
    name: "Application on Official Letterhead",
    description:
      "Application from the Individual/Company/Society on letterhead duly stamped and signed by authorized signatory or appointed Architect/Civil Engineer, indicating site address, Development Control Rules applicable, and nearest fire service station.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Application on letterhead",
    defaultReason: "Mandatory statutory application for all Fire NOC applicants",
  },
  REQ_ARCHITECTURAL_DRAWINGS: {
    id: "REQ_ARCHITECTURAL_DRAWINGS",
    name: "Architectural Drawings & Metric Plans",
    description:
      "Two sets of architectural drawings in metric system including Block Plan, Typical Floor Plan, Section & Elevation Plan, and floor-wise area calculation certificate duly signed by Architect/Civil Engineer.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Architectural Drawings in metric system",
    defaultReason: "Required for floor layout, escape routes, and FSI verification",
  },
  REQ_BLOCK_PLAN: {
    id: "REQ_BLOCK_PLAN",
    name: "Detailed Site Block Plan",
    description:
      "Site Block Plan showing road width, adjacent plot activities, main and secondary entrance widths, basement details, marginal spaces, and unobstructed approach roads for fire tender movement.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Block Plan of building",
    defaultReason: "Required to verify perimeter fire brigade vehicular access and marginal clearance",
  },
  REQ_ACTIVITY_NOTE: {
    id: "REQ_ACTIVITY_NOTE",
    name: "Brief Note on Building Activities",
    description:
      "Detailed descriptive note covering operations, occupancies, and specific activities conducted within the building premises.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Brief Note on Activities",
    defaultReason: "Establishes base occupancy hazard and risk assessment profile",
  },
  REQ_COMPANY_REGISTRATION: {
    id: "REQ_COMPANY_REGISTRATION",
    name: "Company / Society Registration & License",
    description:
      "Certified copy of registration certificate, trade license, or certificate of incorporation for the operating company or society.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Copy of Registration and License",
    defaultReason: "Proof of legal entity identity and site operational rights",
  },
  REQ_ARCHITECT_CERTIFICATE: {
    id: "REQ_ARCHITECT_CERTIFICATE",
    name: "Architect Compliance Certificate (NBC-2005)",
    description:
      "Certificate by Architect/Civil Engineer certifying that building plans conform with competent authority development control rules and National Building Code of India (NBC-2005) fire safety provisions.",
    category: "COMMON",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Architect/Civil Engineer Certificate",
    defaultReason: "Statutory structural and NBC-2005 fire safety compliance certification",
  },

  // Industrial Requirements (Rule A)
  REQ_RAW_MATERIALS: {
    id: "REQ_RAW_MATERIALS",
    name: "Raw Materials List & Storage Locations",
    description:
      "Detailed list of all raw materials (including consumable fuels, LPG, diesel, solvents) with their quantities, unit of measurement, and storage locations.",
    category: "INDUSTRIAL",
    type: "INFORMATION",
    required: true,
    sourceReference: "Information.docx - List of raw material & finish goods",
    defaultReason: "Applicable because occupancy category is Industrial; fire load assessment requires material and storage data",
  },
  REQ_FINISHED_GOODS: {
    id: "REQ_FINISHED_GOODS",
    name: "Finished Goods & Storage Inventory",
    description:
      "Inventory of manufactured or processed finished products, quantities, packaging types, and designated storage locations in the facility.",
    category: "INDUSTRIAL",
    type: "INFORMATION",
    required: true,
    sourceReference: "Information.docx - List of raw material & finish goods",
    defaultReason: "Applicable because occupancy category is Industrial; combustible loading calculation requires finished goods data",
  },
  REQ_PROCESS_FLOW_CHART: {
    id: "REQ_PROCESS_FLOW_CHART",
    name: "Manufacturing Process Flow Chart",
    description:
      "Process flow chart of the industrial plant duly certified by authorized person on company letterhead showing stages, thermal points, and chemical interactions.",
    category: "INDUSTRIAL",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Process flow chart of the plant",
    defaultReason: "Applicable because building is an Industrial facility; required to evaluate operational ignition risks",
  },

  // Existing Building Requirements (Rule B)
  REQ_EXISTING_FIRE_PROTECTION: {
    id: "REQ_EXISTING_FIRE_PROTECTION",
    name: "Existing Fire Prevention & Protection Measures",
    description:
      "Brief note and layout drawings of existing fire protection arrangements (hydrants, wet risers, sprinklers, alarms, extinguishers, and pump capacities).",
    category: "EXISTING_BUILDING",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Brief Note on Fire Prevention and Protection measures",
    defaultReason: "Applicable because building status is Existing; operational status of existing fire systems must be verified",
  },
  REQ_OCCUPANCY_CERTIFICATE: {
    id: "REQ_OCCUPANCY_CERTIFICATE",
    name: "Prior Occupancy Certificate & Fire Approval",
    description:
      "Copy of earlier Fire Approval and Occupancy Certificate issued by the competent planning authority along with approved drawing set.",
    category: "EXISTING_BUILDING",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Fire Approval and occupancy certificate",
    defaultReason: "Applicable because building is Existing; proof of prior authorized occupancy is required",
  },

  // Hazardous Materials (Rule C)
  REQ_HAZARDOUS_APPROVALS: {
    id: "REQ_HAZARDOUS_APPROVALS",
    name: "Government Agency Approvals for Hazardous Materials",
    description:
      "Statutory approval certificates from relevant government agencies (Chief Controller of Explosives - PESO/CCE, State Pollution Control Board - MPCB, DISH, FDA, or Gas Authority).",
    category: "HAZARDOUS_MATERIALS",
    type: "DOCUMENT",
    required: true,
    sourceReference: "Information.docx - Approvals taken from Govt. agencies",
    defaultReason: "Applicable because hazardous materials are present; statutory external agency clearances are mandatory",
  },

  // High-Rise Building Safety (Rule - Supplementary from Information.docx)
  REQ_CIVIL_AVIATION_NOC: {
    id: "REQ_CIVIL_AVIATION_NOC",
    name: "Civil Aviation Authority (AAI) NOC",
    description:
      "Height clearance No Objection Certificate from Directorate General of Civil Aviation / Airports Authority of India if building falls in proximity to aerodrome surfaces.",
    category: "BUILDING_SAFETY",
    type: "DOCUMENT",
    required: false,
    sourceReference: "Information.docx - In case of high rise building falling around airport",
    defaultReason: "Applicable conditionally for high-rise buildings requiring aerodrome elevation clearance",
  },
};

// ─── Centralized Rule Definitions ─────────────────────────────────────────────
export const RULES_CATALOG: IRuleDefinition[] = [
  {
    id: "RULE_COMMON",
    name: "Standard Fire Safety Requirements",
    description:
      "Common statutory baseline documentation required for all building NOC applications under Fire Services regulations.",
    version: ACTIVE_RULESET_VERSION,
    enabled: true,
    sourceReference: "Information.docx - Documents Required for Obtaining Fire Approval",
    applicableReason: "Mandatory standard documentation applicable to every Fire NOC application",
    condition: {
      evaluate: () => true, // Applies to every application
    },
    requirementIds: [
      "REQ_APPLICATION_LETTER",
      "REQ_ARCHITECTURAL_DRAWINGS",
      "REQ_BLOCK_PLAN",
      "REQ_ACTIVITY_NOTE",
      "REQ_COMPANY_REGISTRATION",
      "REQ_ARCHITECT_CERTIFICATE",
    ],
  },
  {
    id: "RULE_INDUSTRIAL",
    name: "Industrial Facility Fire Scrutiny Requirements",
    description:
      "Requires detailed inventory of raw materials, finished products, their storage locations, and process flow chart for industrial facilities.",
    version: ACTIVE_RULESET_VERSION,
    enabled: true,
    sourceReference: "Information.docx - If it is a Industrial or storage building",
    applicableReason: "Triggered because building occupancy category is INDUSTRIAL",
    condition: {
      field: "buildingDetails.occupancyCategory",
      operator: "EQUALS",
      evaluate: (app: IApplication) =>
        app.buildingDetails?.occupancyCategory === OccupancyCategory.INDUSTRIAL,
    },
    requirementIds: [
      "REQ_RAW_MATERIALS",
      "REQ_FINISHED_GOODS",
      "REQ_PROCESS_FLOW_CHART",
    ],
  },
  {
    id: "RULE_EXISTING_BUILDING",
    name: "Existing Structure Audit & Compliance Requirements",
    description:
      "Requires documentation of existing fire protection systems and copies of previous occupancy certificates for already constructed buildings.",
    version: ACTIVE_RULESET_VERSION,
    enabled: true,
    sourceReference: "Information.docx - in case of existing building",
    applicableReason: "Triggered because building status is EXISTING",
    condition: {
      field: "buildingDetails.buildingStatus",
      operator: "EQUALS",
      evaluate: (app: IApplication) =>
        app.buildingDetails?.buildingStatus === BuildingStatus.EXISTING,
    },
    requirementIds: [
      "REQ_EXISTING_FIRE_PROTECTION",
      "REQ_OCCUPANCY_CERTIFICATE",
    ],
  },
  {
    id: "RULE_HAZARDOUS_MATERIALS",
    name: "Hazardous & Regulated Materials Approval Documentation",
    description:
      "Requires copies of regulatory approvals from specialized government authorities (e.g., PESO/CCE, MPCB, DISH) when hazardous substances are present.",
    version: ACTIVE_RULESET_VERSION,
    enabled: true,
    sourceReference: "Information.docx - If handling, processed or storage of any materials which requires permission from Govt. Agencies",
    applicableReason: "Triggered because application marks hazardous materials as present",
    condition: {
      field: "buildingDetails.hasHazardousMaterials",
      operator: "EQUALS",
      evaluate: (app: IApplication) =>
        Boolean(app.buildingDetails?.hasHazardousMaterials),
    },
    requirementIds: ["REQ_HAZARDOUS_APPROVALS"],
  },
  {
    id: "RULE_HIGH_RISE",
    name: "High-Rise Building Aviation Clearance",
    description:
      "Requires civil aviation clearance documentation for buildings categorized as high-rise structures.",
    version: ACTIVE_RULESET_VERSION,
    enabled: true,
    sourceReference: "Information.docx - In case of high rise building falling around airport",
    applicableReason: "Triggered because building is designated as a High-Rise structure",
    condition: {
      field: "buildingDetails.isHighRise",
      operator: "EQUALS",
      evaluate: (app: IApplication) =>
        Boolean(app.buildingDetails?.isHighRise),
    },
    requirementIds: ["REQ_CIVIL_AVIATION_NOC"],
  },
];

// ─── Deterministic Rule Evaluation Function ──────────────────────────────────
/**
 * Evaluates an application's saved data against the active rule catalog.
 * Returns a deterministic, deduplicated set of applicable requirements
 * with rule references and applicability reasons.
 */
export function evaluateApplicationRules(
  application: IApplication
): IEvaluationResult {
  const evaluatedAt = new Date();
  const applicableRules: {
    ruleId: string;
    ruleName: string;
    applicableReason: string;
  }[] = [];

  // Map to deduplicate requirements while aggregating rule references
  const requirementMap = new Map<
    string,
    {
      requirement: IRequirementDefinition;
      ruleReferences: Set<string>;
      applicableReasons: string[];
    }
  >();

  // Process rules in stable, deterministic order
  for (const rule of RULES_CATALOG) {
    if (!rule.enabled) continue;

    let matches = false;
    try {
      matches = rule.condition.evaluate(application);
    } catch (err) {
      console.error(`Rule evaluation error for rule ${rule.id}:`, err);
      matches = false;
    }

    if (matches) {
      applicableRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        applicableReason: rule.applicableReason,
      });

      for (const reqId of rule.requirementIds) {
        const reqDef = REQUIREMENTS_REGISTRY[reqId];
        if (!reqDef) continue;

        if (!requirementMap.has(reqId)) {
          requirementMap.set(reqId, {
            requirement: reqDef,
            ruleReferences: new Set([rule.id]),
            applicableReasons: [rule.applicableReason],
          });
        } else {
          const entry = requirementMap.get(reqId)!;
          entry.ruleReferences.add(rule.id);
          if (!entry.applicableReasons.includes(rule.applicableReason)) {
            entry.applicableReasons.push(rule.applicableReason);
          }
        }
      }
    }
  }

  // Convert map to deterministic array (ordered by registry insertion)
  const requirements = Array.from(requirementMap.values()).map((entry) => ({
    requirement: entry.requirement,
    ruleReferences: Array.from(entry.ruleReferences),
    applicableReason: entry.applicableReasons.join("; "),
  }));

  return {
    ruleSetVersion: ACTIVE_RULESET_VERSION,
    evaluatedAt,
    applicableRules,
    requirements,
  };
}
