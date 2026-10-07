import AdmZip from "adm-zip";
import { ProjectStore } from "../db/projectStore";
import { PrismaCalculator } from "./prismaCalculator";
import { EvidenceService } from "./evidenceService";
import { ValidationService } from "./validationService";
import { CanonicalRecord, ScreeningDecision, FullTextAttempt } from "../types";

export class ExportPackageService {
  /**
   * Escape một ô trong file CSV theo chuẩn RFC 4180
   */
  private static escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Tạo dòng CSV từ một mảng các giá trị
   */
  private static toCsvRow(cells: any[]): string {
    return cells.map((c) => this.escapeCsvCell(c)).join(",");
  }

  /**
   * 1. Sinh nội dung review-protocol.md
   */
  static generateReviewProtocol(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const protocols = ProjectStore.getProtocols(projectId);
    const activeProto = protocols.find((p) => p.version === project?.activeProtocolVersion) || protocols[0];

    let md = `# Review Protocol — ${project?.name || "Literature Review"}\n\n`;
    md += `*Mã nghiên cứu / RQ Code*: **${project?.rqCode || "N/A"}**\n`;
    md += `*Nhóm nghiên cứu*: **${project?.teamName || "N/A"}**\n`;
    md += `*Phiên bản Protocol*: **v${activeProto?.version || "1.0"}** (Cập nhật: ${activeProto?.createdAt || new Date().toISOString()})\n\n`;

    md += `## 1. Mục tiêu và Câu hỏi nghiên cứu (Research Questions)\n\n`;
    md += `- **Câu hỏi nghiên cứu (RQ)**: ${project?.rq || "N/A"}\n`;
    if (project?.h0) md += `- **Giả thuyết H0**: ${project.h0}\n`;
    if (project?.h1) md += `- **Giả thuyết H1**: ${project.h1}\n`;
    md += `\n`;

    md += `## 2. Khung nghiên cứu PICO / Framework\n\n`;
    md += `*Khung áp dụng*: **${project?.framework || "PICO"}**\n\n`;
    if (project?.pico) {
      md += `- **Population (P)**: ${project.pico.population || "N/A"}\n`;
      md += `- **Intervention (I)**: ${project.pico.intervention || "N/A"}\n`;
      md += `- **Comparison (C)**: ${project.pico.comparison || "N/A"}\n`;
      md += `- **Outcome (O)**: ${project.pico.outcome || "N/A"}\n`;
    }
    md += `\n`;

    md += `## 3. Thời gian và Phạm vi tìm kiếm\n\n`;
    if (project?.searchPeriod) {
      md += `- Ngày bắt đầu: ${project.searchPeriod.startDate || "N/A"}\n`;
      md += `- Ngày kết thúc: ${project.searchPeriod.endDate || "N/A"}\n`;
      md += `- Timezone: ${project.searchPeriod.timezone || "Asia/Ho_Chi_Minh"}\n`;
    }
    md += `- Ngôn ngữ báo cáo: ${project?.reportLanguage === "vi" ? "Tiếng Việt" : "Tiếng Anh"}\n\n`;

    md += `## 4. Lịch sử các phiên bản Protocol\n\n`;
    md += `| Phiên bản | Ngày tạo | Người sửa | Lý do thay đổi |\n`;
    md += `|---|---|---|---|\n`;
    for (const p of protocols) {
      md += `| v${p.version} | ${p.createdAt} | ${p.createdBy || "Reviewer"} | ${p.changeReason || "Khởi tạo ban đầu"} |\n`;
    }

    return md;
  }

  /**
   * 2. Sinh nội dung ie_criteria.md
   */
  static generateIeCriteria(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const protocols = ProjectStore.getProtocols(projectId);
    const activeProto = protocols.find((p) => p.version === project?.activeProtocolVersion) || protocols[0];
    const criteria = activeProto?.criteria || [];

    let md = `# Inclusion & Exclusion Criteria (IC/EC) — ${project?.name || "Literature Review"}\n\n`;
    md += `*Phiên bản áp dụng*: **v${activeProto?.version || "1.0"}**\n\n`;

    md += `## 1. Tiêu chí lựa chọn (Inclusion Criteria - IC)\n\n`;
    md += `| Mã | Tên tiêu chí | Mô tả | Giai đoạn | Phương pháp | Trạng thái |\n`;
    md += `|---|---|---|---|---|---|\n`;
    const icList = criteria.filter((c) => c.kind === "inclusion");
    for (const c of icList) {
      md += `| **${c.code}** | ${c.name} | ${c.description} | ${c.stage} | ${c.evaluationMethod} | ${c.isActive ? "Đang áp dụng" : "Tạm dừng"} |\n`;
    }
    md += `\n`;

    md += `## 2. Tiêu chí loại trừ (Exclusion Criteria - EC)\n\n`;
    md += `| Mã | Tên tiêu chí | Mô tả | Giai đoạn | Phương pháp | Trạng thái |\n`;
    md += `|---|---|---|---|---|---|\n`;
    const ecList = criteria.filter((c) => c.kind === "exclusion");
    for (const c of ecList) {
      md += `| **${c.code}** | ${c.name} | ${c.description} | ${c.stage} | ${c.evaluationMethod} | ${c.isActive ? "Đang áp dụng" : "Tạm dừng"} |\n`;
    }

    return md;
  }

  /**
   * 3. Sinh nội dung search-log.md
   */
  static generateSearchLog(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const runs = ProjectStore.getSearchRuns(projectId);

    let md = `# Search Log (Nhật ký tìm kiếm) — ${project?.name || "Literature Review"}\n\n`;
    md += `*Thời gian xuất báo cáo*: ${new Date().toISOString()}\n\n`;
    md += `| Run ID | Nguồn | Query thực tế | URL / Endpoint | Tổng nguồn | Đã nhập | Thất bại | Thời gian | Người chạy |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;

    for (const r of runs) {
      const q = r.actualQuery.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
      const u = (r.searchUrl || "N/A").replace(/\|/g, "\\|");
      md += `| ${r.id} | ${r.source} | \`${q}\` | ${u} | ${r.totalFoundSource} | ${r.importedCount} | ${r.failedCount} | ${r.executedAt} | ${r.executedBy || "Reviewer"} |\n`;
    }

    return md;
  }

  /**
   * 4. Sinh nội dung authorship.md
   */
  static generateAuthorship(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const members = project?.members || [];

    let md = `# Authorship & Responsibilities — ${project?.name || "Literature Review"}\n\n`;
    md += `*Nhóm*: **${project?.teamName || "N/A"}**\n\n`;
    md += `| Thứ tự tác giả | Họ và tên | Vai trò trong nghiên cứu | Nguồn phụ trách | Reviewer | Trích xuất Evidence | Xác nhận bản cuối |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    for (const m of members) {
      const src = (m.assignedSources || []).join(", ") || "Toàn bộ";
      const conf = m.confirmedFinalDraft ? "✅ Đã xác nhận" : "⏳ Chưa xác nhận";
      md += `| ${m.plannedAuthorOrder || "-"} | **${m.name}** | ${m.role} | ${src} | ${m.isReviewer ? "Có" : "Không"} | ${m.isExtractor ? "Có" : "Không"} | ${conf} |\n`;
    }

    return md;
  }

  /**
   * 5. Sinh nội dung 01_all_records.csv
   * Header: ma,nguon,phien_ban,loai,doi,title,authors,year,venue,url,abstract
   */
  static generate01AllRecordsCsv(projectId: string): string {
    const records = ProjectStore.getRecords(projectId);
    const header = ["ma", "nguon", "phien_ban", "loai", "doi", "title", "authors", "year", "venue", "url", "abstract"];
    const rows: string[] = [this.toCsvRow(header)];

    for (const r of records) {
      rows.push(
        this.toCsvRow([
          r.displayId,
          r.source || "",
          r.version || "1",
          r.docType || "article",
          r.doi || "",
          r.title || "",
          r.authors || "",
          r.year || "",
          r.venue || "",
          r.url || "",
          r.abstract || "",
        ])
      );
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * 6. Sinh nội dung 02_after_screening_v1.csv
   * Header: các cột 01 + v1_decision,v1_reason
   */
  static generate02AfterScreeningV1Csv(projectId: string): string {
    const records = ProjectStore.getRecords(projectId);
    const allDecisions = ProjectStore.getAllDecisions(projectId);
    const header = [
      "ma",
      "nguon",
      "phien_ban",
      "loai",
      "doi",
      "title",
      "authors",
      "year",
      "venue",
      "url",
      "abstract",
      "v1_decision",
      "v1_reason",
    ];
    const rows: string[] = [this.toCsvRow(header)];

    for (const r of records) {
      const decList = allDecisions.get(r.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      const v1Decision = v1Dec ? v1Dec.decision : "PENDING";
      const v1Reason = v1Dec ? (v1Dec.primaryReasonCode ? `${v1Dec.primaryReasonCode}: ${v1Dec.reasonText || ""}` : v1Dec.reasonText || "") : "";

      rows.push(
        this.toCsvRow([
          r.displayId,
          r.source || "",
          r.version || "1",
          r.docType || "article",
          r.doi || "",
          r.title || "",
          r.authors || "",
          r.year || "",
          r.venue || "",
          r.url || "",
          r.abstract || "",
          v1Decision,
          v1Reason,
        ])
      );
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * 7. Sinh nội dung 03_final_included.csv
   * Header: ma,doi,title,year,venue,url,v1_decision,v2_status,v2_note
   * Chỉ chứa các bài được xác nhận INCLUDE ở V2 (hoặc cả các bài đề xuất nếu cấu hình)
   */
  static generate03FinalIncludedCsv(projectId: string, includeOnlyFinal: boolean = true): string {
    const records = ProjectStore.getRecords(projectId);
    const allDecisions = ProjectStore.getAllDecisions(projectId);
    const header = ["ma", "doi", "title", "year", "venue", "url", "v1_decision", "v2_status", "v2_note"];
    const rows: string[] = [this.toCsvRow(header)];

    for (const r of records) {
      const decList = allDecisions.get(r.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      const v2Dec = decList.find((d) => d.stage === "v2");

      if (includeOnlyFinal) {
        // Chỉ lấy những bài đã chốt INCLUDE ở V2
        if (!v2Dec || v2Dec.decision !== "INCLUDE") continue;
      } else {
        // Lấy tất cả bài qua V1 (Include + Unsure)
        if (!v1Dec || (v1Dec.decision !== "INCLUDE" && v1Dec.decision !== "UNSURE")) continue;
      }

      const v1DecisionStr = v1Dec?.decision || "INCLUDE";
      const v2StatusStr = v2Dec?.decision === "INCLUDE" ? "INCLUDE" : (v2Dec?.decision || "CHỜ CHỐT");
      const v2NoteStr = v2Dec?.reasonText || v2Dec?.notes || "Đạt toàn bộ tiêu chí chọn lọc sau khi đọc toàn văn.";

      rows.push(
        this.toCsvRow([
          r.displayId,
          r.doi || "",
          r.title || "",
          r.year || "",
          r.venue || "",
          r.url || "",
          v1DecisionStr,
          v2StatusStr,
          v2NoteStr,
        ])
      );
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * 8. Sinh nội dung 00_raw_records.csv
   */
  static generate00RawRecordsCsv(projectId: string): string {
    const records = ProjectStore.getRecords(projectId);
    const header = ["raw_id", "canonical_ma", "nguon", "query", "ngay_thu_thap", "doi", "title", "authors", "year", "venue", "url"];
    const rows: string[] = [this.toCsvRow(header)];

    for (const r of records) {
      const occs = r.searchOccurrences || [];
      if (occs.length === 0) {
        rows.push(
          this.toCsvRow([
            r.id,
            r.displayId,
            r.source || "",
            "",
            r.createdAt || "",
            r.doi || "",
            r.title || "",
            r.authors || "",
            r.year || "",
            r.venue || "",
            r.url || "",
          ])
        );
      } else {
        for (const occ of occs) {
          rows.push(
            this.toCsvRow([
              occ.id,
              r.displayId,
              occ.source || r.source || "",
              occ.queryVersionTag || "",
              occ.retrievedAt || "",
              r.doi || "",
              r.title || "",
              r.authors || "",
              r.year || "",
              r.venue || "",
              r.url || "",
            ])
          );
        }
      }
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * 9. Sinh nội dung duplicate-report.csv
   */
  static generateDuplicateReportCsv(projectId: string): string {
    const dups = ProjectStore.getDuplicateCandidates(projectId);
    const header = [
      "pair_id",
      "record_a_id",
      "record_b_id",
      "match_type",
      "score",
      "status",
      "resolution",
      "resolved_by",
      "resolved_at",
      "notes",
    ];
    const rows: string[] = [this.toCsvRow(header)];

    for (const d of dups) {
      rows.push(
        this.toCsvRow([
          d.id,
          d.recordIdA,
          d.recordIdB,
          d.reason || "duplicate_detected",
          d.similarity,
          d.status,
          d.status === "merged" ? "merged" : d.status === "separated" ? "separated" : "unresolved",
          d.resolvedBy || "",
          d.resolvedAt || "",
          d.reason || "",
        ])
      );
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * 10. Sinh nội dung 02b_fulltext_screening.csv
   */
  static generate02bFulltextScreeningCsv(projectId: string): string {
    const records = ProjectStore.getRecords(projectId);
    const allDecisions = ProjectStore.getAllDecisions(projectId);
    const ftAttempts = ProjectStore.getFullTextAttempts(projectId);
    const ftMap = new Map<string, FullTextAttempt>();
    ftAttempts.forEach((f) => ftMap.set(f.recordId, f));

    const header = [
      "ma",
      "doi",
      "title",
      "year",
      "url",
      "fulltext_status",
      "fulltext_source",
      "page_count",
      "v1_decision",
      "v2_decision",
      "v2_reason",
      "v2_note",
    ];
    const rows: string[] = [this.toCsvRow(header)];

    for (const r of records) {
      const decList = allDecisions.get(r.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      if (!v1Dec || (v1Dec.decision !== "INCLUDE" && v1Dec.decision !== "UNSURE")) continue;

      const ft = ftMap.get(r.id);
      const v2Dec = decList.find((d) => d.stage === "v2");

      rows.push(
        this.toCsvRow([
          r.displayId,
          r.doi || "",
          r.title || "",
          r.year || "",
          r.url || "",
          ft?.status || "NOT_ATTEMPTED",
          ft?.source || "",
          ft?.pageCount !== undefined ? ft.pageCount : "",
          v1Dec.decision,
          v2Dec?.decision || "PENDING",
          v2Dec?.primaryReasonCode || "",
          v2Dec?.reasonText || "",
        ])
      );
    }

    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * Đóng gói toàn bộ 9 file mẫu + 5 file mở rộng vào buffer ZIP hoàn chỉnh
   */
  static exportCompleteZip(projectId: string): { zipBuffer: Buffer; filename: string; report: any } {
    const project = ProjectStore.getProject(projectId);
    const report = ValidationService.validate(projectId);
    const zip = new AdmZip();

    // 1. review-protocol.md
    zip.addFile("review-protocol.md", Buffer.from(this.generateReviewProtocol(projectId), "utf-8"));

    // 2. ie_criteria.md
    zip.addFile("ie_criteria.md", Buffer.from(this.generateIeCriteria(projectId), "utf-8"));

    // 3. search-log.md
    zip.addFile("search-log.md", Buffer.from(this.generateSearchLog(projectId), "utf-8"));

    // 4. authorship.md
    zip.addFile("authorship.md", Buffer.from(this.generateAuthorship(projectId), "utf-8"));

    // 5. 01_all_records.csv
    zip.addFile("01_all_records.csv", Buffer.from(this.generate01AllRecordsCsv(projectId), "utf-8"));

    // 6. 02_after_screening_v1.csv
    zip.addFile("02_after_screening_v1.csv", Buffer.from(this.generate02AfterScreeningV1Csv(projectId), "utf-8"));

    // 7. 03_final_included.csv
    zip.addFile("03_final_included.csv", Buffer.from(this.generate03FinalIncludedCsv(projectId, true), "utf-8"));

    // 8. evidence-table.md
    zip.addFile("evidence-table.md", Buffer.from(EvidenceService.generateEvidenceMarkdown(projectId), "utf-8"));

    // 9. prisma-flow.md
    zip.addFile("prisma-flow.md", Buffer.from(PrismaCalculator.generatePrismaMarkdown(projectId), "utf-8"));

    // 10. 00_raw_records.csv
    zip.addFile("00_raw_records.csv", Buffer.from(this.generate00RawRecordsCsv(projectId), "utf-8"));

    // 11. duplicate-report.csv
    zip.addFile("duplicate-report.csv", Buffer.from(this.generateDuplicateReportCsv(projectId), "utf-8"));

    // 12. 02b_fulltext_screening.csv
    zip.addFile("02b_fulltext_screening.csv", Buffer.from(this.generate02bFulltextScreeningCsv(projectId), "utf-8"));

    // 13. validation-report.md
    zip.addFile("validation-report.md", Buffer.from(ValidationService.generateValidationMarkdown(projectId), "utf-8"));

    // 14. project-backup.json
    const backupJson = ProjectStore.exportProjectBackup(projectId);
    zip.addFile("project-backup.json", Buffer.from(JSON.stringify(backupJson, null, 2), "utf-8"));

    // 15. manifest.json
    const manifest = {
      projectId,
      projectName: project?.name,
      exportTimestamp: new Date().toISOString(),
      protocolVersion: project?.activeProtocolVersion,
      status: report.status,
      filesCount: 15,
      prismaMetrics: report.prismaNumbers,
    };
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"));

    const zipBuffer = zip.toBuffer();
    const safeName = (project?.name || "slr_export").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const filename = `${safeName}_${report.status}_${Date.now()}.zip`;

    return { zipBuffer, filename, report };
  }
}
