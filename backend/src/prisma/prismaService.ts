import { CanonicalPaper, PaperRecord, PrismaData, PrismaDrilldownCell } from "../types";

export class PrismaService {
  /**
   * Tính toán ma trận số liệu PRISMA 2020 toán học chuẩn xác, kèm danh sách paper IDs cho từng ô
   */
  static calculatePrismaFlow(params: {
    rawRecords: PaperRecord[];
    canonicalRecords: CanonicalPaper[];
    duplicatesRemovedCount: number;
    duplicateRecordIds?: string[];
  }): PrismaData {
    const { rawRecords, canonicalRecords, duplicatesRemovedCount, duplicateRecordIds = [] } = params;

    // 1. Nhận diện (Identification) - Phân tách theo nguồn
    const dbSources: Record<string, PrismaDrilldownCell> = {};
    const otherSources: Record<string, PrismaDrilldownCell> = {};
    const rawAllIds: string[] = [];

    for (const record of rawRecords) {
      rawAllIds.push(record.id);
      const src = record.source || "Unknown";
      const method = record.collectionMethod || "";

      // Phân nhóm: Database searches vs Other methods (Snowballing, TOC expansion, Manual import)
      const isOtherMethod =
        method.includes("snowball") ||
        method.includes("toc_expansion") ||
        src.toLowerCase().includes("snowball");

      if (isOtherMethod) {
        if (!otherSources[src]) otherSources[src] = { count: 0, paperIds: [] };
        otherSources[src].count++;
        otherSources[src].paperIds.push(record.id);
      } else {
        if (!dbSources[src]) dbSources[src] = { count: 0, paperIds: [] };
        dbSources[src].count++;
        dbSources[src].paperIds.push(record.id);
      }
    }

    const totalDbCount = Object.values(dbSources).reduce((acc, c) => acc + c.count, 0);
    const totalDbIds = Object.values(dbSources).flatMap((c) => c.paperIds);

    const totalOtherCount = Object.values(otherSources).reduce((acc, c) => acc + c.count, 0);
    const totalOtherIds = Object.values(otherSources).flatMap((c) => c.paperIds);

    // 2. Loại trùng & Pre-screening (V1)
    const containerRecords = canonicalRecords.filter((r) => r.isContainer);
    const containerIds = containerRecords.map((r) => r.id);

    // 3. Sàng lọc Tiêu đề / Tóm tắt (V2) - Tách biệt rõ ràng với V3
    const screenedV2All = canonicalRecords.filter(
      (r) =>
        r.isContainer ||
        r.v2Decision !== undefined ||
        r.pipelineStage === "V2" ||
        r.pipelineStage === "V3" ||
        r.pipelineStage === "FINAL" ||
        r.screeningStage === "V2" ||
        r.screeningStage === "V3",
    );
    const unscreenedV2Records = canonicalRecords.filter((r) => !screenedV2All.includes(r));

    // Excluded tại V2: Container hoặc bị loại rõ ràng ở V2
    const excludedV2Records = screenedV2All.filter(
      (r) =>
        r.isContainer ||
        r.v2Decision === "Exclude" ||
        (r.v2Decision === undefined && r.pipelineStage === "V2" && r.suggestedDecision === "Exclude"),
    );

    // Passed tại V2: Được quyết định PassToFullText tại V2 (hoặc suggested Include khi chưa có v2Decision)
    // KHÔNG viết đè kết quả V2 thành Pass chỉ vì paper được chuyển sang V3!
    const passedV2Records = screenedV2All.filter(
      (r) =>
        !r.isContainer &&
        !excludedV2Records.includes(r) &&
        (r.v2Decision === "PassToFullText" ||
          (r.v2Decision === undefined && (r.suggestedDecision === "Include" || r.pipelineStage === "V3" || r.pipelineStage === "FINAL"))),
    );

    // Unsure tại V2: Bảo lưu quyết định V2 Unsure ngay cả khi sau đó bài được chọn chuyển tiếp sang V3
    const unsureV2Records = screenedV2All.filter(
      (r) => !r.isContainer && !excludedV2Records.includes(r) && !passedV2Records.includes(r),
    );

    const excludedByReasonV2: Record<string, PrismaDrilldownCell> = {};
    for (const rec of excludedV2Records) {
      let reasonKey = "EC-Other";
      if (rec.isContainer) reasonKey = "EC-N (Tập kỷ yếu/Container)";
      else {
        const m = (rec.screeningReason || "").match(/\b(EC-[A-Z0-9]+)\b/);
        if (m) reasonKey = m[1];
      }
      if (!excludedByReasonV2[reasonKey]) excludedByReasonV2[reasonKey] = { count: 0, paperIds: [] };
      excludedByReasonV2[reasonKey].count++;
      excludedByReasonV2[reasonKey].paperIds.push(rec.id);
    }

    // 4. Sàng lọc Toàn văn (V3)
    // Sought for retrieval: Tất cả bài thực tế được chọn đưa vào tìm kiếm toàn văn
    // (Bao gồm các bài PassToFullText VÀ các bài Unsure được người dùng chuyển tiếp sang V3)
    const soughtForRetrieval = canonicalRecords.filter(
      (r) =>
        !r.isContainer &&
        !excludedV2Records.includes(r) &&
        (r.pipelineStage === "V3" ||
          r.pipelineStage === "FINAL" ||
          r.v2Decision === "PassToFullText" ||
          r.fullTextStatus !== undefined ||
          r.pdfUrl !== undefined),
    );

    // Not retrieved: Các bài thất bại khi tìm hoặc tải toàn văn
    const notRetrievedRecords = soughtForRetrieval.filter(
      (r) =>
        r.fullTextStatus === "paywalled" ||
        r.fullTextStatus === "not_found" ||
        r.fullTextStatus === "confirmed_unretrievable" ||
        r.fullTextStatus === "network_error" ||
        r.fullTextStatus === "extraction_failed",
    );

    // Assessed eligibility: Các bài thực sự tải và đọc được toàn văn
    // KHẮC PHỤC LỖI ĐẾM ĐÚP: Loại trừ toàn bộ các bài thuộc notRetrievedRecords ngay cả khi có page_count cũ
    const assessedEligibility = soughtForRetrieval.filter(
      (r) =>
        !notRetrievedRecords.includes(r) &&
        (r.fullTextStatus === "downloaded" ||
          r.isPdfVerified ||
          (r.page_count !== undefined && r.page_count > 0 && r.fullTextStatus !== "finding")),
    );

    const pendingV3Retrieval = soughtForRetrieval.filter(
      (r) => !notRetrievedRecords.includes(r) && !assessedEligibility.includes(r),
    );

    const excludedV3Records = assessedEligibility.filter(
      (r) =>
        r.v3Decision === "Exclude" ||
        r.finalDecision === "Exclude" ||
        (r.v3Decision === undefined && r.pipelineStage === "V3" && r.suggestedDecision === "Exclude"),
    );
    const unsureV3Records = assessedEligibility.filter(
      (r) =>
        (r.v3Decision === "Unsure" || r.suggestedDecision === "Unsure") &&
        !excludedV3Records.includes(r) &&
        r.finalDecision !== "Include",
    );

    const excludedByReasonV3: Record<string, PrismaDrilldownCell> = {};
    for (const rec of excludedV3Records) {
      let reasonKey = "EC-Other";
      const m = (rec.screeningReason || "").match(/\b(EC-[A-Z0-9]+)\b/);
      if (m) reasonKey = m[1];
      if (!excludedByReasonV3[reasonKey]) excludedByReasonV3[reasonKey] = { count: 0, paperIds: [] };
      excludedByReasonV3[reasonKey].count++;
      excludedByReasonV3[reasonKey].paperIds.push(rec.id);
    }

    // 5. Chốt Include: CHỈ tính các bài người dùng đã chốt finalDecision === "Include"
    const finalIncludedRecords = canonicalRecords.filter((r) => r.finalDecision === "Include");

    // Pending check: Kiểm tra TOÀN BỘ các bài chưa có finalDecision ở các bước đã tiến hành
    const unconfirmedInPipeline = canonicalRecords.filter(
      (r) =>
        !r.isContainer &&
        r.finalDecision === "" &&
        (r.pipelineStage === "V3" ||
          r.pipelineStage === "FINAL" ||
          assessedEligibility.includes(r) ||
          (r.pipelineStage === "V2" && r.suggestedDecision === "Include")),
    );

    const hasPending =
      unscreenedV2Records.length > 0 ||
      unsureV2Records.length > 0 ||
      pendingV3Retrieval.length > 0 ||
      unsureV3Records.length > 0 ||
      unconfirmedInPipeline.length > 0;

    // isFinal = true khi toàn bộ bài đều đã được quyết định và không còn bài pending
    // Cho phép hoàn tất ngay cả khi kết quả có 0 bài Include (toàn bộ bị Exclude)
    const isFinal = Boolean(canonicalRecords.length > 0 && !hasPending);

    return {
      databases: dbSources,
      totalDatabaseRecords: { count: totalDbCount, paperIds: totalDbIds },
      otherMethods: otherSources,
      totalOtherRecords: { count: totalOtherCount, paperIds: totalOtherIds },
      totalRawIdentified: { count: rawRecords.length, paperIds: rawAllIds },

      duplicatesRemoved: { count: duplicatesRemovedCount, paperIds: duplicateRecordIds },
      recordsMarkedContainers: { count: containerRecords.length, paperIds: containerIds },
      recordsAfterDuplicates: { count: canonicalRecords.length, paperIds: canonicalRecords.map((r) => r.id) },

      screenedTitleAbstract: { count: screenedV2All.length, paperIds: screenedV2All.map((r) => r.id) },
      excludedTitleAbstract: { count: excludedV2Records.length, paperIds: excludedV2Records.map((r) => r.id) },
      excludedByReasonV2,
      passedToFullText: { count: passedV2Records.length, paperIds: passedV2Records.map((r) => r.id) },
      unsureTitleAbstract: { count: unsureV2Records.length, paperIds: unsureV2Records.map((r) => r.id) },

      reportsSoughtForRetrieval: { count: soughtForRetrieval.length, paperIds: soughtForRetrieval.map((r) => r.id) },
      reportsNotRetrieved: { count: notRetrievedRecords.length, paperIds: notRetrievedRecords.map((r) => r.id) },
      reportsAssessedForEligibility: { count: assessedEligibility.length, paperIds: assessedEligibility.map((r) => r.id) },
      reportsPendingRetrieval: { count: pendingV3Retrieval.length, paperIds: pendingV3Retrieval.map((r) => r.id) },
      excludedFullText: { count: excludedV3Records.length, paperIds: excludedV3Records.map((r) => r.id) },
      excludedByReasonV3,
      unsureFullText: { count: unsureV3Records.length, paperIds: unsureV3Records.map((r) => r.id) },

      studiesIncluded: { count: finalIncludedRecords.length, paperIds: finalIncludedRecords.map((r) => r.id) },
      reportsIncluded: { count: finalIncludedRecords.length, paperIds: finalIncludedRecords.map((r) => r.id) },

      isFinal,
      hasPending,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Tạo văn bản Markdown prisma-flow.md chuẩn xác 100%
   */
  static generatePrismaMarkdown(data: PrismaData, researchName: string = "SWT302 REST API Testing"): string {
    const lines: string[] = [];

    lines.push(`# Sơ đồ luồng PRISMA 2020 — ${researchName}`);
    lines.push(`*Tự động sinh bởi Scholar Extractor · Cập nhật: ${new Date().toLocaleDateString("vi-VN")} · Trạng thái: ${data.isFinal ? "Hoàn tất (Final)" : "Đang xử lý (In-Progress)"}*\n`);

    lines.push("## 1. Nhận diện (Identification)");
    lines.push("| Nguồn / Phương thức tìm kiếm | Số bản ghi (Records) |");
    lines.push("|---|---|");
    for (const [src, cell] of Object.entries(data.databases)) {
      lines.push(`| Cơ sở dữ liệu: ${src} | ${cell.count} |`);
    }
    for (const [src, cell] of Object.entries(data.otherMethods)) {
      lines.push(`| Phương pháp khác: ${src} | ${cell.count} |`);
    }
    lines.push(`| **Tổng số bản ghi thô thu thập (B1)** | **${data.totalRawIdentified.count}** |`);
    lines.push(`| Trùng lặp loại bỏ (V1 Dedup) | ${data.duplicatesRemoved.count} |`);
    lines.push(`| **Bản ghi duy nhất sau loại trùng (V1 Output)** | **${data.recordsAfterDuplicates.count}** |\n`);

    lines.push("## 2. Sàng lọc Tiêu đề & Tóm tắt (V2 Screening)");
    lines.push("| Tiêu chí / Bước | Số lượng |");
    lines.push("|---|---|");
    lines.push(`| Bản ghi đưa vào sàng lọc tiêu đề/tóm tắt | **${data.screenedTitleAbstract.count}** |`);
    lines.push(`| Bị loại tại vòng tiêu đề/tóm tắt | **${data.excludedTitleAbstract.count}** |`);
    for (const [reason, cell] of Object.entries(data.excludedByReasonV2)) {
      lines.push(`|  — Lý do loại: ${reason} | ${cell.count} |`);
    }
    lines.push(`| Chưa rõ (Unsure, bảo lưu để đọc toàn văn) | ${data.unsureTitleAbstract.count} |`);
    lines.push(`| **Đạt điều kiện vào vòng toàn văn (PassToFullText)** | **${data.passedToFullText.count}** |\n`);

    lines.push("## 3. Tìm kiếm Toàn văn & Đánh giá Tính phù hợp (V3 Full-Text)");
    lines.push("| Tiêu chí / Bước | Số lượng |");
    lines.push("|---|---|");
    lines.push(`| Báo cáo cần tìm toàn văn (Reports sought for retrieval) | **${data.reportsSoughtForRetrieval.count}** |`);
    lines.push(`| Báo cáo không tải được (Not retrieved / Paywalled) | ${data.reportsNotRetrieved.count} |`);
    lines.push(`| Báo cáo đã tiếp cận và đọc toàn văn (Assessed for eligibility) | **${data.reportsAssessedForEligibility.count}** |`);
    lines.push(`| Bị loại sau khi đọc toàn văn | **${data.excludedFullText.count}** |`);
    for (const [reason, cell] of Object.entries(data.excludedByReasonV3)) {
      lines.push(`|  — Lý do loại toàn văn: ${reason} | ${cell.count} |`);
    }
    lines.push(`| Chưa rõ / Chờ xác minh thêm | ${data.unsureFullText.count} |\n`);

    lines.push("## 4. Nghiên cứu được chọn (Included)");
    lines.push("| Kết quả cuối cùng | Số lượng |");
    lines.push("|---|---|");
    lines.push(`| **Tổng số nghiên cứu được đưa vào tổng quan (Studies included)** | **${data.studiesIncluded.count}** |`);
    lines.push(`| Tổng số báo cáo/bài báo tương ứng (Reports included) | **${data.reportsIncluded.count}** |\n`);

    // Thực hiện đối soát số học chính xác
    const isIdBalanced =
      data.totalDatabaseRecords.count + data.totalOtherRecords.count === data.totalRawIdentified.count;
    const isDedupBalanced =
      data.totalRawIdentified.count - data.duplicatesRemoved.count === data.recordsAfterDuplicates.count;
    const isV2Balanced =
      data.passedToFullText.count + data.excludedTitleAbstract.count + data.unsureTitleAbstract.count ===
      data.screenedTitleAbstract.count;
    const pendingRetrievalCount = data.reportsPendingRetrieval ? data.reportsPendingRetrieval.count : 0;
    const isV3Balanced =
      data.reportsAssessedForEligibility.count + data.reportsNotRetrieved.count + pendingRetrievalCount ===
      data.reportsSoughtForRetrieval.count;

    lines.push("## 5. Đối soát cân bằng toán học (Check balance)");
    lines.push(
      `- Cân bằng Identification: ${data.totalDatabaseRecords.count} + ${data.totalOtherRecords.count} = ${data.totalRawIdentified.count} ${isIdBalanced ? "✓ Cân bằng" : "❌ LỆCH"}`,
    );
    lines.push(
      `- Cân bằng Dedup: ${data.totalRawIdentified.count} - ${data.duplicatesRemoved.count} = ${data.recordsAfterDuplicates.count} ${isDedupBalanced ? "✓ Cân bằng" : "❌ LỆCH"}`,
    );
    lines.push(
      `- Cân bằng Screening V2: ${data.passedToFullText.count} (Pass) + ${data.excludedTitleAbstract.count} (Exclude) + ${data.unsureTitleAbstract.count} (Unsure) = ${data.screenedTitleAbstract.count} ${isV2Balanced ? "✓ Cân bằng" : "❌ LỆCH"}`,
    );
    const pendingText = pendingRetrievalCount > 0 ? ` + ${pendingRetrievalCount} (Đang chờ/Pending)` : "";
    lines.push(
      `- Cân bằng Retrieval V3: ${data.reportsAssessedForEligibility.count} (Đọc được) + ${data.reportsNotRetrieved.count} (Không tải được)${pendingText} = ${data.reportsSoughtForRetrieval.count} ${isV3Balanced ? "✓ Cân bằng" : "❌ LỆCH"}`,
    );

    return lines.join("\n");
  }
}
