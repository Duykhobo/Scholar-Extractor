import fs from "fs";
import path from "path";
import { sanitizeString } from "./sanitizer";
import { PaperRecord } from "./types";

/**
 * Thoát trường CSV an toàn, đồng thời chống CSV Formula Injection
 * (Khi trường văn bản bắt đầu bằng =, +, -, @, tab hoặc return)
 */
export function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '""';
  }
  let str = String(field);

  // Chống CSV Formula Injection: nếu chuỗi bắt đầu bằng ký tự công thức, thêm dấu nháy đơn ' ở đầu
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * 1. Xuất file CSV chuẩn 10 cột của SWT302/PRISMA (Metadata tương thích ngược)
 */
export function exportToCsv(
  records: PaperRecord[],
  outputPath: string,
): { success: boolean; filePath: string; error?: string } {
  try {
    const headers = [
      "source",
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "abstract",
      "url",
      "query",
      "retrieval_date",
    ];

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(",") + "\r\n";

    for (const record of records) {
      const row = [
        escapeCsvField(record.source || record.discoverySource || "Google Scholar"),
        escapeCsvField(record.title || ""),
        escapeCsvField(record.authors || ""),
        escapeCsvField(record.year || ""),
        escapeCsvField(record.venue || ""),
        escapeCsvField(record.doi || ""),
        escapeCsvField(record.abstract || ""),
        escapeCsvField(record.url || ""),
        escapeCsvField(record.query || ""),
        escapeCsvField(record.retrieval_date || ""),
      ];
      csvContent += row.join(",") + "\r\n";
    }

    const sanitizedCsv = sanitizeString(csvContent);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sanitizedCsv, "utf-8");
    return { success: true, filePath: outputPath };
  } catch (err: any) {
    return { success: false, filePath: outputPath, error: err.message };
  }
}

/**
 * 2. Xuất file CSV phân loại sàng lọc chuyên biệt (02_screening_decisions.csv)
 */
export function exportScreeningCsv(
  records: PaperRecord[],
  outputPath: string,
): { success: boolean; filePath: string; error?: string } {
  try {
    const headers = [
      "id",
      "source",
      "title",
      "year",
      "venue",
      "doi",
      "url",
      "screening_stage",
      "matched_criteria",
      "unknown_criteria",
      "missing_evidence",
      "suggested_decision",
      "screening_reason",
      "final_decision",
      "user_notes",
      "potential_duplicate",
      "duplicate_reason",
      "query",
      "retrieval_date",
    ];

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    for (const record of records) {
      const row = [
        escapeCsvField(record.id),
        escapeCsvField(record.source || record.discoverySource || "Google Scholar"),
        escapeCsvField(record.title || ""),
        escapeCsvField(record.year || ""),
        escapeCsvField(record.venue || ""),
        escapeCsvField(record.doi || ""),
        escapeCsvField(record.url || ""),
        escapeCsvField(record.screeningStage || "V1"),
        escapeCsvField((record.matchedCriteria || []).join("; ")),
        escapeCsvField((record.unknownCriteria || []).join("; ")),
        escapeCsvField((record.missingEvidence || []).join("; ")),
        escapeCsvField(record.suggestedDecision || "Unsure"),
        escapeCsvField(record.screeningReason || ""),
        escapeCsvField(record.finalDecision || ""),
        escapeCsvField(record.userNotes || ""),
        escapeCsvField(record.potentialDuplicate ? "YES" : "NO"),
        escapeCsvField(record.duplicateReason || ""),
        escapeCsvField(record.query || ""),
        escapeCsvField(record.retrieval_date || ""),
      ];
      csvContent += row.join(",") + "\r\n";
    }

    const sanitizedCsv = sanitizeString(csvContent);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sanitizedCsv, "utf-8");
    return { success: true, filePath: outputPath };
  } catch (err: any) {
    return { success: false, filePath: outputPath, error: err.message };
  }
}

/**
 * 3. Xuất file CSV Sàng lọc Đầy đủ chuẩn hóa theo ResearchProfile đa nghiên cứu
 * Bao gồm: researchId, profileVersion, sessionId, criterionResults, verificationStatus, reviewerNotes...
 */
export function exportFullScreeningCsv(
  records: PaperRecord[],
  outputPath: string,
  extraMeta?: { researchId?: string; profileVersion?: number; sessionId?: string },
): { success: boolean; filePath: string; error?: string } {
  try {
    const headers = [
      "id",
      "research_id",
      "profile_version",
      "session_id",
      "source",
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "url",
      "pdf_url",
      "page_count",
      "verification_status",
      "screening_stage",
      "matched_criteria",
      "unknown_criteria",
      "missing_evidence",
      "suggested_decision",
      "final_decision",
      "reviewer_notes",
      "provenance_method",
      "provenance_url",
      "model_contribution",
      "concept_labels",
      "literature_group",
      "retrieval_date",
      "decision_date",
    ];

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    for (const record of records) {
      const rec = record as any;
      const row = [
        escapeCsvField(record.id),
        escapeCsvField(rec.researchId || extraMeta?.researchId || ""),
        escapeCsvField(rec.profileVersion || extraMeta?.profileVersion || 1),
        escapeCsvField(rec.sessionId || extraMeta?.sessionId || record.search_id || ""),
        escapeCsvField(record.source || record.discoverySource || "Google Scholar"),
        escapeCsvField(record.title || ""),
        escapeCsvField(record.authors || ""),
        escapeCsvField(record.year || ""),
        escapeCsvField(record.venue || ""),
        escapeCsvField(record.doi || ""),
        escapeCsvField(record.url || ""),
        escapeCsvField(record.pdfUrl || ""),
        escapeCsvField(record.page_count ?? ""),
        escapeCsvField(record.user_verified ? "VERIFIED" : "UNVERIFIED"),
        escapeCsvField(record.screeningStage || "V1"),
        escapeCsvField((record.matchedCriteria || []).join("; ")),
        escapeCsvField((record.unknownCriteria || []).join("; ")),
        escapeCsvField((record.missingEvidence || []).join("; ")),
        escapeCsvField(record.suggestedDecision || "Unsure"),
        escapeCsvField(record.finalDecision || ""),
        escapeCsvField(record.userNotes || ""),
        escapeCsvField(record.extraction_method || "SerpApi"),
        escapeCsvField(record.extracted_url || ""),
        escapeCsvField((record.modelContribution || []).join("; ")),
        escapeCsvField((record.conceptLabels || []).join("; ")),
        escapeCsvField(record.literatureGroup || ""),
        escapeCsvField(record.retrieval_date || ""),
        escapeCsvField(record.extracted_at || ""),
      ];
      csvContent += row.join(",") + "\r\n";
    }

    const sanitizedCsv = sanitizeString(csvContent);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sanitizedCsv, "utf-8");
    return { success: true, filePath: outputPath };
  } catch (err: any) {
    return { success: false, filePath: outputPath, error: err.message };
  }
}

/**
 * Chuẩn hóa tên tác giả theo định dạng APA 7: "Họ, T. Đ."
 */
export function formatApa7Author(authorsStr: string): string {
  if (!authorsStr || !authorsStr.trim()) return "";

  // Tách tác giả bằng dấu chấm phẩy hoặc " and "
  const rawList = authorsStr
    .split(/;\s*|\s+and\s+/i)
    .map((a) => a.trim())
    .filter(Boolean);

  if (rawList.length === 0) return "";

  const formatted: string[] = [];

  for (const raw of rawList) {
    // Nếu đã ở dạng "Họ, Tên"
    if (raw.includes(",")) {
      const parts = raw.split(",").map((p) => p.trim());
      const surname = parts[0];
      const initials = parts
        .slice(1)
        .join(" ")
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => `${n[0].toUpperCase()}.`)
        .join(" ");
      formatted.push(initials ? `${surname}, ${initials}` : surname);
    } else {
      // Dạng "Tên Họ"
      const parts = raw.split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        formatted.push(parts[0]);
      } else {
        const surname = parts[parts.length - 1];
        const initials = parts
          .slice(0, parts.length - 1)
          .map((n) => `${n[0].toUpperCase()}.`)
          .join(" ");
        formatted.push(`${surname}, ${initials}`);
      }
    }
  }

  // Quy tắc APA 7 cho danh sách nhiều tác giả
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  if (formatted.length <= 20) {
    return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
  }
  // Trên 20 tác giả: 19 tác giả đầu, dấu ... và tác giả cuối
  return `${formatted.slice(0, 19).join(", ")}, ... ${formatted[formatted.length - 1]}`;
}

export interface Apa7CitationResult {
  paperId: string;
  citation: string;
  isComplete: boolean;
  missingFields: string[];
  publicationType: "journal" | "conference" | "unknown";
}

/**
 * Định dạng một bản ghi thành trích dẫn chuẩn APA 7th Edition
 * Tuyệt đối không bịa volume, issue, page range khi thiếu dữ liệu thực tế
 */
export function formatApa7Citation(record: PaperRecord): Apa7CitationResult {
  const missingFields: string[] = [];

  const authorsFormatted = formatApa7Author(record.authors);
  if (!authorsFormatted) missingFields.push("Tác giả (authors)");

  const year = record.year ? String(record.year).trim() : "";
  if (!year || isNaN(Number(year))) missingFields.push("Năm xuất bản (year)");

  const title = (record.title || "").trim();
  if (!title) missingFields.push("Tiêu đề (title)");

  const venue = (record.venue || "").trim();
  if (!venue) missingFields.push("Nơi xuất bản / Tên tạp chí hoặc hội nghị (venue)");

  const doi = (record.doi || "").trim();
  const doiUrl = doi ? (doi.startsWith("http") ? doi : `https://doi.org/${doi}`) : "";

  // Xác định loại công bố
  const isConf =
    /\b(conference|proceedings|symposium|workshop|sbes|icse|issta|ase|fse|msr|icsme|saner|icst|issre|qrs|sac|ast)\b/i.test(
      venue,
    );
  const isJournal = /\b(journal|transactions|annals|letters|bulletin|review)\b/i.test(venue);
  const pubType: "journal" | "conference" | "unknown" = isJournal ? "journal" : isConf ? "conference" : "unknown";

  let citation = "";

  const authorPart = authorsFormatted || "[Không rõ tác giả]";
  const yearPart = year ? `(${year})` : "(n.d.)";
  const titlePart = title ? (title.endsWith(".") ? title : `${title}.`) : "[Không có tiêu đề].";

  if (pubType === "conference") {
    // Conference Paper: Author, A. A. (Year). Title of paper. In *Proceedings of the Conference* (optional pages). Publisher. DOI
    citation = `${authorPart} ${yearPart}. ${titlePart} In *${venue}*`;
    if (record.page_count && record.page_count > 0) {
      citation += ` (${record.page_count} pages)`;
    }
    citation += ".";
    if (doiUrl) citation += ` ${doiUrl}`;
  } else if (pubType === "journal") {
    // Journal Article: Author, A. A. (Year). Title of article. *Title of Periodical*, *xx*(x), pp-pp. DOI
    citation = `${authorPart} ${yearPart}. ${titlePart} *${venue}*.`;
    if (doiUrl) citation += ` ${doiUrl}`;
  } else {
    // General Scholarly Document
    citation = `${authorPart} ${yearPart}. ${titlePart}`;
    if (venue) citation += ` *${venue}*.`;
    if (doiUrl) citation += ` ${doiUrl}`;
    else if (record.url) citation += ` ${record.url}`;
  }

  const isComplete = missingFields.length === 0;

  return {
    paperId: record.id,
    citation: citation.trim(),
    isComplete,
    missingFields,
    publicationType: pubType,
  };
}

/**
 * Xuất toàn bộ danh mục tài liệu tham khảo theo định dạng APA 7
 * Tách biệt rõ ràng:
 * 1. Các bài báo đã đầy đủ & xác minh.
 * 2. Danh sách bài báo chưa đủ thông tin cần bổ sung (không bịa thông tin).
 */
export function exportApa7References(
  records: PaperRecord[],
  outputPath?: string,
): { success: boolean; filePath?: string; textContent: string; completeCount: number; incompleteCount: number } {
  try {
    const results = records.map(formatApa7Citation);
    const completeList = results.filter((r) => r.isComplete);
    const incompleteList = results.filter((r) => !r.isComplete);

    let content = "=======================================================================\n";
    content += "DANH MỤC TÀI LIỆU THAM KHẢO (APA 7th EDITION REFERENCES)\n";
    content += `Ngày xuất: ${new Date().toISOString().split("T")[0]} | Tổng số bài: ${records.length}\n`;
    content += "=======================================================================\n\n";

    content += "--- CÁC BÀI BÁO ĐÃ XÁC MINH & ĐẦY ĐỦ THÔNG TIN APA 7 ---\n";
    if (completeList.length === 0) {
      content += "(Chưa có bài báo nào đủ 100% metadata chuẩn APA 7)\n\n";
    } else {
      completeList.forEach((item, idx) => {
        content += `[${idx + 1}] ${item.citation}\n\n`;
      });
    }

    content += "\n=======================================================================\n";
    content += "--- ⚠️ DANH SÁCH BÀI BÁO CHƯA ĐỦ THÔNG TIN ĐỂ ĐỊNH DẠNG HOÀN CHỈNH APA 7 (CẦN BỔ SUNG) ---\n";
    content += "(Quy tắc: Không tự bịa trường thông tin còn thiếu. Cần đối chiếu toàn văn hoặc nguồn xuất bản)\n";
    content += "=======================================================================\n\n";

    if (incompleteList.length === 0) {
      content += "(Toàn bộ bài báo đều đã đầy đủ thông tin chuẩn hóa)\n";
    } else {
      incompleteList.forEach((item, idx) => {
        content += `[⚠️ ${idx + 1}] ${item.citation}\n`;
        content += `    -> Thiếu các trường: ${item.missingFields.join(", ")}\n\n`;
      });
    }

    const sanitizedContent = sanitizeString(content);

    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, sanitizedContent, "utf-8");
      return {
        success: true,
        filePath: outputPath,
        textContent: sanitizedContent,
        completeCount: completeList.length,
        incompleteCount: incompleteList.length,
      };
    }

    return {
      success: true,
      textContent: sanitizedContent,
      completeCount: completeList.length,
      incompleteCount: incompleteList.length,
    };
  } catch (err: any) {
    return {
      success: false,
      textContent: "",
      completeCount: 0,
      incompleteCount: 0,
    };
  }
}
