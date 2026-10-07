import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class PubmedAdapter extends BaseSourceAdapter {
  readonly sourceName = "PubMed";

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: true,
      paginationType: "offset",
      canFilterYear: true,
      canEnrich: true,
      canFetchCitations: false,
      canFetchReferences: false,
      canDiscoverFullText: true,
      canImport: false,
      supportedImportFormats: [],
      rateLimitPerMinute: 180,
      requiresApiKey: false,
      isApiKeyConfigured: true,
      notes: "Miễn phí qua NCBI Entrez E-utilities (esearch + esummary). Cung cấp cơ sở dữ liệu y sinh học, sức khỏe cộng đồng và khoa học đời sống.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    const cleaned = rawQuery.trim();
    return {
      actualQuery: cleaned,
      notes: "PubMed hỗ trợ truy vấn MeSH và từ khóa y sinh học.",
    };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    const limit = Math.min(options.limit || 25, 50);
    const start = options.start || 0;

    // 1. ESearch: lấy danh sách PMIDs
    const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("term", actualQuery);
    searchUrl.searchParams.set("retstart", start.toString());
    searchUrl.searchParams.set("retmax", limit.toString());
    searchUrl.searchParams.set("retmode", "json");

    if (options.asYlo && options.asYhi) {
      searchUrl.searchParams.set("mindate", `${options.asYlo}/01/01`);
      searchUrl.searchParams.set("maxdate", `${options.asYhi}/12/31`);
    }

    const searchRes = await this.fetchWithRetry(searchUrl.toString(), {
      headers: { "User-Agent": "ScholarExtractor/3.0" },
    });
    if (!searchRes.ok) {
      throw new Error(`[PubMed] ESearch lỗi HTTP ${searchRes.status}: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const esearchResult = searchData.esearchresult || {};
    const idList: string[] = esearchResult.idlist || [];
    const totalCount = parseInt(esearchResult.count || "0", 10);

    if (idList.length === 0) {
      return {
        records: [],
        totalReported: totalCount,
        hasMore: false,
        actualQuery,
        source: this.sourceName,
      };
    }

    // 2. ESummary: lấy chi tiết metadata cho các PMIDs
    const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("id", idList.join(","));
    summaryUrl.searchParams.set("retmode", "json");

    const summaryRes = await this.fetchWithRetry(summaryUrl.toString(), {
      headers: { "User-Agent": "ScholarExtractor/3.0" },
    });
    if (!summaryRes.ok) {
      throw new Error(`[PubMed] ESummary lỗi HTTP ${summaryRes.status}: ${summaryRes.statusText}`);
    }

    const summaryData = await summaryRes.json();
    const resultsObj = summaryData.result || {};

    const records: PaperRecord[] = idList.map((pmid) => {
      const doc = resultsObj[pmid] || {};
      const rawTitle = (doc.title || "Untitled").replace(/\[|\]/g, "").trim();

      // DOI
      let doi = "";
      if (Array.isArray(doc.articleids)) {
        const doiObj = doc.articleids.find((a: any) => a.idtype === "doi");
        if (doiObj) doi = doiObj.value;
      }

      // Authors
      const authorList = (doc.authors || []).map((a: any) => a.name).filter(Boolean);
      const authors = authorList.join("; ");

      // Year
      let year = "";
      if (doc.pubdate) {
        const yMatch = doc.pubdate.match(/\b(19\d\d|20\d\d)\b/);
        if (yMatch) year = yMatch[1];
      }

      const venue = doc.source || doc.fulljournalname || "PubMed";
      const landingPageUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      const id = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `pmid_${pmid}`;

      const provenance = this.createProvenance(id, options, actualQuery, "pubmed_api", {
        url: landingPageUrl,
      });

      return {
        id,
        source: this.sourceName,
        discoverySource: this.sourceName,
        collectionMethod: "pubmed_api",
        title: rawTitle,
        authors,
        year,
        venue,
        doi,
        snippet: "",
        abstract: "", // PubMed summary không chứa đầy đủ abstract, người dùng có thể xem qua landing page hoặc fetch sâu
        url: landingPageUrl,
        query: options.query,
        retrieval_date: new Date().toISOString(),
        search_id: options.sessionId || "",
        uncertain_authors: authorList.length === 0,
        uncertain_year: !year,
        uncertain_venue: !venue,
        uncertain_doi: !doi,
        missing_abstract: true,
        screeningStage: "B1",
        pipelineStage: "B1",
        matchedCriteria: [],
        suggestedDecision: "Unsure",
        screeningReason: "Thu thập từ PubMed API (NCBI Entrez)",
        finalDecision: "",
        userNotes: "",
        publicationType: "journal-article",
        provenanceList: [provenance],
      };
    });

    const hasMore = start + idList.length < totalCount;

    return {
      records,
      totalReported: totalCount,
      nextCursor: hasMore ? String(start + idList.length) : undefined,
      hasMore,
      actualQuery,
      source: this.sourceName,
    };
  }
}
