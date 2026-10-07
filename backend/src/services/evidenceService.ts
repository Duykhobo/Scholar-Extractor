import { EvidenceCitation, EvidenceEntry, CanonicalRecord, ScreeningDecision } from "../types";
import { ProjectStore } from "../db/projectStore";

export class EvidenceService {
  /**
   * Lấy danh sách toàn bộ evidence entries của project
   */
  static getEntries(projectId: string): EvidenceEntry[] {
    return ProjectStore.getEvidenceEntries(projectId);
  }

  /**
   * Lấy evidence entry theo recordId
   */
  static getEntry(projectId: string, recordId: string): EvidenceEntry | undefined {
    return ProjectStore.getEvidenceEntry(projectId, recordId);
  }

  /**
   * Lưu hoặc cập nhật evidence entry
   */
  static saveEntry(projectId: string, entry: Partial<EvidenceEntry> & { recordId: string }): EvidenceEntry {
    const record = ProjectStore.getRecord(projectId, entry.recordId);
    const existing = ProjectStore.getEvidenceEntry(projectId, entry.recordId);

    const paperDisplay =
      entry.paperDisplay ||
      existing?.paperDisplay ||
      (record ? `${record.title} (${record.year || "N/A"}) - ${record.venue || "N/A"}` : entry.recordId);

    const fullEntry: EvidenceEntry = {
      id: existing?.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recordId: entry.recordId,
      projectId,
      paperDisplay,
      toolOrLlm: entry.toolOrLlm !== undefined ? entry.toolOrLlm : existing?.toolOrLlm || "N/A",
      dataset: entry.dataset !== undefined ? entry.dataset : existing?.dataset || "N/A",
      metric: entry.metric !== undefined ? entry.metric : existing?.metric || "N/A",
      result: entry.result !== undefined ? entry.result : existing?.result || "N/A",
      code: entry.code !== undefined ? entry.code : existing?.code || "N/A",
      limitations: entry.limitations !== undefined ? entry.limitations : existing?.limitations || "N/A",
      nearRq: entry.nearRq !== undefined ? entry.nearRq : existing?.nearRq || "N/A",
      nearRqBreakdown: entry.nearRqBreakdown || existing?.nearRqBreakdown || {
        p: false,
        i: false,
        c: false,
        o: false,
        explanation: "Chưa đánh giá chi tiết P/I/C/O",
      },
      citations: entry.citations || existing?.citations || [],
      enteredBy: entry.enteredBy || existing?.enteredBy || "Reviewer",
      enteredAt: new Date().toISOString(),
    };

    // Tự động tính chuỗi nearRq nếu có breakdown
    if (entry.nearRqBreakdown) {
      const parts: string[] = [];
      if (entry.nearRqBreakdown.p) parts.push("P");
      if (entry.nearRqBreakdown.i) parts.push("I");
      if (entry.nearRqBreakdown.c) parts.push("C");
      if (entry.nearRqBreakdown.o) parts.push("O");
      fullEntry.nearRq = `${parts.length}/4 — ${parts.length > 0 ? parts.join(",") : "Không đạt"}`;
    }

    ProjectStore.saveEvidenceEntry(projectId, fullEntry);
    ProjectStore.logAudit(projectId, "EVIDENCE_UPDATE", {
      recordId: entry.recordId,
      nearRq: fullEntry.nearRq,
    });

    return fullEntry;
  }

  /**
   * Thêm citation cho một trường trong evidence (Paper, Result, Metric, Dataset, Code,...)
   */
  static addCitation(
    projectId: string,
    recordId: string,
    citation: EvidenceCitation
  ): EvidenceEntry {
    const entry = this.getEntry(projectId, recordId) || this.saveEntry(projectId, { recordId });
    entry.citations = entry.citations || [];
    entry.citations.push(citation);
    return ProjectStore.saveEvidenceEntry(projectId, entry);
  }

  /**
   * Kiểm tra tính hợp lệ và dẫn chứng của evidence đối với các bài Included V2
   */
  static validateEvidenceCompleteness(projectId: string): {
    totalIncludedV2: number;
    totalEvidenceEntries: number;
    missingEvidenceRecordIds: string[];
    incompleteCitations: { recordId: string; missingFields: string[] }[];
    insufficientEvidenceRecords: string[];
  } {
    const records = ProjectStore.getRecords(projectId);
    const decisions = ProjectStore.getAllDecisions(projectId);
    const evidenceList = ProjectStore.getEvidenceEntries(projectId);

    // Tìm các bài đạt INCLUDE ở V2 (hoặc V1 INCLUDE / UNSURE chưa bị EXCLUDE ở V2)
    const includedV2RecordIds: string[] = [];

    for (const record of records) {
      const recDecisions = decisions.get(record.id) || [];
      const v2Dec = recDecisions.find((d) => d.stage === "v2");
      const v1Dec = recDecisions.find((d) => d.stage === "v1");

      if (v2Dec && v2Dec.decision === "INCLUDE") {
        includedV2RecordIds.push(record.id);
      } else if (!v2Dec && v1Dec && (v1Dec.decision === "INCLUDE" || v1Dec.decision === "UNSURE")) {
        // Đang chờ hoặc chưa có V2
      }
    }

    const missingEvidenceRecordIds: string[] = [];
    const incompleteCitations: { recordId: string; missingFields: string[] }[] = [];
    const insufficientEvidenceRecords: string[] = [];

    for (const recId of includedV2RecordIds) {
      const ev = evidenceList.find((e) => e.recordId === recId);
      if (!ev) {
        missingEvidenceRecordIds.push(recId);
        continue;
      }

      const missing: string[] = [];
      if (!ev.result || ev.result === "N/A") missing.push("Kết quả");
      if (!ev.toolOrLlm || ev.toolOrLlm === "N/A") missing.push("Tool/LLM");
      if (!ev.dataset || ev.dataset === "N/A") missing.push("Dataset");
      if (!ev.metric || ev.metric === "N/A") missing.push("Metric");

      if (missing.length > 0) {
        incompleteCitations.push({ recordId: recId, missingFields: missing });
      }

      const hasInsufficient = ev.citations.some((c) => c.verifiedStatus === "insufficient_evidence");
      if (hasInsufficient) {
        insufficientEvidenceRecords.push(recId);
      }
    }

    return {
      totalIncludedV2: includedV2RecordIds.length,
      totalEvidenceEntries: evidenceList.length,
      missingEvidenceRecordIds,
      incompleteCitations,
      insufficientEvidenceRecords,
    };
  }

  /**
   * Tạo Markdown bảng Evidence 8 cột chuẩn theo mẫu `evidence-table(1).md`
   */
  static generateEvidenceMarkdown(projectId: string): string {
    const project = ProjectStore.getProject(projectId);
    const records = ProjectStore.getRecords(projectId);
    const evidenceList = ProjectStore.getEvidenceEntries(projectId);

    // Sắp xếp bài theo record.displayId hoặc id
    const recMap = new Map<string, CanonicalRecord>();
    records.forEach((r) => recMap.set(r.id, r));

    const sortedEvidence = [...evidenceList].sort((a, b) => {
      const recA = recMap.get(a.recordId);
      const recB = recMap.get(b.recordId);
      const numA = parseInt((recA?.displayId || a.recordId).replace(/\D/g, "")) || 0;
      const numB = parseInt((recB?.displayId || b.recordId).replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    let md = `# Evidence Table — ${project?.name || "Nghiên cứu"}\n\n`;
    md += `*Thời gian tạo: ${new Date().toISOString()}*\n\n`;
    md += `| Paper | Tool/LLM | Dataset | Metric | Kết quả | Code | Hạn chế | Gần RQ |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;

    for (const ev of sortedEvidence) {
      const rec = recMap.get(ev.recordId);
      const displayTag = rec ? `**[${rec.displayId}]** ${ev.paperDisplay}` : ev.paperDisplay;
      
      const clean = (val: string) => (val || "N/A").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");

      md += `| ${clean(displayTag)} | ${clean(ev.toolOrLlm)} | ${clean(ev.dataset)} | ${clean(ev.metric)} | ${clean(ev.result)} | ${clean(ev.code)} | ${clean(ev.limitations)} | ${clean(ev.nearRq)} |\n`;
    }

    md += `\n---\n*Ghi chú: Cột "Gần RQ" phân rã theo P/I/C/O (Population, Intervention, Comparison, Outcome). Mọi số liệu trong cột "Kết quả" đều được trích xuất có dẫn chứng số trang, section hoặc bảng/hình biểu diễn.*\n`;
    return md;
  }
}
