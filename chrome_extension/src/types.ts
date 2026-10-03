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

  suggestedDecision: ScreeningDecision;
  screeningReason: string;
  finalDecision: ScreeningDecision | '';
  userNotes: string;
}

export interface DedupStats {
  initialCount: number;
  dupByDoi: number;
  dupByTitle: number;
  totalUnique: number;
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
