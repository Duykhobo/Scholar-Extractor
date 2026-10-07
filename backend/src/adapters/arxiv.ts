import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class ArxivAdapter extends BaseSourceAdapter {
  readonly sourceName = "arXiv";

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
      rateLimitPerMinute: 60,
      requiresApiKey: false,
      isApiKeyConfigured: true,
      notes: "Miễn phí qua arXiv API. Cung cấp preprint bài báo khoa học máy tính, toán học và kỹ thuật kèm toàn văn Open Access PDF.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    const cleaned = rawQuery.trim();
    return {
      actualQuery: `all:${cleaned}`,
      notes: "arXiv tìm kiếm qua trường all: từ khóa.",
    };
  }

  private parseXmlEntries(xmlText: string): Array<{
    id: string;
    title: string;
    summary: string;
    published: string;
    authors: string[];
    pdfUrl: string;
    doi: string;
  }> {
    const entries: Array<any> = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const block = match[1];

      // ID
      const idMatch = /<id>([^<]+)<\/id>/i.exec(block);
      const rawId = idMatch ? idMatch[1].trim() : "";
      const arxivId = rawId.replace(/^https?:\/\/arxiv\.org\/abs\//i, "");

      // Title
      const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(block);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Untitled";

      // Summary (Abstract)
      const summaryMatch = /<summary>([\s\S]*?)<\/summary>/i.exec(block);
      const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";

      // Published
      const pubMatch = /<published>([^<]+)<\/published>/i.exec(block);
      const published = pubMatch ? pubMatch[1].trim() : "";

      // Authors
      const authors: string[] = [];
      const authorRegex = /<author>\s*<name>([^<]+)<\/name>/gi;
      let aMatch;
      while ((aMatch = authorRegex.exec(block)) !== null) {
        authors.push(aMatch[1].trim());
      }

      // PDF link
      const pdfMatch = /<link[^>]+title=["']pdf["'][^>]+href=["']([^"']+)["']/i.exec(block) ||
                       /<link[^>]+href=["']([^"']+)["'][^>]+title=["']pdf["']/i.exec(block);
      let pdfUrl = pdfMatch ? pdfMatch[1] : (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : "");

      // DOI (nếu có tag arxiv:doi)
      const doiMatch = /<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/i.exec(block);
      const doi = doiMatch ? doiMatch[1].trim() : "";

      entries.push({
        id: arxivId || rawId,
        title,
        summary,
        published,
        authors,
        pdfUrl,
        doi,
      });
    }

    return entries;
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const limit = Math.min(options.limit || 25, 100);
    const start = options.start || 0;

    const url = new URL("http://export.arxiv.org/api/query");
    url.searchParams.set("search_query", actualQuery);
    url.searchParams.set("start", start.toString());
    url.searchParams.set("max_results", limit.toString());
    url.searchParams.set("sortBy", "relevance");
    url.searchParams.set("sortOrder", "descending");

    const res = await this.fetchWithRetry(url.toString(), {
      headers: { "User-Agent": "ScholarExtractor/3.0" },
    });
    if (!res.ok) {
      throw new Error(`[arXiv] API lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    const xml = await res.text();
    const parsedEntries = this.parseXmlEntries(xml);

    // Lấy tổng số kết quả ước tính từ <opensearch:totalResults>
    const totalMatch = /<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/i.exec(xml);
    const totalResults = totalMatch ? parseInt(totalMatch[1], 10) : parsedEntries.length;

    const records: PaperRecord[] = parsedEntries.map((e, idx) => {
      const id = e.id ? `arxiv_${e.id.replace(/[^a-zA-Z0-9]/g, "_")}` : `arxiv_${Date.now()}_${start + idx}`;
      const year = e.published ? e.published.slice(0, 4) : "";
      const landingPageUrl = e.id ? `https://arxiv.org/abs/${e.id}` : "";

      const provenance = this.createProvenance(id, options, actualQuery, "arxiv_api", {
        url: landingPageUrl,
      });

      return {
        id,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "arxiv_api",
        title: e.title,
        authors: e.authors.join("; "),
        year,
        venue: "arXiv.org",
        doi: e.doi,
        snippet: e.summary ? e.summary.slice(0, 300) : "",
        abstract: e.summary,
        url: landingPageUrl,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: e.authors.length === 0,
        uncertain_year: !year,
        uncertain_venue: false,
        uncertain_doi: !e.doi,
        missing_abstract: !e.summary,
        screeningStage: "B1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ arXiv API",
        finalDecision: "",
        userNotes: "",
        pdfUrl: e.pdfUrl,
        publicationType: "proceedings-article",
        provenanceList: [provenance],
      };
    });

    const hasMore = start + parsedEntries.length < totalResults;

    return {
      records,
      totalReported: totalResults,
      nextCursor: hasMore ? String(start + parsedEntries.length) : undefined,
      hasMore,
      actualQuery,
      source: this.sourceName,
    };
  }
}
