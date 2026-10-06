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

    // 3. Sàng lọc Tiêu đề / Tóm tắt (V2) - Tách biệt với V3
    const screenedV2All = canonicalRecords.filter(
      (r) =>
        r.isContainer ||
        r.v2Decision !== undefined ||
        r.pipelineStage === "V2" ||
        r.pipelineStage === "V3" ||
        r.pipelineStage === "FINAL",
    );
    const unscreenedV2Records = canonicalRecords.filter((r) => !screenedV2All.includes(r));

    // Excluded tại V2: Container hoặc bị loại rõ ràng ở V2 (KHÔNG dùng suggestedDecision nếu đã qua V3)
    const excludedV2Records = screenedV2All.filter(
      (r) =>
        r.isContainer ||
        r.v2Decision === "Exclude" ||
        (r.pipelineStage === "V2" && r.suggestedDecision === "Exclude"),
    );

    // Passed tại V2: Đạt điều kiện để chuyển tiếp sang V3
    const passedV2Records = screenedV2All.filter(
      (r) =>
        !r.isContainer &&
        !excludedV2Records.includes(r) &&
        (r.v2Decision === "PassToFullText" ||
          r.pipelineStage === "V3" ||
          r.pipelineStage === "FINAL" ||
          (r.pipelineStage === "V2" && r.suggestedDecision === "Include")),
    );

    // Unsure tại V2: Còn lại trong các bài đã đưa vào V2
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
    const soughtForRetrieval = passedV2Records;
    const notRetrievedRecords = soughtForRetrieval.filter(
      (r) =>
        r.fullTextStatus === "paywalled" ||
        r.fullTextStatus === "not_found" ||
        r.fullTextStatus === "confirmed_unretrievable" ||
        r.fullTextStatus === "network_error" ||
        r.fullTextStatus === "extraction_failed",
    );
    const assessedEligibility = soughtForRetrieval.filter(
      (r) => r.fullTextStatus === "downloaded" || (r.page_count && r.page_count > 0) || r.isPdfVerified,
    );
    const pendingV3Retrieval = soughtForRetrieval.filter(
      (r) => !notRetrievedRecords.includes(r) && !assessedEligibility.includes(r),
    );

    const excludedV3Records = assessedEligibility.filter(
      (r) =>
        r.v3Decision === "Exclude" ||
        r.finalDecision === "Exclude" ||
        (r.pipelineStage === "V3" && r.suggestedDecision === "Exclude"),
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

    // Pending: Còn bài ở V1 chưa screening, hoặc ở V2/V3 chưa giải quyết, hoặc gợi ý Include nhưng chưa chốt finalDecision
    const unconfirmedInclude = canonicalRecords.filter(
      (r) => r.finalDecision === "" && r.suggestedDecision === "Include" && (r.pipelineStage === "V3" || r.pipelineStage === "FINAL"),
    );

    const hasPending =
      unscreenedV2Records.length > 0 ||
      unsureV2Records.length > 0 ||
      pendingV3Retrieval.length > 0 ||
      unsureV3Records.length > 0 ||
      unconfirmedInclude.length > 0;

    const isFinal = Boolean(canonicalRecords.length > 0 && !hasPending && finalIncludedRecords.length > 0);

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
    const isV3Balanced =
      data.reportsAssessedForEligibility.count + data.reportsNotRetrieved.count ===
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
    lines.push(
      `- Cân bằng Retrieval V3: ${data.reportsAssessedForEligibility.count} (Đọc được) + ${data.reportsNotRetrieved.count} (Không tải được) = ${data.reportsSoughtForRetrieval.count} ${isV3Balanced ? "✓ Cân bằng" : "❌ LỆCH"}`,
    );

    return lines.join("\n");
  }
}
