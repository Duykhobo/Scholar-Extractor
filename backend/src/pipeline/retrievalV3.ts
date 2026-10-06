import crypto from "crypto";
import { SourceAdapterRegistry } from "../adapters";
import { extractDoiFromString, fetchCrossrefMetadata } from "../doiService";
import { analyzeTabAgainstRecord } from "../evidenceAnalyzer";
import { extractAbstractFromPdfPages, extractVenueFromPdfPages, parsePdfBuffer, parsePdfFromUrl } from "../pdfService";
import { ResearchProfile } from "../profiles";
import { CanonicalPaper, FullTextRecordInfo, FullTextStatus, TabExtractedData } from "../types";

export interface RetrievalV3Result {
  records: CanonicalPaper[];
  includedCandidates: CanonicalPaper[];
  excludedRecords: CanonicalPaper[];
  unsureRecords: CanonicalPaper[];
  fullTextReports: Record<string, FullTextRecordInfo>;
  stats: {
    totalAssessed: number;
    retrievedSuccessfully: number;
    unretrieved: number;
    suggestedInclude: number;
    suggestedExclude: number;
    suggestedUnsure: number;
    excludedByReason: Record<string, number>;
  };
}

export class PipelineV3Retrieval {
  /**
   * Tính mã băm MD5 cho tệp PDF để xác thực tính toàn vẹn
   */
  static computeChecksum(buffer: Buffer | Uint8Array): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Thực hiện V3: Tìm kiếm toàn văn, tải, đọc, trích xuất bằng chứng và thẩm định
   */
  static async processV3(
    candidateRecords: CanonicalPaper[],
    profile: ResearchProfile,
    options: {
      autoFetchPdf?: boolean;
      userPdfs?: Map<string, { buffer: Buffer; fileName: string }>;
    } = { autoFetchPdf: true },
  ): Promise<RetrievalV3Result> {
    const updatedRecords: CanonicalPaper[] = [];
    const includedList: CanonicalPaper[] = [];
    const excludedList: CanonicalPaper[] = [];
    const unsureList: CanonicalPaper[] = [];
    const fullTextReports: Record<string, FullTextRecordInfo> = {};
    const excludedByReason: Record<string, number> = {};

    let retrievedCount = 0;
    let unretrievedCount = 0;

    const openAlexAdapter = SourceAdapterRegistry.getAdapter("OpenAlex");
    const s2Adapter = SourceAdapterRegistry.getAdapter("Semantic Scholar");

    for (const record of candidateRecords) {
      let status: FullTextStatus = "finding";
      let actualUrl = record.pdfUrl || "";
      let pageCount = record.page_count;
      let checksum = "";
      let pages: { pageNum: number; text: string }[] | undefined;
      let rawText = "";
      let isImagePdf = false;
      let officialVenue = record.venue || "";

      // 1. Kiểm tra nếu người dùng đã upload PDF thủ công cho bài này
      if (options.userPdfs && options.userPdfs.has(record.id)) {
        const userPdf = options.userPdfs.get(record.id)!;
        checksum = this.computeChecksum(userPdf.buffer);
        const uint8 = new Uint8Array(userPdf.buffer.buffer.slice(userPdf.buffer.byteOffset, userPdf.buffer.byteOffset + userPdf.buffer.byteLength));
        const parseRes = await parsePdfBuffer(uint8);
        if (parseRes.success) {
          status = "downloaded";
          pageCount = parseRes.pageCount;
          pages = parseRes.pages;
          rawText = parseRes.rawText || "";
          isImagePdf = parseRes.isImagePdf || false;
          actualUrl = `local_upload://${userPdf.fileName}`;
        }
      }

      // 2. Nếu chưa có PDF và có URL -> thử tải nếu autoFetchPdf = true
      if (status !== "downloaded" && actualUrl && options.autoFetchPdf !== false) {
        try {
          const pdfRes = await parsePdfFromUrl(actualUrl);
          if (pdfRes.success && pdfRes.pages && pdfRes.pages.length > 0) {
            status = "downloaded";
            pageCount = pdfRes.pageCount;
            pages = pdfRes.pages;
            rawText = pdfRes.rawText || "";
            isImagePdf = pdfRes.isImagePdf || false;
          }
        } catch {
          // Chưa đánh dấu unretrievable vội vì còn bước tìm Open Access
        }
      }

      // 3. Nếu vẫn chưa có PDF -> Thử khám phá Open Access URL qua OpenAlex / Unpaywall / Semantic Scholar
      if (status !== "downloaded" && record.doi && options.autoFetchPdf !== false) {
        let oaUrl = "";

        // 3a. OpenAlex OA discovery
        if (openAlexAdapter) {
          try {
            const oaRes = await openAlexAdapter.discoverFullText(record);
            if (oaRes.pdfUrl) oaUrl = oaRes.pdfUrl;
          } catch {
            // ignore
          }
        }

        // 3b. Unpaywall discovery
        if (!oaUrl) {
          try {
            const unpaywall = await UnpaywallService.resolveOpenAccess(record.doi);
            if (unpaywall?.pdfUrl) oaUrl = unpaywall.pdfUrl;
          } catch {
            // ignore
          }
        }

        // 3c. Semantic Scholar discovery (tùy chọn, không bắt buộc)
        if (!oaUrl && s2Adapter) {
          try {
            const s2Res = await s2Adapter.discoverFullText(record);
            if (s2Res.pdfUrl) oaUrl = s2Res.pdfUrl;
          } catch {
            // ignore
          }
        }

        if (oaUrl) {
          actualUrl = oaUrl;
          try {
            const pdfRes = await parsePdfFromUrl(oaUrl);
            if (pdfRes.success && pdfRes.pages && pdfRes.pages.length > 0) {
              status = "downloaded";
              pageCount = pdfRes.pageCount;
              pages = pdfRes.pages;
              rawText = pdfRes.rawText || "";
              isImagePdf = pdfRes.isImagePdf || false;
            }
          } catch {
            status = "network_error";
          }
        }
      }

      // 4. Nếu có DOI, tra cứu Crossref để bổ sung Venue chính thức và publicationType
      if (record.doi) {
        try {
          const crossref = await fetchCrossrefMetadata(record.doi);
          if (crossref?.venue) officialVenue = crossref.venue;
        } catch {
          // ignore
        }
      }

      // 5. Nếu có PDF pages, trích xuất thêm Venue từ Header/Running Head nếu chưa rõ
      if (pages && pages.length > 0 && (!officialVenue || /arxiv/i.test(officialVenue))) {
        const venueExtracted = extractVenueFromPdfPages(pages);
        if (venueExtracted?.venue) officialVenue = venueExtracted.venue;
      }

      // 6. Đánh giá trạng thái thu thập toàn văn
      if (status === "downloaded") {
        retrievedCount++;
      } else {
        unretrievedCount++;
        // Không tự gán EC-A chỉ vì tải lỗi; chỉ ghi nhận trạng thái chưa tải được
        if (status === "finding") {
          status = "paywalled";
        }
      }

      // 7. Chạy phân tích bằng chứng và sàng lọc toàn văn
      const tabData: TabExtractedData = {
        title: record.title,
        authors: record.authors,
        year: record.year,
        venue: officialVenue,
        doi: record.doi,
        abstract: record.abstract,
        pdfUrl: actualUrl,
        sourceUrl: record.url || actualUrl,
        method: status === "downloaded" ? "PDF.js Full-Text Parser" : "Metadata Assessment",
        pages,
        pageCount,
        rawText,
        isImagePdf,
      };

      const analysis = analyzeTabAgainstRecord(record, tabData, profile);

      // 8. Chốt quyết định gợi ý V3
      let suggestedDecision = analysis.suggestedScreeningUpdate?.suggestedDecision || "Unsure";
      let screeningReason = analysis.suggestedScreeningUpdate?.screeningReason || "Đang thẩm định toàn văn V3";

      // Kiểm tra chốt số trang < 4 trang -> EC-S
      if (pageCount && pageCount > 0 && pageCount < 4) {
        suggestedDecision = "Exclude";
        screeningReason = `EC-S — Toàn văn chỉ có ${pageCount} trang (< 4 trang theo protocol); loại trừ bài ngắn/demo.`;
      }

      // Ghi nhận lý do loại trừ chính
      if (suggestedDecision === "Exclude") {
        const matchEc = screeningReason.match(/\b(EC-[A-Z0-9]+)\b/);
        const primaryReason = matchEc ? matchEc[1] : "EC-Other";
        excludedByReason[primaryReason] = (excludedByReason[primaryReason] || 0) + 1;
      }

      const updatedRecord: CanonicalPaper = {
        ...record,
        pipelineStage: "V3",
        screeningStage: "V2", // giữ V2/V3 tương thích
        suggestedDecision,
        screeningReason,
        matchedCriteria: analysis.suggestedScreeningUpdate?.matchedCriteria || record.matchedCriteria,
        unknownCriteria: analysis.suggestedScreeningUpdate?.unknownCriteria || record.unknownCriteria,
        missingEvidence: analysis.suggestedScreeningUpdate?.missingEvidence || record.missingEvidence,
        page_count: pageCount,
        pdfUrl: actualUrl || record.pdfUrl,
        evidence_snippets: analysis.evidence,
        isPdfVerified: status === "downloaded",
        venue: officialVenue,
        fullTextStatus: status,
      };

      fullTextReports[record.id] = {
        paperId: record.id,
        status,
        officialVenue,
        actualFullTextUrl: actualUrl,
        pageCount,
        pdfChecksum: checksum,
        downloadedAt: status === "downloaded" ? new Date().toISOString() : undefined,
        extractionMethod: tabData.method,
        ocrStatus: isImagePdf ? "unsupported" : "not_needed",
        metadataMatchConfidence: analysis.titleMatchConfidence,
        isPaywalled: status === "paywalled",
      };

      updatedRecords.push(updatedRecord);
      if (suggestedDecision === "Include") includedList.push(updatedRecord);
      else if (suggestedDecision === "Exclude") excludedList.push(updatedRecord);
      else unsureList.push(updatedRecord);
    }

    return {
      records: updatedRecords,
      includedCandidates: includedList,
      excludedRecords: excludedList,
      unsureRecords: unsureList,
      fullTextReports,
      stats: {
        totalAssessed: updatedRecords.length,
        retrievedSuccessfully: retrievedCount,
        unretrieved: unretrievedCount,
        suggestedInclude: includedList.length,
        suggestedExclude: excludedList.length,
        suggestedUnsure: unsureList.length,
        excludedByReason,
      },
    };
  }
}
