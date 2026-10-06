import { PaperRecord, SourceAdapterCapability, SourceProvenance } from "../types";

export interface SearchOptions {
  query: string;
  queryVersion?: string; // Q1, Q2, Q3
  asYlo?: number | string;
  asYhi?: number | string;
  start?: number;
  limit?: number;
  cursor?: string;
  sessionId?: string;
  researchId?: string;
}

export interface SearchResult {
  records: PaperRecord[];
  totalReported?: number;
  nextCursor?: string;
  hasMore: boolean;
  actualQuery: string;
  source: string;
  warnings?: string[];
}

export abstract class BaseSourceAdapter {
  abstract readonly sourceName: string;

  abstract getCapabilities(): SourceAdapterCapability;

  abstract transformQuery(rawQuery: string): { actualQuery: string; notes?: string };

  abstract search(options: SearchOptions): Promise<SearchResult>;

  async enrichMetadata(record: PaperRecord): Promise<Partial<PaperRecord>> {
    return {};
  }

  async fetchCitations(paperIdOrDoi: string): Promise<PaperRecord[]> {
    return [];
  }

  async fetchReferences(paperIdOrDoi: string): Promise<PaperRecord[]> {
    return [];
  }

  async discoverFullText(record: PaperRecord): Promise<{
    pdfUrl?: string;
    source: string;
    isPaywalled?: boolean;
    license?: string;
  }> {
    return { source: this.sourceName };
  }

  protected createProvenance(
    recordId: string,
    options: SearchOptions,
    actualQuery: string,
    method: string,
    extra?: Partial<SourceProvenance>,
  ): SourceProvenance {
    return {
      source: this.sourceName,
      sourceRecordId: recordId,
      queryId: options.sessionId,
      queryVersion: options.queryVersion || "Q1",
      retrievedAt: new Date().toISOString(),
      method,
      rawQuery: options.query,
      actualQuery,
      ...extra,
    };
  }

  /**
   * Helper retry voi backoff khi gap 429
   */
  protected async fetchWithRetry(
    url: string,
    fetchOptions: RequestInit,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
  ): Promise<Response> {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, fetchOptions);
        if (res.status === 429) {
          console.warn(`[${this.sourceName}] HTTP 429 (Rate Limit). Thu lai lan ${attempt}/${maxRetries} sau ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        return res;
      } catch (err: any) {
        if (attempt === maxRetries) throw err;
        console.warn(`[${this.sourceName}] Loi mang: ${err.message}. Thu lai lan ${attempt}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error(`[${this.sourceName}] Vuot qua so lan thu lai (${maxRetries})`);
  }
}
