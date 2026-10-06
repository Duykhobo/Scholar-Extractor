import { evaluateProfileScreening } from "./profiles/engine";
import { ResearchProfile } from "./profiles/types";
import { evaluateScreeningV1, evaluateScreeningV2, hasQuantitativeTableOrFigure } from "./screening";
import { EvidenceSnippet, PaperRecord, StructuredTable, TabAnalysisResult, TabExtractedData } from "./types";

/**
 * 1. Tính toán độ tương đồng giữa 2 tiêu đề bài báo (Dice Coefficient)
 */
export function computeTitleSimilarity(title1?: string, title2?: string): number {
  if (!title1 || !title2) return 0;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const s1 = normalize(title1);
  const s2 = normalize(title2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;

  // Nếu tiêu đề này chứa trọn tiêu đề kia
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.85, minLen / maxLen);
  }

  // Phân tích n-grams (bigrams)
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  let intersection = 0;
  for (const bg of b1) {
    if (b2.has(bg)) intersection++;
  }

  return (2.0 * intersection) / (b1.size + b2.size);
}

/**
 * 2. Xác định Section chứa đoạn trích (Methodology, Evaluation, Related Work, References...)
 */
export function detectSection(
  fullText: string,
  matchIndex: number,
): "Methodology" | "Evaluation" | "Related Work" | "References" | "Unknown" {
  // Quét ngược tối đa 1500 ký tự trước vị trí match để tìm tiêu đề mục gần nhất
  const start = Math.max(0, matchIndex - 1500);
  const preText = fullText.slice(start, matchIndex).toLowerCase();

  const refRegex = /\b(references|bibliography|works\s*cited)\b/i;
  const relatedRegex =
    /\b(related\s*works?|literature\s*review|background\s*and\s*related\s*work|state\s*of\s*the\s*art|prior\s*work)\b/i;
  const evalRegex =
    /\b(evaluation|empirical\s*study|experimental\s*results?|experiments?|case\s*stud(y|ies)|results?\s*and\s*discussion)\b/i;
  const methodRegex =
    /\b(methodology|proposed\s*approach|system\s*design|our\s*approach|method|technique|implementation|testing\s*framework)\b/i;

  // Lấy các chỉ số xuất hiện cuối cùng trước match
  const lastRef = preText.search(refRegex);
  const lastRelated = preText.search(relatedRegex);
  const lastEval = preText.search(evalRegex);
  const lastMethod = preText.search(methodRegex);

  const positions = [
    { section: "References" as const, pos: lastRef },
    { section: "Related Work" as const, pos: lastRelated },
    { section: "Evaluation" as const, pos: lastEval },
    { section: "Methodology" as const, pos: lastMethod },
  ].filter((p) => p.pos !== -1);

  if (positions.length === 0) return "Unknown";

  // Lấy mục có vị trí xuất hiện gần vị trí match nhất
  positions.sort((a, b) => b.pos - a.pos);
  return positions[0].section;
}

/**
 * 2b. Helper phân giải tên section từ anchor ID hoặc heading (S5 -> Evaluation, S3/S4 -> Methodology, S2 -> Related Work)
 */
export function resolveSectionName(
  sectionStr?: string,
): "Methodology" | "Evaluation" | "Related Work" | "References" | "Unknown" {
  if (!sectionStr) return "Evaluation";
  const s = sectionStr.toLowerCase();
  if (/\b(results?|discussion|evaluation|experiments?|findings)\b/i.test(s) || /^#?s5\b/i.test(s)) {
    return "Evaluation";
  }
  if (/\b(method|methodology|approach|system|architecture|design|implementation)\b/i.test(s) || /^#?s[34]\b/i.test(s)) {
    return "Methodology";
  }
  if (/\b(related|background|prior|literature)\b/i.test(s) || /^#?s2\b/i.test(s)) {
    return "Related Work";
  }
  if (/\b(reference|bibliography|cited)\b/i.test(s) || /^#?bib\b/i.test(s)) {
    return "References";
  }
  const detected = detectSection(sectionStr, sectionStr.length);
  return detected !== "Unknown" ? detected : "Evaluation";
}

/**
 * 3. Trích xuất bằng chứng IC-I và IC-E từ nội dung văn bản (từng trang PDF hoặc DOM HTML)
 * QUY TẮC BẮT BUỘC:
 * - Bằng chứng HTML lưu section/anchor; page=null. Chỉ ghi số trang khi thực sự parse PDF.
 * - Table/Figure nhận dấu phẩy thập phân: 71,7%, 40,8%.
 * - Đọc bảng HTML theo cấu trúc table, caption, headers và cells.
 */
export function extractEvidenceFromPages(
  pages: { pageNum: number; text: string }[],
  isPdf: boolean = true,
  structuredTables?: StructuredTable[],
  profile?: ResearchProfile,
): {
  evidence: EvidenceSnippet[];
  warnings: string[];
} {
  const evidence: EvidenceSnippet[] = [];
  const warnings: string[] = [];

  // Helper detect section
  const detectSectionLocal = (str: string, pos: number): string => detectSection(str, pos);

  // Truong hop su dung Ho so Nghien cuu rieng (khong phai preset_swt302)
  if (profile && profile.id !== "preset_swt302") {
    // 1. Quet bang bieu structuredTables
    if (structuredTables && structuredTables.length > 0) {
      for (const tbl of structuredTables) {
        const combinedText = `${tbl.caption || ""} ${(tbl.headers || []).join(" ")} ${(tbl.cells || []).join(" ")}`;
        if (
          /\b(\d+(?:[.,]\d+)?%|p\s*[<=]\s*0\.\d+|N\s*=\s*\d+|M\s*=\s*|SD\s*=\s*|score|sample|participants?)\b/i.test(
            combinedText,
          )
        ) {
          const anchor = tbl.id ? `#${tbl.id}` : undefined;
          evidence.push({
            type: "EVIDENCE_TABLE",
            term: tbl.caption || (tbl.id ? `Table #${tbl.id}` : "Table"),
            context: `[Bảng HTML ${tbl.id ? `#${tbl.id}` : ""}${tbl.caption ? `: ${tbl.caption}` : ""}] ${tbl.rawText.slice(0, 260)}...`,
            page: null,
            anchor,
            section: resolveSectionName(tbl.section),
            isValidEvidence: true,
            reason: `Bảng dữ liệu định lượng / thực nghiệm của nghiên cứu.`,
          });
        }
      }
    }

    // 2. Quet noi dung text tung trang theo tieu chi cua profile
    for (const page of pages) {
      const text = page.text;
      const pageNum = page.pageNum;

      const getContextLabel = (matchIdx: number, section: string, anchorTag?: string): string => {
        if (isPdf) return `[Trang ${pageNum} - ${section}]`;
        if (anchorTag) return `[${anchorTag} - ${section}]`;
        return `[Section: ${section}]`;
      };

      const findNearbyAnchor = (matchIdx: number): string | undefined => {
        const windowText = text.slice(Math.max(0, matchIdx - 300), Math.min(text.length, matchIdx + 300));
        const m = windowText.match(/#([a-zA-Z0-9_.-]+)/);
        return m ? `#${m[1]}` : undefined;
      };

      for (const criterion of profile.criteria) {
        const keywords = criterion.parameters?.keywords || [];
        if (!Array.isArray(keywords) || keywords.length === 0) continue;

        for (const kw of keywords) {
          if (!kw || typeof kw !== "string") continue;
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const kwRegex = new RegExp(`\\b${escaped}\\b`, "gi");
          let match: RegExpExecArray | null;

          while ((match = kwRegex.exec(text)) !== null) {
            const term = match[0];
            const matchIndex = match.index;
            const snippetStart = Math.max(0, matchIndex - 60);
            const snippetEnd = Math.min(text.length, matchIndex + term.length + 80);
            const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();

            const section = detectSectionLocal(text, matchIndex);
            const anchor = findNearbyAnchor(matchIndex);
            const label = getContextLabel(matchIndex, section, anchor);

            const isReferences = section === "References";
            evidence.push({
              type: criterion.id,
              term,
              context: `${label} "...${context}..."`,
              page: isPdf ? pageNum : null,
              anchor,
              section,
              isValidEvidence: !isReferences,
              reason: isReferences
                ? `Xuất hiện trong References/Trích dẫn.`
                : `Khớp tiêu chí [${criterion.id}: ${criterion.label}].`,
            });

            if (
              evidence.filter((e) => e.type === criterion.id && e.term.toLowerCase() === term.toLowerCase()).length >= 3
            ) {
              break;
            }
          }
        }
      }
    }

    return { evidence, warnings };
  }

  let hasValidIci = false;
  let hasValidIce = false;
  let mentionedMetricWithoutTable = false;

  // 1. Phân tích trước từ danh sách Structured Tables (HTML tables) nếu có
  if (structuredTables && structuredTables.length > 0) {
    const quantMetricRegex =
      /\b(\d+(?:[.,]\d+)?%|\d+\s*(?:mutants?\s*(?:killed|detected|alive)?|faults?\s*(?:found|detected|revealed)?|bugs?\s*(?:found|detected)?|test\s*cases?\s*(?:generated|executed|passed|failed)?|tests?\s*(?:failed|passed)?)\b)/i;

    for (const tbl of structuredTables) {
      // Bỏ qua các bảng chỉ mô tả danh sách project / benchmark / repository (không phải kết quả kiểm thử thực nghiệm)
      const captionOrHeaders = `${tbl.caption || ""} ${(tbl.headers || []).join(" ")}`.toLowerCase();
      const isProjectDescriptionTable =
        /\b(selected\s+(?:projects?|apis?|systems?|benchmarks?)|subject\s+(?:projects?|apis?)|dataset\s+description|benchmarks?\s+description)\b/i.test(
          captionOrHeaders,
        ) && /\b(license|stars?|forks?|cloc|loc|dependencies)\b/i.test(captionOrHeaders);

      if (isProjectDescriptionTable) {
        continue;
      }

      // Loại bỏ con số chỉ là trọng số tính điểm (ví dụ: "weight of 33.33%")
      const textWithoutWeights = tbl.rawText.replace(
        /\bweights?\s*(?:of|denotated\s*by\s*\w+|,|\s*[:=])?\s*\d+(?:[.,]\d+)?%/gi,
        "",
      );
      const combinedText = `${tbl.caption || ""} ${(tbl.headers || []).join(" ")} ${(tbl.cells || []).join(" ")} ${textWithoutWeights}`;
      const quantMatch = combinedText.match(quantMetricRegex);

      if (quantMatch) {
        hasValidIce = true;
        const matchedNum = quantMatch[0];
        const allMatchedNumbers = (combinedText.match(/\b\d+(?:[.,]\d+)?%/g) || []).slice(0, 4);

        const tblSection = resolveSectionName(tbl.section);
        const anchor = tbl.anchor || (tbl.id ? `#${tbl.id}` : undefined);

        // BẢNG HTML TỪ DOM LUÔN CÓ page: null; TUYỆT ĐỐI KHÔNG GÁN page=1
        evidence.push({
          type: "IC-E",
          term: tbl.caption || (tbl.id ? `Table #${tbl.id}` : "Table"),
          context: `[Bảng HTML ${tbl.id ? `#${tbl.id}` : ""}${tbl.caption ? `: ${tbl.caption}` : ""}] ${tbl.rawText.slice(0, 260)}...`,
          page: null,
          anchor,
          section: tblSection,
          isValidEvidence: true,
          reason: `Bảng HTML có cấu trúc chứa số liệu định lượng thực nghiệm (${allMatchedNumbers.length > 0 ? allMatchedNumbers.join(", ") : matchedNum}).`,
        });
      }
    }
  }

  // 2. Quét nội dung text của từng trang (PDF) hoặc toàn bộ nội dung HTML
  for (const page of pages) {
    const text = page.text;
    const pageNum = page.pageNum;

    // Helper tạo context label chuẩn: chỉ ghi số trang khi parse PDF thật, còn HTML ghi anchor/section
    const getContextLabel = (matchIdx: number, section: string, anchorTag?: string): string => {
      if (isPdf) {
        return `[Trang ${pageNum} - ${section}]`;
      }
      if (anchorTag) {
        return `[${anchorTag} - ${section}]`;
      }
      return `[Section: ${section}]`;
    };

    // Helper tìm anchor gần nhất trong phạm vi match
    const findNearbyAnchor = (matchIdx: number): string | undefined => {
      const windowText = text.slice(Math.max(0, matchIdx - 300), Math.min(text.length, matchIdx + 300));
      const m = windowText.match(/#([a-zA-Z0-9_.-]+)/);
      return m ? `#${m[1]}` : undefined;
    };

    // A. Tìm kiếm bằng chứng IC-I
    // 1. Equivalence Partitioning / BVA
    const epBvaRegex =
      /\b(equivalence\s*partition(ing|s)?|equivalence\s*class(es)?|\bep\b(?=\s*[\/&,]\s*bva|\s*technique|\s*method|\s*test|\s*parameter)|\bbva\b(?=\s*[\/&,]\s*ep|\s*technique|\s*method|\s*test|\s*parameter)|boundary[- ]value(\s*analysis)?|boundary\s*testing|parameter\s*boundaries)\b/gi;
    let match: RegExpExecArray | null;

    while ((match = epBvaRegex.exec(text)) !== null) {
      const term = match[0];
      const matchIndex = match.index;
      const snippetStart = Math.max(0, matchIndex - 60);
      const snippetEnd = Math.min(text.length, matchIndex + term.length + 80);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();

      const section = detectSection(text, matchIndex);
      const anchor = findNearbyAnchor(matchIndex);
      const label = getContextLabel(matchIndex, section, anchor);

      // 1. Kiểm tra ngữ cảnh lịch sử / khảo sát thứ cấp (không phải nghiên cứu tự thực hiện)
      const isHistoricalOrSurvey =
        /\b(development\s*of\s*formal\s*test|history\s*of|introduction\s*of\s*unit\s*testing|starting\s*with\s*sunit|traditional\s*testing\s*techniques?|surveys?\s*(?:of|show)|literature\s*(?:shows|highlights|identifies)|among\s*studies|historical\s*development|earlier\s*work)\b/i.test(
          context,
        );

      // 2. Kiểm tra đối tượng tham số (Parameter / Input domain target)
      const hasParamTarget =
        /\b(parameter|param|request|endpoint|input|query|path|body|header|payload|scalar|variable|schema|boundar(y|ies)|range|values?|classes?)\b/i.test(
          context,
        );

      // 3. Kiểm tra hành động áp dụng (Active application action)
      const hasActiveAction =
        /\b(appl(y|ied|ying|ication)|generat(e|ed|ing|ion)|test(ing|s|ed)?|partition(ed|ing)?|evaluat(e|ed|ing)|deriv(e|ed|ing)|design(ed|ing)?|sampl(e|ed|ing)|exercis(e|ed|ing)|select(ed|ing)|propos(e|ed|ing)|implement(ed|ing)?|validat(e|ed|ing)|conduct(ed|ing)?|build(s|ing)?)\b/i.test(
          context,
        );

      if (section === "Related Work" || section === "References") {
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: false,
          reason:
            "Chỉ xuất hiện trong phần Tổng quan (Related Work / References) hoặc trích dẫn; không phải phương pháp nghiên cứu áp dụng.",
        });
      } else if (isHistoricalOrSurvey) {
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: false,
          reason:
            "Đoạn văn chỉ thuật lại lịch sử phát triển kỹ thuật kiểm thử hoặc tổng quan tài liệu chung, chưa chứng minh nghiên cứu này trực tiếp áp dụng EP/BVA cho tham số request.",
        });
      } else if (hasParamTarget && hasActiveAction) {
        hasValidIci = true;
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: true,
          reason:
            "Nghiên cứu có mô tả hành động áp dụng/thiết kế kỹ thuật EP/BVA cho tham số/dữ liệu đầu vào kiểm thử.",
        });
      } else {
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: false,
          reason:
            "Đoạn văn chỉ nhắc đến thuật ngữ EP/BVA lý thuyết đơn thuần, chưa chứng minh hành vi áp dụng cụ thể cho tham số request.",
        });
      }
    }

    // 2. Category-Partition Method / TSL
    const tslRegex = /\b(category[- ]partition(\s*method)?|\btsl\b|test\s*specification\s*language)\b/gi;
    while ((match = tslRegex.exec(text)) !== null) {
      const term = match[0];
      const matchIndex = match.index;
      const snippetStart = Math.max(0, matchIndex - 60);
      const snippetEnd = Math.min(text.length, matchIndex + term.length + 80);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
      const section = detectSection(text, matchIndex);
      const anchor = findNearbyAnchor(matchIndex);
      const label = getContextLabel(matchIndex, section, anchor);

      const hasEpOrBvaInContext =
        /\b(equivalence(\s*partitioning|\s*classes)?|boundary[- ]value|boundary\s*testing|parameter\s*boundaries)\b/i.test(
          context,
        );
      const hasRequestParamInContext = /\b(parameter|request|query|path|body|header|endpoint)\b/i.test(context);

      if (section === "Related Work" || section === "References") {
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: false,
          reason: "Category Partition / TSL chỉ được nhắc trong Related Work / References.",
        });
      } else if (hasEpOrBvaInContext && hasRequestParamInContext) {
        hasValidIci = true;
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: true,
          reason: "Category-Partition / TSL có mô tả rõ ràng áp dụng EP/BVA cho tham số REST request đáp ứng IC-I.",
        });
      } else {
        evidence.push({
          type: "IC-I",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: false,
          reason:
            "Đoạn này chỉ có “TSL + input” hoặc Category-Partition đơn thuần, chưa đủ cấu thành EP/BVA độc lập (cần đối chiếu với các đoạn phương pháp khác).",
        });
      }
    }

    // B. Tìm kiếm bằng chứng IC-E (Table / Figure có số liệu định lượng)
    // Hỗ trợ cả dấu chấm lẫn dấu phẩy thập phân: 71,7%, 40,8%, 80%
    // Cho phép trải rộng qua nhiều dòng trong bảng (lên tới 1500 ký tự)
    const tableFigureRegex =
      /\b(table|figure|fig\.)\s*(\d+|[ivx]+)\b[\s\S]{0,1500}?\b(\d+([.,]\d+)?%|\d+\s*(mutants?\s*(?:killed|detected|alive)?|faults?\s*(?:found|detected|revealed)?|bugs?\s*(?:found|detected)?|test\s*cases?\s*(?:generated|executed|passed|failed)?|tests?\s*(?:failed|passed)?)\b)/gi;
    while ((match = tableFigureRegex.exec(text)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      // 1. Bỏ qua nếu là bảng mô tả danh sách project / benchmark
      const isProjectTable =
        /\b(table|figure|fig\.)\s*(\d+|[ivx]+)\s*[:.\-]?\s*(selected\s+(?:projects?|apis?|systems?|benchmarks?)|subject\s+(?:projects?|apis?)|dataset\s+description)\b/i.test(
          matchText,
        );
      if (isProjectTable) {
        continue;
      }

      // 2. Bỏ qua nếu con số chỉ là trọng số tính điểm (vd: "weight of 33.33%")
      const matchedSnippet = text.slice(matchIndex, matchIndex + matchText.length + 60);
      if (
        /\bweights?\s*(?:of|denotated\s*by\s*\w+|,|\s*[:=])?\s*\d+(?:[.,]\d+)?%/i.test(matchedSnippet) &&
        !/\b(coverage|mutation\s*score|faults?|bugs?|success\s*rate)\b/i.test(matchedSnippet)
      ) {
        continue;
      }

      hasValidIce = true;
      const term = match[0].slice(0, 100).replace(/\s+/g, " ");
      const snippetStart = Math.max(0, matchIndex - 40);
      const snippetEnd = Math.min(text.length, matchIndex + match[0].length + 60);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
      const section = detectSection(text, matchIndex);
      const anchor = findNearbyAnchor(matchIndex);
      const label = getContextLabel(matchIndex, section, anchor);

      // Tránh trùng lặp nếu đã thêm từ structuredTables
      const isAlreadyAdded = evidence.some(
        (e) => e.type === "IC-E" && (e.anchor === anchor || (anchor && e.context.includes(anchor))),
      );
      if (!isAlreadyAdded) {
        evidence.push({
          type: "IC-E",
          term,
          context: `${label} "...${context}..."`,
          page: isPdf ? pageNum : null,
          anchor,
          section,
          isValidEvidence: true,
          reason: "Có số liệu định lượng thực nghiệm cụ thể trong Table / Figure.",
        });
      }
    }

    // Cảnh báo nếu chỉ nhắc metric mà không có Table/Figure
    const metricWordsRegex = /\b(mutation\s*score|branch\s*coverage|code\s*coverage|statement\s*coverage)\b/i;
    if (metricWordsRegex.test(text) && !hasQuantitativeTableOrFigure(text)) {
      mentionedMetricWithoutTable = true;
    }
  }

  if (mentionedMetricWithoutTable && !hasValidIce) {
    warnings.push(
      "Bài báo có nhắc đến chỉ số kiểm thử (coverage / mutation score) nhưng chưa tìm thấy Table hoặc Figure chứa con số kết quả định lượng cụ thể (IC-E chưa đạt).",
    );
  }

  if (!hasValidIci && evidence.some((e) => e.type === "IC-I" && !e.isValidEvidence)) {
    warnings.push(
      "Từ khóa kỹ thuật kiểm thử (EP/BVA/boundary) chỉ xuất hiện trong phần Related Work / References; không tìm thấy bằng chứng áp dụng trong phương pháp đề xuất.",
    );
  }

  return { evidence, warnings };
}

/**
 * 4. Tính toán danh sách các trường dữ liệu thay đổi giữa bản ghi cũ và dữ liệu trích xuất mới
 * QUY TẮC BẮT BUỘC: Không thay venue đã xác minh bằng tên nền tảng arXiv.
 */
export function calculateFieldChanges(
  record: PaperRecord,
  tabData: Partial<TabExtractedData>,
): TabAnalysisResult["changes"] {
  const changes: TabAnalysisResult["changes"] = [];
  const fieldsToCheck: Array<{ field: string; oldVal: string; newVal?: string }> = [
    { field: "title", oldVal: record.title, newVal: tabData.title },
    { field: "authors", oldVal: record.authors, newVal: tabData.authors },
    { field: "year", oldVal: record.year, newVal: tabData.year },
    { field: "venue", oldVal: record.venue, newVal: tabData.venue },
    { field: "doi", oldVal: record.doi, newVal: tabData.doi },
    { field: "abstract", oldVal: record.abstract, newVal: tabData.abstract },
    { field: "pdfUrl", oldVal: record.pdfUrl || "", newVal: tabData.pdfUrl },
    {
      field: "page_count",
      oldVal: record.page_count ? String(record.page_count) : "",
      newVal: tabData.pageCount ? String(tabData.pageCount) : "",
    },
  ];

  for (const item of fieldsToCheck) {
    const oldV = String(item.oldVal !== undefined && item.oldVal !== null ? item.oldVal : "").trim();
    let newV = String(item.newVal !== undefined && item.newVal !== null ? item.newVal : "").trim();

    // Ca 5: Không thay venue đã xác minh bằng tên nền tảng arXiv hoặc chuỗi rỗng
    if (item.field === "venue") {
      const isNewArxiv = /^\s*arxiv(\.org)?\s*$/i.test(newV);
      if (isNewArxiv || !newV) {
        if (oldV && oldV !== "(Trống)") {
          // Giữ nguyên venue đã có, không cho phép thay đổi sang arXiv hoặc xoá venue đã xác minh
          changes.push({
            field: "venue",
            oldValue: oldV,
            newValue: oldV,
            willChange: false,
          });
          continue;
        } else {
          // Ngay cả khi bản ghi cũ chưa có venue, không tự gán "arXiv" làm venue
          newV = "";
        }
      }
    }

    const willChange = Boolean(newV && newV !== oldV);
    changes.push({
      field: item.field,
      oldValue: oldV || "(Trống)",
      newValue: newV || "(Trống)",
      willChange,
    });
  }
  return changes;
}

/**
 * 5. Phân tích đối chiếu giữa Tab Extracted Data và Paper Record được chọn
 */
export function analyzeTabAgainstRecord(
  record: PaperRecord,
  tabData: TabExtractedData,
  profile?: ResearchProfile,
): TabAnalysisResult {
  const warnings: string[] = [];

  // A. Kiểm tra độ tương đồng tiêu đề
  const extractedTitle = (tabData.title || "").trim();
  const recordTitle = (record.title || "").trim();
  const titleMatchConfidence = computeTitleSimilarity(extractedTitle, recordTitle);
  const isTitleMatch = titleMatchConfidence >= 0.55;

  let titleMismatchWarning: string | undefined;
  if (!isTitleMatch && extractedTitle && recordTitle) {
    titleMismatchWarning = `⚠️ CẢNH BÁO: Tiêu đề trang đang mở ("${extractedTitle}") có vẻ KHÔNG KHỚP với bài báo đang chọn ("${recordTitle}"). Độ tương đồng: ${Math.round(titleMatchConfidence * 100)}%. Vui lòng kiểm tra lại trước khi xác nhận.`;
    warnings.push(titleMismatchWarning);
  }

  // B. Danh sách các trường sẽ thay đổi
  const changes = calculateFieldChanges(record, tabData);

  // C. Phân tích bằng chứng từ nội dung các trang hoặc full-text
  const isPdf = Boolean(
    (tabData.method && tabData.method.toLowerCase().includes("pdf")) ||
    (tabData.pages && tabData.pages.length > 0 && tabData.pageCount && tabData.pageCount > 0),
  );

  // Phân biệt rành mạch giữa văn bản toàn văn thực sự (PDF / HTML body) và đoạn trích abstract
  const hasRealFullText = Boolean(
    (isPdf && tabData.pages && tabData.pages.length > 0 && tabData.pageCount && tabData.pageCount > 0) ||
    (tabData.rawText &&
      tabData.rawText.trim().length > 100 &&
      tabData.rawText.trim() !== (tabData.abstract || "").trim()) ||
    (tabData.pageCount && tabData.pageCount > 0 && tabData.rawText && tabData.rawText.trim().length > 50),
  );

  const actualFullText = hasRealFullText
    ? tabData.pages && tabData.pages.length > 0
      ? tabData.pages.map((p) => p.text).join("\n")
      : tabData.rawText
    : undefined;

  const pages =
    isPdf && tabData.pages
      ? tabData.pages
      : tabData.rawText
        ? [{ pageNum: 1, text: tabData.rawText }]
        : tabData.abstract
          ? [{ pageNum: 1, text: tabData.abstract }]
          : [];

  const { evidence, warnings: evidenceWarnings } = extractEvidenceFromPages(pages, isPdf, tabData.tables, profile);
  warnings.push(...evidenceWarnings);

  const hasValidIci = evidence.some((e) => e.type === "IC-I" && e.isValidEvidence === true);
  const hasValidIce = evidence.some((e) => e.type === "IC-E" && e.isValidEvidence === true);

  if (tabData.isImagePdf) {
    warnings.push(
      '⚠️ PDF chỉ chứa hình ảnh / bản scan (không trích xuất được văn bản số). Không suy diễn thiếu văn bản thành "không có thực nghiệm" (EC-N).',
    );
  }

  // D. Gợi ý screening cập nhật
  let suggestedScreeningUpdate: TabAnalysisResult["suggestedScreeningUpdate"];
  const fullTextToScan = actualFullText || "";

  if (profile && profile.id !== "preset_swt302") {
    // Chỉ chuyển sang vòng V2 (full_text) khi THỰC SỰ có toàn văn số và số trang xác minh
    const isV2 = Boolean(hasRealFullText && tabData.pageCount && tabData.pageCount > 0);
    const effectiveRecord: PaperRecord = {
      ...record,
      title: tabData.title || record.title,
      abstract: tabData.abstract || record.abstract,
      year: tabData.year || record.year,
      venue: tabData.venue || record.venue,
      doi: tabData.doi || record.doi,
      page_count: tabData.pageCount ?? record.page_count,
    };
    const profileEval = evaluateProfileScreening(profile, effectiveRecord, {
      stage: isV2 ? "full_text" : "title_abstract",
      fullText: actualFullText, // Tuyệt đối không truyền abstract vào làm fullText
      pageCount: tabData.pageCount,
      isImagePdf: tabData.isImagePdf,
      tables: tabData.tables,
    });
    suggestedScreeningUpdate = {
      stage: isV2 ? "V2" : "V1",
      suggestedDecision: profileEval.suggestedDecision,
      matchedCriteria: profileEval.matchedCriteria,
      unknownCriteria: profileEval.unknownCriteria,
      missingEvidence: profileEval.missingEvidence,
      screeningReason: profileEval.screeningReason,
    };
  } else if (fullTextToScan.trim().length > 100 && tabData.pageCount) {
    // Vòng V2
    const screening = evaluateScreeningV2(
      tabData.title || record.title,
      tabData.abstract || record.abstract,
      fullTextToScan,
      tabData.year || record.year,
      tabData.venue || record.venue,
      {
        pageCount: tabData.pageCount,
        fullTextUnavailable: false,
        hasVerifiedEpBva: hasValidIci,
        hasVerifiedTableOrFigure: hasValidIce,
        publicationType: (tabData as any).publicationType || record.publicationType,
        sourceEvidence: tabData.venue || record.venue,
      },
    );
    suggestedScreeningUpdate = screening;
  } else {
    // Vòng V1
    const screening = evaluateScreeningV1(
      tabData.title || record.title,
      record.snippet,
      tabData.abstract || record.abstract,
      tabData.year || record.year,
      tabData.venue || record.venue,
      {
        pageCount: tabData.pageCount,
        fullTextUnavailable: false,
        hasVerifiedEpBva: hasValidIci,
        hasVerifiedTableOrFigure: hasValidIce,
        publicationType: (tabData as any).publicationType || record.publicationType,
        sourceEvidence: tabData.venue || record.venue,
      },
    );
    suggestedScreeningUpdate = screening;
  }

  // BẢO VỆ CHẮC CHẮN THEO PROTOCOL (CHỈ ÁP DỤNG CHO HỒ SƠ SWT302):
  if (!profile || profile.id === "preset_swt302") {
    // Nếu bằng chứng IC-I thẩm định không hợp lệ (ví dụ BVA chỉ nằm trong Related Work hoặc chỉ có TSL+input chung):
    // BẮT BUỘC LOẠI IC-I KHỎI MATCHEDCRITERIA VÀ KHÔNG ĐƯỢC GỢI Ý INCLUDE!
    if (suggestedScreeningUpdate && !hasValidIci) {
      suggestedScreeningUpdate.matchedCriteria = suggestedScreeningUpdate.matchedCriteria.filter((c) => c !== "IC-I");
      if (!suggestedScreeningUpdate.unknownCriteria.includes("IC-I")) {
        suggestedScreeningUpdate.unknownCriteria.push("IC-I");
      }
      if (!suggestedScreeningUpdate.missingEvidence.some((m) => m.includes("IC-I"))) {
        suggestedScreeningUpdate.missingEvidence.push(
          "Từ khóa kỹ thuật kiểm thử chỉ xuất hiện trong Related Work / References hoặc chưa chứng minh EP/BVA cho tham số request (IC-I)",
        );
      }
      if (suggestedScreeningUpdate.suggestedDecision === "Include") {
        suggestedScreeningUpdate.suggestedDecision = "Unsure";
        suggestedScreeningUpdate.screeningReason =
          "Chưa đạt IC-I: Từ khóa kỹ thuật kiểm thử (EP/BVA/TSL) chỉ nằm trong Related Work / References hoặc chưa có bằng chứng áp dụng cho tham số REST request. Giữ Unsure theo protocol.";
      }
    }

    if (suggestedScreeningUpdate && !hasValidIce) {
      suggestedScreeningUpdate.matchedCriteria = suggestedScreeningUpdate.matchedCriteria.filter((c) => c !== "IC-E");
      if (!suggestedScreeningUpdate.unknownCriteria.includes("IC-E")) {
        suggestedScreeningUpdate.unknownCriteria.push("IC-E");
      }
      if (suggestedScreeningUpdate.suggestedDecision === "Include") {
        suggestedScreeningUpdate.suggestedDecision = "Unsure";
        suggestedScreeningUpdate.screeningReason =
          "Chưa đạt IC-E: Chưa tìm thấy kết quả định lượng cụ thể trong Table hoặc Figure. Giữ Unsure theo protocol.";
      }
    }

    // ĐỒNG BỘ NẾU CÓ BẰNG CHỨNG HỢP LỆ VÀ ĐỦ 6 TIÊU CHÍ IC:
    if (suggestedScreeningUpdate && hasValidIci) {
      if (!suggestedScreeningUpdate.matchedCriteria.includes("IC-I")) {
        suggestedScreeningUpdate.matchedCriteria.push("IC-I");
      }
      suggestedScreeningUpdate.unknownCriteria = suggestedScreeningUpdate.unknownCriteria.filter((c) => c !== "IC-I");
      suggestedScreeningUpdate.missingEvidence = suggestedScreeningUpdate.missingEvidence.filter(
        (m) => !m.includes("IC-I"),
      );
    }

    if (suggestedScreeningUpdate && hasValidIce) {
      if (!suggestedScreeningUpdate.matchedCriteria.includes("IC-E")) {
        suggestedScreeningUpdate.matchedCriteria.push("IC-E");
      }
      suggestedScreeningUpdate.unknownCriteria = suggestedScreeningUpdate.unknownCriteria.filter((c) => c !== "IC-E");
      suggestedScreeningUpdate.missingEvidence = suggestedScreeningUpdate.missingEvidence.filter(
        (m) => !m.includes("IC-E"),
      );
    }

    const mandatoryCriteria = ["IC-L", "IC-T", "IC-E", "IC-Y", "IC-P", "IC-I"];
    const allMandatoryMatched = mandatoryCriteria.every((c) => suggestedScreeningUpdate?.matchedCriteria.includes(c));
    const hasAnyExclusion = Boolean(suggestedScreeningUpdate?.matchedCriteria.some((c) => c.startsWith("EC-")));
    const wasAlreadyExcluded = suggestedScreeningUpdate?.suggestedDecision === "Exclude";
    const isFullTextV2 = Boolean(hasRealFullText && tabData.pageCount && tabData.pageCount >= 4);

    if (
      suggestedScreeningUpdate &&
      allMandatoryMatched &&
      suggestedScreeningUpdate.unknownCriteria.length === 0 &&
      !hasAnyExclusion &&
      !wasAlreadyExcluded &&
      isFullTextV2
    ) {
      suggestedScreeningUpdate.stage = "V2";
      suggestedScreeningUpdate.suggestedDecision = "Include";
      suggestedScreeningUpdate.screeningReason =
        "Thỏa mãn toàn bộ 6 tiêu chí IC ở vòng V2 toàn văn (IC-L, IC-T, IC-Y, IC-P, IC-I, IC-E), có số trang >= 4 và không vi phạm bất kỳ tiêu chí EC nào.";
    } else if (suggestedScreeningUpdate && suggestedScreeningUpdate.suggestedDecision === "Include") {
      // Chốt chặn: Nếu thiếu điều kiện toàn văn V2 hoặc có tiêu chí loại trừ thì không được giữ Include
      if (hasAnyExclusion || wasAlreadyExcluded) {
        suggestedScreeningUpdate.suggestedDecision = "Exclude";
      } else {
        suggestedScreeningUpdate.suggestedDecision = "Unsure";
        suggestedScreeningUpdate.screeningReason =
          "Chưa đủ điều kiện xác nhận toàn văn (cần tệp toàn văn >= 4 trang để xác minh V2). Tạm giữ Unsure theo protocol.";
      }
    }
  }

  return {
    extracted: tabData,
    isTitleMatch,
    titleMatchConfidence,
    titleMismatchWarning,
    changes,
    evidence,
    suggestedScreeningUpdate,
    warnings,
  };
}
