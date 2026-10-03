import { PaperRecord, TabExtractedData, TabAnalysisResult, EvidenceSnippet } from './types';
import { evaluateScreeningV1, evaluateScreeningV2, hasQuantitativeTableOrFigure } from './screening';

/**
 * 1. Tính toán độ tương đồng giữa 2 tiêu đề bài báo (Dice Coefficient)
 */
export function computeTitleSimilarity(title1?: string, title2?: string): number {
  if (!title1 || !title2) return 0;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
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
 * 2. Xác định Section chứa đoạn trích (Methodology, Related Work, References...)
 */
export function detectSection(fullText: string, matchIndex: number): 'Methodology' | 'Evaluation' | 'Related Work' | 'References' | 'Unknown' {
  // Quét ngược tối đa 1500 ký tự trước vị trí match để tìm tiêu đề mục gần nhất
  const start = Math.max(0, matchIndex - 1500);
  const preText = fullText.slice(start, matchIndex).toLowerCase();

  const refRegex = /\b(references|bibliography|works\s*cited)\b/i;
  const relatedRegex = /\b(related\s*works?|literature\s*review|background\s*and\s*related\s*work|state\s*of\s*the\s*art|prior\s*work)\b/i;
  const evalRegex = /\b(evaluation|empirical\s*study|experimental\s*results?|experiments?|case\s*stud(y|ies)|results?\s*and\s*discussion)\b/i;
  const methodRegex = /\b(methodology|proposed\s*approach|system\s*design|our\s*approach|method|technique|implementation|testing\s*framework)\b/i;

  // Lấy các chỉ số xuất hiện cuối cùng trước match
  const lastRef = preText.search(refRegex);
  const lastRelated = preText.search(relatedRegex);
  const lastEval = preText.search(evalRegex);
  const lastMethod = preText.search(methodRegex);

  const positions = [
    { section: 'References' as const, pos: lastRef },
    { section: 'Related Work' as const, pos: lastRelated },
    { section: 'Evaluation' as const, pos: lastEval },
    { section: 'Methodology' as const, pos: lastMethod }
  ].filter(p => p.pos !== -1);

  if (positions.length === 0) return 'Unknown';

  // Lấy mục có vị trí xuất hiện gần vị trí match nhất
  positions.sort((a, b) => b.pos - a.pos);
  return positions[0].section;
}

/**
 * 3. Trích xuất bằng chứng IC-I và IC-E từ nội dung văn bản (từng trang hoặc toàn bộ)
 */
export function extractEvidenceFromPages(pages: { pageNum: number; text: string }[]): {
  evidence: EvidenceSnippet[];
  warnings: string[];
} {
  const evidence: EvidenceSnippet[] = [];
  const warnings: string[] = [];

  let hasValidIci = false;
  let hasValidIce = false;
  let mentionedMetricWithoutTable = false;

  for (const page of pages) {
    const text = page.text;
    const pageNum = page.pageNum;

    // A. Tìm kiếm bằng chứng IC-I
    // 1. Equivalence Partitioning / BVA
    const epBvaRegex = /\b(equivalence\s*partition(ing|s)?|equivalence\s*class(es)?|\bep\b(?=\s*[\/&,]\s*bva|\s*technique|\s*method|\s*test|\s*parameter)|\bbva\b(?=\s*[\/&,]\s*ep|\s*technique|\s*method|\s*test|\s*parameter)|boundary[- ]value(\s*analysis)?|boundary\s*testing|parameter\s*boundaries)\b/gi;
    let match: RegExpExecArray | null;

    while ((match = epBvaRegex.exec(text)) !== null) {
      const term = match[0];
      const matchIndex = match.index;
      const snippetStart = Math.max(0, matchIndex - 60);
      const snippetEnd = Math.min(text.length, matchIndex + term.length + 80);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

      const section = detectSection(text, matchIndex);

      if (section === 'Related Work' || section === 'References') {
        evidence.push({
          type: 'IC-I',
          term,
          context: `[Trang ${pageNum} - ${section}] "...${context}..."`,
          page: pageNum,
          section,
          isValidEvidence: false,
          reason: 'Chỉ xuất hiện trong phần Tổng quan (Related Work / References) hoặc trích dẫn; không phải phương pháp nghiên cứu áp dụng.'
        });
      } else {
        hasValidIci = true;
        evidence.push({
          type: 'IC-I',
          term,
          context: `[Trang ${pageNum} - ${section}] "...${context}..."`,
          page: pageNum,
          section,
          isValidEvidence: true,
          reason: 'Kỹ thuật EP/BVA được sử dụng trong phương pháp / thực nghiệm.'
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
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();
      const section = detectSection(text, matchIndex);

      // Quy tắc protocol: Category partition/TSL chỉ được tính khi nội dung mô tả cho thấy đáp ứng IC-I;
      // không tự động coi là EP/BVA.
      const hasParameterContext = /\b(parameter|request|input|equivalence|boundary|partition)\b/i.test(context);

      if (section === 'Related Work' || section === 'References') {
        evidence.push({
          type: 'IC-I',
          term,
          context: `[Trang ${pageNum} - ${section}] "...${context}..."`,
          page: pageNum,
          section,
          isValidEvidence: false,
          reason: 'Category Partition / TSL chỉ được nhắc trong Related Work / References.'
        });
      } else if (hasParameterContext) {
        hasValidIci = true;
        evidence.push({
          type: 'IC-I',
          term,
          context: `[Trang ${pageNum} - ${section}] "...${context}..."`,
          page: pageNum,
          section,
          isValidEvidence: true,
          reason: 'Category-Partition / TSL có mô tả áp dụng phân hoạch tham số request đáp ứng IC-I.'
        });
      } else {
        evidence.push({
          type: 'IC-I',
          term,
          context: `[Trang ${pageNum} - ${section}] "...${context}..."`,
          page: pageNum,
          section,
          isValidEvidence: false,
          reason: 'Chỉ nhắc tên công cụ/kỹ thuật TSL đơn thuần, chưa đủ bằng chứng áp dụng EP/BVA cho tham số request.'
        });
      }
    }

    // B. Tìm kiếm bằng chứng IC-E (Table / Figure có số liệu định lượng)
    const tableFigureRegex = /\b(table|figure|fig\.)\s*(\d+|[ivx]+)\b[^.\n\r]{0,120}?\b(\d+(\.\d+)?%|\d+\s*(mutants?|faults?|bugs?|errors?|tests?|requests?|endpoints?)\b)/gi;
    while ((match = tableFigureRegex.exec(text)) !== null) {
      hasValidIce = true;
      const term = match[0];
      const matchIndex = match.index;
      const snippetStart = Math.max(0, matchIndex - 40);
      const snippetEnd = Math.min(text.length, matchIndex + term.length + 60);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

      evidence.push({
        type: 'IC-E',
        term,
        context: `[Trang ${pageNum}] "...${context}..."`,
        page: pageNum,
        section: detectSection(text, matchIndex),
        isValidEvidence: true,
        reason: 'Có số liệu định lượng thực nghiệm cụ thể trong Table / Figure.'
      });
    }

    // Cảnh báo nếu chỉ nhắc metric mà không có Table/Figure
    const metricWordsRegex = /\b(mutation\s*score|branch\s*coverage|code\s*coverage|statement\s*coverage)\b/i;
    if (metricWordsRegex.test(text) && !hasQuantitativeTableOrFigure(text)) {
      mentionedMetricWithoutTable = true;
    }
  }

  if (mentionedMetricWithoutTable && !hasValidIce) {
    warnings.push('Bài báo có nhắc đến chỉ số kiểm thử (coverage / mutation score) nhưng chưa tìm thấy Table hoặc Figure chứa con số kết quả định lượng cụ thể (IC-E chưa đạt).');
  }

  if (!hasValidIci && evidence.some(e => e.type === 'IC-I' && !e.isValidEvidence)) {
    warnings.push('Từ khóa kỹ thuật kiểm thử (EP/BVA/boundary) chỉ xuất hiện trong phần Related Work / References; không tìm thấy bằng chứng áp dụng trong phương pháp đề xuất.');
  }

  return { evidence, warnings };
}

/**
 * 4. Tính toán danh sách các trường dữ liệu thay đổi giữa bản ghi cũ và dữ liệu trích xuất mới
 */
export function calculateFieldChanges(record: PaperRecord, tabData: Partial<TabExtractedData>): TabAnalysisResult['changes'] {
  const changes: TabAnalysisResult['changes'] = [];
  const fieldsToCheck: Array<{ field: string; oldVal: string; newVal?: string }> = [
    { field: 'title', oldVal: record.title, newVal: tabData.title },
    { field: 'authors', oldVal: record.authors, newVal: tabData.authors },
    { field: 'year', oldVal: record.year, newVal: tabData.year },
    { field: 'venue', oldVal: record.venue, newVal: tabData.venue },
    { field: 'doi', oldVal: record.doi, newVal: tabData.doi },
    { field: 'abstract', oldVal: record.abstract, newVal: tabData.abstract },
    { field: 'pdfUrl', oldVal: record.pdfUrl || '', newVal: tabData.pdfUrl },
    { field: 'page_count', oldVal: record.page_count ? String(record.page_count) : '', newVal: tabData.pageCount ? String(tabData.pageCount) : '' }
  ];

  for (const item of fieldsToCheck) {
    const oldV = (item.oldVal || '').trim();
    const newV = (item.newVal || '').trim();
    const willChange = Boolean(newV && newV !== oldV);
    changes.push({
      field: item.field,
      oldValue: oldV || '(Trống)',
      newValue: newV || '(Trống)',
      willChange
    });
  }
  return changes;
}

/**
 * 5. Phân tích đối chiếu giữa Tab Extracted Data và Paper Record được chọn
 */
export function analyzeTabAgainstRecord(record: PaperRecord, tabData: TabExtractedData): TabAnalysisResult {
  const warnings: string[] = [];

  // A. Kiểm tra độ tương đồng tiêu đề
  const extractedTitle = (tabData.title || '').trim();
  const recordTitle = (record.title || '').trim();
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
  const pages = tabData.pages || (tabData.rawText ? [{ pageNum: 1, text: tabData.rawText }] : []);
  const { evidence, warnings: evidenceWarnings } = extractEvidenceFromPages(pages);
  warnings.push(...evidenceWarnings);

  if (tabData.isImagePdf) {
    warnings.push('⚠️ PDF chỉ chứa hình ảnh / bản scan (không trích xuất được văn bản số). Không suy diễn thiếu văn bản thành "không có thực nghiệm" (EC-N).');
  }

  // D. Gợi ý screening cập nhật
  let suggestedScreeningUpdate: TabAnalysisResult['suggestedScreeningUpdate'];
  const fullTextToScan = pages.map(p => p.text).join('\n') || tabData.rawText || '';

  if (fullTextToScan.trim().length > 100 && tabData.pageCount) {
    // Vòng V2
    const screening = evaluateScreeningV2(
      tabData.title || record.title,
      tabData.abstract || record.abstract,
      fullTextToScan,
      tabData.year || record.year,
      tabData.venue || record.venue,
      {
        pageCount: tabData.pageCount,
        fullTextUnavailable: false
      }
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
        fullTextUnavailable: false
      }
    );
    suggestedScreeningUpdate = screening;
  }

  return {
    extracted: tabData,
    isTitleMatch,
    titleMatchConfidence,
    titleMismatchWarning,
    changes,
    evidence,
    suggestedScreeningUpdate,
    warnings
  };
}
