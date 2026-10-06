import { PaperRecord, SourceProvenance } from "../types";
import { AcmDlAdapter } from "./acmdl";

export interface ImportPreviewResult {
  fileName: string;
  fileType: "csv" | "bibtex" | "ris" | "unknown";
  totalRowsParsed: number;
  validRecords: PaperRecord[];
  containersCount: number;
  articlesCount: number;
  rowErrors: Array<{ row: number; error: string; rawSnippet?: string }>;
  warnings: string[];
  suggestedPipelineStage: "B1" | "V1" | "V2" | "V3";
  metadataSummary: {
    sources: Record<string, number>;
    withDoi: number;
    withAbstract: number;
  };
}

export class UniversalFileImporter {
  /**
   * Parse CSV dạng RFC 4180 an toàn, hỗ trợ nhiều dòng trong ngoặc kép và BOM
   */
  static parseCsvRows(csvContent: string): string[][] {
    const cleanContent = csvContent.replace(/^\uFEFF/, "");
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i];
      const nextChar = cleanContent[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Bỏ qua escape quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Import file CSV và tự động map theo schema tiếng Việt hoặc quốc tế
   */
  static parseCsv(csvContent: string, fileName: string = "uploaded.csv"): ImportPreviewResult {
    const rows = this.parseCsvRows(csvContent);
    if (rows.length === 0) {
      return {
        fileName,
        fileType: "csv",
        totalRowsParsed: 0,
        validRecords: [],
        containersCount: 0,
        articlesCount: 0,
        rowErrors: [{ row: 0, error: "Tệp CSV rỗng hoặc không có dữ liệu." }],
        warnings: [],
        suggestedPipelineStage: "B1",
        metadataSummary: { sources: {}, withDoi: 0, withAbstract: 0 },
      };
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Phát hiện các cột
    const colIndex = {
      id: header.findIndex((h) => h === "ma" || h === "id" || h === "paper_id"),
      source: header.findIndex((h) => h === "nguon" || h === "source"),
      phien_ban: header.findIndex((h) => h === "phien_ban" || h === "query_version" || h === "version"),
      loai: header.findIndex((h) => h === "loai" || h === "type" || h === "publication_type"),
      doi: header.findIndex((h) => h === "doi"),
      title: header.findIndex((h) => h === "title" || h === "tieu_de"),
      authors: header.findIndex((h) => h === "authors" || h === "tac_gia" || h === "author"),
      year: header.findIndex((h) => h === "year" || h === "nam"),
      venue: header.findIndex((h) => h === "venue" || h === "noi_xuat_ban" || h === "journal"),
      url: header.findIndex((h) => h === "url" || h === "link"),
      abstract: header.findIndex((h) => h === "abstract" || h === "tom_tat"),
      // Vòng screening cũ
      v1_decision: header.findIndex((h) => h === "v1_decision" || h === "decision_v1"),
      v1_reason: header.findIndex((h) => h === "v1_reason" || h === "reason_v1"),
      v2_status: header.findIndex((h) => h === "v2_status" || h === "status_v2"),
      v2_note: header.findIndex((h) => h === "v2_note" || h === "note_v2"),
    };

    const validRecords: PaperRecord[] = [];
    const rowErrors: Array<{ row: number; error: string; rawSnippet?: string }> = [];
    const warnings: string[] = [];
    const sourcesCount: Record<string, number> = {};
    let withDoi = 0;
    let withAbstract = 0;
    let containersCount = 0;
    let articlesCount = 0;

    let isFile01 = fileName.includes("01_") || (colIndex.loai >= 0 && colIndex.v1_decision < 0);
    let isFile02 = fileName.includes("02_") || colIndex.v1_decision >= 0;
    let isFile03 = fileName.includes("03_") || colIndex.v2_status >= 0;

    if (isFile03) {
      warnings.push(
        "Phát hiện file danh sách ứng viên (03_final_included): Chứa cả đề xuất GIỮ và đề xuất LOẠI (EC-S/EC-A). Không tự động gán toàn bộ thành Include cuối cùng.",
      );
    }

    dataRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const getVal = (col: number) => (col >= 0 && col < row.length ? row[col].trim() : "");

      const rawTitle = getVal(colIndex.title);
      const rawDoi = getVal(colIndex.doi).replace(/^https?:\/\/doi\.org\//i, "");
      const rawId = getVal(colIndex.id);

      if (!rawTitle && !rawDoi) {
        rowErrors.push({
          row: rowNum,
          error: "Dòng thiếu cả tiêu đề và DOI.",
          rawSnippet: row.slice(0, 3).join(" | "),
        });
        return;
      }

      const rawAuthors = getVal(colIndex.authors);
      const rawYear = getVal(colIndex.year);
      const rawVenue = getVal(colIndex.venue);
      const rawUrl = getVal(colIndex.url);
      const rawAbstract = getVal(colIndex.abstract);
      const rawSource = getVal(colIndex.source) || "Imported File";
      const rawLoai = getVal(colIndex.loai);
      const rawPhienBan = getVal(colIndex.phien_ban);
      const rawV1Decision = getVal(colIndex.v1_decision);
      const rawV1Reason = getVal(colIndex.v1_reason);
      const rawV2Status = getVal(colIndex.v2_status);
      const rawV2Note = getVal(colIndex.v2_note);

      // Nhận diện Container vs Bài báo
      const isContainer = AcmDlAdapter.isContainerRecord(rawTitle, rawAuthors, rawDoi, rawLoai);
      if (isContainer) {
        containersCount++;
      } else {
        articlesCount++;
      }

      // Thống kê
      if (rawDoi) withDoi++;
      if (rawAbstract) withAbstract++;
      sourcesCount[rawSource] = (sourcesCount[rawSource] || 0) + 1;

      // Chuẩn hóa Query Version: V1;V2;V3 -> Q1;Q2;Q3, giữ nguyên giá trị gốc
      let normalizedQueryVersion = rawPhienBan;
      if (rawPhienBan) {
        normalizedQueryVersion = rawPhienBan
          .split(";")
          .map((v) => v.trim().replace(/^V(\d+)/i, "Q$1"))
          .join(";");
      }

      // Khởi tạo PaperRecord
      const paperId = rawId || (rawDoi ? `doi_${rawDoi.replace(/[^a-zA-Z0-9]/g, "_")}` : `imp_${Date.now()}_${idx}`);

      // Ánh xạ quyết định vòng
      let suggestedDecision: "Include" | "Exclude" | "Unsure" = "Unsure";
      let screeningReason = "Nhập từ tệp CSV";
      let screeningStage = "V1";
      let finalDecision: "Include" | "Exclude" | "Unsure" | "" = "";

      if (isContainer) {
        suggestedDecision = "Exclude";
        screeningReason = "EC-N — tập kỷ yếu (container), không phải bài thực nghiệm";
        screeningStage = "V2";
      } else if (rawV1Decision) {
        // Map vòng Title/Abstract cũ sang V2 chuẩn
        screeningStage = "V2";
        if (/include/i.test(rawV1Decision)) {
          suggestedDecision = "Include";
        } else if (/exclude/i.test(rawV1Decision)) {
          suggestedDecision = "Exclude";
        } else {
          suggestedDecision = "Unsure";
        }
        if (rawV1Reason) screeningReason = rawV1Reason;
      }

      if (rawV2Status) {
        screeningStage = "V3";
        if (/loại/i.test(rawV2Status) || /đề xuất loại/i.test(rawV2Status)) {
          suggestedDecision = "Exclude";
          screeningReason = `${rawV2Status}: ${rawV2Note}`;
        } else if (/giữ/i.test(rawV2Status)) {
          suggestedDecision = "Include";
          screeningReason = `${rawV2Status}: ${rawV2Note}`;
        }
      }

      const provenance: SourceProvenance = {
        source: rawSource,
        sourceRecordId: rawId || rawDoi || paperId,
        queryVersion: normalizedQueryVersion || "Q1",
        retrievedAt: new Date().toISOString(),
        method: "import_csv",
        url: rawUrl,
        rawQuery: rawPhienBan,
      };

      const record: PaperRecord = {
        id: paperId,
        source: rawSource,
        discoverySource: rawSource,
        collectionMethod: "import_csv",
        title: rawTitle,
        authors: rawAuthors,
        year: rawYear,
        venue: rawVenue,
        doi: rawDoi,
        snippet: rawAbstract ? rawAbstract.slice(0, 300) : "",
        abstract: rawAbstract,
        url: rawUrl || (rawDoi ? `https://doi.org/${rawDoi}` : ""),
        query: rawPhienBan || "",
        retrieval_date: new Date().toISOString(),
        search_id: "",
        uncertain_authors: !rawAuthors,
        uncertain_year: !rawYear,
        uncertain_venue: !rawVenue,
        uncertain_doi: !rawDoi,
        missing_abstract: !rawAbstract,
        screeningStage,
        pipelineStage: isFile03 ? "V3" : isFile02 ? "V2" : "V1",
        queryVersion: normalizedQueryVersion,
        matchedCriteria: [],
        suggestedDecision,
        screeningReason,
        finalDecision,
        userNotes: rawV2Note || rawV1Reason || "",
        publicationType: isContainer ? "proceedings" : "proceedings-article",
        isContainer,
        provenanceList: [provenance],
      };

      validRecords.push(record);
    });

    let suggestedStage: "B1" | "V1" | "V2" | "V3" = "V1";
    if (isFile03) suggestedStage = "V3";
    else if (isFile02) suggestedStage = "V2";

    return {
      fileName,
      fileType: "csv",
      totalRowsParsed: dataRows.length,
      validRecords,
      containersCount,
      articlesCount,
      rowErrors,
      warnings,
      suggestedPipelineStage: suggestedStage,
      metadataSummary: {
        sources: sourcesCount,
        withDoi,
        withAbstract,
      },
    };
  }

  /**
   * Parse BibTeX format
   */
  static parseBibtex(bibContent: string, fileName: string = "uploaded.bib"): ImportPreviewResult {
    const entries = bibContent.split(/@(?=[a-zA-Z]+\s*\{)/);
    const validRecords: PaperRecord[] = [];
    const rowErrors: Array<{ row: number; error: string }> = [];

    entries.forEach((entry, idx) => {
      const trimmed = entry.trim();
      if (!trimmed) return;

      const typeMatch = trimmed.match(/^([a-zA-Z]+)\s*\{\s*([^,]+),/);
      if (!typeMatch) {
        rowErrors.push({ row: idx + 1, error: "Không nhận diện được BibTeX key hoặc entry type." });
        return;
      }

      const entryType = typeMatch[1].toLowerCase();
      const citeKey = typeMatch[2].trim();

      const getField = (field: string): string => {
        const regex = new RegExp(`${field}\\s*=\\s*[\\{"]([^\\}"]+)[\\}"]`, "i");
        const match = trimmed.match(regex);
        return match ? match[1].trim() : "";
      };

      const title = getField("title");
      const authors = getField("author");
      const year = getField("year");
      const venue = getField("journal") || getField("booktitle") || "";
      const doi = getField("doi").replace(/^https?:\/\/doi\.org\//i, "");
      const abstract = getField("abstract");
      const url = getField("url") || (doi ? `https://doi.org/${doi}` : "");

      const isContainer = entryType === "proceedings" || entryType === "book";
      const id = doi ? `doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}` : `bib_${citeKey}`;

      validRecords.push({
        id,
        source: "BibTeX Import",
        discoverySource: "BibTeX Import",
        collectionMethod: "import_bibtex",
        title: title || citeKey,
        authors,
        year,
        venue,
        doi,
        snippet: abstract.slice(0, 300),
        abstract,
        url,
        query: "",
        retrieval_date: new Date().toISOString(),
        search_id: "",
        uncertain_authors: !authors,
        uncertain_year: !year,
        uncertain_venue: !venue,
        uncertain_doi: !doi,
        missing_abstract: !abstract,
        screeningStage: "V1",
        pipelineStage: "B1",
        queryVersion: "Q1",
        matchedCriteria: [],
        suggestedDecision: isContainer ? "Exclude" : "Unsure",
        screeningReason: isContainer ? "EC-N (container)" : "Nhập từ tệp BibTeX",
        finalDecision: "",
        userNotes: "",
        isContainer,
        publicationType: isContainer ? "proceedings" : "proceedings-article",
        provenanceList: [
          {
            source: "BibTeX Import",
            sourceRecordId: citeKey,
            retrievedAt: new Date().toISOString(),
            method: "import_bibtex",
            url,
          },
        ],
      });
    });

    return {
      fileName,
      fileType: "bibtex",
      totalRowsParsed: entries.length,
      validRecords,
      containersCount: validRecords.filter((r) => r.isContainer).length,
      articlesCount: validRecords.filter((r) => !r.isContainer).length,
      rowErrors,
      warnings: [],
      suggestedPipelineStage: "B1",
      metadataSummary: {
        sources: { "BibTeX Import": validRecords.length },
        withDoi: validRecords.filter((r) => r.doi).length,
        withAbstract: validRecords.filter((r) => r.abstract).length,
      },
    };
  }
}
