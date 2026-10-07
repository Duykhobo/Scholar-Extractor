import { ProjectStore } from "../db/projectStore";
import { CanonicalRecord, ScreeningDecision, FullTextAttempt, SearchRun } from "../types";

export interface PrismaMetrics {
  identification: {
    databasesTotal: number;
    databasesBySource: Record<string, number>;
    otherMethodsTotal: number;
    otherMethodsBySource: Record<string, number>;
    totalRawOccurrences: number;
    duplicatesRemoved: number;
    canonicalRecords: number;
  };
  screeningV1: {
    recordsScreened: number;
    excluded: number;
    excludedByReason: Record<string, number>;
    passedV1: number; // Include + Unsure
    includeV1: number;
    unsureV1: number;
    pendingV1: number;
  };
  retrievalV2: {
    reportsSought: number;
    reportsNotRetrieved: number;
    reportsRetrieved: number;
    pendingRetrieval: number;
  };
  screeningV2: {
    reportsAssessed: number;
    excluded: number;
    excludedByReason: Record<string, number>;
    includedFinal: number;
    pendingV2: number;
  };
  balanceCheck: {
    isRawBalanced: boolean;
    isV1Balanced: boolean;
    isV2Balanced: boolean;
    overallConsistent: boolean;
    discrepancies: string[];
  };
}

export class PrismaCalculator {
  /**
   * Tính toán các chỉ số PRISMA 2020 từ cơ sở dữ liệu thực tế của Project
   */
  static calculate(projectId: string): PrismaMetrics {
    const records = ProjectStore.getRecords(projectId);
    const runs = ProjectStore.getSearchRuns(projectId);
    const duplicates = ProjectStore.getDuplicateCandidates(projectId);
    const allDecisions = ProjectStore.getAllDecisions(projectId);
    const fullTextAttempts = ProjectStore.getFullTextAttempts(projectId);

    // 1. Identification
    let databasesTotal = 0;
    const databasesBySource: Record<string, number> = {};
    let otherMethodsTotal = 0;
    const otherMethodsBySource: Record<string, number> = {};

    let totalRawOccurrences = 0;
    for (const rec of records) {
      const occurrences = rec.searchOccurrences || [];
      if (occurrences.length === 0) {
        // Nếu không có occurrence cụ thể, đếm chính nó theo rec.source
        totalRawOccurrences += 1;
        const src = rec.source || "Unknown";
        if (src.toLowerCase().includes("snowball") || src.toLowerCase().includes("manual")) {
          otherMethodsTotal += 1;
          otherMethodsBySource[src] = (otherMethodsBySource[src] || 0) + 1;
        } else {
          databasesTotal += 1;
          databasesBySource[src] = (databasesBySource[src] || 0) + 1;
        }
      } else {
        totalRawOccurrences += occurrences.length;
        for (const occ of occurrences) {
          const src = occ.source || "Unknown";
          if (src.toLowerCase().includes("snowball") || src.toLowerCase().includes("manual")) {
            otherMethodsTotal += 1;
            otherMethodsBySource[src] = (otherMethodsBySource[src] || 0) + 1;
          } else {
            databasesTotal += 1;
            databasesBySource[src] = (databasesBySource[src] || 0) + 1;
          }
        }
      }
    }

    // Nếu có runs với rawCount, đối chiếu
    const canonicalCount = records.length;
    const duplicatesRemoved = totalRawOccurrences > canonicalCount ? totalRawOccurrences - canonicalCount : 0;

    // 2. Screening V1
    let excludedV1 = 0;
    const excludedByReasonV1: Record<string, number> = {};
    let includeV1 = 0;
    let unsureV1 = 0;
    let pendingV1 = 0;

    for (const rec of records) {
      const decList = allDecisions.get(rec.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      if (!v1Dec || v1Dec.decision === "PENDING") {
        pendingV1 += 1;
      } else if (v1Dec.decision === "EXCLUDE") {
        excludedV1 += 1;
        const reason = v1Dec.primaryReasonCode || "Khác";
        excludedByReasonV1[reason] = (excludedByReasonV1[reason] || 0) + 1;
      } else if (v1Dec.decision === "INCLUDE") {
        includeV1 += 1;
      } else if (v1Dec.decision === "UNSURE") {
        unsureV1 += 1;
      }
    }

    const passedV1 = includeV1 + unsureV1;
    const recordsScreenedV1 = canonicalCount;

    // 3. Retrieval V2 (Reports sought)
    // Các bài passed V1 (Include + Unsure) đều được chuyển sang tìm full-text
    const reportsSought = passedV1;
    let reportsNotRetrieved = 0;
    let reportsRetrieved = 0;
    let pendingRetrieval = 0;

    const ftMap = new Map<string, FullTextAttempt>();
    fullTextAttempts.forEach((ft) => ftMap.set(ft.recordId, ft));

    for (const rec of records) {
      const decList = allDecisions.get(rec.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      if (!v1Dec || (v1Dec.decision !== "INCLUDE" && v1Dec.decision !== "UNSURE")) continue;

      const ft = ftMap.get(rec.id);
      if (!ft || ft.status === "NOT_ATTEMPTED") {
        pendingRetrieval += 1;
      } else if (ft.status === "UNAVAILABLE") {
        reportsNotRetrieved += 1;
      } else if (ft.status === "FOUND") {
        reportsRetrieved += 1;
      }
    }

    // 4. Screening V2 (Reports assessed)
    // Những bài tìm được fulltext sẽ được đánh giá V2
    const reportsAssessed = reportsRetrieved;
    let excludedV2 = 0;
    const excludedByReasonV2: Record<string, number> = {};
    let includedFinal = 0;
    let pendingV2 = 0;

    for (const rec of records) {
      const decList = allDecisions.get(rec.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      if (!v1Dec || (v1Dec.decision !== "INCLUDE" && v1Dec.decision !== "UNSURE")) continue;

      const ft = ftMap.get(rec.id);
      // Nếu bài tìm được full-text hoặc được đưa vào V2
      const v2Dec = decList.find((d) => d.stage === "v2");
      if (!v2Dec || v2Dec.decision === "PENDING") {
        if (ft?.status === "FOUND") pendingV2 += 1;
      } else if (v2Dec.decision === "EXCLUDE") {
        excludedV2 += 1;
        const reason = v2Dec.primaryReasonCode || "Khác";
        excludedByReasonV2[reason] = (excludedByReasonV2[reason] || 0) + 1;
      } else if (v2Dec.decision === "INCLUDE") {
        includedFinal += 1;
      }
    }

    // 5. Cân bằng số học (Balance Check)
    const discrepancies: string[] = [];
    const isRawBalanced = totalRawOccurrences - duplicatesRemoved === canonicalCount;
    if (!isRawBalanced) {
      discrepancies.push(
        `Mất cân bằng Identification: Tổng raw (${totalRawOccurrences}) - Trùng (${duplicatesRemoved}) != Canonical (${canonicalCount})`
      );
    }

    const isV1Balanced = excludedV1 + passedV1 + pendingV1 === recordsScreenedV1;
    if (!isV1Balanced) {
      discrepancies.push(
        `Mất cân bằng V1: Excluded (${excludedV1}) + Passed (${passedV1}) + Pending (${pendingV1}) != Screened (${recordsScreenedV1})`
      );
    }

    const isV2Balanced = reportsRetrieved === excludedV2 + includedFinal + pendingV2;
    if (!isV2Balanced) {
      discrepancies.push(
        `Mất cân bằng V2: Đã truy cập (${reportsRetrieved}) != Excluded (${excludedV2}) + Included (${includedFinal}) + Pending (${pendingV2})`
      );
    }

    return {
      identification: {
        databasesTotal,
        databasesBySource,
        otherMethodsTotal,
        otherMethodsBySource,
        totalRawOccurrences,
        duplicatesRemoved,
        canonicalRecords: canonicalCount,
      },
      screeningV1: {
        recordsScreened: recordsScreenedV1,
        excluded: excludedV1,
        excludedByReason: excludedByReasonV1,
        passedV1,
        includeV1,
        unsureV1,
        pendingV1,
      },
      retrievalV2: {
        reportsSought,
        reportsNotRetrieved,
        reportsRetrieved,
        pendingRetrieval,
      },
      screeningV2: {
        reportsAssessed,
        excluded: excludedV2,
        excludedByReason: excludedByReasonV2,
        includedFinal,
        pendingV2,
      },
      balanceCheck: {
        isRawBalanced,
        isV1Balanced,
        isV2Balanced,
        overallConsistent: isRawBalanced && isV1Balanced && isV2Balanced && discrepancies.length === 0,
        discrepancies,
      },
    };
  }

  /**
   * Sinh báo cáo Markdown luồng PRISMA chuẩn theo mẫu `prisma-flow(1).md`
   */
  static generatePrismaMarkdown(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const metrics = this.calculate(projectId);

    let md = `# PRISMA 2020 Flow Diagram — ${project?.name || "Literature Review"}\n\n`;
    md += `*Thời gian trích xuất: ${new Date().toISOString()}*\n\n`;

    md += `## 1. Identification (Xác định nguồn)\n\n`;
    md += `### Từ cơ sở dữ liệu khoa học / registers:\n`;
    for (const [src, count] of Object.entries(metrics.identification.databasesBySource)) {
      md += `- **${src}**: ${count} bản ghi\n`;
    }
    md += `- **Tổng từ database**: ${metrics.identification.databasesTotal}\n\n`;

    if (metrics.identification.otherMethodsTotal > 0) {
      md += `### Từ các phương thức khác (Snowballing, manual):\n`;
      for (const [src, count] of Object.entries(metrics.identification.otherMethodsBySource)) {
        md += `- **${src}**: ${count} bản ghi\n`;
      }
      md += `- **Tổng phương thức khác**: ${metrics.identification.otherMethodsTotal}\n\n`;
    }

    md += `**Tổng số raw occurrences thu thập**: ${metrics.identification.totalRawOccurrences}\n`;
    md += `**Số bản ghi trùng bị loại**: ${metrics.identification.duplicatesRemoved}\n`;
    md += `**Số bản ghi duy nhất (canonical records) đưa vào sàng lọc**: ${metrics.identification.canonicalRecords}\n\n`;

    md += `## 2. Screening V1 (Sàng lọc Title/Abstract)\n\n`;
    md += `- **Số bản ghi đã sàng lọc**: ${metrics.screeningV1.recordsScreened}\n`;
    md += `- **Số bản ghi bị loại (Excluded V1)**: ${metrics.screeningV1.excluded}\n`;
    md += `  *Phân rã lý do loại V1:*\n`;
    for (const [code, count] of Object.entries(metrics.screeningV1.excludedByReason)) {
      md += `  - **${code}**: ${count}\n`;
    }
    md += `- **Số bản ghi vượt qua V1 chuyển sang V2 (INCLUDE + UNSURE)**: ${metrics.screeningV1.passedV1}\n`;
    md += `  - Tự tin (INCLUDE): ${metrics.screeningV1.includeV1}\n`;
    md += `  - Cần đọc toàn văn để làm rõ (UNSURE): ${metrics.screeningV1.unsureV1}\n`;
    if (metrics.screeningV1.pendingV1 > 0) {
      md += `  - *Còn chờ xử lý (PENDING)*: ${metrics.screeningV1.pendingV1}\n`;
    }
    md += `\n`;

    md += `## 3. Retrieval V2 (Thu thập toàn văn Full-text)\n\n`;
    md += `- **Số báo cáo cần tìm toàn văn (Reports sought)**: ${metrics.retrievalV2.reportsSought}\n`;
    md += `- **Số báo cáo không thể truy cập (Reports not retrieved)**: ${metrics.retrievalV2.reportsNotRetrieved}\n`;
    md += `- **Số báo cáo đã tìm được toàn văn**: ${metrics.retrievalV2.reportsRetrieved}\n`;
    if (metrics.retrievalV2.pendingRetrieval > 0) {
      md += `- *Số báo cáo chưa thực hiện tìm kiếm*: ${metrics.retrievalV2.pendingRetrieval}\n`;
    }
    md += `\n`;

    md += `## 4. Screening V2 & Final Included (Sàng lọc Full-text)\n\n`;
    md += `- **Số báo cáo được đánh giá toàn văn (Reports assessed)**: ${metrics.screeningV2.reportsAssessed}\n`;
    md += `- **Số báo cáo bị loại sau đọc toàn văn (Excluded V2)**: ${metrics.screeningV2.excluded}\n`;
    md += `  *Phân rã lý do loại V2:*\n`;
    for (const [code, count] of Object.entries(metrics.screeningV2.excludedByReason)) {
      md += `  - **${code}**: ${count}\n`;
    }
    md += `- **Số nghiên cứu chính thức được đưa vào tổng quan (Included in review)**: **${metrics.screeningV2.includedFinal}**\n`;
    if (metrics.screeningV2.pendingV2 > 0) {
      md += `- *Số báo cáo V2 còn đang chờ quyết định (PENDING)*: ${metrics.screeningV2.pendingV2}\n`;
    }
    md += `\n`;

    md += `## 5. Kiểm tra cân bằng toán học (Balance & Audit)\n\n`;
    if (metrics.balanceCheck.overallConsistent) {
      md += `✅ **Dữ liệu hoàn toàn cân bằng và nhất quán theo chuẩn PRISMA 2020.**\n`;
    } else {
      md += `⚠️ **CẢNH BÁO MÂU THUẪN HOẶC CHƯA HOÀN THIỆN:**\n`;
      for (const disc of metrics.balanceCheck.discrepancies) {
        md += `- ${disc}\n`;
      }
    }

    return md;
  }
}
