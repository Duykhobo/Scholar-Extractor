import { ScreeningDecision } from './types';

export interface ScreeningEvaluation {
  suggestedDecision: ScreeningDecision;
  screeningReason: string;
}

/**
 * Quy tac sang loc theo tieu chi PRISMA va chu de SWT302 (Kiem thu phan mem / Sinh test tu dong):
 * - IC (Inclusion Criteria):
 *   + IC1: Bai bao tap trung vao kiem thu phan mem, sinh ca kiem thu tu dong (automated test case generation).
 *   + IC2: Co bang chung ve phan hoach tuong duong (Equivalence Partitioning - EP) hoac phan tich gia tri bien (Boundary Value Analysis - BVA).
 *   + IC3: Nam xuat ban trong khoang 2020 - 2026.
 * - EC (Exclusion Criteria):
 *   + EC1: Khong thuoc linh vuc phan mem (y sinh, vat lieu, xet nghiem y te, khao sat ngoai nganh).
 *   + EC2: Nam ngoai khung thoi gian 2020 - 2026.
 * - QUY TAC BAT BUOC:
 *   "Thieu abstract hoac bang chung EP/BVA thi Unsure."
 *   "Chi goi y; nguoi dung xac nhan finalDecision."
 */
export function evaluateScreening(
  title: string,
  snippet: string,
  abstract: string,
  year: string
): ScreeningEvaluation {
  const textToScan = `${title} ${snippet} ${abstract}`.toLowerCase();

  // 1. Kiem tra EC ro rang: Ngoai nganh phan mem
  const nonSoftwareKeywords = [
    'clinical trial', 'patient', 'covid-19', 'blood test', 'polymerase',
    'chemical', 'concrete', 'soil', 'medical diagnosis', 'cardiac', 'in vitro'
  ];
  for (const kw of nonSoftwareKeywords) {
    if (textToScan.includes(kw) && !textToScan.includes('software')) {
      return {
        suggestedDecision: 'Exclude',
        screeningReason: `Loại theo EC1: Tài liệu có dấu hiệu thuộc lĩnh vực phi công nghệ phần mềm ('${kw}').`
      };
    }
  }

  // 2. Kiem tra nam xuat ban (2020 - 2026)
  const parsedYear = parseInt(year, 10);
  if (!isNaN(parsedYear) && (parsedYear < 2020 || parsedYear > 2026)) {
    return {
      suggestedDecision: 'Exclude',
      screeningReason: `Loại theo EC2: Năm xuất bản (${parsedYear}) nằm ngoài khung 2020 - 2026.`
    };
  }

  // 3. Kiem tra xem co abstract day du khong
  const hasFullAbstract = Boolean(abstract && abstract.trim().length > 100);

  // 4. Kiem tra bang chung ve EP hoac BVA (su dung regex word boundary de tranh khop sai chu ep trong repositories/deep)
  const epBvaRegex = /\b(equivalence partition\w*|boundary value\w*|\bbva\b|\bep\b|boundary test\w*|equivalence class\w*|partition testing|domain testing)\b/i;
  const hasEpBvaEvidence = epBvaRegex.test(textToScan);

  // 5. Ap dung nguyen tac: "Thieu abstract hoac bang chung EP/BVA thi Unsure"
  if (!hasFullAbstract) {
    return {
      suggestedDecision: 'Unsure',
      screeningReason: 'Chưa có abstract toàn văn (Google Scholar chỉ cung cấp snippet). Bắt buộc chọn Unsure để người dùng đọc tài liệu gốc xác nhận.'
    };
  }

  if (!hasEpBvaEvidence) {
    return {
      suggestedDecision: 'Unsure',
      screeningReason: 'Chưa tìm thấy bằng chứng rõ ràng về kỹ thuật Phân hoạch tương đương / Phân tích giá trị biên (EP/BVA) trong bản tóm tắt. Cần người dùng xác minh.'
    };
  }

  // 6. Neu co ca abstract day du va bang chung EP/BVA + kiem thu phan mem
  const testingKeywords = ['test case', 'test generation', 'automated test', 'software testing', 'testing'];
  const hasTestingTopic = testingKeywords.some(kw => textToScan.includes(kw));

  if (hasTestingTopic) {
    return {
      suggestedDecision: 'Include',
      screeningReason: 'Thỏa mãn IC: Có abstract, thuộc chủ đề sinh ca kiểm thử và có bằng chứng về kỹ thuật EP/BVA trong khung năm 2020-2026.'
    };
  }

  return {
    suggestedDecision: 'Unsure',
    screeningReason: 'Cần người dùng đối chiếu toàn văn để xác định mức độ phù hợp với tiêu chí IC/EC.'
  };
}
