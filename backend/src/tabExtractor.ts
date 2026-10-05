import { cleanDoi } from "./dedup";
import { TabExtractedData } from "./types";

/**
 * Trích xuất metadata bài báo từ nội dung HTML của trang web (hoặc từ DOM parser)
 */
export function extractMetadataFromHtml(html: string, pageUrl: string = ""): TabExtractedData {
  if (!html || html.trim().length === 0) {
    return {
      sourceUrl: pageUrl,
      method: "Empty HTML",
      title: "",
      authors: "",
      year: "",
      venue: "",
      doi: "",
      abstract: "",
      pdfUrl: "",
    };
  }

  // 1. Trích xuất qua HighWire Press (citation_*) meta tags (ƯU TIÊN 1)
  const getMeta = (metaName: string): string => {
    const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${metaName}["'][^>]*content=["']([^"']*)["']`, "i");
    const match = regex.exec(html);
    if (match) return match[1].trim();

    // Thử thứ tự ngược lại (content trước name/property)
    const revRegex = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${metaName}["']`,
      "i",
    );
    const revMatch = revRegex.exec(html);
    return revMatch ? revMatch[1].trim() : "";
  };

  const getAllMetas = (metaName: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${metaName}["'][^>]*content=["']([^"']*)["']`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      if (match[1].trim()) results.push(match[1].trim());
    }
    const revRegex = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${metaName}["']`,
      "gi",
    );
    while ((match = revRegex.exec(html)) !== null) {
      const val = match[1].trim();
      if (val && !results.includes(val)) results.push(val);
    }
    return results;
  };

  let title = getMeta("citation_title");
  const citationAuthors = getAllMetas("citation_author");
  let authors = citationAuthors.join("; ");
  let doi = getMeta("citation_doi");
  let venue =
    getMeta("citation_journal_title") || getMeta("citation_conference_title") || getMeta("citation_publisher");
  let rawDate = getMeta("citation_publication_date") || getMeta("citation_date") || getMeta("citation_year");
  let abstract = getMeta("citation_abstract");
  let pdfUrl = getMeta("citation_pdf_url");

  let methodUsed = "HighWire citation_* Meta";

  // 2. Trích xuất qua Schema.org JSON-LD (ƯU TIÊN 2 nếu thiếu trường)
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1].trim());
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];

      for (const item of items) {
        const itemType = String(item["@type"] || "").toLowerCase();
        if (
          itemType.includes("article") ||
          itemType.includes("scholarlyarticle") ||
          itemType.includes("techreport") ||
          itemType.includes("report") ||
          itemType.includes("publication")
        ) {
          if (!title) title = item.headline || item.name || "";
          if (!authors && item.author) {
            const authorList = Array.isArray(item.author) ? item.author : [item.author];
            authors = authorList
              .map((a: any) => (typeof a === "string" ? a : a.name || ""))
              .filter(Boolean)
              .join("; ");
          }
          if (!doi && (item.identifier || item.sameAs)) {
            const idVal = String(item.identifier || item.sameAs);
            const doiM = idVal.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
            if (doiM) doi = doiM[0];
          }
          if (!venue && item.isPartOf) {
            venue = typeof item.isPartOf === "string" ? item.isPartOf : item.isPartOf.name || "";
          }
          if (!venue && item.publisher) {
            venue = typeof item.publisher === "string" ? item.publisher : item.publisher.name || "";
          }
          if (!rawDate && item.datePublished) {
            rawDate = String(item.datePublished);
          }
          if (!abstract && (item.description || item.abstract)) {
            abstract = item.abstract || item.description || "";
          }
          methodUsed = "JSON-LD + citation_*";
        }
      }
    } catch {
      // Bỏ qua lỗi parse JSON-LD hỏng
    }
  }

  // 3. Dự phòng Dublin Core & OpenGraph
  if (!title) {
    title = getMeta("DC.title") || getMeta("dc.title") || getMeta("og:title");
    if (!title) {
      const docTitleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (docTitleM) title = docTitleM[1].trim();
    }
  }

  if (!authors) {
    const dcAuthors = getAllMetas("DC.creator").concat(getAllMetas("dc.creator"));
    if (dcAuthors.length > 0) authors = dcAuthors.join("; ");
  }

  if (!doi) {
    const dcId = getMeta("DC.identifier") || getMeta("dc.identifier");
    const doiM = dcId.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    if (doiM) doi = doiM[0];
  }

  if (!venue) {
    venue = getMeta("DC.source") || getMeta("dc.source") || getMeta("og:site_name");
  }

  if (!rawDate) {
    rawDate = getMeta("DC.date") || getMeta("dc.date") || getMeta("article:published_time");
  }

  if (!abstract) {
    abstract =
      getMeta("DC.description") || getMeta("dc.description") || getMeta("description") || getMeta("og:description");
  }

  // 4. arXiv DOM Selector Fallback (đặc thù cho LaTeXML / ar5iv / arXiv /abs/ & /html/)
  const isArxiv = /arxiv\.org/i.test(pageUrl) || /arxiv:/i.test(pageUrl);

  if (isArxiv) {
    // A. Xác định PDF của chính paper từ arXiv ID: https://arxiv.org/pdf/{arxivId}
    // Tuyệt đối không chọn liên kết .pdf đầu tiên trong nội dung bài
    const arxivMatch =
      pageUrl.match(/arxiv\.org\/(?:abs|html|pdf)\/([a-z\-]+(?:\.[a-z\-]+)?\/\d{7}|\d{4}\.\d{4,5}(?:v\d+)?)/i) ||
      pageUrl.match(/arxiv:([a-z\-]+(?:\.[a-z\-]+)?\/\d{7}|\d{4}\.\d{4,5}(?:v\d+)?)/i);
    if (arxivMatch) {
      const arxivId = arxivMatch[1].replace(/\.pdf$/i, "");
      pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
      methodUsed = "arXiv Canonical URL";
    }

    // B. Lấy abstract từ cấu trúc DOM thực tế của arXiv HTML (.ltx_abstract)
    if (!abstract) {
      const ltxAbsMatch =
        html.match(
          /<(?:section|div)[^>]*class=["'][^"']*(?:ltx_abstract|abstract)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div)>/i,
        ) || html.match(/<blockquote[^>]*class=["'][^"']*abstract[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i);
      if (ltxAbsMatch) {
        let absHtml = ltxAbsMatch[1];
        // Loại bỏ thẻ tiêu đề bên trong abstract
        absHtml = absHtml.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
        absHtml = absHtml.replace(/<span[^>]*class=["'][^"']*ltx_title[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "");

        // Trích xuất các đoạn paragraph
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        const paragraphs: string[] = [];
        let pMatch: RegExpExecArray | null;
        while ((pMatch = pRegex.exec(absHtml)) !== null) {
          const pText = pMatch[1].replace(/<[^>]+>/g, "").trim();
          if (pText) paragraphs.push(pText);
        }

        if (paragraphs.length > 0) {
          abstract = paragraphs.join("\n\n");
        } else {
          abstract = absHtml
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }
        abstract = abstract.replace(/^(?:Abstract[:.]?)\s*/i, "").trim();
      }
    }

    // C. Tiêu đề arXiv HTML nếu chưa có
    if (!title) {
      const titleMatch = html.match(/<h1[^>]*class=["'][^"']*(?:title|ltx_title)[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/<[^>]+>/g, "")
          .replace(/^Title:\s*/i, "")
          .trim();
      }
    }

    // D. Tác giả từ cấu trúc DOM LaTeXML (.ltx_personname) nếu chưa có
    if (!authors) {
      const authorRegex = /<span[^>]*class=["'][^"']*ltx_personname[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
      const authorList: string[] = [];
      let aMatch: RegExpExecArray | null;
      while ((aMatch = authorRegex.exec(html)) !== null) {
        const name = aMatch[1].replace(/<[^>]+>/g, "").trim();
        if (name && !authorList.includes(name)) authorList.push(name);
      }
      if (authorList.length > 0) {
        authors = authorList.join("; ");
      }
    }

    // E. Năm từ arXiv ID (vd: 2509.05540v1 -> 2025) nếu chưa có
    if (!rawDate && arxivMatch) {
      const y2 = arxivMatch[1].slice(0, 2);
      if (/^\d\d$/.test(y2)) {
        rawDate = `20${y2}`;
      }
    }
  }

  // Chuẩn hóa năm 4 chữ số
  let year = "";
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) year = yearMatch[1];
  }

  // Chuẩn hóa link PDF nếu là relative
  if (pdfUrl && pageUrl && !pdfUrl.startsWith("http://") && !pdfUrl.startsWith("https://")) {
    try {
      pdfUrl = new URL(pdfUrl, pageUrl).toString();
    } catch {
      // Giữ nguyên nếu không parse được
    }
  }

  // 5. Đọc các bảng HTML có cấu trúc (table, figure.ltx_table, caption, headers, cells)
  const structuredTables: Array<{
    id?: string;
    caption: string;
    section?: string;
    anchor: string;
    headers: string[];
    cells: string[];
    rawText: string;
  }> = [];

  const figTableRegex =
    /<figure[^>]*class=["'][^"']*ltx_table[^"']*["'][^>]*id=["']([^"']*)["'][^>]*>([\s\S]*?)<\/figure>/gi;
  let figMatch: RegExpExecArray | null;
  while ((figMatch = figTableRegex.exec(html)) !== null) {
    const tableId = figMatch[1];
    const figBody = figMatch[2];
    const sectionFromId = tableId.includes(".") ? tableId.split(".")[0] : undefined;

    const capM = figBody.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    const caption = capM
      ? capM[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

    const headers: string[] = [];
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let thM: RegExpExecArray | null;
    while ((thM = thRegex.exec(figBody)) !== null) {
      const t = thM[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (t) headers.push(t);
    }

    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM: RegExpExecArray | null;
    while ((tdM = tdRegex.exec(figBody)) !== null) {
      const t = tdM[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (t) cells.push(t);
    }

    const rawT = `[Table / Figure #${tableId}: ${caption} | Headers: ${headers.join(" | ")} | Cells: ${cells.join(", ")}]`;
    structuredTables.push({
      id: tableId,
      caption,
      section: sectionFromId,
      anchor: `#${tableId}`,
      headers,
      cells,
      rawText: rawT,
    });
  }

  // Generic <table> nếu chưa có từ figure
  if (structuredTables.length === 0) {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tblMatch: RegExpExecArray | null;
    let tblIdx = 1;
    while ((tblMatch = tableRegex.exec(html)) !== null) {
      const tblBody = tblMatch[1];
      const capM = tblBody.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
      const caption = capM
        ? capM[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "";

      const headers: string[] = [];
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thM: RegExpExecArray | null;
      while ((thM = thRegex.exec(tblBody)) !== null) {
        const t = thM[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (t) headers.push(t);
      }

      const cells: string[] = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdM: RegExpExecArray | null;
      while ((tdM = tdRegex.exec(tblBody)) !== null) {
        const t = tdM[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (t) cells.push(t);
      }

      if (caption || cells.length > 0) {
        const tId = `table-${tblIdx++}`;
        const rawT = `[Table / Figure #${tId}: ${caption} | Headers: ${headers.join(" | ")} | Cells: ${cells.join(", ")}]`;
        structuredTables.push({
          id: tId,
          caption,
          anchor: `#${tId}`,
          headers,
          cells,
          rawText: rawT,
        });
      }
    }
  }

  // Xóa các tiền tố HTML entities thông dụng trong title/abstract
  const cleanText = (str?: string) =>
    (str || "")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

  // QUY TẮC BẮT BUỘC: Không gán hoặc coi "arXiv" / "arXiv.org" là venue đã xác minh
  let cleanedVenue = cleanText(venue);
  if (/^\s*arxiv(\.org)?\s*$/i.test(cleanedVenue)) {
    cleanedVenue = "";
  }

  // Nếu venue chưa có hoặc là arXiv preprint, trích xuất venue hội nghị/tạp chí từ văn bản HTML (running headers, footnotes)
  if (!cleanedVenue) {
    if (
      /\bSBES\s*['’]?\d{2,4}\b/i.test(html) ||
      /\bBrazilian\s+Symposium\s+on\s+Software\s+Engineering\b/i.test(html)
    ) {
      cleanedVenue = "Brazilian Symposium on Software Engineering (SBES)";
    } else {
      const confHeaderMatch = html.match(
        /\b((?:ICSE|ISSTA|ASE|ESEC\/FSE|FSE|MSR|ICSME|SANER|ICST|ISSRE|QRS|SAC|AST)\s*['’]\d{2})\b/i,
      );
      if (confHeaderMatch) {
        cleanedVenue = confHeaderMatch[1];
      } else {
        const fullConfMatch = html.match(/\b(Proceedings of the\s+[\w\s]{4,80}?(?:Conference|Symposium|Workshop))\b/i);
        if (fullConfMatch) {
          cleanedVenue = fullConfMatch[1].trim();
        }
      }
    }
  }

  let rawText = "";
  if (structuredTables.length > 0) {
    rawText = structuredTables.map((t) => t.rawText).join("\n\n");
  }

  return {
    sourceUrl: pageUrl,
    method: methodUsed,
    title: cleanText(title),
    authors: cleanText(authors),
    year,
    venue: cleanedVenue,
    doi: cleanDoi(doi),
    abstract: cleanText(abstract), // Tuyệt đối không lấy snippet làm abstract
    pdfUrl: pdfUrl ? pdfUrl.trim() : "",
    rawText,
    tables: structuredTables,
  };
}
