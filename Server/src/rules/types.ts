import { IApplication, BuildingStatus, OccupancyCategory } from "../models/Application.js";

export type RequirementType = "DOCUMENT" | "INFORMATION";

export type RequirementCategory =
  | "COMMON"
  | "INDUSTRIAL"
  | "EXISTING_BUILDING"
  | "HAZARDOUS_MATERIALS"
  | "BUILDING_SAFETY";

export interface IRequirementDefinition {
  id: string;
  name: string;
  description: string;
  category: RequirementCategory;
  type: RequirementType;
  required: boolean;
  sourceReference: string;
  defaultReason: string;
}

export interface IRuleCondition {
  field?: string;
  operator?: string;
  evaluate: (application: IApplication) => boolean;
}

export interface IRuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  sourceReference: string;
  applicableReason: string;
  condition: IRuleCondition;
  requirementIds: string[];
}

export interface IEvaluationResult {
  ruleSetVersion: string;
  evaluatedAt: Date;
  applicableRules: {
    ruleId: string;
    ruleName: string;
    applicableReason: string;
  }[];
  requirements: {
    requirement: IRequirementDefinition;
    ruleReferences: string[];
    applicableReason: string;
  }[];
}
