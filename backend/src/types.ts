export interface ScholarSearchParams {
  engine?: "google_scholar";
  q: string;
  as_ylo?: number | string;
  as_yhi?: number | string;
  hl?: string;
  start?: number;
  num?: number;
}

export interface SerpApiSearchMetadata {
  id?: string;
  status?: string;
  json_endpoint?: string;
  created_at?: string;
  processed_at?: string;
  google_scholar_url?: string;
  raw_html_file?: string;
  total_time_taken?: number;
  from_cache?: boolean;
  cache_age?: string | number;
}

export interface SerpApiSearchInformation {
  total_results?: number;
  time_taken_displayed?: number;
  query_displayed?: string;
}

export interface SerpApiPublicationInfo {
  summary?: string;
  authors?: Array<{
    name: string;
    link?: string;
    author_id?: string;
    serpapi_scholar_link?: string;
  }>;
}

export interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  result_id?: string;
  link?: string;
  snippet?: string;
  publication_info?: SerpApiPublicationInfo;
  resources?: Array<{
    title?: string;
    file_format?: string;
    link?: string;
  }>;
  inline_links?: {
    serpapi_cite_link?: string;
    cited_by?: {
      total?: number;
      link?: string;
      cites_id?: string;
      serpapi_scholar_link?: string;
    };
    related_pages_link?: string;
    versions?: {
      total?: number;
      link?: string;
      cluster_id?: string;
      serpapi_scholar_link?: string;
    };
  };
}

export interface SerpApiRawResponse {
  search_metadata?: SerpApiSearchMetadata;
  search_parameters?: Record<string, any>;
  search_information?: SerpApiSearchInformation;
  organic_results?: SerpApiOrganicResult[];
  pagination?: {
    current?: number;
    next?: string;
    other_pages?: Record<string, string>;
  };
  error?: string;
}

export type LegacyScreeningDecision = "Include" | "Exclude" | "Unsure";

export interface PaperRecord {
  id: string; // generated unique id
  source: string; // 'Google Scholar'
  discoverySource: string; // 'Google Scholar'
  collectionMethod: string; // 'SerpApi'
  title: string;
  authors: string;
  year: string;
  venue: string;
  doi: string;
  snippet: string; // Luu ro snippet tu Scholar, khong coi la abstract
  abstract: string; // Khong tu y suy doan abstract tu snippet
  url: string;
  query: string;
  retrieval_date: string;
  search_id: string;

  // Cac co canh bao metadata chua chac chan can nguoi dung xac minh
  uncertain_authors: boolean;
  uncertain_year: boolean;
  uncertain_venue: boolean;
  uncertain_doi: boolean;
  missing_abstract: boolean;

  // De xuat trung lap (khong tu dong xoa neu khac DOI ma chi danh dau de nguoi dung xac nhan)
  potentialDuplicate?: boolean;
  duplicateOfId?: string;
  duplicateReason?: string;

  // Screening theo tieu chi IC-L/T/E/Y/P/I va EC-D/A/S/N/O
  screeningStage: "V1" | "V2" | "V3" | "B1" | string;
  pipelineStage?: PipelineStage;
  queryVersion?: string; // Q1, Q2, Q3 hoặc giữ nguyên giá trị gốc khi import
  matchedCriteria: string[];
  unknownCriteria?: string[];
  missingEvidence?: string[];
  suggestedDecision: LegacyScreeningDecision;
  screeningReason: string;
  finalDecision: LegacyScreeningDecision | "";
  userNotes: string;

  // Provenance & Du lieu bo sung tu tab dang mo / PDF / Nguon
  pdfUrl?: string;
  extracted_url?: string;
  extracted_at?: string;
  extraction_method?: string;
  evidence_snippets?: EvidenceSnippet[];
  page_count?: number;
  user_verified?: boolean;
  provenanceList?: SourceProvenance[];
  publicationType?: "journal-article" | "proceedings-article" | "proceedings" | "book" | "thesis" | "unknown" | string;
  isContainer?: boolean; // tập kỷ yếu, issue, book
  containerDoi?: string;
  parentPaperId?: string;
  childPapersCount?: number;
  v2Decision?: V2ScreeningDecision;
  v3Decision?: "Include" | "Exclude" | "Unsure";
  fullTextStatus?: FullTextStatus;
  isPaywalled?: boolean;

  // Mô hình nghiên cứu, Protocol & Đóng góp học thuật
  researchId?: string;
  sessionId?: string;
  profileVersion?: number;
  protocolVersion?: string;
  isDecisionOutdated?: boolean;
  isPdfVerified?: boolean;
  modelContribution?: string[]; // e.g. ['X', 'M', 'Y', 'H1', 'H2', 'H3', 'H4']
  conceptLabels?: string[]; // e.g. ['self-confidence (Primary Y)', 'self-esteem', 'self-efficacy']
  literatureGroup?: "direct" | "supporting" | "foundational" | string;
}

export interface EvidenceSnippet {
  type: "IC-I" | "IC-E" | "Other" | string;
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
    suggestedDecision: LegacyScreeningDecision;
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

export interface SearchLogPayload {
  query: string;
  searchId: string;
  method: string;
  params: Record<string, any>;
  apiTotalResults: number;
  uiTotalResults?: number;
  collectedCount: number;
  candidateCount: number;
  uniqueCount?: number; // Ho tro tuong thich neu client gui uniqueCount
  dedupStats: DedupStats;
  spotChecks: Array<{
    title: string;
    year: string;
    venue: string;
    doi: string;
    url: string;
  }>;
  retrievalDate: string;
  notes?: string;
}

export type PipelineStage = "B1" | "V1" | "V2" | "V3" | "FINAL";
export type V2ScreeningDecision = "PassToFullText" | "Exclude" | "Unsure";
export type FullTextStatus =
  | "finding"
  | "downloaded"
  | "not_found"
  | "paywalled"
  | "network_error"
  | "corrupted_file"
  | "scanned_image_pdf"
  | "extraction_failed"
  | "confirmed_unretrievable";

export interface SourceProvenance {
  source: string;
  sourceRecordId?: string;
  queryId?: string;
  queryVersion?: string; // Q1, Q2, Q3, etc.
  retrievedAt: string;
  method: string; // "api" | "serpapi" | "import_csv" | "import_bibtex" | "import_ris" | "active_tab" | "snowball_backward" | "snowball_forward" | "toc_expansion"
  url?: string;
  rawQuery?: string;
  actualQuery?: string;
  isEnrichmentOnly?: boolean;
  containerDoi?: string;
  parentPaperId?: string;
}

export interface SourceAdapterCapability {
  sourceName: string;
  canSearch: boolean;
  paginationType: "offset" | "cursor" | "page" | "none";
  canFilterYear: boolean;
  canEnrich: boolean;
  canFetchCitations: boolean;
  canFetchReferences: boolean;
  canDiscoverFullText: boolean;
  canImport: boolean;
  supportedImportFormats: ("csv" | "bibtex" | "ris")[];
  rateLimitPerMinute: number;
  requiresApiKey: boolean;
  isApiKeyConfigured: boolean;
  notes: string;
}

export interface DuplicateGroup {
  id: string;
  canonicalId: string;
  duplicateIds: string[];
  reason: string;
  rule: "exact_doi" | "title_exact" | "title_fuzzy" | "manual_group";
  userConfirmed?: boolean;
  createdAt: string;
}

export interface CanonicalPaper extends PaperRecord {
  allSources: string[];
  provenanceList: SourceProvenance[];
  mergedRecordIds: string[];
}

export interface FullTextRecordInfo {
  paperId: string;
  status: FullTextStatus;
  officialVenue?: string;
  officialVersion?: string;
  actualFullTextUrl?: string;
  actualVersionRead?: string;
  pdfChecksum?: string;
  pageCount?: number;
  downloadedAt?: string;
  extractionMethod?: string;
  ocrStatus?: "not_needed" | "performed" | "failed" | "unsupported";
  metadataMatchConfidence?: number;
  isPaywalled?: boolean;
  retrievalAttempts?: Array<{
    url: string;
    source: string;
    timestamp: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BackgroundJob {
  id: string;
  researchId: string;
  sessionId?: string;
  stage: PipelineStage;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  progress: number; // 0 to 100
  totalItems: number;
  processedItems: number;
  failedItems: number;
  message?: string;
  checkpoints?: Record<string, any>;
  errorLog?: string[];
  createdAt: string;
  updatedAt: string;
  config?: Record<string, any>;
}

export interface SnowballSeed {
  id: string;
  paperId: string;
  doi?: string;
  title: string;
  direction: "backward" | "forward";
  iteration: number;
  source: string;
  parentPaperId?: string;
  discoveredAt: string;
}

export interface PrismaDrilldownCell {
  count: number;
  paperIds: string[];
  notes?: string;
}

export interface PrismaData {
  // Identification
  databases: Record<string, PrismaDrilldownCell>;
  totalDatabaseRecords: PrismaDrilldownCell;
  otherMethods: Record<string, PrismaDrilldownCell>;
  totalOtherRecords: PrismaDrilldownCell;
  totalRawIdentified: PrismaDrilldownCell;

  // Duplicate & Pre-screening
  duplicatesRemoved: PrismaDrilldownCell;
  recordsMarkedContainers: PrismaDrilldownCell;
  recordsAfterDuplicates: PrismaDrilldownCell; // V1 output

  // Title/Abstract Screening (V2)
  screenedTitleAbstract: PrismaDrilldownCell;
  excludedTitleAbstract: PrismaDrilldownCell;
  excludedByReasonV2: Record<string, PrismaDrilldownCell>;
  passedToFullText: PrismaDrilldownCell;
  unsureTitleAbstract: PrismaDrilldownCell;

  // Full-Text Retrieval & Eligibility (V3)
  reportsSoughtForRetrieval: PrismaDrilldownCell;
  reportsNotRetrieved: PrismaDrilldownCell;
  reportsAssessedForEligibility: PrismaDrilldownCell;
  reportsPendingRetrieval?: PrismaDrilldownCell;
  excludedFullText: PrismaDrilldownCell;
  excludedByReasonV3: Record<string, PrismaDrilldownCell>;
  unsureFullText: PrismaDrilldownCell;

  // Included
  studiesIncluded: PrismaDrilldownCell;
  reportsIncluded: PrismaDrilldownCell;

  // Metadata
  isFinal: boolean;
  hasPending: boolean;
  generatedAt: string;
}

export interface EvidenceTableRow {
  id: string;
  index: number;
  paperText: string;
  title: string;
  year: number | string;
  venue: string;
  doi: string;
  toolOrModel: string;
  dataset: string;
  metric: string;
  result: string;
  codeUrl: string;
  limitations: string;
  nearRq: string;
  provenance: string;
}

export interface PicoStructure {
  population?: string;
  intervention?: string;
  comparator?: string; // Optional / N/A
  outcome?: string;
  framework?: "PICO" | "PICOS" | "SPIDER" | "CUSTOM";
}

export interface ProtocolChangeRecord {
  id: string;
  protocolVersion: string;
  previousVersion?: string;
  changedBy: string;
  timestamp: string;
  reason: string;
  changeType: "wording" | "scope_change";
  impactScope: Array<"RQ" | "query" | "filter" | "IC_EC" | "screening" | "evidence_extraction">;
  diffSummary: string;
  requiresRerun: boolean;
  status: "approved" | "pending_review";
}

export interface SearchExecutionRecord {
  searchRunId?: string;
  researchId: string;
  sessionId?: string;
  jobId?: string;
  protocolVersion?: string;
  queryVersion?: string; // Q1, Q2, Q3
  requestedSource: string;
  actualSource: string;
  fallbackReason?: string;
  literalQuery?: string;
  actualApiQuery: string;
  searchFields?: string;
  filters: Record<string, any>;
  syntaxNotes?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  pagesProcessed: number;
  stopCondition?: string;
  reportedResults: number;
  actualReceivedRecords: number;
  newDiscoveryRecords: number;
  newCanonicalRecords: number;
  status: "completed" | "partial" | "failed" | "cancelled";
  errors?: string[];
  retryCount?: number;
  dataSnapshotId?: string;
  timestamp?: string;
}

export interface SnowballExecutionRecord {
  runId: string;
  researchId: string;
  seedDoiOrId: string;
  seedTitle: string;
  direction: "backward" | "forward" | "both";
  iteration: number;
  source: string;
  relationsReceived: number;
  newPapersFound: number;
  stopCondition: string;
  errors?: string[];
  timestamp: string;
}

// ==========================================
// MÔ HÌNH DỮ LIỆU CÔNG CỤ CHỈ THU THẬP (COLLECTOR-ONLY)
// ==========================================

export interface Collection {
  id: string;
  name: string;
  description?: string;
  notes?: string; // Ghi chú tùy chọn (RQ, PICO, bối cảnh nghiên cứu)
  createdAt: string;
  updatedAt: string;
}

export type SearchRunStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export interface SearchRun {
  id: string;
  collectionId: string;
  source: string;
  userQuery: string;
  actualQuery: string;
  filters: {
    yearStart?: number;
    yearEnd?: number;
    documentType?: string;
    maxResults?: number;
    [key: string]: any;
  };
  status: SearchRunStatus;
  progressPercent?: number;
  totalReported?: number;
  itemsReceived: number;
  itemsSaved: number;
  itemsError: number;
  checkpoint?: {
    cursor?: string;
    offset?: number;
    page?: number;
    lastProcessedId?: string;
  };
  startedAt: string;
  completedAt?: string;
  errorLog: string[];
  searchUrl?: string;
  totalFoundSource?: number;
  importedCount?: number;
  failedCount?: number;
  executedAt?: string;
  executedBy?: string;
}

export interface NormalizedRecord {
  id: string;
  collectionId?: string;
  searchRunId?: string;
  title: string;
  authors: string;
  year: string;
  publicationDate?: string;
  abstract: string;
  doi: string;
  venue: string;
  publisher?: string;
  documentType?: string;
  language?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  source: string;
  sourceRecordId: string;
  landingPageUrl: string;
  openAccessPdfUrl?: string;
  citationCount?: number;
  retrievedAt: string;
  rawPayload?: any; // Giữ nguyên payload gốc
}

export interface RetrievalEvent {
  id: string;
  recordId: string;
  collectionId: string;
  searchRunId: string;
  source: string;
  retrievedAt: string;
  rawQuery: string;
  actualQuery: string;
  rawData?: any;
}

export interface SnowballConfig {
  seeds: string[]; // DOI, URL, hoặc ID
  direction: "backward" | "forward" | "both";
  maxDepth: number;
  maxPapersPerSeed: number;
  source?: string;
}

// ==========================================
// CÁC CẤP ĐỘ LỌC SƠ BỘ DỮ LIỆU (L0 - L3)
// ==========================================

// L0: Chuẩn hóa & Gắn cờ chất lượng dữ liệu
export interface DataQualityFlags {
  missing_title: boolean;
  missing_abstract: boolean;
  missing_year: boolean;
  missing_doi: boolean;
  missing_fulltext: boolean;
  needs_data_review: boolean; // Không tiêu đề và không định danh
}

// L1: Nhóm trùng nghi ngờ (chờ người dùng xác nhận Merge hoặc Keep separate)
export interface SuspectedDuplicateGroup {
  id: string;
  collectionId: string;
  title: string;
  year?: string;
  similarity: number;
  recordIds: string[];
  canonicalRecordId?: string;
  resolution: "unresolved" | "merged" | "separated";
  resolvedAt?: string;
}

// L1: Canonical Record (đại diện cho bài báo sau khi gộp trùng chắc chắn hoặc người dùng merge)
export interface CanonicalRecord extends NormalizedRecord {
  displayId?: string;
  normalizedTitle?: string;
  version?: string;
  docType?: string;
  url?: string;
  searchOccurrences?: SearchOccurrence[];
  isContainer?: boolean;
  containerId?: string;
  childRecordIds?: string[];
  createdAt?: string;
  mergedRecordIds: string[];
  duplicateGroupId?: string;
  sourcesList: string[];
  qualityFlags: DataQualityFlags;
  // Kết quả lọc L2 & L3 mới nhất
  latestFilterResult?: {
    filterRunId: string;
    metadataStatus: "PASS" | "FAIL" | "UNKNOWN";
    metadataReasons: string[];
    keywordStatus?: "MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA";
    hasExclusionHit?: boolean;
    matchedTerms?: string[];
    matchedFields?: string[];
  };
}

// L2: Cấu hình lọc điều kiện khách quan
export interface MetadataFilterConfig {
  yearRange?: {
    enabled: boolean;
    start?: number;
    end?: number;
  };
  language?: {
    enabled: boolean;
    allowedLanguages: string[]; // e.g. ["en", "english"]
  };
  documentType?: {
    enabled: boolean;
    allowedTypes: string[]; // e.g. ["journal-article", "proceedings-article", "review", "preprint", "thesis"]
  };
}

export type MetadataConditionStatus = "PASS" | "FAIL" | "UNKNOWN";

export interface MetadataEvaluationResult {
  recordId: string;
  overallStatus: "PASS" | "FAIL" | "UNKNOWN";
  reasons: string[];
  details: {
    yearStatus?: MetadataConditionStatus;
    languageStatus?: MetadataConditionStatus;
    typeStatus?: MetadataConditionStatus;
  };
}

// L3: Cấu hình kiểm tra từ khóa trên title / abstract
export interface KeywordGroup {
  id: string;
  name: string;
  terms: string[]; // Nối bằng OR trong cùng nhóm
}

export interface KeywordFilterConfig {
  version: string;
  groups: KeywordGroup[]; // Các nhóm nối bằng AND
  exclusionTerms: string[];
  scope: "title" | "title_abstract";
}

export type KeywordStatus = "MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA";

export interface KeywordEvaluationResult {
  recordId: string;
  status: KeywordStatus;
  hasExclusionHit: boolean;
  matchedTerms: string[];
  matchedFields: string[];
  snippets: string[];
  exclusionMatches: string[];
}

// Bản ghi lưu tiến trình và snapshot mỗi lần chạy L2 / L3
export interface FilterRun {
  id: string;
  collectionId: string;
  version: string;
  timestamp: string;
  filterType: "L2_metadata" | "L3_keyword" | "combined";
  metadataConfig?: MetadataFilterConfig;
  keywordConfig?: KeywordFilterConfig;
  totalEvaluated: number;
  counts: {
    pass?: number;
    fail?: number;
    unknown?: number;
    keywordMatch?: number;
    keywordNoMatch?: number;
    keywordInsufficient?: number;
    exclusionHit?: number;
  };
  recordResults: Record<
    string,
    {
      metadataStatus?: "PASS" | "FAIL" | "UNKNOWN";
      metadataReasons?: string[];
      keywordStatus?: KeywordStatus;
      hasExclusionHit?: boolean;
      matchedTerms?: string[];
    }
  >;
}

// ==========================================
// MÔ HÌNH DỮ LIỆU ĐA DỰ ÁN LITERATURE REVIEW (PROJECT -> EXPORT)
// ==========================================

export type FrameworkType = "PICO" | "PICOS" | "SPIDER" | "Custom" | "None";

export interface PicoConfig {
  population?: string;
  intervention?: string;
  comparison?: string;
  outcome?: string;
  customFields?: Record<string, string>;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  role: string; // e.g. "Lead Reviewer", "Reviewer", "Data Extractor"
  assignedSources: string[]; // e.g. ["ACM Digital Library", "IEEE Xplore"]
  isReviewer: boolean;
  isExtractor: boolean;
  plannedAuthorOrder?: number;
  confirmedFinalDraft?: boolean;
}

export interface Criterion {
  id: string;
  code: string; // e.g. "IC-L", "IC-T", "IC-E", "IC-Y", "IC-P", "IC-I", "EC-D", "EC-A", "EC-S", "EC-N", "EC-O"
  name: string;
  description: string;
  kind: "inclusion" | "exclusion";
  stage: "v1" | "v2" | "both";
  evidenceRequirements?: string;
  evaluationMethod: "auto" | "suggested" | "manual";
  isActive: boolean;
}

export interface ProtocolVersion {
  version: string; // "v1.0", "v1.1", "v2.0"
  projectId: string;
  title: string;
  description?: string;
  reasonForChange?: string;
  changeReason?: string;
  createdBy?: string;
  createdAt: string;
  criteria: Criterion[];
  sourcePolicies: Record<string, { role: "primary" | "supplementary" | "excluded"; notes?: string }>;
}

export interface QueryBlock {
  block: "P" | "I" | "C" | "O" | "custom";
  blockName?: string;
  keywords: string[];
  synonyms: Record<string, string[]>;
}

export interface QueryVersion {
  id: string;
  projectId: string;
  versionTag: string; // "V1", "V2", "V3"
  rawQuery: string;
  targetDatabase: string;
  searchFields?: string; // e.g. "AllField", "Title/Abstract"
  filtersApplied?: Record<string, any>;
  expansionRuleApplied?: string; // e.g. "<20 kết quả: bỏ khối O"
  createdAt: string;
}

export interface SearchOccurrence {
  id: string;
  canonicalId: string;
  searchRunId: string;
  source: string;
  sourceRecordId?: string;
  queryVersionTag?: string;
  rawPayload?: any;
  retrievedAt: string;
}

export interface DuplicateCandidate {
  id: string;
  projectId: string;
  recordIdA: string;
  recordIdB: string;
  similarity: number;
  reason: string;
  status: "unresolved" | "merged" | "separated";
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ScreeningDecision {
  recordId: string;
  projectId: string;
  protocolVersion: string;
  stage: "v1" | "v2";
  decision: "PENDING" | "INCLUDE" | "EXCLUDE" | "UNSURE";
  primaryReason?: string;
  primaryReasonCode?: string;
  secondaryReasons?: string[];
  reasonText?: string;
  notes?: string;
  decidedBy?: string;
  decidedAt?: string;
  isOutdated?: boolean; // Đánh dấu khi protocol thay đổi
}

export interface FullTextAttempt {
  id: string;
  recordId: string;
  projectId: string;
  status: "NOT_ATTEMPTED" | "FOUND" | "UNAVAILABLE";
  url?: string;
  source?: string;
  version?: string; // "Published", "Author Preprint", "Repository"
  pageCount?: number;
  isImagePdf?: boolean;
  notes?: string;
  attemptedAt: string;
  attemptedBy?: string;
}

export interface EvidenceCitation {
  field: string;
  sourceUrl?: string;
  page?: string;
  section?: string;
  tableOrFigure?: string;
  snippet?: string;
  verifiedStatus: "unverified" | "verified" | "insufficient_evidence";
}

export interface EvidenceEntry {
  id: string;
  recordId: string; // Liên kết canonical displayId (ví dụ "R55")
  projectId: string;
  paperDisplay: string; // Tên + năm + venue + DOI
  toolOrLlm: string; // Tool/LLM
  dataset: string; // Dataset
  metric: string; // Metric
  result: string; // Kết quả (số THẬT đọc từ bài)
  code: string; // Link code / replication
  limitations: string; // Hạn chế
  nearRq: string; // Gần RQ (e.g. "2/4 — P,O")
  nearRqBreakdown?: {
    p: boolean;
    i: boolean;
    c: boolean;
    o: boolean;
    explanation?: string;
  };
  citations: EvidenceCitation[];
  enteredBy?: string;
  enteredAt?: string;
}

export interface SnowballingLink {
  id: string;
  projectId: string;
  seedRecordId: string;
  direction: "backward" | "forward";
  round: number;
  source: string;
  discoveredRecordId: string;
  citationRelation: string;
  performedBy?: string;
  performedAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  timestamp: string;
  eventType: string; // "PROTOCOL_CHANGE", "DECISION_UPDATE", "MERGE_RECORD", "IMPORT_CSV", etc.
  userId?: string;
  details: Record<string, any>;
}

export interface ValidationReport {
  projectId: string;
  timestamp: string;
  isBalanced: boolean;
  prismaNumbers: {
    totalRawOccurrences: number;
    duplicatesRemoved: number;
    recordsScreenedV1: number;
    excludedV1: number;
    passedV1: number; // INCLUDE + UNSURE
    reportsSought: number;
    reportsNotRetrieved: number;
    reportsAssessedV2: number;
    excludedV2: number;
    includedFinal: number;
  };
  blockingIssues: string[]; // Các lỗi chặn xuất bản FINAL
  warnings: string[];
  pendingCounts: {
    v1Pending: number;
    v2Pending: number;
    fullTextPending: number;
    unresolvedDuplicates: number;
    outdatedDecisions: number;
  };
  status: "DRAFT" | "FINAL";
}

export interface Project {
  id: string;
  name: string;
  rqCode?: string;
  teamName?: string;
  rq?: string;
  h0?: string;
  h1?: string;
  framework: FrameworkType;
  pico?: PicoConfig;
  members: Member[];
  searchPeriod?: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
  reportLanguage: "vi" | "en";
  activeProtocolVersion: string;
  activeStage?: "PROJECT" | "PROTOCOL" | "SEARCH" | "RECORDS" | "SCREENING_V1" | "SCREENING_V2" | "EVIDENCE" | "VALIDATION" | "EXPORT";
  createdAt: string;
  updatedAt: string;
}


