import { PicoStructure, ProtocolChangeRecord } from "../types";

export type ReviewType = "literature_review" | "systematic_review" | "scoping_review" | "custom";

export type CriterionKind = "inclusion" | "exclusion";

export type ScreeningStage = "metadata" | "title_abstract" | "full_text";

export type EvaluatorType =
  | "year_range"
  | "publication_type"
  | "language"
  | "page_count"
  | "full_text_availability"
  | "keyword_group"
  | "duplicate"
  | "manual_assessment"
  | "swt302_ep_bva";

export type CriterionStatus = "met" | "not_met" | "unknown";

export interface CriterionEvidence {
  snippet: string;
  source: string;
  page?: number | null;
  anchor?: string;
  field?: string;
}

export interface CriterionEvaluationResult {
  criterionId: string;
  status: CriterionStatus;
  reason: string;
  evidence?: CriterionEvidence[];
  evaluatorVersion: string;
}

export interface Criterion {
  id: string;
  label: string;
  description: string;
  kind: CriterionKind;
  required: boolean;
  stage: ScreeningStage;
  evaluator: EvaluatorType;
  parameters?: Record<string, any>;
  evidenceRequirements?: string;
}

export interface SourcePolicy {
  prismaRole: "primary" | "supplementary" | "excluded";
  notes?: string;
}

export interface SearchStringConfig {
  id: string;
  name: string;
  query: string;
  source?: string;
  isDefault?: boolean;
}

export interface ResearchProfile {
  id: string;
  name: string;
  description: string;
  researchQuestions: string[];
  reviewType: ReviewType;
  searchStrings: SearchStringConfig[];
  yearRange?: {
    start?: number;
    end?: number;
    enabled?: boolean;
  };
  languageRequirements?: string[];
  allowedPublicationTypes?: string[];
  minPageCount?: number;
  maxPageCount?: number;
  targetIncludedCount?: number; // Mục tiêu số lượng paper cuối cùng cho review (KHÔNG phải quota API)
  criteria: Criterion[];
  sourcePolicies: Record<string, SourcePolicy>;
  schemaVersion: string; // ví dụ "2.0.0"
  profileVersion: number; // số nguyên tăng dần mỗi khi sửa tiêu chí
  protocolVersion?: string; // ví dụ "1.0", "1.1"
  pico?: PicoStructure;
  protocolHistory?: ProtocolChangeRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileScreeningEvaluation {
  stage: ScreeningStage;
  suggestedDecision: "Include" | "Exclude" | "Unsure";
  profileId: string;
  profileVersion: number;
  evaluatorVersion: string;
  evaluatedAt: string;
  criterionResults: CriterionEvaluationResult[];
  matchedCriteria: string[];
  unknownCriteria: string[];
  missingEvidence: string[];
  screeningReason: string;
  isDecisionOutdated?: boolean;
  modelContributions?: string[];
  conceptLabels?: string[];
  literatureGroup?: "direct" | "supporting" | "foundational" | string;
}

export interface ResearchSession {
  sessionId: string;
  researchId: string;
  profileVersion: number;
  query: string;
  source: string;
  searchParams: Record<string, any>;
  records: any[];
  totalReported: number;
  apiRequestsUsed: number;
  startOffset: number;
  createdAt: string;
  updatedAt: string;
}
