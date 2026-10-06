import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class OpenAlexAdapter extends BaseSourceAdapter {
  readonly sourceName = "OpenAlex";
  private userEmail: string;
  private apiKey: string;

  constructor(userEmail: string = "swt302-slr@fpt.edu.vn", apiKey: string = process.env.OPENALEX_API_KEY || "") {
    super();
    this.userEmail = userEmail;
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": `ScholarExtractor/2.0 (mailto:${this.userEmail})`,
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
      headers["api_key"] = this.apiKey;
    }
    return headers;
  }

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: true,
      paginationType: "cursor",
      canFilterYear: true,
      canEnrich: true,
      canFetchCitations: true,
      canFetchReferences: true,
      canDiscoverFullText: true,
      canImport: false,
      supportedImportFormats: [],
      rateLimitPerMinute: this.apiKey ? 6000 : 600,
      requiresApiKey: false,
      isApiKeyConfigured: Boolean(this.apiKey),
      notes: this.apiKey
        ? "Đã cấu hình OpenAlex API key (hạn mức cao, tốc độ tối đa)."
        : "Miễn phí qua Polite Pool (mailto). Hỗ trợ tìm kiếm toàn văn, cursor pagination, và phát hiện Open Access URL.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    const cleaned = rawQuery.trim();
    return {
      actualQuery: cleaned,
      notes: "OpenAlex hỗ trợ tìm kiếm text tự do và cụm từ trong ngoặc kép.",
    };
  }

  private reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
    if (!invertedIndex || typeof invertedIndex !== "object") return "";
    const words: [number, string][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (Array.isArray(positions)) {
        for (const pos of positions) {
          words.push([pos, word]);
        }
      }
    }
    words.sort((a, b) => a[0] - b[0]);
    return words.map((w) => w[1]).join(" ");
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const limit = Math.min(options.limit || 25, 100);
    const cursor = options.cursor || "*";

    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", actualQuery);
    url.searchParams.set("per-page", limit.toString());
    url.searchParams.set("cursor", cursor);

    // Năm xuất bản
    const filters: string[] = [];
    if (options.asYlo) {
      filters.push(`from_publication_date:${options.asYlo}-01-01`);
    }
    if (options.asYhi) {
      filters.push(`to_publication_date:${options.asYhi}-12-31`);
    }
    if (filters.length > 0) {
      url.searchParams.set("filter", filters.join(","));
    }

    const headers = this.getHeaders();
    const res = await this.fetchWithRetry(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`[OpenAlex] API lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const results = data.results || [];
    const meta = data.meta || {};

    const records: PaperRecord[] = results.map((item: any, idx: number) => {
      const doiRaw = item.doi || "";
      const doi = doiRaw.replace(/^https?:\/\/doi\.org\//i, "").trim();

      const authorsList = (item.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean);
      const authors = authorsList.join("; ");

      const venue =
        item.primary_location?.source?.display_name ||
        item.host_venue?.display_name ||
        item.primary_location?.source?.host_organization_name ||
        "";

      const publicationType = item.type || "journal-article";
      const year = item.publication_year ? item.publication_year.toString() : "";
      const abstract = this.reconstructAbstract(item.abstract_inverted_index);

      // Open Access PDF
      const pdfUrl = item.open_access?.oa_url || item.best_oa_location?.pdf_url || item.primary_location?.pdf_url || "";

      const openAlexId = item.id || `openalex_${Date.now()}_${idx}`;
      const recordId = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `oa_${openAlexId.split("/").pop()}`;

      const rec: PaperRecord = {
        id: recordId,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "api",
        title: item.display_name || item.title || "Untitled",
        authors,
        year,
        venue,
        doi,
        snippet: abstract ? abstract.slice(0, 300) : "",
        abstract,
        url: item.doi || item.primary_location?.landing_page_url || item.id || "",
        pdfUrl: pdfUrl || undefined,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: authorsList.length === 0,
        uncertain_year: !year,
        uncertain_venue: !venue,
        uncertain_doi: !doi,
        missing_abstract: !abstract,
        screeningStage: "V1",
        pipelineStage: "B1",
        queryVersion: options.queryVersion || "Q1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ OpenAlex API (B1)",
        finalDecision: "",
        userNotes: "",
        publicationType,
        provenanceList: [
          this.createProvenance(item.id || recordId, options, actualQuery, "api", {
            url: item.doi || item.id,
          }),
        ],
      };

      return rec;
    });

    return {
      records,
      totalReported: meta.count || records.length,
      nextCursor: meta.next_cursor || undefined,
      hasMore: Boolean(meta.next_cursor && meta.next_cursor !== cursor),
      actualQuery,
      source: this.sourceName,
    };
  }

  async fetchCitations(openAlexIdOrDoi: string): Promise<PaperRecord[]> {
    const identifier = openAlexIdOrDoi.startsWith("10.") ? `https://doi.org/${openAlexIdOrDoi}` : openAlexIdOrDoi;
    const url = `https://api.openalex.org/works?filter=cites:${identifier}&per-page=50`;

    const res = await this.fetchWithRetry(url, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];
    return results.map((item: any, idx: number) => {
      const doiRaw = item.doi || "";
      const doi = doiRaw.replace(/^https?:\/\/doi\.org\//i, "").trim();
      const authors = (item.authorships || [])
        .map((a: any) => a.author?.display_name)
        .filter(Boolean)
        .join("; ");

      return {
        id: doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `oa_${item.id?.split("/").pop() || idx}`,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "snowball_forward",
        title: item.display_name || item.title || "",
        authors,
        year: item.publication_year ? item.publication_year.toString() : "",
        venue: item.primary_location?.source?.display_name || "",
        doi,
        snippet: "",
        abstract: this.reconstructAbstract(item.abstract_inverted_index),
        url: item.doi || item.id || "",
        pdfUrl: item.open_access?.oa_url || item.best_oa_location?.pdf_url || undefined,
        query: `citations:${identifier}`,
        retrieval_date: new Date().toISOString(),
        search_id: "",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: !doi,
        missing_abstract: !item.abstract_inverted_index,
        screeningStage: "V1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: `Snowballing tiến (Citations của ${identifier})`,
        finalDecision: "",
        userNotes: "",
      };
    });
  }

  async fetchReferences(openAlexIdOrDoi: string): Promise<PaperRecord[]> {
    const identifier = openAlexIdOrDoi.startsWith("10.") ? `https://doi.org/${openAlexIdOrDoi}` : openAlexIdOrDoi;
    // Lấy thông tin bài gốc trước để lấy referenced_works
    const workUrl = `https://api.openalex.org/works/${identifier}`;
    const workRes = await this.fetchWithRetry(workUrl, {
      headers: this.getHeaders(),
    });
    if (!workRes.ok) return [];

    const workData = await workRes.json();
    const referencedWorks: string[] = workData.referenced_works || [];
    if (referencedWorks.length === 0) return [];

    // Lấy tối đa 25 referenced works
    const idsToFetch = referencedWorks.slice(0, 25).join("|");
    const refUrl = `https://api.openalex.org/works?filter=openalex_id:${idsToFetch}&per-page=50`;

    const refRes = await this.fetchWithRetry(refUrl, {
      headers: this.getHeaders(),
    });
    if (!refRes.ok) return [];

    const data = await refRes.json();
    const results = data.results || [];
    return results.map((item: any, idx: number) => {
      const doiRaw = item.doi || "";
      const doi = doiRaw.replace(/^https?:\/\/doi\.org\//i, "").trim();
      const authors = (item.authorships || [])
        .map((a: any) => a.author?.display_name)
        .filter(Boolean)
        .join("; ");

      return {
        id: doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `oa_${item.id?.split("/").pop() || idx}`,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "snowball_backward",
        title: item.display_name || item.title || "",
        authors,
        year: item.publication_year ? item.publication_year.toString() : "",
        venue: item.primary_location?.source?.display_name || "",
        doi,
        snippet: "",
        abstract: this.reconstructAbstract(item.abstract_inverted_index),
        url: item.doi || item.id || "",
        pdfUrl: item.open_access?.oa_url || item.best_oa_location?.pdf_url || undefined,
        query: `references:${identifier}`,
        retrieval_date: new Date().toISOString(),
        search_id: "",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: !doi,
        missing_abstract: !item.abstract_inverted_index,
        screeningStage: "V1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: `Snowballing lùi (References của ${identifier})`,
        finalDecision: "",
        userNotes: "",
      };
    });
  }

  async discoverFullText(record: PaperRecord): Promise<{
    pdfUrl?: string;
    source: string;
    isPaywalled?: boolean;
    license?: string;
  }> {
    if (record.pdfUrl) {
      return { pdfUrl: record.pdfUrl, source: this.sourceName, isPaywalled: false };
    }
    if (!record.doi) {
      return { source: this.sourceName, isPaywalled: true };
    }

    try {
      const url = `https://api.openalex.org/works/https://doi.org/${record.doi}`;
      const res = await this.fetchWithRetry(url, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const item = await res.json();
        const oaUrl = item.open_access?.oa_url || item.best_oa_location?.pdf_url;
        if (oaUrl) {
          return {
            pdfUrl: oaUrl,
            source: this.sourceName,
            isPaywalled: false,
            license: item.best_oa_location?.license || undefined,
          };
        }
      }
    } catch {
      // ignore
    }

    return { source: this.sourceName, isPaywalled: true };
  }
}
