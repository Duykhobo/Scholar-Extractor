import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class IeeeXploreAdapter extends BaseSourceAdapter {
  readonly sourceName = "IEEE Xplore";
  private apiKey?: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.IEEE_API_KEY;
  }

  getCapabilities(): SourceAdapterCapability {
    const isConfigured = Boolean(this.apiKey);
    return {
      sourceName: this.sourceName,
      canSearch: isConfigured,
      paginationType: isConfigured ? "offset" : "none",
      canFilterYear: true,
      canEnrich: isConfigured,
      canFetchCitations: false,
      canFetchReferences: false,
      canDiscoverFullText: false,
      canImport: true,
      supportedImportFormats: ["csv", "bibtex", "ris"],
      rateLimitPerMinute: isConfigured ? 120 : 0,
      requiresApiKey: true,
      isApiKeyConfigured: isConfigured,
      notes: isConfigured
        ? "Đã cấu hình IEEE_API_KEY hợp lệ. Hỗ trợ tìm kiếm tự động qua IEEE API chính thức."
        : "Chưa có IEEE_API_KEY (yêu cầu đăng ký cổng IEEE Developer). Vui lòng dùng 'Nhập CSV / BibTeX' hoặc trích xuất từ tab IEEE Xplore đang mở.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    return {
      actualQuery: rawQuery.trim(),
      notes: "IEEE Xplore API yêu cầu cú pháp truy vấn chuẩn hoặc toán tử logic chuẩn.",
    };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    if (!this.apiKey) {
      return {
        records: [],
        totalReported: 0,
        hasMore: false,
        actualQuery,
        source: this.sourceName,
        warnings: [
          "IEEE Xplore chưa được cấu hình API Key. Hãy xuất file CSV/BibTeX từ IEEE Xplore và dùng nút 'Nhập CSV / BibTeX' để nạp dữ liệu.",
        ],
      };
    }

    const start = options.start || 1;
    const limit = Math.min(options.limit || 25, 100);
    const url = new URL("https://ieeexploreapi.ieee.org/api/v1/search/articles");
    url.searchParams.set("apikey", this.apiKey);
    url.searchParams.set("querytext", actualQuery);
    url.searchParams.set("start_record", start.toString());
    url.searchParams.set("max_records", limit.toString());
    if (options.asYlo) url.searchParams.set("start_year", options.asYlo.toString());
    if (options.asYhi) url.searchParams.set("end_year", options.asYhi.toString());

    const res = await this.fetchWithRetry(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`[IEEE Xplore] Lỗi API HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const articles = data.articles || [];
    const total = data.total_records || articles.length;

    const records: PaperRecord[] = articles.map((item: any, idx: number) => {
      const doi = (item.doi || "").trim();
      const authors = (item.authors?.authors || [])
        .map((a: any) => a.full_name)
        .filter(Boolean)
        .join("; ");
      const id = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `ieee_${item.article_number || idx}`;

      const rec: PaperRecord = {
        id,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "api",
        title: item.title || "",
        authors,
        year: item.publication_year ? item.publication_year.toString() : "",
        venue: item.publication_title || "",
        doi,
        snippet: (item.abstract || "").slice(0, 300),
        abstract: item.abstract || "",
        url: item.html_url || (doi ? `https://doi.org/${doi}` : ""),
        pdfUrl: item.pdf_url || undefined,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: !authors,
        uncertain_year: !item.publication_year,
        uncertain_venue: !item.publication_title,
        uncertain_doi: !doi,
        missing_abstract: !item.abstract,
        screeningStage: "V1",
        pipelineStage: "B1",
        queryVersion: options.queryVersion || "Q1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ IEEE Xplore API chính thức (B1)",
        finalDecision: "",
        userNotes: "",
        publicationType: item.content_type === "Conferences" ? "proceedings-article" : "journal-article",
        provenanceList: [
          this.createProvenance(item.article_number || id, options, actualQuery, "api", {
            url: item.html_url,
          }),
        ],
      };
      return rec;
    });

    return {
      records,
      totalReported: total,
      hasMore: start + records.length < total,
      actualQuery,
      source: this.sourceName,
    };
  }
}
