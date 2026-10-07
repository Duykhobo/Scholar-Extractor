import { ProjectStore } from "../db/projectStore";
import { PrismaCalculator } from "./prismaCalculator";
import { EvidenceService } from "./evidenceService";
import { ValidationReport } from "../types";

export class ValidationService {
  /**
   * Kiểm tra toàn diện tính toàn vẹn và hợp lệ của dự án Literature Review
   */
  static validate(projectId: string): ValidationReport {
    const project = ProjectStore.getProject(projectId);
    const records = ProjectStore.getRecords(projectId);
    const duplicates = ProjectStore.getDuplicateCandidates(projectId);
    const allDecisions = ProjectStore.getAllDecisions(projectId);
    const fullTextAttempts = ProjectStore.getFullTextAttempts(projectId);
    const metrics = PrismaCalculator.calculate(projectId);
    const evValidation = EvidenceService.validateEvidenceCompleteness(projectId);

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    // 1. Kiểm tra Pending Counts
    let v1Pending = 0;
    let v2Pending = 0;
    let fullTextPending = 0;
    let outdatedDecisions = 0;
    let missingReasonCount = 0;

    for (const rec of records) {
      const decList = allDecisions.get(rec.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      const v2Dec = decList.find((d) => d.stage === "v2");

      // V1 check
      if (!v1Dec || v1Dec.decision === "PENDING") {
        v1Pending += 1;
      } else {
        if (v1Dec.decision === "EXCLUDE" && (!v1Dec.primaryReasonCode || v1Dec.primaryReasonCode.trim() === "")) {
          missingReasonCount += 1;
        }
        if (v1Dec.isOutdated) {
          outdatedDecisions += 1;
        }
      }

      // V2 & Full-text check
      if (v1Dec && (v1Dec.decision === "INCLUDE" || v1Dec.decision === "UNSURE")) {
        const ft = fullTextAttempts.find((f) => f.recordId === rec.id);
        if (!ft || ft.status === "NOT_ATTEMPTED") {
          fullTextPending += 1;
        }

        if (!v2Dec || v2Dec.decision === "PENDING") {
          v2Pending += 1;
        } else {
          if (v2Dec.decision === "EXCLUDE" && (!v2Dec.primaryReasonCode || v2Dec.primaryReasonCode.trim() === "")) {
            missingReasonCount += 1;
          }
          if (v2Dec.isOutdated) {
            outdatedDecisions += 1;
          }
        }
      }
    }

    const unresolvedDuplicates = duplicates.filter((d) => d.status === "unresolved").length;

    // 2. Phân loại Blocking Issues (Chặn xuất FINAL)
    if (v1Pending > 0) {
      blockingIssues.push(`Còn ${v1Pending} bản ghi chưa được sàng lọc ở bước V1 (PENDING).`);
    }
    if (fullTextPending > 0) {
      blockingIssues.push(`Còn ${fullTextPending} bản ghi chưa được kiểm tra thu thập toàn văn (Full-text).`);
    }
    if (v2Pending > 0) {
      blockingIssues.push(`Còn ${v2Pending} bản ghi chưa được đưa ra quyết định sàng lọc V2.`);
    }
    if (unresolvedDuplicates > 0) {
      blockingIssues.push(`Còn ${unresolvedDuplicates} cặp bản ghi nghi trùng chưa được giải quyết.`);
    }
    if (missingReasonCount > 0) {
      blockingIssues.push(`Có ${missingReasonCount} quyết định EXCLUDE thiếu lý do bắt buộc (primary exclusion reason).`);
    }
    if (outdatedDecisions > 0) {
      blockingIssues.push(`Có ${outdatedDecisions} quyết định bị lỗi thời (outdated) cần rà soát lại sau khi cập nhật Protocol.`);
    }
    if (evValidation.missingEvidenceRecordIds.length > 0) {
      blockingIssues.push(
        `Có ${evValidation.missingEvidenceRecordIds.length} bài đạt chuẩn FINAL INCLUDE nhưng chưa có bản ghi trong bảng Evidence: [${evValidation.missingEvidenceRecordIds.join(", ")}].`
      );
    }
    if (!metrics.balanceCheck.overallConsistent) {
      blockingIssues.push(`Số liệu PRISMA 2020 không cân bằng: ${metrics.balanceCheck.discrepancies.join("; ")}`);
    }

    // 3. Warnings (Cảnh báo chất lượng)
    if (evValidation.incompleteCitations.length > 0) {
      warnings.push(
        `Có ${evValidation.incompleteCitations.length} bài có ô Evidence thiếu trường thông tin cốt lõi (kết quả, tool, dataset hoặc metric).`
      );
    }
    if (evValidation.insufficientEvidenceRecords.length > 0) {
      warnings.push(
        `Có ${evValidation.insufficientEvidenceRecords.length} bài bị gắn cờ "insufficient_evidence" (không đủ bằng chứng xác thực).`
      );
    }

    // Kiểm tra container proceedings
    const containerCount = records.filter((r) => r.isContainer).length;
    if (containerCount > 0) {
      warnings.push(
        `Dự án có chứa ${containerCount} tập kỷ yếu/container proceedings (cần đảm bảo không tính trùng số lượng bài đơn).`
      );
    }

    const status: "DRAFT" | "FINAL" = blockingIssues.length === 0 ? "FINAL" : "DRAFT";

    return {
      projectId,
      timestamp: new Date().toISOString(),
      isBalanced: metrics.balanceCheck.overallConsistent,
      prismaNumbers: {
        totalRawOccurrences: metrics.identification.totalRawOccurrences,
        duplicatesRemoved: metrics.identification.duplicatesRemoved,
        recordsScreenedV1: metrics.screeningV1.recordsScreened,
        excludedV1: metrics.screeningV1.excluded,
        passedV1: metrics.screeningV1.passedV1,
        reportsSought: metrics.retrievalV2.reportsSought,
        reportsNotRetrieved: metrics.retrievalV2.reportsNotRetrieved,
        reportsAssessedV2: metrics.screeningV2.reportsAssessed,
        excludedV2: metrics.screeningV2.excluded,
        includedFinal: metrics.screeningV2.includedFinal,
      },
      blockingIssues,
      warnings,
      pendingCounts: {
        v1Pending,
        v2Pending,
        fullTextPending,
        unresolvedDuplicates,
        outdatedDecisions,
      },
      status,
    };
  }

  /**
   * Sinh file `validation-report.md`
   */
  static generateValidationMarkdown(projectId: string): string {
    const report = this.validate(projectId);
    const project = ProjectStore.getProject(projectId);

    let md = `# Validation Report — ${project?.name || "Literature Review"}\n\n`;
    md += `*Thời gian kiểm tra: ${report.timestamp}*\n`;
    md += `*Trạng thái xuất bản*: **${report.status === "FINAL" ? "🟢 FINAL (Đủ điều kiện chốt)" : "🟡 DRAFT (Còn công việc tồn đọng)"}**\n\n`;

    md += `## 1. Tóm tắt số liệu dòng chảy PRISMA\n\n`;
    md += `| Chỉ số | Giá trị |\n`;
    md += `|---|---|\n`;
    md += `| Tổng số raw occurrences | ${report.prismaNumbers.totalRawOccurrences} |\n`;
    md += `| Trùng lặp đã loại bỏ | ${report.prismaNumbers.duplicatesRemoved} |\n`;
    md += `| Bản ghi duy nhất sàng lọc V1 | ${report.prismaNumbers.recordsScreenedV1} |\n`;
    md += `| Loại bỏ V1 (Excluded V1) | ${report.prismaNumbers.excludedV1} |\n`;
    md += `| Vượt qua V1 (Passed V1: Include + Unsure) | ${report.prismaNumbers.passedV1} |\n`;
    md += `| Báo cáo tìm toàn văn (Reports sought) | ${report.prismaNumbers.reportsSought} |\n`;
    md += `| Không tìm được toàn văn (Not retrieved) | ${report.prismaNumbers.reportsNotRetrieved} |\n`;
    md += `| Báo cáo đánh giá V2 (Assessed V2) | ${report.prismaNumbers.reportsAssessedV2} |\n`;
    md += `| Loại bỏ V2 (Excluded V2) | ${report.prismaNumbers.excludedV2} |\n`;
    md += `| **Tổng nghiên cứu Included chính thức (FINAL)** | **${report.prismaNumbers.includedFinal}** |\n\n`;

    md += `## 2. Công việc đang chờ xử lý (Pending Work)\n\n`;
    md += `- Bản ghi chờ sàng lọc V1: **${report.pendingCounts.v1Pending}**\n`;
    md += `- Bản ghi chờ tìm toàn văn: **${report.pendingCounts.fullTextPending}**\n`;
    md += `- Bản ghi chờ sàng lọc V2: **${report.pendingCounts.v2Pending}**\n`;
    md += `- Cặp nghi trùng chờ giải quyết: **${report.pendingCounts.unresolvedDuplicates}**\n`;
    md += `- Quyết định cần rà soát lại (outdated): **${report.pendingCounts.outdatedDecisions}**\n\n`;

    md += `## 3. Các vấn đề chặn xuất bản FINAL (Blocking Issues)\n\n`;
    if (report.blockingIssues.length === 0) {
      md += `*Không có vấn đề chặn nào. Dự án đủ điều kiện phát hành bản FINAL.*\n\n`;
    } else {
      for (const issue of report.blockingIssues) {
        md += `- ❌ **CHẶN**: ${issue}\n`;
      }
      md += `\n`;
    }

    md += `## 4. Các cảnh báo và khuyến nghị (Warnings)\n\n`;
    if (report.warnings.length === 0) {
      md += `*Không có cảnh báo.*\n\n`;
    } else {
      for (const warn of report.warnings) {
        md += `- ⚠️ **CẢNH BÁO**: ${warn}\n`;
      }
      md += `\n`;
    }

    return md;
  }
}
