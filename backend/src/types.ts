export interface ScholarSearchParams {
  engine?: 'google_scholar';
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

export type ScreeningDecision = 'Include' | 'Exclude' | 'Unsure';

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
  screeningStage: 'V1' | 'V2';
  matchedCriteria: string[];
  unknownCriteria?: string[];
  missingEvidence?: string[];
  suggestedDecision: ScreeningDecision;
  screeningReason: string;
  finalDecision: ScreeningDecision | '';
  userNotes: string;

  // Provenance & Du lieu bo sung tu tab dang mo / PDF
  pdfUrl?: string;
  extracted_url?: string;
  extracted_at?: string;
  extraction_method?: string;
  evidence_snippets?: EvidenceSnippet[];
  page_count?: number;
  user_verified?: boolean;
}

export interface EvidenceSnippet {
  type: 'IC-I' | 'IC-E' | 'Other';
  term: string;
  context: string;
  page?: number;
  section: 'Methodology' | 'Evaluation' | 'Related Work' | 'References' | 'Unknown';
  isValidEvidence: boolean;
  reason?: string;
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
    stage: 'V1' | 'V2';
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
