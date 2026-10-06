import { config } from "../config";
import { fetchScholarFromSerpApi } from "../scholarService";
import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class GoogleScholarAdapter extends BaseSourceAdapter {
  readonly sourceName = "Google Scholar";

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: true,
      paginationType: "offset",
      canFilterYear: true,
      canEnrich: false,
      canFetchCitations: false,
      canFetchReferences: false,
      canDiscoverFullText: true,
      canImport: false,
      supportedImportFormats: [],
      rateLimitPerMinute: 100,
      requiresApiKey: true,
      isApiKeyConfigured: config.isKeyConfigured(),
      notes: "Nguồn ứng viên bổ trợ qua SerpApi. Bản ghi được gắn nhãn riêng và không tính trực tiếp vào Identification chính của PRISMA.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    return {
      actualQuery: rawQuery.trim(),
      notes: "Google Scholar hỗ trợ tìm kiếm đầy đủ toán tử AND, OR và cụm từ trong ngoặc kép.",
    };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const start = options.start || 0;
    const num = Math.min(options.limit || 10, 20);

    const result = await fetchScholarFromSerpApi({
      q: actualQuery,
      as_ylo: options.asYlo,
      as_yhi: options.asYhi,
      start,
      num,
    });

    const records = result.records.map((r) => {
      r.pipelineStage = "B1";
      r.queryVersion = options.queryVersion || "Q1";
      r.provenanceList = [
        this.createProvenance(r.id, options, actualQuery, "serpapi", {
          url: r.url,
        }),
      ];
      return r;
    });

    return {
      records,
      totalReported: result.summary.totalReportedResults,
      hasMore: start + records.length < result.summary.totalReportedResults,
      actualQuery,
      source: this.sourceName,
    };
  }
}
