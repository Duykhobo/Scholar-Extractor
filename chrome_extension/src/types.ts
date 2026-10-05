export type ScreeningDecision = "Include" | "Exclude" | "Unsure";

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
  targetIncludedCount?: number;
  criteria: Criterion[];
  sourcePolicies: Record<string, SourcePolicy>;
  schemaVersion: string;
  profileVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileScreeningEvaluation {
  stage: ScreeningStage;
  suggestedDecision: ScreeningDecision;
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
  literatureGroup?: 'direct' | 'supporting' | 'foundational' | string;
}

export interface ResearchSession {
  sessionId: string;
  researchId: string;
  profileVersion: number;
  query: string;
  source: string;
  searchParams: Record<string, any>;
  records: PaperRecord[];
  totalReported: number;
  apiRequestsUsed: number;
  startOffset: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaperRecord {
  id: string;
  source: string;
  discoverySource: string;
  collectionMethod: string;
  title: string;
  authors: string;
  year: string;
  venue: string;
  doi: string;
  snippet: string;
  abstract: string;
  url: string;
  query: string;
  retrieval_date: string;
  search_id: string;

  // Provenance hồ sơ nghiên cứu
  researchId?: string;
  profileVersion?: number;
  sessionId?: string;

  uncertain_authors: boolean;
  uncertain_year: boolean;
  uncertain_venue: boolean;
  uncertain_doi: boolean;
  missing_abstract: boolean;

  potentialDuplicate?: boolean;
  duplicateOfId?: string;
  duplicateReason?: string;

  screeningStage: "V1" | "V2";
  matchedCriteria: string[];
  unknownCriteria?: string[];
  missingEvidence?: string[];
  suggestedDecision: ScreeningDecision;
  screeningReason: string;
  finalDecision: ScreeningDecision | "";
  userNotes: string;

  // Cờ báo hiệu quyết định thủ công được đưa ra theo phiên bản tiêu chí cũ
  isDecisionOutdated?: boolean;
  criterionResults?: CriterionEvaluationResult[];

  // Provenance & Du lieu bo sung tu tab dang mo / PDF
  pdfUrl?: string;
  extracted_url?: string;
  extracted_at?: string;
  extraction_method?: string;
  evidence_snippets?: EvidenceSnippet[];
  page_count?: number;
  user_verified?: boolean;

  // Mô hình nghiên cứu & Đóng góp học thuật
  modelContribution?: string[];
  conceptLabels?: string[];
  literatureGroup?: "direct" | "supporting" | "foundational" | string;
}

export interface EvidenceSnippet {
  type: "IC-I" | "IC-E" | "Other";
  term: string;
  context: string;
  page?: number | null;
  anchor?: string;
  section: "Methodology" | "Evaluation" | "Related Work" | "References" | "Unknown" | string;
  isValidEvidence: boolean;
  reason?: string;
}

export interface StructuredTable {
  id?: string;
  caption?: string;
  section?: string;
  anchor?: string;
  headers?: string[];
  cells?: string[];
  rawText: string;
}

export interface TabExtractedData {
  title?: string;
  authors?: string;
  year?: string;
  venue?: string;
  doi?: string;
  abstract?: string;
  pdfUrl?: string;
  sourceUrl: string;
  method: string;
  rawText?: string;
  pages?: { pageNum: number; text: string }[];
  pageCount?: number;
  isImagePdf?: boolean;
  tables?: StructuredTable[];
}

export interface TabAnalysisResult {
  extracted: TabExtractedData;
  isTitleMatch: boolean;
  titleMatchConfidence: number;
  titleMismatchWarning?: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
    willChange: boolean;
  }[];
  evidence: EvidenceSnippet[];
  suggestedScreeningUpdate?: {
    stage: "V1" | "V2";
    suggestedDecision: ScreeningDecision;
    matchedCriteria: string[];
    unknownCriteria: string[];
    missingEvidence: string[];
    screeningReason: string;
  };
  warnings: string[];
}

export interface DedupStats {
  initialCount: number;
  exactDupByDoi: number;
  potentialDupByTitle: number;
  totalRetained: number;
}

export interface SearchExecutionSummary {
  searchId: string;
  responseStatus: string;
  fromCache: boolean;
  cacheAge?: string | number;
  apiRequestsUsed: number;
  totalReportedResults: number;
  recordsCollectedThisPage: number;
  totalCollectedSoFar: number;
  totalUniqueSoFar: number;
  query: string;
  executedParams: Record<string, any>;
  timestamp: string;
}
