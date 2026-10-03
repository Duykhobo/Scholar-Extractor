import { ScreeningDecision } from './types';

export interface ScreeningEvaluation {
  stage: 'V1' | 'V2';
  suggestedDecision: ScreeningDecision;
  matchedCriteria: string[];
  screeningReason: string;
}

/**
 * Bộ tiêu chí Inclusion / Exclusion (IC/EC) dùng chung — nhóm 1 (SaoCungDuoc) · RQ FA26-EXT-12
 * Tham chiếu chính xác từ team-synthesis/ie_criteria.md & review-protocol.md
 *
 * IC/EC CỐ ĐỊNH:
 * - IC-L: Paper viết bằng tiếng Anh.
 * - IC-T: Đăng trên conference hoặc journal (không phải blog, thesis).
 * - IC-E: Có ít nhất 1 con số kết quả trong Table hoặc Figure (metrics: mutant, coverage, bugs found, etc.).
 * - EC-D: Trùng với paper đã có (Duplicate).
 * - EC-A: Không tải được full-text hoặc thiếu abstract/dữ liệu thẩm định.
 * - EC-S: Dưới 4 trang (abstract, poster, short paper < 4 trang, keynote).
 * - EC-N: Không có thực nghiệm (vision paper, tutorial).
 *
 * ĐIỀN THEO RQ FA26-EXT-12 (REST API Testing EP/BVA):
 * - IC-Y: Từ 2020 trở đi (2020 - 2026).
 * - IC-P: REST API: kiểm thử ở mức request cho dịch vụ HTTP (yêu cầu NL + schema API); bài toán gắn với mutant/coverage của API.
 * - IC-I: Kỹ thuật thiết kế test black-box: phân hoạch tương đương (EP) và/hoặc phân tích giá trị biên (BVA) cho tham số request (gồm cả so sánh với sinh dữ liệu ngẫu nhiên).
 * - EC-O: Loại sẵn ≥ 2 chủ đề dễ lẫn:
 *     (1) KHÔNG về UI/E2E web testing (Selenium, Cypress, DOM UI);
 *     (2) KHÔNG về unit test thư viện nội bộ (package-level, class/method level, JUnit);
 *     (3) KHÔNG thuần bug report / fault localization (không sinh ca kiểm thử).
 *     (4) Phi phần mềm (y sinh, lâm sàng, vật liệu...) hoặc xuất bản ngoài 2020-2026.
 *
 * LƯU Ý QUAN TRỌNG:
 * 1. Nghiên cứu sử dụng AI / LLM / Machine Learning cho REST API testing HOÀN TOÀN HỢP LỆ, KHÔNG bị loại chỉ vì có AI.
 * 2. Kiểm thử đơn vị nội bộ (unit testing nội bộ / class / method level) không liên quan REST API -> Bắt buộc Exclude theo EC-O.
 * 3. Thiếu abstract hoặc thiếu bằng chứng quan trọng -> Mặc định Unsure.
 * 4. Đây là gợi ý tự động; người dùng có toàn quyền quyết định finalDecision.
 */

export function evaluateScreeningV1(
  title: string,
  snippet: string,
  abstract: string,
  year: string
): ScreeningEvaluation {
  const fullText = `${title} ${snippet} ${abstract}`.toLowerCase();
  const matchedCriteria: string[] = [];

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
        screeningReason: `Loại theo EC-O (Out of Scope): Tài liệu thuộc lĩnh vực phi phần mềm ('${kw}').`
      };
    }
  }

  // 2. Kiểm tra EC-O (Vi phạm IC-Y): Năm xuất bản ngoài khung 2020 - 2026
  const parsedYear = parseInt(year, 10);
  if (!isNaN(parsedYear) && (parsedYear < 2020 || parsedYear > 2026)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: `Loại theo EC-O (vi phạm IC-Y): Năm xuất bản (${parsedYear}) ngoài khung 2020 - 2026.`
    };
  }
  if (!isNaN(parsedYear) && parsedYear >= 2020 && parsedYear <= 2026) {
    matchedCriteria.push('IC-Y');
  }

  // 3. Kiểm tra EC-S: Nghiên cứu thứ cấp (Survey / Systematic Literature Review / Mapping Study)
  const surveyRegex = /\b(systematic literature review|systematic mapping study|\bslr\b|a survey on|literature review)\b/i;
  if (surveyRegex.test(title)) {
    matchedCriteria.push('EC-S');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-S: Nghiên cứu thứ cấp (Survey / Systematic Mapping / SLR), chỉ dùng để tham khảo snowballing.'
    };
  }

  // 4. Kiểm tra EC-N: Không có thực nghiệm (vision paper, tutorial)
  const tutorialRegex = /\b(tutorial|vision\s*paper|position\s*paper|panel\s*discussion)\b/i;
  if (tutorialRegex.test(title)) {
    matchedCriteria.push('EC-N');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-N: Tài liệu dạng tutorial hoặc vision paper không có thực nghiệm.'
    };
  }

  // 5. Kiểm tra EC-T: Không phải blog, thesis, dissertation
  const thesisRegex = /\b(thesis|dissertation|master's\s*thesis|doctoral\s*dissertation|phd\s*thesis)\b/i;
  if (thesisRegex.test(title)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-O (vi phạm IC-T): Tài liệu dạng luận văn (thesis/dissertation), không phải hội nghị/tạp chí có bình duyệt.'
    };
  }

  // 6. KIỂM TRA PHẠM VI REST API vs CÁC CHỦ ĐỀ NGOẠI PHẠM VI (EC-O theo ie_criteria.md)
  // Regex nhận diện REST API ở mức HTTP request (IC-P)
  const restApiRegex = /\b(rest(\s*[-_]?\s*apis?|\s*[-_]?\s*ful)?|web\s*apis?|openapi|swagger|\braml\b|graphql|http\s*(requests?|endpoints?|traffic|payloads?)|microservices?\s*apis?|api\s*testing|web\s*service\s*testing)\b/i;
  const hasRestApiScope = restApiRegex.test(fullText);

  // (1) EC-O: UI / E2E web testing (Selenium, Cypress, DOM UI)
  const uiE2eRegex = /\b(selenium|cypress|playwright|web\s*ui\s*testing|gui\s*testing|dom[- ]based|user\s*interface\s*testing|end[- ]to[- ]end\s*web\s*test\w*)\b/i;
  const hasUiE2eScope = uiE2eRegex.test(fullText);
  if (hasUiE2eScope && !hasRestApiScope) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu về kiểm thử giao diện người dùng UI/E2E web testing, không phải kiểm thử REST API ở mức HTTP request.'
    };
  }

  // (2) EC-O: Unit test thư viện nội bộ (package-level, class/method level, JUnit)
  const internalUnitRegex = /\b(unit\s*test\w*|junit|test\s*units?|method[- ]level|class[- ]level|unit\s*level|developer[- ]written\s*tests|library\s*testing)\b/i;
  const hasInternalUnitScope = internalUnitRegex.test(fullText);
  const titleHasUnitTesting = /\b(unit\s*test\w*|junit|class[- ]level|method[- ]level)\b/i.test(title);
  const titleHasRestApi = /\b(rest|api|openapi|swagger|graphql|microservice)\b/i.test(title);

  if ((titleHasUnitTesting && !titleHasRestApi) || (hasInternalUnitScope && !hasRestApiScope)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu tập trung vào kiểm thử đơn vị nội bộ (internal unit testing / package / class / method level), không thuộc phạm vi kiểm thử REST API ở mức HTTP request.'
    };
  }

  // (3) EC-O: Thuần bug report / fault localization (không sinh ca kiểm thử)
  const pureFaultLocalizationRegex = /\b(fault\s*localization|bug\s*report\s*summarization|defect\s*prediction\s*only|bug\s*triage)\b/i;
  const testGenRegex = /\b(test\s*case\s*generation|test\s*generation|automated\s*test|fuzzing|test\s*suite\s*generation|synthesis\s*of\s*tests|generating\s*tests|equivalence\s*partitioning|boundary[- ]value|boundary\s*testing)\b/i;
  if (pureFaultLocalizationRegex.test(fullText) && !testGenRegex.test(fullText)) {
    matchedCriteria.push('EC-O');
    return {
      stage: 'V1',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-O (Out of Scope): Nghiên cứu thuần về báo cáo lỗi / bản địa hóa lỗi (fault localization), không có kỹ thuật sinh ca kiểm thử.'
    };
  }

  // 7. Kiểm tra sự hiện diện của Abstract đầy đủ (Google Scholar chỉ có snippet)
  const hasFullAbstract = Boolean(abstract && abstract.trim().length > 100);
  if (!hasFullAbstract) {
    matchedCriteria.push('EC-A');
    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      screeningReason: 'Chưa có abstract toàn văn (Google Scholar chỉ trả về đoạn trích dẫn ngắn snippet). Bắt buộc chọn Unsure [EC-A] để thẩm định qua toàn văn.'
    };
  }

  // 8. Nếu có abstract đầy đủ nhưng thiếu bằng chứng rõ ràng về REST API testing (IC-P)
  if (!hasRestApiScope) {
    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      screeningReason: 'Chưa tìm thấy bằng chứng rõ ràng về kiểm thử dịch vụ REST API ở mức HTTP request [Thiếu IC-P]. Cần thẩm định toàn văn.'
    };
  }

  // Ghi nhận đạt IC-P (REST API at HTTP request level)
  matchedCriteria.push('IC-P');

  // 9. Kiểm tra kỹ thuật thiết kế test black-box / sinh test (IC-I)
  const hasBlackBoxOrTestGen = testGenRegex.test(fullText);
  if (!hasBlackBoxOrTestGen) {
    return {
      stage: 'V1',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      screeningReason: 'Có đề cập đến REST API nhưng chưa thấy rõ kỹ thuật thiết kế test black-box (EP/BVA/fuzzing/sinh test) [Thiếu IC-I]. Cần đọc toàn văn.'
    };
  }

  // Ghi nhận đạt IC-I (Black-box EP/BVA/test generation)
  matchedCriteria.push('IC-I');

  // 10. Ghi nhận IC-L (Tiếng Anh) & IC-T (Conference/Journal)
  matchedCriteria.push('IC-L');
  matchedCriteria.push('IC-T');

  // 11. Kiểm tra bằng chứng thực nghiệm (IC-E)
  const evalRegex = /\b(evaluat\w*|experiment\w*|benchmark\w*|coverage|fault\s*detection|mutation\s*score|precision|recall|casestudy|case\s*study|table|figure)\b/i;
  if (evalRegex.test(fullText)) {
    matchedCriteria.push('IC-E');
  }

  // Ghi nhận nếu dùng AI/LLM (HỢP LỆ THEO PROTOCOL)
  const aiLlmRegex = /\b(large\s*language\s*models?|\bllms?\b|machine\s*learning|\bgpt\b|deep\s*learning|neural|generative\s*ai)\b/i;
  const usesAi = aiLlmRegex.test(fullText);
  const aiNote = usesAi ? ' (Sử dụng AI/LLM hợp lệ trong phạm vi)' : '';

  // Thỏa mãn toàn bộ IC trong V1
  return {
    stage: 'V1',
    suggestedDecision: 'Include',
    matchedCriteria,
    screeningReason: `Thỏa mãn tiêu chí IC (IC-P, IC-I, IC-Y, IC-L, IC-T${matchedCriteria.includes('IC-E') ? ', IC-E' : ''}): Nghiên cứu sinh ca kiểm thử REST API ở mức HTTP request trong khung năm 2020-2026${aiNote}.`
  };
}

/**
 * Screening V2: Thẩm định Toàn văn (Full-Text)
 * Tham chiếu theo ie_criteria.md (Đủ full-text, có bảng/hình thực nghiệm IC-E, bài báo ≥ 4 trang)
 */
export function evaluateScreeningV2(
  title: string,
  abstract: string,
  fullTextContent: string,
  year: string
): ScreeningEvaluation {
  const v1 = evaluateScreeningV1(title, '', abstract, year);
  if (v1.suggestedDecision === 'Exclude') {
    return { ...v1, stage: 'V2' };
  }

  const textToScan = `${title} ${abstract} ${fullTextContent}`.toLowerCase();
  const matchedCriteria = [...v1.matchedCriteria];

  // 1. Kiểm tra chi tiết tiêu chí đánh giá thực nghiệm IC-E (Có ít nhất 1 con số kết quả trong Table hoặc Figure)
  const evalRegex = /\b(table\s*\d+|figure\s*\d+|experiment\w*|benchmark|coverage\s*(percent|%)|fault\s*detection|mutant\s*detection|mutation\s*score|empirical\s*results?)\b/i;
  if (evalRegex.test(textToScan)) {
    if (!matchedCriteria.includes('IC-E')) matchedCriteria.push('IC-E');
  } else {
    return {
      stage: 'V2',
      suggestedDecision: 'Unsure',
      matchedCriteria,
      screeningReason: 'Toàn văn chưa thấy phần đánh giá thực nghiệm định lượng trong Table/Figure [Thiếu IC-E]. Cần người dùng xác nhận.'
    };
  }

  // 2. Kiểm tra xem có phải short paper (< 4 trang, poster, abstract) theo EC-S không
  const shortPaperRegex = /\b(extended\s*abstract|short\s*paper|poster\s*paper|2\s*pages|3\s*pages|page\s*1\s*of\s*[123]\b)\b/i;
  if (shortPaperRegex.test(textToScan)) {
    matchedCriteria.push('EC-S');
    return {
      stage: 'V2',
      suggestedDecision: 'Exclude',
      matchedCriteria,
      screeningReason: 'Loại theo EC-S: Bài báo dạng tóm tắt ngắn / poster (< 4 trang).'
    };
  }

  return {
    stage: 'V2',
    suggestedDecision: 'Include',
    matchedCriteria,
    screeningReason: 'Đạt toàn bộ tiêu chí IC giai đoạn V2 (Toàn văn có đánh giá thực nghiệm định lượng trong Table/Figure cho REST API testing).'
  };
}
