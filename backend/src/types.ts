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

export type ScreeningDecision = "Include" | "Exclude" | "Unsure";

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
  suggestedDecision: ScreeningDecision;
  screeningReason: string;
  finalDecision: ScreeningDecision | "";
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

  // Mô hình nghiên cứu & Đóng góp học thuật
  researchId?: string;
  sessionId?: string;
  profileVersion?: number;
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

