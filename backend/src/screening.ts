import { ScreeningDecision } from './types';

export interface ScreeningEvaluation {
  stage: 'V1' | 'V2';
  suggestedDecision: ScreeningDecision;
  matchedCriteria: string[];
  unknownCriteria: string[];
  missingEvidence: string[];
  screeningReason: string;
}

export interface ScreeningOptions {
  pageCount?: number;
  fullTextUnavailable?: boolean;
  publicationType?: string;
  sourceEvidence?: string;
  hasVerifiedEpBva?: boolean;
  hasVerifiedTableOrFigure?: boolean;
}


/**
 * 1. Helper kiểm tra ngôn ngữ tiếng Anh (IC-L)
 * Phải có bằng chứng riêng, chưa xác minh để unknown, không tự đánh dấu đạt.
 */
export function isEnglishVerified(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  // Bỏ qua nếu có ký tự có dấu tiếng Việt
  const nonEnglishDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (nonEnglishDiacritics.test(text)) return false;

  const englishWords = /\b(the|and|of|in|for|with|on|at|to|is|are|a|an|by|from|this|that|we|our|paper|results?|approach|method)\b/i;
  return englishWords.test(text);
}

/**
 * 2. Helper kiểm tra hội nghị hoặc tạp chí khoa học (IC-T)
 * QUY TẮC BẮT BUỘC (Ca biên 4):
 * - IC-T KHÔNG ĐƯỢC xác minh chỉ từ tên nhà xuất bản Springer / IEEE / ACM / Elsevier / Wiley.
 * - Dùng metadata loại xuất bản (publicationType) và bằng chứng nguồn (sourceEvidence).
 * - Luận văn / luận án (thesis / dissertation) không đạt IC-T.
 */
export function isConferenceOrJournal(
  venue?: string,
  options?: ScreeningOptions
): boolean {
  const thesisRegex = /\b(thesis|dissertation|master's\s*thesis|doctoral\s*dissertation|phd\s*thesis|bachelor's\s*thesis)\b/i;

  // 1. Luận văn / luận án không đạt IC-T
  if (options?.publicationType && thesisRegex.test(options.publicationType)) return false;
  if (options?.sourceEvidence && thesisRegex.test(options.sourceEvidence)) return false;
  if (venue && thesisRegex.test(venue)) return false;

  // 2. Dùng metadata loại xuất bản nếu có
  if (options?.publicationType) {
    const pubType = options.publicationType.toLowerCase().trim();
    if (/\b(conference|journal|proceedings|symposium|transactions|workshop)\b/i.test(pubType)) {
      return true;
    }
  }

  // 3. Dùng bằng chứng nguồn nếu có
  if (options?.sourceEvidence) {
    const evidence = options.sourceEvidence.toLowerCase().trim();
    if (/\b(proceedings|conference|journal|transactions|symposium|workshop)\b/i.test(evidence)) {
      return true;
    }
  }

  if (!venue || venue.trim().length === 0) return false;
  const v = venue.toLowerCase().trim();
  if (v === 'google scholar' || v === 'n/a' || v === 'unknown') return false;

  // 4. IC-T KHÔNG ĐƯỢC xác minh chỉ từ tên Springer/IEEE/ACM:
  // Không cho phép các chuỗi chỉ có tên publisher như "Springer", "IEEE", "ACM", "Elsevier", "Wiley", "Springer, Cham"...
  // Phải chứa từ khóa thể loại hội nghị / tạp chí hoặc tên hội nghị / tạp chí chuyên ngành đã biết:
  const confJournalKeywords = /\b(proceedings|conference|journal|transactions|symposium|workshop|icse|issta|ase|fse|icst|tse|tosem|infsof|jss|sqj|esec|sigsoft|comsac|qsic|icws|icwe|services|scico|spe|software)\b/i;

  return confJournalKeywords.test(v);
}

/**
 * 3. Helper kiểm tra kỹ thuật black-box: Phân hoạch tương đương (EP) và/hoặc Phân tích giá trị biên (BVA) (IC-I)
 * YÊU CẦU BẮT BUỘC: EP và/hoặc BVA cho tham số REST request.
 * Test generation, fuzzing, random testing hoặc LLM riêng lẻ KHÔNG ĐỦ để đánh dấu đạt IC-I.
 */
export function hasEpOrBva(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const epRegex = /\b(equivalence\s*partition(ing|s)?|equivalence\s*class(es)?|\bep\b(?=\s*[\/&,]\s*bva|\s*technique|\s*method|\s*test|\s*parameter|\s*input))\b/i;
  const bvaRegex = /\b(boundary[- ]value(\s*analysis)?|boundary\s*testing|\bbva\b(?=\s*[\/&,]\s*ep|\s*technique|\s*method|\s*test|\s*parameter|\s*input))\b/i;
  const epBvaCombined = /\b(ep\s*[\/&,]\s*bva|bva\s*[\/&,]\s*ep)\b/i;
  return epRegex.test(text) || bvaRegex.test(text) || epBvaCombined.test(text);
}

/**
 * 4. Helper kiểm tra số liệu định lượng trong Table hoặc Figure (IC-E)
 * QUY TẮC BẮT BUỘC (Ca biên 3):
 * - hasQuantitativeTableOrFigure phải nhận được "Table 1 reports 80% coverage."
 * - KHÔNG coi riêng số thứ tự của Table/Figure (như "Table 1", "Figure 2") là kết quả.
 * - TUYỆT ĐỐI KHÔNG coi từ "Table", "evaluation", "coverage" đứng riêng là bằng chứng.
 */
export function hasQuantitativeTableOrFigure(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  // Mẫu 1: Table/Fig X ... [kết quả định lượng cụ thể] (vd: "Table 1 reports 80% coverage.", "Figure 2: 95% branch coverage", "Table 1 shows 48 mutants")
  const tableThenDataRegex = /\b(table|figure|fig\.)\s*(\d+|[ivx]+)\b[^.\n\r]{0,120}?\b(\d+(\.\d+)?%|\d+\s*(mutants?|faults?|bugs?|errors?|tests?|requests?|endpoints?)\b)/i;

  // Mẫu 2: [kết quả định lượng cụ thể] ... Table/Fig X (vd: "80% coverage was reported in Table 1")
  const dataThenTableRegex = /\b(\d+(\.\d+)?%|\d+\s*(mutants?|faults?|bugs?|errors?|tests?|requests?|endpoints?)\b)[^.\n\r]{0,120}?\b(table|figure|fig\.)\s*(\d+|[ivx]+)\b/i;

  return tableThenDataRegex.test(text) || dataThenTableRegex.test(text);
}

/**
 * 5. Helper kiểm tra phạm vi kiểm thử REST API ở mức HTTP request (IC-P)
 * QUY TẮC BẮT BUỘC (Ca biên 1):
 * - GraphQL riêng lẻ KHÔNG ĐƯỢC đánh dấu đạt IC-P.
 */
export function hasRestApiScope(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const t = text.toLowerCase();

  const hasGraphQL = /\bgraphql\b/i.test(t);
  const explicitRestRegex = /\b(rest(\s*[-_]?\s*apis?|\s*[-_]?\s*ful)?|openapi|swagger|\braml\b)\b/i;
  const hasExplicitRest = explicitRestRegex.test(t);

  // Ca biên 1: Nếu là GraphQL riêng lẻ (không có REST API / OpenAPI / Swagger / RAML) -> không đạt IC-P
  if (hasGraphQL && !hasExplicitRest) {
    return false;
  }

  // Nếu có REST API cụ thể
  if (hasExplicitRest) {
    return true;
  }

  // Các dạng kiểm thử API/dịch vụ web qua HTTP requests
  const generalHttpApiRegex = /\b(web\s*apis?|http\s*(requests?|endpoints?|traffic|payloads?)|microservices?\s*apis?|api\s*testing|web\s*service\s*testing)\b/i;

  return generalHttpApiRegex.test(t);
}

/**
 * Bộ tiêu chí Inclusion / Exclusion (IC/EC) dùng chung — nhóm 1 (SaoCungDuoc) · RQ FA26-EXT-12
 * Tham chiếu chính xác từ ie_criteria.md & review-protocol.md
 *
 * IC/EC CỐ ĐỊNH:
 * - IC-L: Paper viết bằng tiếng Anh (phải có bằng chứng riêng).
 * - IC-T: Đăng trên conference hoặc journal (không phải blog, thesis - phải có bằng chứng venue/metadata).
 * - IC-E: Có ít nhất 1 con số kết quả trong Table hoặc Figure (chỉ nhắc tên metric trong abstract/text chưa đủ).
 * - EC-D: Trùng với paper đã có (Duplicate).
 * - EC-A: Không tải được full-text (CHỈ gắn khi xác nhận không tải được full-text, KHÔNG gắn khi chỉ thiếu abstract).
 * - EC-S: Dưới 4 trang (abstract, poster) - CHỈ dùng khi xác minh số trang < 4 từ full-text, không đoán từ snippet.
 * - EC-N: Không có thực nghiệm (vision paper, tutorial).
 *
 * ĐIỀN THEO RQ FA26-EXT-12 (REST API Testing EP/BVA):
 * - IC-Y: Từ 2020 trở đi (khung 2020 - 2026). Ghi thêm ngày chốt tìm kiếm theo protocol; mọi lần nới khoảng năm phải được ghi log.
 * - IC-P: REST API: kiểm thử ở mức request cho dịch vụ HTTP (yêu cầu NL và/hoặc schema API: OpenAPI, Swagger, RAML). GraphQL riêng lẻ không đạt IC-P.
 * - IC-I: Kỹ thuật thiết kế test black-box: phân hoạch tương đương (EP) và/hoặc phân tích giá trị biên (BVA) cho tham số request.
 *         Category partition/TSL chỉ được tính khi nội dung mô tả cho thấy đáp ứng IC-I; không tự động coi là EP/BVA.
 * - EC-O: Loại sẵn ≥ 2 chủ đề dễ lẫn:
 *     (1) KHÔNG về UI/E2E web testing (Selenium, Cypress, DOM UI);
 *     (2) KHÔNG về unit test thư viện nội bộ (package-level, class/method level, JUnit);
 *     (3) KHÔNG thuần bug report / fault localization (không sinh ca kiểm thử);
 *     (4) Phi phần mềm hoặc xuất bản ngoài 2020-2026.
 *
 * HƯỚNG DẪN ÁP DỤNG:
 * - Vòng 1: Đánh giá title/abstract; thiếu bằng chứng ghi Unsure. Không suy diễn thiếu abstract thành EC-A hay EC-N.
 * - Vòng 2: Full-text; IC-I cần bằng chứng EP/BVA tham số request (phân biệt với nhắc trong Related Work/References).
 *   IC-E cần số liệu định lượng trong Table/Figure.
 * - Quyết định cuối do người review xác nhận; AI/extension chỉ gợi ý.
 */

export function evaluateScreeningV1(
  title: string,
  snippet: string,
  abstract: string,
  year: string,
  venue?: string,
  options?: ScreeningOptions
): ScreeningEvaluation {
  const fullText = `${title} ${snippet} ${abstract}`.toLowerCase();
  const matchedCriteria: string[] = [];
  const unknownCriteria: string[] = [];
  const missingEvidence: string[] = [];

  // 1. Kiểm tra EC-O: Lĩnh vực phi phần mềm (y sinh, lâm sàng, vật liệu...)
  const nonSoftwareKeywords = [
    'clinical trial', 'patient', 'covid-19', 'blood test', 'polymerase',
    'chemical', 'concrete', 'soil', 'medical diagnosis', 'cardiac', 'in vitro'
  ];
  for (const kw of nonSoftwareKeywords) {
    if (fullText.includes(kw) && !fullText.includes('software') && !fullText.includes('api')) {
      matchedCriteria.push('EC-O');
      return {
        stage: 'V1',
        suggestedDecision: 'Exclude',
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        screeningReason: `Loại theo EC-O (Out of Scope): Tài liệu thuộc lĩnh vực phi phần mềm ('${kw}').`
      };
    }
  }

  // 2. Kiểm tra EC-O (Vi phạm IC-Y): Năm xuất bản ngoài khung 2020 - 2026
  const parsedYear = parseInt(year, 10);
  if (!isNaN(parsedYear)) {
    if (parsedYear < 2020 || parsedYear > 2026) {
      matchedCriteria.push('EC-O');
      return {
        stage: 'V1',
        suggestedDecision: 'Exclude',
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        screeningReason: `Loại theo EC-O (vi phạm IC-Y): Năm xuất bản (${parsedYear}) ngoài khung 2020 - 2026.`
      };
    }
    matchedCriteria.push('IC-Y');
  } else {
    unknownCriteria.push('IC-Y');
    missingEvidence.push('Năm xuất bản chưa xác định');
  }

  // 3. Kiểm tra EC-N: Không có thực nghiệm (vision paper, tutorial)
  const tutorialRegex = /\b(tutorial|vision\s*paper|position\s*paper|panel\s*discussion)\b/i;
  if (tutorialRegex.test(title)) {
    matchedCriteria.push('EC-N');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-N: Tài liệu dạng tutorial hoặc vision paper không có thực nghiệm.'
    };
  }

  // 4. Kiểm tra EC-O: Blog, thesis, dissertation (vi phạm IC-T - Ca biên 4)
  const thesisRegex = /\b(thesis|dissertation|master's\s*thesis|doctoral\s*dissertation|phd\s*thesis|bachelor's\s*thesis)\b/i;
  const isThesis =
    thesisRegex.test(title) ||
    thesisRegex.test(venue || '') ||
    thesisRegex.test(options?.publicationType || '') ||
    thesisRegex.test(options?.sourceEvidence || '');

  if (isThesis) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (vi phạm IC-T): Tài liệu dạng luận văn/luận án, không phải hội nghị/tạp chí.'
    };
  }

  // 5. Kiểm tra EC-S: CHỈ DÙNG KHI XÁC MINH SỐ TRANG < 4 (Không loại survey/review chỉ dựa vào nhãn/title)
  if (options?.pageCount !== undefined && options.pageCount > 0 && options.pageCount < 4) {
    matchedCriteria.push('EC-S');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: `Loại theo EC-S: Đã xác minh bài báo dưới 4 trang (${options.pageCount} trang).`
    };
  }

  // 6. KIỂM TRA PHẠM VI REST API vs CÁC CHỦ ĐỀ NGOẠI PHẠM VI (EC-O theo ie_criteria.md)
  // Ca biên 1: GraphQL riêng lẻ không được tính là REST API scope
  const hasRestScope = hasRestApiScope(fullText);

  // (1) EC-O: UI / E2E web testing (Selenium, Cypress, DOM UI)
  const uiE2eRegex = /\b(selenium|cypress|playwright|web\s*ui\s*testing|gui\s*testing|dom[- ]based|user\s*interface\s*testing|end[- ]to[- ]end\s*web\s*test\w*)\b/i;
  const hasUiE2eScope = uiE2eRegex.test(fullText);
  if (hasUiE2eScope && !hasRestScope) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu về kiểm thử giao diện người dùng UI/E2E web testing, không phải kiểm thử REST API ở mức HTTP request.'
    };
  }

  // (2) EC-O: Unit test thư viện nội bộ (package-level, class/method level, JUnit)
  const internalUnitRegex = /\b(unit\s*test\w*|junit|test\s*units?|method[- ]level|class[- ]level|unit\s*level|developer[- ]written\s*tests|library\s*testing)\b/i;
  const hasInternalUnitScope = internalUnitRegex.test(fullText);
  const titleHasUnitTesting = /\b(unit\s*test\w*|junit|class[- ]level|method[- ]level)\b/i.test(title);
  const titleHasRestApi = /\b(rest(\s*[-_]?\s*apis?|\s*[-_]?\s*ful)?|openapi|swagger|microservice)\b/i.test(title);

  if ((titleHasUnitTesting && !titleHasRestApi) || (hasInternalUnitScope && !hasRestScope)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu tập trung vào kiểm thử đơn vị nội bộ (internal unit testing / package / class / method level), không thuộc phạm vi kiểm thử REST API ở mức HTTP request.'
    };
  }

  // (3) EC-O: Thuần bug report / fault localization (không sinh ca kiểm thử)
  const pureFaultLocalizationRegex = /\b(fault\s*localization|bug\s*report\s*summarization|defect\s*prediction\s*only|bug\s*triage)\b/i;
  const anyTestGenRegex = /\b(test\s*case\s*generation|test\s*generation|automated\s*test|fuzzing|test\s*suite\s*generation|synthesis\s*of\s*tests|generating\s*tests|equivalence\s*partitioning|boundary[- ]value|boundary\s*testing)\b/i;
  if (pureFaultLocalizationRegex.test(fullText) && !anyTestGenRegex.test(fullText) && !hasRestScope) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu thuần về báo cáo lỗi / bản địa hóa lỗi (fault localization), không có kỹ thuật sinh ca kiểm thử.'
    };
  }

  // 7. Kiểm tra EC-A: CHỈ GẮN KHI XÁC NHẬN KHÔNG TẢI ĐƯỢC FULL-TEXT
  if (options?.fullTextUnavailable === true) {
    matchedCriteria.push('EC-A');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence: ['Không thể tải toàn văn (EC-A)'],
      screeningReason: 'Loại theo EC-A: Đã xác nhận không thể tải được toàn văn bài báo.'
    };
  }

  // 8. KIỂM TRA SỰ HIỆN DIỆN CỦA ABSTRACT (Thiếu abstract: Unsure + missingEvidence, KHÔNG gắn EC-A)
  const hasFullAbstract = Boolean(abstract && abstract.trim().length > 50);
  if (!hasFullAbstract) {
    missingEvidence.push('abstract');
    if (hasRestScope) {
      matchedCriteria.push('IC-P');
    } else {
      unknownCriteria.push('IC-P');
      if (fullText.includes('graphql')) {
        missingEvidence.push('GraphQL riêng lẻ không thỏa mãn kiểm thử REST API ở mức HTTP request (IC-P)');
      }
    }
    unknownCriteria.push('IC-I');
    unknownCriteria.push('IC-E');

    if (isConferenceOrJournal(venue, options)) {
      matchedCriteria.push('IC-T');
    } else {
      unknownCriteria.push('IC-T');
    }

    if (isEnglishVerified(title + ' ' + snippet)) {
      matchedCriteria.push('IC-L');
    } else {
      unknownCriteria.push('IC-L');
    }

    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Chưa có abstract đầy đủ từ nguồn tìm kiếm. Gợi ý Unsure và ghi nhận thiếu bằng chứng (chưa gắn EC-A khi chưa xác minh việc tải full-text).'
    };
  }

  // 9. NẾU CÓ ABSTRACT ĐẦY ĐỦ:
  // (a) Kiểm tra IC-P (REST API at HTTP request level - Ca biên 1)
  if (!hasRestScope) {
    unknownCriteria.push('IC-P');
    if (fullText.includes('graphql')) {
      missingEvidence.push('GraphQL riêng lẻ không thỏa mãn kiểm thử REST API ở mức HTTP request (IC-P)');
      return {
        stage: 'V1',
        suggestedDecision: 'Unsure',
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        screeningReason: 'Tài liệu về GraphQL riêng lẻ không thỏa mãn phạm vi kiểm thử REST API ở mức HTTP request [Thiếu IC-P]. Cần thẩm định toàn văn.'
      };
    }
    missingEvidence.push('Thiếu bằng chứng kiểm thử REST API ở mức HTTP request (IC-P)');
    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Chưa tìm thấy bằng chứng rõ ràng về kiểm thử dịch vụ REST API ở mức HTTP request [Thiếu IC-P]. Cần thẩm định toàn văn.'
    };
  }
  matchedCriteria.push('IC-P');

  // (b) Kiểm tra IC-I (Kỹ thuật EP và/hoặc BVA cho tham số request)
  // Test generation, fuzzing, random testing hoặc LLM riêng lẻ KHÔNG ĐỦ
  const hasEpBvaEvidence = options?.hasVerifiedEpBva !== undefined ? options.hasVerifiedEpBva : hasEpOrBva(fullText);
  if (!hasEpBvaEvidence) {
    unknownCriteria.push('IC-I');
    missingEvidence.push('Thiếu bằng chứng kỹ thuật EP và/hoặc BVA cho tham số REST request (IC-I)');
    // Ghi nhận AI nếu có, nhưng không được Include vì thiếu EP/BVA
    const usesAi = /\b(large\s*language\s*models?|\bllms?\b|machine\s*learning|\bgpt\b|deep\s*learning|generative\s*ai)\b/i.test(fullText);
    const aiNote = usesAi ? ' (Nghiên cứu có sử dụng AI/LLM hợp lệ nhưng chưa thấy áp dụng EP/BVA)' : '';
    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: `Có đề cập kiểm thử REST API nhưng chưa thấy bằng chứng áp dụng Phân hoạch tương đương (EP) hoặc Phân tích giá trị biên (BVA) cho tham số request [Thiếu IC-I]${aiNote}. Bắt buộc để Unsure.`
    };
  }
  matchedCriteria.push('IC-I');

  // (c) Kiểm tra IC-L (Ngôn ngữ tiếng Anh có bằng chứng riêng)
  if (isEnglishVerified(fullText)) {
    matchedCriteria.push('IC-L');
  } else {
    unknownCriteria.push('IC-L');
    missingEvidence.push('Chưa xác minh ngôn ngữ tiếng Anh (IC-L)');
  }

  // (d) Kiểm tra IC-T (Conference/Journal có bằng chứng riêng - Ca biên 4: Không chỉ dựa vào Springer/IEEE/ACM)
  if (isConferenceOrJournal(venue, options)) {
    matchedCriteria.push('IC-T');
  } else {
    unknownCriteria.push('IC-T');
    missingEvidence.push('Nơi xuất bản chưa xác minh conference/journal (IC-T) (không xác minh chỉ từ tên Springer/IEEE/ACM)');
  }

  // (e) Kiểm tra IC-E (Số liệu Table/Figure - Ca biên 3)
  const hasIceEvidence = options?.hasVerifiedTableOrFigure !== undefined ? options.hasVerifiedTableOrFigure : hasQuantitativeTableOrFigure(fullText);
  if (hasIceEvidence) {
    matchedCriteria.push('IC-E');
  } else {
    unknownCriteria.push('IC-E');
    missingEvidence.push('Chưa xác minh số liệu định lượng trong Table/Figure (IC-E)');
  }


  // Đánh giá quyết định gợi ý vòng V1:
  // Cần đạt tối thiểu IC-P, IC-I, IC-Y, IC-L, IC-T. Nếu IC-T hoặc IC-L chưa xác minh -> Unsure
  const requiredV1 = ['IC-P', 'IC-I', 'IC-Y', 'IC-L', 'IC-T'];
  const hasAllRequiredV1 = requiredV1.every(c => matchedCriteria.includes(c));

  if (hasAllRequiredV1) {
    const usesAi = /\b(large\s*language\s*models?|\bllms?\b|machine\s*learning|\bgpt\b|generative\s*ai)\b/i.test(fullText);
    const aiNote = usesAi ? ' (Kết hợp AI/LLM hợp lệ trong phạm vi)' : '';
    return {
      stage: 'V1',
      suggestedDecision: 'Include',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: `Thỏa mãn tiêu chí IC sơ bộ ở vòng V1 (IC-P, IC-I, IC-Y, IC-L, IC-T${matchedCriteria.includes('IC-E') ? ', IC-E' : ''}): Nghiên cứu sinh ca kiểm thử REST API sử dụng EP/BVA${aiNote}.`
    };
  }

  return {
    stage: 'V1',
    suggestedDecision: 'Unsure',
    matchedCriteria,
    unknownCriteria,
    missingEvidence,
    screeningReason: `Bản tóm tắt còn tiêu chí bắt buộc chưa được xác minh (${unknownCriteria.join(', ')}). Bắt buộc gợi ý Unsure để thẩm định qua toàn văn.`
  };
}

/**
 * Screening V2: Thẩm định Toàn văn (Full-Text)
 * QUY TẮC BẮT BUỘC:
 * - V2 KHÔNG ĐƯỢC Include khi full-text rỗng, thiếu pageCount hợp lệ, hoặc còn tiêu chí bắt buộc unknown.
 * - Ca biên 1: GraphQL riêng lẻ không được đánh dấu đạt IC-P.
 * - Ca biên 2: V2 thiếu pageCount hợp lệ phải Unsure; 3 trang Exclude, 4 trang qua kiểm tra EC-S.
 * - Ca biên 3: hasQuantitativeTableOrFigure nhận được "Table 1 reports 80% coverage." nhưng không coi riêng số thứ tự Table 1 là kết quả.
 * - Ca biên 4: IC-T không được xác minh chỉ từ tên Springer/IEEE/ACM; Dùng metadata loại xuất bản và bằng chứng nguồn; thesis/dissertation không đạt IC-T.
 */
export function evaluateScreeningV2(
  title: string,
  abstract: string,
  fullTextContent: string,
  year: string,
  venue?: string,
  options?: ScreeningOptions
): ScreeningEvaluation {
  const matchedCriteria: string[] = [];
  const unknownCriteria: string[] = [];
  const missingEvidence: string[] = [];

  // 1. Kiểm tra nếu xác nhận không tải được full-text -> Exclude theo EC-A
  if (options?.fullTextUnavailable === true) {
    matchedCriteria.push('EC-A');
    return {
      stage: 'V2',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence: ['Không thể tải toàn văn (EC-A)'],
      screeningReason: 'Loại theo EC-A: Đã xác nhận không thể tải toàn văn.'
    };
  }

  // 2. V2 KHÔNG ĐƯỢC Include khi full-text rỗng
  if (!fullTextContent || fullTextContent.trim().length === 0) {
    return {
      stage: 'V2',
      suggestedDecision: 'Unsure',
      matchedCriteria: [],
      unknownCriteria: ['IC-L', 'IC-T', 'IC-E', 'IC-Y', 'IC-P', 'IC-I'],
      missingEvidence: ['Toàn văn rỗng (chưa cung cấp nội dung toàn văn)'],
      screeningReason: 'Toàn văn rỗng, không thể thẩm định V2. Bắt buộc giữ Unsure (không gắn EC-A nếu chưa xác nhận lỗi tải).'
    };
  }

  // 3. Kiểm tra số trang theo EC-S (Ca biên 2):
  // - V2 thiếu pageCount hợp lệ phải Unsure;
  // - 3 trang Exclude;
  // - 4 trang qua kiểm tra EC-S.
  const pageCount = options?.pageCount;
  const hasValidPageCount = pageCount !== undefined && typeof pageCount === 'number' && !isNaN(pageCount) && pageCount > 0;

  if (hasValidPageCount && pageCount < 4) {
    matchedCriteria.push('EC-S');
    return {
      stage: 'V2',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: `Loại theo EC-S: Đã xác minh bài báo dưới 4 trang (${pageCount} trang).`
    };
  }

  if (!hasValidPageCount) {
    unknownCriteria.push('EC-S');
    missingEvidence.push('Thiếu số trang hợp lệ để thẩm định EC-S (yêu cầu bài báo ≥ 4 trang)');
  }

  // 4. Kiểm tra loại trừ EC-O trên toàn văn
  const fullTextScan = `${title} ${abstract} ${fullTextContent}`.toLowerCase();

  // Kiểm tra thesis / dissertation (Ca biên 4: thesis/dissertation không đạt IC-T)
  const thesisRegex = /\b(thesis|dissertation|master's\s*thesis|doctoral\s*dissertation|phd\s*thesis|bachelor's\s*thesis)\b/i;
  const isThesis =
    thesisRegex.test(title) ||
    thesisRegex.test(venue || '') ||
    thesisRegex.test(options?.publicationType || '') ||
    thesisRegex.test(options?.sourceEvidence || '') ||
    thesisRegex.test(fullTextScan.slice(0, 1000));

  if (isThesis) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V2',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (vi phạm IC-T): Tài liệu dạng luận văn/luận án, không phải hội nghị/tạp chí.'
    };
  }

  // Phi phần mềm
  const nonSoftwareKeywords = [
    'clinical trial', 'patient', 'covid-19', 'blood test', 'polymerase',
    'chemical', 'concrete', 'soil', 'medical diagnosis', 'cardiac', 'in vitro'
  ];
  for (const kw of nonSoftwareKeywords) {
    if (fullTextScan.includes(kw) && !fullTextScan.includes('software') && !fullTextScan.includes('api')) {
      matchedCriteria.push('EC-O');
      return {
        stage: 'V2',
        suggestedDecision: 'Exclude',
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        screeningReason: `Loại theo EC-O (Out of Scope): Tài liệu thuộc lĩnh vực phi phần mềm ('${kw}').`
      };
    }
  }

  // Năm xuất bản
  const parsedYear = parseInt(year, 10);
  if (!isNaN(parsedYear)) {
    if (parsedYear < 2020 || parsedYear > 2026) {
      matchedCriteria.push('EC-O');
      return {
        stage: 'V2',
        suggestedDecision: 'Exclude',
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        screeningReason: `Loại theo EC-O (vi phạm IC-Y): Năm xuất bản (${parsedYear}) ngoài khung 2020 - 2026.`
      };
    }
    matchedCriteria.push('IC-Y');
  } else {
    unknownCriteria.push('IC-Y');
    missingEvidence.push('Năm xuất bản chưa xác định');
  }

  // Kiểm tra REST API scope (Ca biên 1: GraphQL riêng lẻ không được đánh dấu đạt IC-P)
  const hasRestScope = hasRestApiScope(fullTextScan);

  // Unit test thư viện nội bộ
  const internalUnitRegex = /\b(unit\s*test\w*|junit|test\s*units?|method[- ]level|class[- ]level|unit\s*level|developer[- ]written\s*tests|library\s*testing)\b/i;
  const hasInternalUnitScope = internalUnitRegex.test(fullTextScan);
  const titleHasUnitTesting = /\b(unit\s*test\w*|junit|class[- ]level|method[- ]level)\b/i.test(title);
  const titleHasRestApi = /\b(rest(\s*[-_]?\s*apis?|\s*[-_]?\s*ful)?|openapi|swagger|microservice)\b/i.test(title);

  if ((titleHasUnitTesting && !titleHasRestApi) || (hasInternalUnitScope && !hasRestScope)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V2',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu tập trung vào kiểm thử đơn vị nội bộ (internal unit testing / package / class / method level), không thuộc phạm vi kiểm thử REST API ở mức HTTP request.'
    };
  }

  if (hasRestScope) {
    matchedCriteria.push('IC-P');
  } else {
    unknownCriteria.push('IC-P');
    if (fullTextScan.includes('graphql')) {
      missingEvidence.push('GraphQL riêng lẻ không thỏa mãn kiểm thử REST API ở mức HTTP request (IC-P)');
    } else {
      missingEvidence.push('Thiếu bằng chứng kiểm thử REST API ở mức HTTP request (IC-P)');
    }
  }

  // Kiểm tra EP / BVA (IC-I)
  const hasEpBvaEvidence = options?.hasVerifiedEpBva !== undefined ? options.hasVerifiedEpBva : hasEpOrBva(fullTextScan);
  if (hasEpBvaEvidence) {
    matchedCriteria.push('IC-I');
  } else {
    unknownCriteria.push('IC-I');
    missingEvidence.push('Thiếu bằng chứng kỹ thuật EP và/hoặc BVA cho tham số REST request (IC-I)');
  }

  // Kiểm tra tiếng Anh (IC-L)
  if (isEnglishVerified(fullTextScan)) {
    matchedCriteria.push('IC-L');
  } else {
    unknownCriteria.push('IC-L');
    missingEvidence.push('Chưa xác minh ngôn ngữ tiếng Anh (IC-L)');
  }

  // Kiểm tra conference/journal (IC-T - Ca biên 4: Không chỉ dựa vào Springer/IEEE/ACM)
  if (isConferenceOrJournal(venue, options) || (!isThesis && isConferenceOrJournal(fullTextScan.slice(0, 1000), options))) {
    matchedCriteria.push('IC-T');
  } else {
    unknownCriteria.push('IC-T');
    missingEvidence.push('Nơi xuất bản chưa xác minh conference/journal (IC-T) (không xác minh chỉ từ tên Springer/IEEE/ACM)');
  }

  // Kiểm tra số liệu định lượng trong Table/Figure (IC-E - Ca biên 3)
  const hasIceEvidence = options?.hasVerifiedTableOrFigure !== undefined ? options.hasVerifiedTableOrFigure : hasQuantitativeTableOrFigure(fullTextScan);
  if (hasIceEvidence) {
    matchedCriteria.push('IC-E');
  } else {
    unknownCriteria.push('IC-E');
    missingEvidence.push('Chưa có bằng chứng số liệu định lượng trong Table hoặc Figure (IC-E)');
  }


  // 5. V2 KHÔNG ĐƯỢC INCLUDE KHI CÒN TIÊU CHÍ BẮT BUỘC UNKNOWN HOẶC THIẾU PAGECOUNT HỢP LỆ
  const mandatoryCriteria = ['IC-L', 'IC-T', 'IC-E', 'IC-Y', 'IC-P', 'IC-I'];
  const hasAllMandatory = mandatoryCriteria.every(c => matchedCriteria.includes(c));

  if (!hasValidPageCount || !hasAllMandatory || unknownCriteria.length > 0) {
    const unverifiedReasons: string[] = [];
    if (!hasValidPageCount) {
      unverifiedReasons.push('thiếu xác minh số trang hợp lệ (cần ≥ 4 trang để vượt qua EC-S)');
    }
    if (unknownCriteria.length > 0) {
      unverifiedReasons.push(`tiêu chí chưa xác minh: ${unknownCriteria.join(', ')}`);
    }
    return {
      stage: 'V2',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      unknownCriteria,
      missingEvidence,
      screeningReason: `Toàn văn chưa đủ điều kiện Include (${unverifiedReasons.join('; ')}). Bắt buộc gợi ý Unsure, không được Include.`
    };
  }

  return {
    stage: 'V2',
    suggestedDecision: 'Include',
    matchedCriteria,
    unknownCriteria: [],
    missingEvidence: [],
    screeningReason: 'Đạt toàn bộ 6 tiêu chí IC giai đoạn V2 và vượt qua kiểm tra EC-S (Toàn văn có đánh giá thực nghiệm định lượng trong Table/Figure cho REST API testing sử dụng EP/BVA, xuất bản conference/journal từ 2020 bằng tiếng Anh, dung lượng ≥ 4 trang).'
  };
}

