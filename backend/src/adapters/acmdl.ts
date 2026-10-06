import { PaperRecord, SourceAdapterCapability } from "../types";
import { BaseSourceAdapter, SearchOptions, SearchResult } from "./base";

export class AcmDlAdapter extends BaseSourceAdapter {
  readonly sourceName = "ACM Digital Library";

  getCapabilities(): SourceAdapterCapability {
    return {
      sourceName: this.sourceName,
      canSearch: false,
      paginationType: "none",
      canFilterYear: true,
      canEnrich: true,
      canFetchCitations: false,
      canFetchReferences: false,
      canDiscoverFullText: false,
      canImport: true,
      supportedImportFormats: ["csv", "bibtex", "ris"],
      rateLimitPerMinute: 0,
      requiresApiKey: false,
      isApiKeyConfigured: false,
      notes: "Nguồn xuất dữ liệu chính thống từ ACM DL (CSV/BibTeX). Hỗ trợ phát hiện tập kỷ yếu (Container) vs bài báo thực nghiệm, và mở mục lục tách bài con.",
    };
  }

  transformQuery(rawQuery: string): { actualQuery: string; notes?: string } {
    return {
      actualQuery: rawQuery.trim(),
      notes: "ACM DL tìm kiếm trên cổng web qua giao diện tìm kiếm nâng cao (AllField hoặc Title).",
    };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const { actualQuery } = this.transformQuery(options.query);
    return {
      records: [],
      totalReported: 0,
      hasMore: false,
      actualQuery,
      source: this.sourceName,
      warnings: [
        "ACM Digital Library yêu cầu truy cập xác thực trường đại học; vui lòng sử dụng tính năng 'Nhập CSV / BibTeX' hoặc trích xuất từ tab ACM DL đang mở.",
      ],
    };
  }

  /**
   * Nhận diện một record là Container (tập kỷ yếu) hay Bài báo
   */
  static isContainerRecord(title: string, authors: string, doi: string, rawLoai?: string): boolean {
    if (rawLoai && /tập kỷ yếu|proceedings volume|container/i.test(rawLoai)) {
      return true;
    }
    const titleNorm = title.trim();
    if (/^proceedings of the\b/i.test(titleNorm) && (!authors || authors.trim().length === 0)) {
      return true;
    }
    if (/\bsymposium on\b|\bconference on\b/i.test(titleNorm) && (!authors || authors.trim().length === 0)) {
      return true;
    }
    return false;
  }

  /**
   * Tạo quan hệ cha-con khi mở mục lục tập kỷ yếu
   */
  static createChildPaperFromToc(
    parentContainer: PaperRecord,
    childData: {
      title: string;
      authors: string;
      doi: string;
      url?: string;
      abstract?: string;
    },
  ): PaperRecord {
    const doiClean = childData.doi.replace(/^https?:\/\/doi\.org\//i, "").trim();
    const id = doiClean ? `doi_${doiClean.replace(/[^a-zA-Z0-9]/g, "_")}` : `acm_child_${Date.now()}`;

    return {
      id,
      source: "ACM Digital Library",
      discoverySource: "ACM Digital Library",
      collectionMethod: "toc_expansion",
      title: childData.title,
      authors: childData.authors,
      year: parentContainer.year,
      venue: parentContainer.title, // Venue chính là tên hội nghị/tập kỷ yếu cha
      doi: doiClean,
      snippet: childData.abstract ? childData.abstract.slice(0, 300) : "",
      abstract: childData.abstract || "",
      url: childData.url || (doiClean ? `https://doi.org/${doiClean}` : parentContainer.url),
      query: parentContainer.query,
      retrieval_date: new Date().toISOString(),
      search_id: parentContainer.search_id,
      uncertain_authors: !childData.authors,
      uncertain_year: !parentContainer.year,
      uncertain_venue: false,
      uncertain_doi: !doiClean,
      missing_abstract: !childData.abstract,
      screeningStage: "V1",
      pipelineStage: "B1",
      queryVersion: parentContainer.queryVersion || "Q1",
      matchedCriteria: [],
      suggestedDecision: "Unsure",
      screeningReason: `Tách từ mục lục tập kỷ yếu: ${parentContainer.title}`,
      finalDecision: "",
      userNotes: "",
      publicationType: "proceedings-article",
      isContainer: false,
      parentPaperId: parentContainer.id,
      containerDoi: parentContainer.doi,
      provenanceList: [
        {
          source: "ACM Digital Library",
          sourceRecordId: id,
          queryId: parentContainer.search_id,
          queryVersion: parentContainer.queryVersion || "Q1",
          retrievedAt: new Date().toISOString(),
          method: "toc_expansion",
          url: childData.url || parentContainer.url,
          parentPaperId: parentContainer.id,
          containerDoi: parentContainer.doi,
        },
      ],
    };
  }
}
