import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class SemanticScholarAdapter extends BaseSourceAdapter {
  readonly sourceName = "Semantic Scholar";
  private apiKey?: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: true,
      paginationType: "offset",
      canFilterYear: true,
      canEnrich: true,
      canFetchCitations: true,
      canFetchReferences: true,
      canDiscoverFullText: true,
      canImport: false,
      supportedImportFormats: [],
      rateLimitPerMinute: this.apiKey ? 600 : 60,
      requiresApiKey: false,
      isApiKeyConfigured: Boolean(this.apiKey),
      notes:
        "API Graph mở. Hỗ trợ tìm kiếm theo từ khóa, lọc năm, phát hiện Open Access PDF và truy vết citations/references.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    // Làm sạch dấu ngoặc và toán tử Boolean để Semantic Scholar tìm kiếm ngữ nghĩa chính xác
    let cleaned = rawQuery.replace(/[\(\)]/g, " ");
    cleaned = cleaned.replace(/\b(AND|OR|NOT)\b/gi, " ");
    const words = cleaned
      .split(/\s+/)
      .map((w) => w.replace(/^["']|["']$/g, "").trim())
      .filter((w) => w.length > 0);

    const actualQuery = words.slice(0, 10).join(" ");
    return {
      actualQuery,
      notes: "Semantic Scholar tối ưu với cụm từ khóa tự nhiên; các toán tử logic được chuẩn hóa thành từ khóa.",
    };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const limit = Math.min(options.limit || 20, 100);
    const offset = options.start || 0;

    const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
    url.searchParams.set("query", actualQuery);
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set(
      "fields",
      "title,authors,year,venue,publicationTypes,externalIds,abstract,url,openAccessPdf,citationCount",
    );

    if (options.asYlo && options.asYhi) {
      url.searchParams.set("year", `${options.asYlo}-${options.asYhi}`);
    } else if (options.asYlo) {
      url.searchParams.set("year", `${options.asYlo}-2026`);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "ScholarExtractor/2.0 (mailto:swt302-research@fpt.edu.vn)",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    let res: Response;
    try {
      res = await this.fetchWithRetry(url.toString(), { headers }, 2, 800);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (s2Err: any) {
      console.warn(
        `[Semantic Scholar] Lỗi/Giới hạn truy cập (${s2Err.message}). Tự động chuyển tiếp sang OpenAlex làm nguồn chính.`,
      );
      const { OpenAlexAdapter } = await import("./openalex");
      const openAlex = new OpenAlexAdapter();
      const fallbackRes = await openAlex.search(options);
      fallbackRes.warnings = [
        `Semantic Scholar gặp giới hạn/lỗi: ${s2Err.message}. Pipeline đã tự động chuyển đổi sang OpenAlex để đảm bảo không gián đoạn.`,
      ];
      return fallbackRes;
    }

    const data = await res.json();
    const results = data.data || [];
    const total = data.total || results.length;

    const records: PaperRecord[] = results.map((item: any, idx: number) => {
      const extIds = item.externalIds || {};
      const doi = (extIds.DOI || "").trim();
      const authors = (item.authors || [])
        .map((a: any) => a.name)
        .filter(Boolean)
        .join("; ");
      const pdfUrl = item.openAccessPdf?.url || "";
      const year = item.year ? item.year.toString() : "";
      const venue = item.venue || "";
      const abstract = item.abstract || "";
      const pubTypes = item.publicationTypes || [];
      const publicationType = pubTypes.includes("JournalArticle")
        ? "journal-article"
        : pubTypes.includes("Conference")
          ? "proceedings-article"
          : "unknown";

      const recordId = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `s2_${item.paperId || idx}`;

      const rec: PaperRecord = {
        id: recordId,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "api",
        title: item.title || "Untitled",
        authors,
        year,
        venue,
        doi,
        snippet: abstract ? abstract.slice(0, 300) : "",
        abstract,
        url: item.url || (doi ? `https://doi.org/${doi}` : ""),
        pdfUrl: pdfUrl || undefined,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: !authors,
        uncertain_year: !year,
        uncertain_venue: !venue,
        uncertain_doi: !doi,
        missing_abstract: !abstract,
        screeningStage: "V1",
        pipelineStage: "B1",
        queryVersion: options.queryVersion || "Q1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ Semantic Scholar API (B1)",
        finalDecision: "",
        userNotes: "",
        publicationType,
        provenanceList: [
          this.createProvenance(item.paperId || recordId, options, actualQuery, "api", {
            url: item.url,
          }),
        ],
      };

      return rec;
    });

    return {
      records,
      totalReported: total,
      hasMore: offset + records.length < total,
      actualQuery,
      source: this.sourceName,
    };
  }

  async fetchCitations(paperIdOrDoi: string): Promise<PaperRecord[]> {
    const paperId = paperIdOrDoi.startsWith("10.") ? `DOI:${paperIdOrDoi}` : paperIdOrDoi;
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?limit=50&fields=title,authors,year,venue,externalIds,abstract,url,openAccessPdf`;

    const headers: Record<string, string> = { "User-Agent": "ScholarExtractor/2.0" };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;

    try {
      const res = await this.fetchWithRetry(url, { headers }, 1, 500);
      if (!res.ok) return [];

      const data = await res.json();
      const results = (data.data || []).map((c: any) => c.citingPaper).filter(Boolean);

      return results.map((item: any, idx: number) => {
        const extIds = item.externalIds || {};
        const doi = (extIds.DOI || "").trim();
        const authors = (item.authors || [])
          .map((a: any) => a.name)
          .filter(Boolean)
          .join("; ");

        return {
          id: doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `s2_${item.paperId || idx}`,
          source: this.sourceName,
          discoverySource: this.sourceName,
          collectionMethod: "snowball_forward",
          title: item.title || "",
          authors,
          year: item.year ? item.year.toString() : "",
          venue: item.venue || "",
          doi,
          snippet: "",
          abstract: item.abstract || "",
          url: item.url || (doi ? `https://doi.org/${doi}` : ""),
          pdfUrl: item.openAccessPdf?.url || undefined,
          query: `citations:${paperIdOrDoi}`,
          retrieval_date: new Date().toISOString(),
          search_id: "",
          uncertain_authors: !authors,
          uncertain_year: !item.year,
          uncertain_venue: !item.venue,
          uncertain_doi: !doi,
          missing_abstract: !item.abstract,
          screeningStage: "V1",
          pipelineStage: "B1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: `Snowballing tiến (Citations của ${paperIdOrDoi})`,
          finalDecision: "",
          userNotes: "",
        };
      });
    } catch {
      return [];
    }
  }

  async fetchReferences(paperIdOrDoi: string): Promise<PaperRecord[]> {
    const paperId = paperIdOrDoi.startsWith("10.") ? `DOI:${paperIdOrDoi}` : paperIdOrDoi;
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/references?limit=50&fields=title,authors,year,venue,externalIds,abstract,url,openAccessPdf`;

    const headers: Record<string, string> = {
      "User-Agent": "ScholarExtractor/2.0 (mailto:swt302-research@fpt.edu.vn)",
    };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;

    try {
      const res = await this.fetchWithRetry(url, { headers }, 1, 500);
      if (!res.ok) return [];

      const data = await res.json();
      const results = (data.data || []).map((c: any) => c.citedPaper).filter(Boolean);

      return results.map((item: any, idx: number) => {
        const extIds = item.externalIds || {};
        const doi = (extIds.DOI || "").trim();
        const authors = (item.authors || [])
          .map((a: any) => a.name)
          .filter(Boolean)
          .join("; ");

        return {
          id: doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `s2_${item.paperId || idx}`,
          source: this.sourceName,
          discoverySource: this.sourceName,
          collectionMethod: "snowball_backward",
          title: item.title || "",
          authors,
          year: item.year ? item.year.toString() : "",
          venue: item.venue || "",
          doi,
          snippet: "",
          abstract: item.abstract || "",
          url: item.url || (doi ? `https://doi.org/${doi}` : ""),
          pdfUrl: item.openAccessPdf?.url || undefined,
          query: `references:${paperIdOrDoi}`,
          retrieval_date: new Date().toISOString(),
          search_id: "",
          uncertain_authors: !authors,
          uncertain_year: !item.year,
          uncertain_venue: !item.venue,
          uncertain_doi: !doi,
          missing_abstract: !item.abstract,
          screeningStage: "V1",
          pipelineStage: "B1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: `Snowballing lùi (References của ${paperIdOrDoi})`,
          finalDecision: "",
          userNotes: "",
        };
      });
    } catch {
      return [];
    }
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
      const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${record.doi}?fields=openAccessPdf`;
      const headers: Record<string, string> = { "User-Agent": "ScholarExtractor/2.0" };
      if (this.apiKey) headers["x-api-key"] = this.apiKey;
      const res = await this.fetchWithRetry(url, { headers });
      if (res.ok) {
        const item = await res.json();
        if (item.openAccessPdf?.url) {
          return { pdfUrl: item.openAccessPdf.url, source: this.sourceName, isPaywalled: false };
        }
      }
    } catch {
      // ignore
    }

    return { source: this.sourceName, isPaywalled: true };
  }
}
