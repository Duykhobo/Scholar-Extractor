import { CanonicalPaper, EvidenceTableRow } from "./types";

export class EvidenceTableService {
  /**
   * Tạo các hàng cho Bảng bằng chứng (Evidence Table) 8/9 cột
   */
  static buildEvidenceRows(includedRecords: CanonicalPaper[]): EvidenceTableRow[] {
    return includedRecords.map((record, index) => {
      const yearStr = record.year ? String(record.year) : "";
      const venueStr = record.venue || "";
      const doiStr = record.doi || "N/A";
      const paperText = `${record.title} (${venueStr} ${yearStr}) · ${doiStr}`;

      // Khai thác các trường từ metadata hoặc bằng chứng đã trích xuất
      let toolOrModel = "N/A";
      let dataset = "N/A";
      let metric = "N/A";
      let result = "N/A";
      let codeUrl = "N/A";
      let limitations = "N/A";
      let nearRq = "2/4 — P, O";

      // Phân tích từ title hoặc abstract nếu có
      const textCorpus = `${record.title} ${record.abstract} ${record.userNotes || ""}`;

      // 1. Tool / Model
      const toolMatch = textCorpus.match(
        /\b(EvoMaster|RESTest|RESTestBench|APITestGenie|MioHint|RBCTest|Defects4REST|CRUDinfer|SAINT|EDEFuzz|AutoRestTest|GPT-4[a-zA-Z0-9\.\-]*|LLM[s]?)\b/i,
      );
      if (toolMatch) toolOrModel = toolMatch[1];

      // 2. Code / Replication Package
      const codeMatch = textCorpus.match(/((?:https?:\/\/)?(?:github\.com|zenodo\.org)[^\s\)\],]+)/i);
      if (codeMatch) codeUrl = codeMatch[1];

      // 3. Metric
      const metricMatches: string[] = [];
      if (/coverage/i.test(textCorpus)) metricMatches.push("Coverage");
      if (/fault|defect|bug/i.test(textCorpus)) metricMatches.push("Fault detection");
      if (/mutation/i.test(textCorpus)) metricMatches.push("Mutation score");
      if (/precision|recall/i.test(textCorpus)) metricMatches.push("Precision/Recall");
      if (metricMatches.length > 0) metric = metricMatches.join("; ");

      // 4. Kết quả định lượng (từ evidence snippet hoặc số % / tỷ lệ thật)
      const quantSnippet = (record.evidence_snippets || []).find((s) => s.type === "IC-E" && s.isValidEvidence);
      if (quantSnippet) {
        result = quantSnippet.context.slice(0, 150);
      } else {
        const percentMatch = textCorpus.match(/(\d+(?:[.,]\d+)?\s*%\s*[a-zA-Z\s]{0,30})/);
        if (percentMatch) result = percentMatch[0].trim();
      }

      // 5. Dataset
      const dsMatch = textCorpus.match(/(\d+\s*(?:APIs?|benchmarks?|projects?|endpoints?|services?|case studies?))/i);
      if (dsMatch) dataset = dsMatch[1];

      return {
        id: record.id,
        index: index + 1,
        paperText,
        title: record.title,
        year: record.year,
        venue: venueStr,
        doi: doiStr,
        toolOrModel,
        dataset,
        metric,
        result,
        codeUrl,
        limitations,
        nearRq,
        provenance: record.allSources?.join(", ") || record.source,
      };
    });
  }

  /**
   * Tạo văn bản Markdown evidence-table.md
   */
  static generateMarkdown(rows: EvidenceTableRow[], researchName: string = "SWT302"): string {
    const lines: string[] = [];
    lines.push(`# Evidence Table — ${researchName} · 8/9 Cột`);
    lines.push(
      `*Tự động trích xuất từ các bài báo chính thức được đưa vào tổng quan (Included) · ${new Date().toLocaleDateString("vi-VN")}*`,
    );
    lines.push(
      `*Chú thích: "Kết quả" = số THẬT đọc từ văn bản bài báo (Abstract/Table/Figure); thiếu thì ghi N/A — Tuyệt đối không bịa.*\n`,
    );

    lines.push(
      "| # | Paper (tên + năm + venue + DOI) | Tool/LLM | Dataset | Metric | Kết quả | Code | Hạn chế | Gần RQ |",
    );
    lines.push("|---|---|---|---|---|---|---|---|---|");

    for (const row of rows) {
      lines.push(
        `| ${row.index} | ${row.paperText.replace(/\|/g, "-")} | ${row.toolOrModel} | ${row.dataset} | ${row.metric} | **${row.result.replace(/\|/g, "-")}** | ${row.codeUrl} | ${row.limitations} | ${row.nearRq} |`,
      );
    }

    return lines.join("\n");
  }
}
