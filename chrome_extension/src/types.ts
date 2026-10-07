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

export type WizardStep = "SETUP" | "B1" | "V1" | "V2" | "V3" | "FINAL";

export type FrameworkType = "PICO" | "PICOS" | "SPIDER" | "Custom";

export interface ResearchProfile {
  id: string;
  name: string;
  description: string;
  researchQuestions: string[];
  reviewType: ReviewType;
  framework?: FrameworkType;
  frameworkFields?: Record<string, string>;
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
  protocolVersion?: string;
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
  literatureGroup?: "direct" | "supporting" | "foundational" | string;
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
  protocolVersion?: string;
  isPaywalled?: boolean;
  v2Decision?: "PassToFullText" | "Exclude" | "Unsure";
  v3Decision?: "Include" | "Exclude" | "Unsure";

  // Provenance & Du lieu bo sung tu tab dang mo / PDF
  pdfUrl?: string;
  extracted_url?: string;
  extracted_at?: string;
  extraction_method?: string;
  evidence_snippets?: EvidenceSnippet[];
  page_count?: number;
  user_verified?: boolean;

  sourceMetadataVerified?: boolean;
  verificationMethod?: string;
  sourceUrl?: string;

  // Full-text retrieval & assessment status
  fullTextStatus?:
    | "finding"
    | "downloaded"
    | "not_found"
    | "paywalled"
    | "network_error"
    | "corrupted_file"
    | "scanned_image_pdf"
    | "extraction_failed"
    | "confirmed_unretrievable";
  fullTextAssessed?: boolean;
  v3EvidenceMissing?: boolean;
  mergeHistory?: {
    mergedFromId: string;
    mergedAt: string;
    title: string;
    source: string;
  }[];

  // Mô hình nghiên cứu & Đóng góp học thuật
  modelContribution?: string[];
  conceptLabels?: string[];
  literatureGroup?: "direct" | "supporting" | "foundational" | string;
}

export interface SuspectedDuplicatePair {
  id: string;
  primaryRecord: PaperRecord;
  duplicateRecord: PaperRecord;
  similarity: number;
  status: "pending" | "merged" | "kept_separate";
  reason: string;
}

export interface SourceStatusInfo {
  name: string;
  category: "free" | "key_required" | "file_only";
  status: "ready" | "needs_key" | "not_configured" | "file_supported" | "error_quota";
  description: string;
  canSearch: boolean;
  isFree: boolean;
  notes?: string;
}

export interface ProtocolDiff {
  oldVersion: string;
  newVersion: string;
  changeReason: string;
  isScopeChange: boolean;
  changes: { field: string; oldValue: any; newValue: any }[];
  affectedQueriesCount: number;
  affectedV2Count: number;
  affectedV3Count: number;
  reusableAssetsCount: number;
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

// -------------------------------------------------------------
// Collector & Preliminary Filtering (L0 - L3) Scope Types
// -------------------------------------------------------------

export type CollectorStage = "COLLECTIONS" | "SEARCH" | "COLLECTOR" | "FILTERING" | "EXPORT";

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  researchQuestions?: string[];
  picoNotes?: string;
  createdAt: string;
  updatedAt: string;
  rawRecordCount?: number;
  uniqueRecordCount?: number;
  suspectedDuplicateGroupCount?: number;
  filterRunCount?: number;
  searchRunCount?: number;
}

export interface DataQualityFlags {
  missing_title: boolean;
  missing_abstract: boolean;
  missing_year: boolean;
  missing_doi: boolean;
  missing_fulltext: boolean;
  needs_data_review: boolean;
}

export interface RetrievalEvent {
  eventId: string;
  source: string;
  sourceRecordId?: string;
  query: string;
  retrievedAt: string;
  collectionMethod: "api" | "import_csv" | "import_ris" | "import_bibtex" | "snowballing";
}

export interface NormalizedRecord {
  id: string;
  collectionId: string;
  source: string;
  sourceRecordId?: string;
  title: string;
  normalizedTitle: string;
  authors?: string;
  year?: string;
  publicationDate?: string;
  venue?: string;
  publisher?: string;
  doi?: string;
  abstract?: string;
  landingPageUrl?: string;
  openAccessPdfUrl?: string;
  documentType?: string;
  language?: string;
  rawPayload?: Record<string, unknown>;
  retrievalEvents: RetrievalEvent[];
  qualityFlags: DataQualityFlags;
  canonicalRecordId?: string;
  duplicateGroupId?: string;
}

export interface CanonicalRecord {
  id: string;
  collectionId: string;
  primaryDoi?: string;
  title: string;
  normalizedTitle: string;
  authors?: string;
  year?: string;
  publicationDate?: string;
  venue?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  abstract?: string;
  landingPageUrl?: string;
  openAccessPdfUrl?: string;
  documentType?: string;
  language?: string;
  mergedRecordIds: string[];
  sources: string[];
  retrievalEvents: RetrievalEvent[];
  qualityFlags: DataQualityFlags;
  metadataFilterStatus?: "PASS" | "FAIL" | "UNKNOWN";
  filterReasons?: string[];
  keywordStatus?: "MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA" | "EXCLUSION_TERM_HIT";
  matchedTerms?: string[];
  matchedSnippets?: Array<{ term: string; field: "title" | "abstract"; snippet: string }>;
  isPreprint?: boolean;
}

export interface SuspectedDuplicateGroup {
  id: string;
  collectionId: string;
  canonicalTitle: string;
  recordIds: string[];
  similarityScore: number;
  status: "pending_review" | "merged" | "kept_separate";
  reviewedAt?: string;
  records?: NormalizedRecord[];
}

export interface MetadataFilterConfig {
  yearRange?: { start?: number; end?: number; enabled: boolean };
  languages?: { allowed: string[]; enabled: boolean };
  documentTypes?: { allowed: string[]; enabled: boolean };
}

export interface KeywordFilterConfig {
  mandatoryGroups: Array<{ id: string; terms: string[] }>;
  exclusionTerms: string[];
  scope: "title_only" | "title_abstract";
}

export interface FilterRun {
  id: string;
  collectionId: string;
  createdAt: string;
  metadataConfig?: MetadataFilterConfig;
  keywordConfig?: KeywordFilterConfig;
  version: number;
  totalRecordsEvaluated: number;
  passesCount: number;
  failsCount: number;
  unknownsCount: number;
  keywordMatchesCount: number;
  keywordExclusionsCount: number;
  recordsSummary?: Record<string, any>;
}

export interface CollectorJobProgress {
  jobId: string;
  collectionId: string;
  status: "queued" | "running" | "paused" | "completed" | "completed_with_errors" | "failed" | "cancelled";
  currentSource?: string;
  totalCollected: number;
  sourcesCompleted: string[];
  errors: Array<{ source: string; message: string; timestamp: string }>;
  sourcesStatus?: Record<string, { collected: number; error?: string; status: string }>;
}

