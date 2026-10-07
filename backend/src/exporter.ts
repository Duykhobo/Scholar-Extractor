import fs from "fs";
import path from "path";
import { CanonicalRecord, FilterRun, NormalizedRecord, PaperRecord, SearchRun, SuspectedDuplicateGroup } from "./types";

export function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '""';
  }
  let str = String(field);

  // Chống CSV Formula Injection
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Xuất danh sách Canonical Records ra CSV với đầy đủ cờ L0, L1, L2, L3
 */
export function generateCanonicalCsv(records: CanonicalRecord[]): string {
  const headers = [
    "canonical_id",
    "title",
    "authors",
    "year",
    "publication_date",
    "abstract",
    "doi",
    "venue",
    "publisher",
    "document_type",
    "language",
    "source",
    "all_sources",
    "merged_record_ids",
    "landing_page_url",
    "open_access_pdf_url",
    "metadata_filter_status",
    "metadata_reasons",
    "keyword_status",
    "has_exclusion_hit",
    "matched_terms",
    "missing_flags",
  ];

  let csv = "\uFEFF"; // UTF-8 BOM cho Excel
  csv += headers.join(",") + "\r\n";

  for (const r of records) {
    const fRes = r.latestFilterResult;
    const qFlags = r.qualityFlags;

    const missingList: string[] = [];
    if (qFlags?.missing_title) missingList.push("missing_title");
    if (qFlags?.missing_abstract) missingList.push("missing_abstract");
    if (qFlags?.missing_year) missingList.push("missing_year");
    if (qFlags?.missing_doi) missingList.push("missing_doi");
    if (qFlags?.missing_fulltext) missingList.push("missing_fulltext");
    if (qFlags?.needs_data_review) missingList.push("needs_data_review");

    const row = [
      escapeCsvField(r.id),
      escapeCsvField(r.title),
      escapeCsvField(r.authors),
      escapeCsvField(r.year),
      escapeCsvField(r.publicationDate || ""),
      escapeCsvField(r.abstract),
      escapeCsvField(r.doi),
      escapeCsvField(r.venue),
      escapeCsvField(r.publisher || ""),
      escapeCsvField(r.documentType || ""),
      escapeCsvField(r.language || ""),
      escapeCsvField(r.source),
      escapeCsvField((r.sourcesList || []).join(" | ")),
      escapeCsvField((r.mergedRecordIds || []).join(" | ")),
      escapeCsvField(r.landingPageUrl),
      escapeCsvField(r.openAccessPdfUrl || ""),
      escapeCsvField(fRes?.metadataStatus || "UNKNOWN"),
      escapeCsvField((fRes?.metadataReasons || []).join(" ; ")),
      escapeCsvField(fRes?.keywordStatus || "NOT_EVALUATED"),
      escapeCsvField(fRes?.hasExclusionHit ? "YES" : "NO"),
      escapeCsvField((fRes?.matchedTerms || []).join(" ; ")),
      escapeCsvField(missingList.join(" | ")),
    ];
    csv += row.join(",") + "\r\n";
  }

  return csv;
}

/**
 * Xuất danh sách Duplicate Mapping
 */
export function generateDuplicateMappingCsv(
  canonicalRecords: CanonicalRecord[],
  suspectedGroups: SuspectedDuplicateGroup[],
): string {
  const headers = [
    "canonical_id",
    "doi",
    "title",
    "merged_record_ids_count",
    "all_merged_ids",
    "sources",
    "is_suspected_group",
    "suspected_group_resolution",
  ];

  let csv = "\uFEFF";
  csv += headers.join(",") + "\r\n";

  for (const c of canonicalRecords) {
    const sus = suspectedGroups.find((g) => g.recordIds.includes(c.id));
    const row = [
      escapeCsvField(c.id),
      escapeCsvField(c.doi),
      escapeCsvField(c.title),
      escapeCsvField(c.mergedRecordIds?.length || 1),
      escapeCsvField((c.mergedRecordIds || []).join(" | ")),
      escapeCsvField((c.sourcesList || []).join(" | ")),
      escapeCsvField(sus ? "YES" : "NO"),
      escapeCsvField(sus ? sus.resolution : "N/A"),
    ];
    csv += row.join(",") + "\r\n";
  }

  return csv;
}

/**
 * Xuất Filter Log CSV
 */
export function generateFilterLogCsv(filterRuns: FilterRun[]): string {
  const headers = [
    "filter_run_id",
    "collection_id",
    "filter_type",
    "version",
    "timestamp",
    "total_evaluated",
    "pass_count",
    "fail_count",
    "unknown_count",
    "keyword_match_count",
    "keyword_no_match_count",
    "keyword_insufficient_count",
    "exclusion_hit_count",
  ];

  let csv = "\uFEFF";
  csv += headers.join(",") + "\r\n";

  for (const f of filterRuns) {
    const row = [
      escapeCsvField(f.id),
      escapeCsvField(f.collectionId),
      escapeCsvField(f.filterType),
      escapeCsvField(f.version),
      escapeCsvField(f.timestamp),
      escapeCsvField(f.totalEvaluated),
      escapeCsvField(f.counts.pass ?? ""),
      escapeCsvField(f.counts.fail ?? ""),
      escapeCsvField(f.counts.unknown ?? ""),
      escapeCsvField(f.counts.keywordMatch ?? ""),
      escapeCsvField(f.counts.keywordNoMatch ?? ""),
      escapeCsvField(f.counts.keywordInsufficient ?? ""),
      escapeCsvField(f.counts.exclusionHit ?? ""),
    ];
    csv += row.join(",") + "\r\n";
  }

  return csv;
}

/**
 * Xuất định dạng RIS chuẩn (Tương thích Rayyan, CADIMA, EndNote, Zotero)
 */
export function generateRis(records: Array<NormalizedRecord | CanonicalRecord>): string {
  let ris = "";

  for (const r of records) {
    let ty = "JOUR";
    const docType = (r.documentType || "").toLowerCase();
    if (docType.includes("proceeding") || docType.includes("conference")) {
      ty = "CONF";
    } else if (docType.includes("book")) {
      ty = "BOOK";
    } else if (docType.includes("thesis")) {
      ty = "THES";
    }

    ris += `TY  - ${ty}\r\n`;
    if (r.title) ris += `TI  - ${r.title}\r\n`;

    if (r.authors) {
      const authorList = r.authors.split(/;\s*|,\s*(?=[A-Z][a-z]+)/);
      for (const a of authorList) {
        const trimmed = a.trim();
        if (trimmed) ris += `AU  - ${trimmed}\r\n`;
      }
    }

    if (r.year) ris += `PY  - ${r.year}\r\n`;
    if (r.publicationDate) ris += `DA  - ${r.publicationDate}\r\n`;
    if (r.venue) ris += `JO  - ${r.venue}\r\n`;
    if (r.publisher) ris += `PB  - ${r.publisher}\r\n`;
    if (r.volume) ris += `VL  - ${r.volume}\r\n`;
    if (r.issue) ris += `IS  - ${r.issue}\r\n`;
    if (r.pages) ris += `SP  - ${r.pages}\r\n`;
    if (r.doi) ris += `DO  - ${r.doi}\r\n`;
    if (r.abstract) ris += `AB  - ${r.abstract.replace(/\r?\n/g, " ")}\r\n`;
    if (r.landingPageUrl) ris += `UR  - ${r.landingPageUrl}\r\n`;
    if (r.openAccessPdfUrl) ris += `L1  - ${r.openAccessPdfUrl}\r\n`;
    if (r.source) ris += `DB  - ${r.source}\r\n`;

    ris += `ER  - \r\n\r\n`;
  }

  return ris;
}

/**
 * Xuất định dạng BibTeX chuẩn
 */
export function generateBibtex(records: Array<NormalizedRecord | CanonicalRecord>): string {
  let bib = "";

  const escapeBibField = (str: string) => {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\$/g, "\\$")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_");
  };

  for (const r of records) {
    const docType = (r.documentType || "").toLowerCase();
    const entryType = docType.includes("proceeding") || docType.includes("conference") ? "inproceedings" : "article";

    const citeKey = r.doi ? `doi_${r.doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `key_${r.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

    bib += `@${entryType}{${citeKey},\r\n`;
    if (r.title) bib += `  title = {${escapeBibField(r.title)}},\r\n`;
    if (r.authors) {
      const bibAuthors = r.authors.replace(/;\s*/g, " and ");
      bib += `  author = {${escapeBibField(bibAuthors)}},\r\n`;
    }
    if (r.year) bib += `  year = {${r.year}},\r\n`;
    if (r.venue) {
      if (entryType === "article") bib += `  journal = {${escapeBibField(r.venue)}},\r\n`;
      else bib += `  booktitle = {${escapeBibField(r.venue)}},\r\n`;
    }
    if (r.publisher) bib += `  publisher = {${escapeBibField(r.publisher)}},\r\n`;
    if (r.volume) bib += `  volume = {${r.volume}},\r\n`;
    if (r.issue) bib += `  number = {${r.issue}},\r\n`;
    if (r.pages) bib += `  pages = {${r.pages}},\r\n`;
    if (r.doi) bib += `  doi = {${r.doi}},\r\n`;
    if (r.landingPageUrl) bib += `  url = {${r.landingPageUrl}},\r\n`;
    if (r.abstract) bib += `  abstract = {${escapeBibField(r.abstract.replace(/\r?\n/g, " "))}},\r\n`;
    bib += `}\r\n\r\n`;
  }

  return bib;
}

/**
 * Xuất Search Log dạng CSV
 */
export function generateSearchLogCsv(runs: SearchRun[]): string {
  const headers = [
    "run_id",
    "collection_id",
    "source",
    "user_query",
    "actual_query",
    "status",
    "total_reported",
    "items_received",
    "items_saved",
    "items_error",
    "year_start",
    "year_end",
    "started_at",
    "completed_at",
    "error_log",
  ];

  let csv = "\uFEFF";
  csv += headers.join(",") + "\r\n";

  for (const run of runs) {
    const row = [
      escapeCsvField(run.id),
      escapeCsvField(run.collectionId),
      escapeCsvField(run.source),
      escapeCsvField(run.userQuery),
      escapeCsvField(run.actualQuery),
      escapeCsvField(run.status),
      escapeCsvField(run.totalReported !== undefined ? run.totalReported : ""),
      escapeCsvField(run.itemsReceived),
      escapeCsvField(run.itemsSaved),
      escapeCsvField(run.itemsError),
      escapeCsvField(run.filters.yearStart || ""),
      escapeCsvField(run.filters.yearEnd || ""),
      escapeCsvField(run.startedAt),
      escapeCsvField(run.completedAt || ""),
      escapeCsvField((run.errorLog || []).join(" | ")),
    ];
    csv += row.join(",") + "\r\n";
  }

  return csv;
}

/**
 * Hướng dẫn CADIMA / Rayyan
 */
export function getCadimaRayyanGuideMarkdown(): string {
  return `# Hướng Dẫn Sử Dụng Với Rayyan & CADIMA

Ứng dụng đóng vai trò **Thu thập & Lọc sơ bộ dữ liệu (L0 - L3)**. 
Bạn không thực hiện đánh giá học thuật tại đây mà chuyển sang Rayyan hoặc CADIMA để hoàn thành bài nghiên cứu.

---

## 1. Sử dụng với Rayyan (https://www.rayyan.ai)
- Tải tập tin \`.ris\` (khuyến nghị tập **Unique records** hoặc tập **Passes metadata filters + Needs checking**).
- Trong Rayyan:
  1. Tạo **New Review**.
  2. Tải tệp \`.ris\` lên.
  3. Mời các đồng nghiệp vào đánh giá mù (Blind screening).

---

## 2. Sử dụng với CADIMA (https://www.cadima.info)
- Tải tập tin \`.ris\` hoặc \`.csv\`.
- Trong CADIMA:
  1. Chọn mục **Search list**.
  2. Upload kết quả tìm kiếm kèm thông số cơ sở dữ liệu từ tệp \`search-log.csv\`.
  3. Bắt đầu vòng lựa chọn nghiên cứu (Study selection).
`;
}

export function formatApa7Author(rawAuthors: string): string {
  if (!rawAuthors) return "Unknown";
  const authorList = rawAuthors
    .split(/;\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
  const formatted = authorList.map((author) => {
    if (author.includes(",")) {
      const parts = author.split(",").map((p) => p.trim());
      const family = parts[0];
      const given = parts[1] || "";
      const initials = given
        .split(/\s+/)
        .map((g) => (g[0] ? g[0].toUpperCase() + "." : ""))
        .filter(Boolean)
        .join(" ");
      return initials ? `${family}, ${initials}` : family;
    } else {
      const parts = author.split(/\s+/);
      if (parts.length === 1) return parts[0];
      const family = parts[parts.length - 1];
      const given = parts.slice(0, -1);
      const initials = given
        .map((g) => (g[0] ? g[0].toUpperCase() + "." : ""))
        .filter(Boolean)
        .join(" ");
      return initials ? `${family}, ${initials}` : family;
    }
  });

  if (formatted.length === 0) return "Unknown";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

// Hàm tương thích cũ
export function formatApa7Citation(paper: PaperRecord): {
  isComplete: boolean;
  citation: string;
  missingFields?: string[];
} {
  const isComplete = !!(paper.authors && paper.year && paper.title && (paper.venue || paper.doi));
  const authors = formatApa7Author(paper.authors || "Unknown");
  const year = paper.year ? `(${paper.year})` : "(n.d.)";
  const title = paper.title || "Untitled";
  const venue = paper.venue ? `*${paper.venue}*` : "";
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url || "";
  let citation = `${authors} ${year}. ${title}.`;
  if (venue) citation += ` ${venue}.`;
  if (doi) citation += ` ${doi}`;
  return { isComplete, citation: citation.trim() };
}

export function exportToCsv(
  records: PaperRecord[],
  outputPath: string,
): { success: boolean; filePath: string; csvContent: string; error?: string } {
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

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, csvContent, "utf-8");

    return { success: true, filePath: outputPath, csvContent };
  } catch (err: any) {
    return { success: false, filePath: outputPath, csvContent: "", error: err.message };
  }
}

export function exportScreeningCsv(
  records: PaperRecord[],
  outputPath: string,
): { success: boolean; filePath: string; csvContent: string; error?: string } {
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
      "screening_stage",
      "suggested_decision",
      "screening_reason",
      "final_decision",
      "user_notes",
    ];

    let csvContent = "\uFEFF";
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
        escapeCsvField(record.screeningStage || ""),
        escapeCsvField(record.suggestedDecision || ""),
        escapeCsvField(record.screeningReason || ""),
        escapeCsvField(record.finalDecision || ""),
        escapeCsvField(record.userNotes || ""),
      ];
      csvContent += row.join(",") + "\r\n";
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, csvContent, "utf-8");

    return { success: true, filePath: outputPath, csvContent };
  } catch (err: any) {
    console.error("DEBUG EXPORT ERROR:", err);
    return { success: false, filePath: outputPath, csvContent: "", error: err.message };
  }
}

export function exportFullScreeningCsv(
  records: PaperRecord[],
  outputPath: string,
  meta?: any,
): { success: boolean; filePath: string; csvContent: string; error?: string } {
  return exportScreeningCsv(records, outputPath);
}

export function exportScreeningV2Csv(
  records: PaperRecord[],
  outputPath: string,
): { success: boolean; filePath: string; csvContent: string; error?: string } {
  return exportScreeningCsv(records, outputPath);
}

export function exportApa7References(
  records: PaperRecord[],
  outputPath?: string,
  options?: any,
): {
  success: boolean;
  filePath: string;
  textContent: string;
  completeCount: number;
  incompleteCount: number;
  error?: string;
} {
  try {
    const completeLines: string[] = [];
    const incompleteLines: string[] = [];
    for (const r of records) {
      const cite = formatApa7Citation(r);
      if (cite.isComplete) {
        completeLines.push(cite.citation);
      } else {
        incompleteLines.push(cite.citation);
      }
    }

    let textContent = "# DANH MỤC TÀI LIỆU THAM KHẢO (APA 7th EDITION REFERENCES)\n\n";
    textContent += "## CÁC BÀI BÁO ĐÃ XÁC MINH & ĐẦY ĐỦ THÔNG TIN APA 7\n";
    textContent += (completeLines.length > 0 ? completeLines.join("\n\n") : "Không có") + "\n\n";
    textContent += "## DANH SÁCH BÀI BÁO CHƯA ĐỦ THÔNG TIN ĐỂ ĐỊNH DẠNG HOÀN CHỈNH APA 7\n";
    textContent += (incompleteLines.length > 0 ? incompleteLines.join("\n\n") : "Không có") + "\n";

    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, textContent, "utf-8");
    }
    return {
      success: true,
      filePath: outputPath || "",
      textContent,
      completeCount: completeLines.length,
      incompleteCount: incompleteLines.length,
    };
  } catch (err: any) {
    return {
      success: false,
      filePath: outputPath || "",
      textContent: "",
      completeCount: 0,
      incompleteCount: 0,
      error: err.message,
    };
  }
}

export function exportDuplicateLogCsv(
  groups: any[],
  outputPath?: string,
): { success: boolean; filePath: string; csvContent: string; error?: string } {
  try {
    const headers = ["group_id", "title", "record_ids", "resolution"];
    let csv = "\uFEFF" + headers.join(",") + "\r\n";
    for (const g of groups) {
      const row = [
        escapeCsvField(g.id || ""),
        escapeCsvField(g.title || ""),
        escapeCsvField((g.recordIds || []).join(" | ")),
        escapeCsvField(g.resolution || "unresolved"),
      ];
      csv += row.join(",") + "\r\n";
    }
    const targetPath = outputPath || "01_duplicates_removed.csv";
    return { success: true, filePath: targetPath, csvContent: csv };
  } catch (err: any) {
    return { success: false, filePath: outputPath || "", csvContent: "", error: err.message };
  }
}
