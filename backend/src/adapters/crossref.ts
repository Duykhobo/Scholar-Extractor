import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class CrossrefAdapter extends BaseSourceAdapter {
  readonly sourceName = "Crossref";
  private userEmail: string;

  constructor(userEmail: string = "scholar-collector@fpt.edu.vn") {
    super();
    this.userEmail = userEmail;
  }

  private getHeaders(): Record<string, string> {
    return {
      "User-Agent": `ScholarExtractor/3.0 (mailto:${this.userEmail})`,
      Accept: "application/json",
    };
  }

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: true,
      paginationType: "offset",
      canFilterYear: true,
      canEnrich: true,
      canFetchCitations: false,
      canFetchReferences: true,
      canDiscoverFullText: true,
      canImport: false,
      supportedImportFormats: [],
      rateLimitPerMinute: 300,
      requiresApiKey: false,
      isApiKeyConfigured: true,
      notes: "Miễn phí qua Crossref REST API (Polite Pool). Cung cấp metadata chính thống của hàng chục triệu DOI, hỗ trợ tìm kiếm thư mục và lấy danh mục tài liệu tham khảo (references).",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    const cleaned = rawQuery.trim();
    return {
      actualQuery: cleaned,
      notes: "Crossref tìm kiếm từ khóa thư mục (bibliographic query).",
    };
  }

  private stripXmlTags(str: string): string {
    if (!str) return "";
    return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const limit = Math.min(options.limit || 25, 100);
    const offset = options.start || 0;

    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query.bibliographic", actualQuery);
    url.searchParams.set("rows", limit.toString());
    url.searchParams.set("offset", offset.toString());

    // Bộ lọc năm
    const filterParts: string[] = [];
    if (options.asYlo) {
      filterParts.push(`from-pub-date:${options.asYlo}-01-01`);
    }
    if (options.asYhi) {
      filterParts.push(`until-pub-date:${options.asYhi}-12-31`);
    }
    if (filterParts.length > 0) {
      url.searchParams.set("filter", filterParts.join(","));
    }

    const headers = this.getHeaders();
    const res = await this.fetchWithRetry(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`[Crossref] API lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const message = data.message || {};
    const items = message.items || [];
    const totalResults = message["total-results"] || 0;

    const records: PaperRecord[] = items.map((item: any, idx: number) => {
      const doi = item.DOI || "";
      const id = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `crossref_${Date.now()}_${offset + idx}`;

      // Authors
      const authorList = (item.author || []).map((a: any) => {
        if (a.given && a.family) return `${a.given} ${a.family}`;
        return a.name || a.family || "";
      });
      const authors = authorList.filter(Boolean).join("; ");

      // Title
      const rawTitle = Array.isArray(item.title) ? item.title[0] : item.title || "";
      const title = this.stripXmlTags(rawTitle) || "Untitled";

      // Year
      let year = "";
      const dateParts = item["published-print"]?.["date-parts"]?.[0] || item["published-online"]?.["date-parts"]?.[0] || item.created?.["date-parts"]?.[0];
      if (Array.isArray(dateParts) && dateParts.length > 0) {
        year = String(dateParts[0]);
      }

      // Venue / Journal
      const venue = Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"] || item.publisher || "";

      // Abstract
      const abstract = this.stripXmlTags(item.abstract || "");

      // Landing page & PDF URL
      const landingPageUrl = item.URL || (doi ? `https://doi.org/${doi}` : "");
      let pdfUrl = "";
      if (Array.isArray(item.link)) {
        const pdfLinkObj = item.link.find((l: any) => l["content-type"] === "application/pdf" || l["content-type"] === "unspecified");
        if (pdfLinkObj && pdfLinkObj.URL) {
          pdfUrl = pdfLinkObj.URL;
        }
      }

      const provenance = this.createProvenance(id, options, actualQuery, "crossref_api", {
        url: landingPageUrl,
      });

      return {
        id,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "crossref_api",
        title,
        authors,
        year,
        venue,
        doi,
        snippet: abstract ? abstract.slice(0, 300) : "",
        abstract,
        url: landingPageUrl,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: !authors,
        uncertain_year: !year,
        uncertain_venue: !venue,
        uncertain_doi: !doi,
        missing_abstract: !abstract,
        screeningStage: "B1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ Crossref API",
        finalDecision: "",
        userNotes: "",
        pdfUrl: pdfUrl || undefined,
        publicationType: item.type === "journal-article" ? "journal-article" : item.type === "proceedings-article" ? "proceedings-article" : "unknown",
        provenanceList: [provenance],
      };
    });

    const hasMore = offset + items.length < totalResults;

    return {
      records,
      totalReported: totalResults,
      nextCursor: hasMore ? String(offset + items.length) : undefined,
      hasMore,
      actualQuery,
      source: this.sourceName,
    };
  }

  async fetchReferences(paperIdOrDoi: string): Promise<PaperRecord[]> {
    const cleanDoi = paperIdOrDoi.replace(/^https?:\/\/doi\.org\//i, "");
    const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
    const res = await this.fetchWithRetry(url, { headers: this.getHeaders() });
    if (!res.ok) return [];

    const data = await res.json();
    const refs = data.message?.reference || [];

    return refs.map((ref: any, idx: number) => {
      const doi = ref.DOI || "";
      const id = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `ref_${cleanDoi}_${idx}`;
      return {
        id,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "crossref_reference",
        title: ref["article-title"] || ref.unstructured || "Untitled Reference",
        authors: ref.author || "",
        year: ref.year ? String(ref.year) : "",
        venue: ref["journal-title"] || ref["volume-title"] || "",
        doi,
        snippet: "",
        abstract: "",
        url: doi ? `https://doi.org/${doi}` : "",
        query: `Reference of ${cleanDoi}`,
        retrieval_date: new Date().toISOString(),
        search_id: "",
        uncertain_authors: !ref.author,
        uncertain_year: !ref.year,
        uncertain_venue: !ref["journal-title"],
        uncertain_doi: !doi,
        missing_abstract: true,
        screeningStage: "B1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: `Tài liệu tham khảo (Reference) của ${cleanDoi}`,
        finalDecision: "",
        userNotes: "",
      };
    });
  }
}
