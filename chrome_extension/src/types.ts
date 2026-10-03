export type ScreeningDecision = 'Include' | 'Exclude' | 'Unsure';

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

  uncertain_authors: boolean;
  uncertain_year: boolean;
  uncertain_venue: boolean;
  uncertain_doi: boolean;
  missing_abstract: boolean;

  potentialDuplicate?: boolean;
  duplicateOfId?: string;
  duplicateReason?: string;

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
  page?: number | null;
  anchor?: string;
  section: 'Methodology' | 'Evaluation' | 'Related Work' | 'References' | 'Unknown' | string;
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
