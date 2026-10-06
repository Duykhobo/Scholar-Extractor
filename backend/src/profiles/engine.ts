import { PaperRecord, StructuredTable } from "../types";
import {
  Criterion,
  CriterionEvaluationResult,
  CriterionEvidence,
  CriterionStatus,
  ProfileScreeningEvaluation,
  ResearchProfile,
  ScreeningStage,
} from "./types";

export const ENGINE_VERSION = "2.0.0";

export interface EvaluationContext {
  stage: ScreeningStage;
  fullText?: string;
  pageCount?: number;
  fullTextUnavailable?: boolean;
  isImagePdf?: boolean;
  tables?: StructuredTable[];
  activeTabUrl?: string;
  userVerification?: boolean;
}

/**
 * Trích xuất an toàn danh sách các từ khóa xuất hiện trong văn bản
 */
function findKeywordsInText(
  text: string,
  keywords: string[],
  caseSensitive = false,
): { found: string[]; snippets: CriterionEvidence[] } {
  if (!text || !keywords || keywords.length === 0) {
    return { found: [], snippets: [] };
  }

  const found: string[] = [];
  const snippets: CriterionEvidence[] = [];
  const targetText = caseSensitive ? text : text.toLowerCase();

  for (const kw of keywords) {
    const pattern = caseSensitive ? kw : kw.toLowerCase();
    const idx = targetText.indexOf(pattern);
    if (idx !== -1) {
      if (!found.includes(kw)) found.push(kw);

      // Trích xuất đoạn ngữ cảnh (snippet 120 ký tự)
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + pattern.length + 80);
      const context = text.slice(start, end).replace(/\s+/g, " ").trim();

      snippets.push({
        snippet: `"...${context}..."`,
        source: "keyword_match",
        field: "text",
      });
    }
  }

  return { found, snippets };
}

/**
 * Đánh giá một tiêu chí đơn lẻ (Individual Criterion Evaluator)
 */
export function evaluateCriterion(
  criterion: Criterion,
  record: Partial<PaperRecord>,
  context: EvaluationContext,
): CriterionEvaluationResult {
  const { evaluator, parameters = {}, kind, id } = criterion;
  let status: CriterionStatus = "unknown";
  let reason = "";
  const evidence: CriterionEvidence[] = [];

  switch (evaluator) {
    // 1. Evaluator: Khoảng năm xuất bản
    case "year_range": {
      const yearStr = (record.year || "").trim();
      const year = parseInt(yearStr, 10);
      const { startYear, endYear } = parameters;

      if (!yearStr || isNaN(year)) {
        status = "unknown";
        reason = "Năm xuất bản chưa được xác định từ nguồn tìm kiếm.";
      } else {
        const isAfterStart = startYear === undefined || year >= startYear;
        const isBeforeEnd = endYear === undefined || year <= endYear;

        if (isAfterStart && isBeforeEnd) {
          status = "met";
          reason = `Năm xuất bản (${year}) nằm trong khoảng hợp lệ [${startYear ?? "-∞"}, ${endYear ?? "+∞"}].`;
        } else {
          status = "not_met";
          reason = `Năm xuất bản (${year}) nằm ngoài khoảng hợp lệ [${startYear ?? "-∞"}, ${endYear ?? "+∞"}].`;
        }
      }
      break;
    }

    // 2. Evaluator: Loại hình xuất bản (Conference / Journal vs Thesis)
    case "publication_type": {
      const venue = (record.venue || "").toLowerCase();
      const title = (record.title || "").toLowerCase();
      const fullText = (context.fullText || "").slice(0, 3000).toLowerCase();

      // Kiểm tra thesis / dissertation
      const thesisRegex =
        /\b(thesis|dissertation|master's\s*thesis|master's\s*degree|doctoral\s*dissertation|phd\s*thesis|bachelor's\s*thesis|mestrado|dissertação|tese)\b/i;
      const isThesis = thesisRegex.test(title) || thesisRegex.test(venue) || thesisRegex.test(fullText);

      if (parameters.rejectTheses && isThesis) {
        status = kind === "exclusion" ? "met" : "not_met";
        reason =
          "Tài liệu dạng luận văn / luận án / báo cáo nội bộ, không phải bài báo hội nghị/tạp chí peer-reviewed.";
        break;
      }

      // Kiểm tra nếu chỉ có tên nhà xuất bản (Springer, IEEE, ACM) mà không có tên hội nghị/tạp chí cụ thể
      const publisherOnlyRegex = /^(ieee|acm|springer|elsevier|wiley|sciencedirect)$/i;
      if (publisherOnlyRegex.test(venue.trim())) {
        status = "unknown";
        reason = `Tên nhà xuất bản ("${record.venue}") đứng riêng không đủ để xác minh hội nghị hoặc tạp chí được bình duyệt. Cần thẩm định venue cụ thể.`;
        break;
      }

      const confOrJournalRegex =
        /\b(conference|proceedings|symposium|workshop|transactions|journal|annals|letters|bulletin|review|ieee|acm|springer|elsevier|sbes|icse|issta|ase|fse|msr|icsme|saner|icst|issre|qrs|sac|ast)\b/i;
      if (confOrJournalRegex.test(venue)) {
        status = "met";
        reason = `Được xuất bản tại hội nghị/tạp chí khoa học: "${record.venue}".`;
      } else if (!venue) {
        status = "unknown";
        reason = "Chưa có thông tin venue xuất bản để xác minh loại hình công bố.";
      } else {
        status = "unknown";
        reason = `Venue "${record.venue}" chưa đủ thông tin để xác minh peer-reviewed conference/journal. Cần kiểm tra thủ công.`;
      }
      break;
    }

    // 3. Evaluator: Ngôn ngữ bài viết có bằng chứng
    case "language": {
      const allowed = (parameters.allowedLanguages || ["English", "en"]).map((l: string) => l.toLowerCase());
      const sample = `${record.title || ""} ${record.abstract || ""} ${context.fullText?.slice(0, 1000) || ""}`;

      if (!sample.trim()) {
        status = "unknown";
        reason = "Chưa có mẫu văn bản để xác minh ngôn ngữ.";
        break;
      }

      // Kiểm tra dấu tiếng Việt đặc trưng
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(sample);
      const isEnglishExpected = allowed.includes("english") || allowed.includes("en");
      const isVietnameseExpected = allowed.includes("vietnamese") || allowed.includes("vi");

      if (hasVietnamese) {
        if (isVietnameseExpected) {
          status = "met";
          reason = "Bài viết xác minh bằng tiếng Việt.";
        } else {
          status = "not_met";
          reason = "Bài viết bằng tiếng Việt, không khớp với yêu cầu tiếng Anh.";
        }
      } else {
        // Mẫu tiếng Anh không dấu
        if (isEnglishExpected) {
          status = "met";
          reason = "Bài viết xác minh bằng tiếng Anh (hoặc ngôn ngữ theo bảng chữ cái Latin không dấu tiếng Việt).";
        } else {
          status = "unknown";
          reason = "Chưa xác minh được ngôn ngữ bài viết có nằm trong danh mục cho phép.";
        }
      }
      break;
    }

    // 4. Evaluator: Số trang đã xác minh (page_count)
    case "page_count": {
      const pageCount = context.pageCount ?? record.page_count;
      const minPages = parameters.minPages !== undefined ? Number(parameters.minPages) : undefined;
      const maxPages = parameters.maxPages !== undefined ? Number(parameters.maxPages) : undefined;

      if (pageCount === undefined || typeof pageCount !== "number" || isNaN(pageCount) || pageCount <= 0) {
        status = "unknown";
        reason =
          "Chưa xác minh được số trang chính xác từ bản toàn văn (PDF). Không suy đoán số trang từ đoạn trích (snippet).";
      } else {
        const isAtLeastMin = minPages === undefined || pageCount >= minPages;
        const isAtMostMax = maxPages === undefined || pageCount <= maxPages;

        if (kind === "exclusion") {
          // Tiêu chí loại trừ (ví dụ EC-S: Dưới minPages trang)
          if (minPages !== undefined && pageCount < minPages) {
            status = "met"; // Exclusion applies!
            reason = `Đã xác minh toàn văn có ${pageCount} trang, dưới ngưỡng tối thiểu ${minPages} trang (Thỏa mãn tiêu chí loại trừ).`;
          } else if (maxPages !== undefined && pageCount > maxPages) {
            status = "met"; // Exclusion applies!
            reason = `Đã xác minh toàn văn có ${pageCount} trang, vượt quá ngưỡng tối đa ${maxPages} trang.`;
          } else {
            status = "not_met"; // Exclusion does NOT apply
            reason = `Đã xác minh toàn văn có ${pageCount} trang (Đạt yêu cầu độ dài, không bị loại).`;
          }
        } else {
          // Tiêu chí nhận vào (Inclusion)
          if (isAtLeastMin && isAtMostMax) {
            status = "met";
            reason = `Đã xác minh toàn văn có ${pageCount} trang, đạt yêu cầu độ dài [${minPages ?? 0}, ${maxPages ?? "∞"}].`;
          } else {
            status = "not_met";
            reason = `Đã xác minh toàn văn có ${pageCount} trang, không đạt yêu cầu độ dài [${minPages ?? 0}, ${maxPages ?? "∞"}].`;
          }
        }
      }
      break;
    }

    // 5. Evaluator: Khả năng truy cập toàn văn (full_text_availability)
    case "full_text_availability": {
      if (context.fullTextUnavailable === true) {
        status = kind === "exclusion" ? "met" : "not_met";
        reason = "Đã xác nhận không thể truy cập hoặc không thể tải toàn văn bài báo.";
      } else if (
        context.fullText &&
        context.fullText.trim().length > 100 &&
        context.fullText.trim() !== (record.abstract || "").trim() &&
        ((context.pageCount !== undefined && context.pageCount >= 4) || record.isPdfVerified)
      ) {
        status = kind === "exclusion" ? "not_met" : "met";
        reason = "Toàn văn bài báo (PDF/toàn văn số >= 4 trang) đã được tải và sẵn sàng để thẩm định.";
      } else {
        // Tuyệt đối không suy diễn thiếu abstract thành không tải được full-text và không coi abstract là toàn văn!
        status = "unknown";
        reason =
          "Chưa kiểm tra hoặc chưa tải được toàn văn bài báo (PDF). Không suy diễn việc thiếu abstract thành không có toàn văn (EC-A). Tuyệt đối không suy diễn abstract thành toàn văn.";
      }
      break;
    }

    // 5b. Evaluator: Trùng lặp bản ghi (duplicate)
    case "duplicate": {
      if (record.potentialDuplicate) {
        status = kind === "exclusion" ? "met" : "not_met";
        reason = `Bài báo trùng lặp với bản ghi đã có (EC-D: ${record.duplicateReason || "Trùng DOI hoặc Tiêu đề"}).`;
      } else {
        status = kind === "exclusion" ? "not_met" : "met";
        reason = "Không phát hiện trùng lặp.";
      }
      break;
    }

    // 6. Evaluator: Nhóm từ khóa với matchMode: 'any' | 'all' | compoundGroups
    case "keyword_group": {
      const keywords: string[] = parameters.keywords || [];
      const matchMode: "any" | "all" = parameters.matchMode || "any";
      const fields: string[] = parameters.fields || ["title", "abstract"];
      const compoundGroups: string[][] = parameters.compoundGroups || [];

      let searchBody = "";
      if (fields.includes("title")) searchBody += ` ${record.title || ""}`;
      if (fields.includes("abstract")) searchBody += ` ${record.abstract || ""}`;
      if (fields.includes("snippet")) searchBody += ` ${record.snippet || ""}`;
      if ((fields.includes("full_text") || fields.includes("abstract")) && context.fullText) {
        searchBody += ` ${context.fullText}`;
      }

      // Xử lý nhóm từ khóa phối hợp (Compound Groups): Yêu cầu mỗi nhóm con phải có ít nhất 1 từ xuất hiện
      if (compoundGroups.length > 0) {
        let allGroupsMatched = true;
        const compoundFound: string[] = [];

        for (const grp of compoundGroups) {
          const gRes = findKeywordsInText(searchBody, grp, parameters.caseSensitive);
          evidence.push(...gRes.snippets);
          if (gRes.found.length > 0) {
            compoundFound.push(...gRes.found);
          } else {
            allGroupsMatched = false;
          }
        }

        const directRes = findKeywordsInText(searchBody, keywords, parameters.caseSensitive);
        evidence.push(...directRes.snippets);

        if (directRes.found.length > 0 || allGroupsMatched) {
          status = "met";
          const allFound = [...new Set([...directRes.found, ...compoundFound])];
          reason = `Thỏa mãn tiêu chí phối hợp: tìm thấy (${allFound.slice(0, 4).join(", ")}).`;
        } else {
          if (fields.includes("abstract") && !record.abstract && !context.fullText) {
            status = "unknown";
            reason = "Chưa có abstract hoặc toàn văn để quét từ khóa. Cần thẩm định toàn văn.";
          } else {
            status = "not_met";
            reason = "Không thỏa mãn đồng thời các điều kiện phối hợp bắt buộc.";
          }
        }
        break;
      }

      const { found, snippets } = findKeywordsInText(searchBody, keywords, parameters.caseSensitive);
      evidence.push(...snippets);

      if (keywords.length === 0) {
        status = "met";
        reason = "Không có danh sách từ khóa yêu cầu.";
        break;
      }

      // Nếu không có nội dung abstract/fulltext mà fields yêu cầu abstract
      if (!searchBody.trim()) {
        status = "unknown";
        reason = "Chưa có nội dung văn bản (abstract/toàn văn) để kiểm tra nhóm từ khóa.";
        break;
      }

      const isMatch = matchMode === "all" ? found.length === keywords.length : found.length > 0;

      if (isMatch) {
        status = "met";
        reason = `Tìm thấy từ khóa liên quan (${found.slice(0, 4).join(", ")}${found.length > 4 ? "..." : ""}). [Lưu ý: Trùng từ khóa chỉ là tín hiệu liên quan, không tự chứng minh chất lượng hay quan hệ nhân quả].`;
      } else {
        // Nếu trường abstract bị thiếu hoàn toàn thì giữ unknown thay vì not_met
        if (fields.includes("abstract") && !record.abstract && !context.fullText) {
          status = "unknown";
          reason = `Chưa có abstract hoặc toàn văn để quét từ khóa (${keywords.slice(0, 3).join(", ")}...). Cần thẩm định toàn văn.`;
        } else {
          status = "not_met";
          reason = `Không tìm thấy từ khóa yêu cầu trong các trường [${fields.join(", ")}].`;
        }
      }
      break;
    }

    // 7. Evaluator: Kiểm tra trùng lặp (duplicate)
    case "duplicate": {
      const isConfirmedDup = Boolean((record as any).confirmedDuplicate);
      const isPotentialDup = Boolean(record.potentialDuplicate);

      if (kind === "exclusion") {
        if (isConfirmedDup) {
          status = "met";
          reason = `Xác nhận trùng lặp bài viết: ${record.duplicateReason || "Trùng DOI hoặc tiêu đề đã đối soát"}.`;
        } else if (isPotentialDup) {
          // Chỉ nghi trùng -> GIỮ UNKNOWN, KHÔNG LOẠI BỎ (EXCLUDE)
          status = "unknown";
          reason = `Nghi vấn trùng lặp (${record.duplicateReason || "Trùng tiêu đề"}). Cần người thẩm định đối soát thủ công, không tự ý loại trừ.`;
        } else {
          status = "not_met";
          reason = "Không phát hiện trùng lặp với các bài báo khác trong tập dữ liệu.";
        }
      } else {
        if (isConfirmedDup) {
          status = "not_met";
          reason = "Bài báo đã xác nhận trùng lặp với bản ghi khác.";
        } else if (isPotentialDup) {
          status = "unknown";
          reason = "Nghi vấn trùng lặp, cần đối soát thủ công.";
        } else {
          status = "met";
          reason = "Bản ghi duy nhất, không trùng lặp.";
        }
      }
      break;
    }

    // 8. Evaluator: Thẩm định thủ công (manual_assessment)
    case "manual_assessment": {
      status = "unknown";
      reason = parameters.prompt || "Tiêu chí yêu cầu người thẩm định (reviewer) đọc và xác nhận thủ công.";
      break;
    }

    // 9. Evaluator: Chuyên biệt SWT302 (REST API + EP/BVA + Thực nghiệm)
    case "swt302_ep_bva": {
      const title = (record.title || "").toLowerCase();
      const snippet = (record.snippet || "").toLowerCase();
      const abstract = (record.abstract || "").toLowerCase();
      const fullText = (context.fullText || "").toLowerCase();
      const scanText = `${title} ${snippet} ${abstract} ${fullText}`;

      // (a) Scope Check: REST API mức HTTP request
      if (parameters.checkScope === "rest_api") {
        const hasRest = /\b(rest|restful|openapi|swagger|raml|http\s*api|web\s*api)\b/i.test(scanText);
        const hasGraphqlOnly = /\bgraphql\b/i.test(scanText) && !hasRest;

        if (hasGraphqlOnly) {
          status = "not_met";
          reason = "Nghiên cứu về GraphQL riêng lẻ không thỏa mãn phạm vi kiểm thử REST API ở mức HTTP request (IC-P).";
        } else if (hasRest) {
          status = "met";
          reason = "Thỏa mãn phạm vi kiểm thử REST API ở mức HTTP request (yêu cầu NL và/hoặc OpenAPI/Swagger schema).";
        } else if (!abstract && !fullText) {
          status = "unknown";
          reason = "Chưa có abstract toàn văn để xác minh phạm vi REST API.";
        } else {
          status = "not_met";
          reason = "Không tìm thấy bằng chứng kiểm thử dịch vụ REST API ở mức HTTP request.";
        }
      }

      // (b) Technique Check: EP và/hoặc BVA cho tham số request
      else if (parameters.checkTechnique === "ep_bva") {
        const hasEpBvaPattern =
          /\b(equivalence\s*partitioning|boundary[- ]value\s*analysis|boundary\s*testing|bva|ep\/bva)\b/i.test(
            scanText,
          );
        const hasTslOnly = /\b(category[- ]partition|test\s*specification\s*language|\btsl\b)\b/i.test(scanText);

        if (hasEpBvaPattern) {
          status = "met";
          reason =
            "Có bằng chứng về kỹ thuật Phân hoạch tương đương (EP) và/hoặc Phân tích giá trị biên (BVA) cho tham số request.";
          evidence.push({
            snippet: "Phát hiện thuật ngữ kỹ thuật kiểm thử EP/BVA cho tham số API trong văn bản.",
            source: "swt302_engine",
            field: "full_text",
          });
        } else if (hasTslOnly) {
          status = "unknown";
          reason =
            "Tài liệu có nhắc đến Category Partition / TSL nhưng chưa đủ bằng chứng chứng minh áp dụng EP/BVA cho tham số REST request. Cần đối chiếu toàn văn.";
        } else if (!fullText) {
          status = "unknown";
          reason =
            "Chưa có toàn văn để xác minh bằng chứng phương pháp EP/BVA cho tham số request (IC-I). Giữ Unsure theo protocol.";
        } else {
          status = "not_met";
          reason = "Không tìm thấy bằng chứng áp dụng kỹ thuật EP hoặc BVA cho tham số REST request.";
        }
      }

      // (c) Empirical Check: Kết quả định lượng trong Table/Figure
      else if (parameters.checkEmpirical === "table_or_figure") {
        const hasTableFigQuant =
          /\b(?:table|figure|fig\.)\s*\d+[\s\S]{0,150}?\b(?:\d+(?:\.\d+)?%|\b\d+\s*(?:bugs|faults|defects|mutants|failures|endpoints|tests)\b)/i.test(
            scanText,
          ) ||
          Boolean(
            context.tables &&
            context.tables.length > 0 &&
            context.tables.some((t) => t.cells && t.cells.some((c) => /\d+/.test(c))),
          );

        if (hasTableFigQuant) {
          status = "met";
          reason = "Có ít nhất một kết quả định lượng cụ thể được trình bày trong Table hoặc Figure.";
          evidence.push({
            snippet: "Phát hiện số liệu định lượng gắn liền với Table / Figure.",
            source: "swt302_engine",
            field: "tables",
          });
        } else if (!fullText) {
          status = "unknown";
          reason = "Chưa có toàn văn hoặc bảng biểu để trích xuất số liệu định lượng (IC-E).";
        } else {
          status = "unknown";
          reason =
            "Chưa tìm thấy kết quả định lượng cụ thể gắn với Table hoặc Figure. Cần kiểm tra bảng biểu trong toàn văn.";
        }
      }

      // (d) Out of Scope Check: EC-O
      else if (parameters.checkOutOfScope) {
        const isUi = /\b(selenium|cypress|playwright|appium|dom\s*testing|ui\s*testing|gui\s*testing)\b/i.test(
          scanText,
        );
        const isUnit =
          /\b(junit|unit\s*test|class[- ]level|method[- ]level|developer[- ]written\s*unit)\b/i.test(scanText) &&
          !/\brest\b/i.test(scanText);
        const isPureFaultLoc =
          /\b(fault\s*localization|spectrum[- ]based|sbfl|bug\s*localization)\b/i.test(scanText) &&
          !/\b(test\s*generation|test\s*suite)\b/i.test(scanText);

        if (isUi) {
          status = "met";
          reason = "Loại theo EC-O: Nghiên cứu về kiểm thử giao diện người dùng (UI/DOM testing).";
        } else if (isUnit) {
          status = "met";
          reason = "Loại theo EC-O: Nghiên cứu về kiểm thử đơn vị nội bộ (JUnit/class/method level).";
        } else if (isPureFaultLoc) {
          status = "met";
          reason = "Loại theo EC-O: Nghiên cứu thuần về báo cáo lỗi / bản địa hóa lỗi, không sinh ca kiểm thử.";
        } else {
          status = "not_met";
          reason = "Không thuộc các chủ đề bị loại trừ theo EC-O.";
        }
      }
      break;
    }

    default: {
      status = "unknown";
      reason = `Evaluator "${evaluator}" chưa được hỗ trợ.`;
      break;
    }
  }

  return {
    criterionId: id,
    status,
    reason,
    evidence,
    evaluatorVersion: ENGINE_VERSION,
  };
}

/**
 * Đánh giá toàn bộ các tiêu chí trong ResearchProfile đối với một PaperRecord
 * QUY TẮC BẮT BUỘC:
 * 1. Inclusion bắt buộc mà not_met -> Gợi ý Exclude.
 * 2. Exclusion mà met -> Gợi ý Exclude.
 * 3. Còn tiêu chí bắt buộc unknown -> Gợi ý Unsure.
 * 4. Chỉ gợi ý Include khi toàn bộ inclusion bắt buộc đạt, không có exclusion nào met, và đã kiểm tra đủ giai đoạn.
 * 5. Tách biệt hoàn toàn giữa suggestedDecision và finalDecision (Hệ thống không ghi đè finalDecision).
 */
export function evaluateProfileScreening(
  profile: ResearchProfile,
  record: PaperRecord,
  context: EvaluationContext,
): ProfileScreeningEvaluation {
  const criterionResults: CriterionEvaluationResult[] = [];
  const matchedCriteria: string[] = [];
  const unknownCriteria: string[] = [];
  const missingEvidence: string[] = [];

  let hasInclusionNotMet = false;
  let inclusionNotMetReason = "";
  let hasExclusionMet = false;
  let exclusionMetReason = "";
  let hasRequiredUnknown = false;

  for (const criterion of profile.criteria) {
    const res = evaluateCriterion(criterion, record, context);
    criterionResults.push(res);

    if (criterion.kind === "inclusion") {
      if (res.status === "met") {
        matchedCriteria.push(criterion.id);
      } else if (res.status === "not_met") {
        if (criterion.required) {
          hasInclusionNotMet = true;
          if (!inclusionNotMetReason) {
            inclusionNotMetReason = `Không thỏa mãn tiêu chí bắt buộc [${criterion.id}: ${criterion.label}]: ${res.reason}`;
          }
        }
      } else {
        // unknown
        unknownCriteria.push(criterion.id);
        if (criterion.required) {
          hasRequiredUnknown = true;
          missingEvidence.push(`${criterion.id} (${criterion.label}): ${res.reason}`);
        }
      }
    } else {
      // exclusion
      if (res.status === "met") {
        hasExclusionMet = true;
        matchedCriteria.push(criterion.id);
        if (!exclusionMetReason) {
          exclusionMetReason = `Bị loại theo tiêu chí loại trừ [${criterion.id}: ${criterion.label}]: ${res.reason}`;
        }
      } else if (res.status === "unknown") {
        if (criterion.required) {
          hasRequiredUnknown = true;
          unknownCriteria.push(criterion.id);
          missingEvidence.push(`${criterion.id} (${criterion.label}): ${res.reason}`);
        }
      }
    }
  }

  // Tự động kiểm tra bài báo bị rút lại (RETRACTED)
  const isRetracted = /\b(retracted|retraction)\b/i.test(`${record.title || ""} ${record.abstract || ""}`);
  if (isRetracted) {
    hasExclusionMet = true;
    exclusionMetReason =
      "Bị loại theo tiêu chí loại trừ: Bài báo đã bị rút lại (RETRACTED). Tuyệt đối không đưa vào tổng quan.";
  }

  // Ra quyết định gợi ý (suggestedDecision)
  let suggestedDecision: "Include" | "Exclude" | "Unsure" = "Unsure";
  let screeningReason = "";

  if (hasExclusionMet) {
    suggestedDecision = "Exclude";
    screeningReason = exclusionMetReason;
  } else if (hasInclusionNotMet) {
    suggestedDecision = "Exclude";
    screeningReason = inclusionNotMetReason;
  } else if (hasRequiredUnknown) {
    suggestedDecision = "Unsure";
    screeningReason = `Còn ${unknownCriteria.length} tiêu chí bắt buộc chưa được xác minh đầy đủ (${unknownCriteria.join(", ")}). Chờ thẩm định toàn văn (Pending Full-Text).`;
  } else {
    // Toàn bộ tiêu chí metadata/title_abstract đã đạt. Kiểm tra xem đã có toàn văn thực tế chưa
    const hasFullText = Boolean(
      context.fullText &&
      context.fullText.trim().length > 300 &&
      context.fullText.trim() !== (record.abstract || "").trim() &&
      ((context.pageCount !== undefined && context.pageCount >= 4) ||
        record.isPdfVerified ||
        (record.user_verified && record.pdfUrl)),
    );
    const hasFullTextCriteria = profile.criteria.some((c) => c.stage === "full_text" && c.required);

    if (hasFullTextCriteria && !hasFullText) {
      suggestedDecision = "Unsure";
      screeningReason =
        "Đạt sơ bộ vòng Tiêu đề & Tóm tắt. Chờ thẩm định toàn văn (Pending Full-Text) để kiểm tra nội dung và số trang.";
    } else {
      suggestedDecision = "Include";
      screeningReason = `Đạt toàn bộ ${matchedCriteria.length} tiêu chí sàng lọc hợp lệ và không vi phạm bất kỳ tiêu chí loại trừ nào.`;
    }
  }

  // Kiểm tra xem quyết định thủ công (finalDecision) trước đó có được đưa ra theo phiên bản profile cũ không
  const isDecisionOutdated = Boolean(
    record.finalDecision &&
    (record as any).profileVersion !== undefined &&
    Number((record as any).profileVersion) < profile.profileVersion,
  );

  // Phân biệt khái niệm & Đóng góp mô hình nghiên cứu
  const combinedText =
    `${record.title || ""} ${record.abstract || ""} ${record.snippet || ""} ${context.fullText || ""}`.toLowerCase();
  const conceptLabels: string[] = [];
  if (combinedText.includes("self-confidence") || combinedText.includes("tự tin")) {
    conceptLabels.push("self-confidence (Primary Y)");
  }
  if (combinedText.includes("self-esteem") || combinedText.includes("lòng tự trọng")) {
    conceptLabels.push("self-esteem (Secondary)");
  }
  if (combinedText.includes("self-efficacy")) {
    conceptLabels.push("self-efficacy (Secondary)");
  }
  if (combinedText.includes("self-concept")) {
    conceptLabels.push("self-concept (Secondary)");
  }
  if (combinedText.includes("participation") || combinedText.includes("social interaction")) {
    conceptLabels.push("social participation (Related)");
  }
  if (combinedText.includes("autonomy") || combinedText.includes("tự chủ")) {
    conceptLabels.push("autonomy (Related)");
  }

  const modelContributions: string[] = [];
  const hasX =
    /supportive communication|kind communication|positive communication|empathetic communication|compassionate communication|teacher support|peer support|giao tiếp tử tế|giao tiếp hỗ trợ/.test(
      combinedText,
    );
  const hasM = /perceived social support|emotional support|social support|cảm nhận được hỗ trợ|hỗ trợ xã hội/.test(
    combinedText,
  );
  const hasY = conceptLabels.length > 0 || /confidence|tự tin/.test(combinedText);

  if (hasX) modelContributions.push("X");
  if (hasM) modelContributions.push("M");
  if (hasY) modelContributions.push("Y");
  if (hasX && hasM) modelContributions.push("H1");
  if (hasM && hasY) modelContributions.push("H2");
  if (hasX && hasY) modelContributions.push("H3");
  if ((hasX && hasM && hasY) || /mediation|mediating role|trung gian/.test(combinedText)) {
    modelContributions.push("H4");
  }

  const hasViPop =
    /children with visual impairments|visually impaired children|blind children|students with visual impairments|visual impairment|blind|khiếm thị/.test(
      combinedText,
    );
  let literatureGroup: "direct" | "supporting" | "foundational" = "foundational";
  if (hasViPop && hasX && hasY) {
    literatureGroup = "direct";
  } else if (hasViPop && (hasX || hasY || hasM)) {
    literatureGroup = "supporting";
  } else {
    literatureGroup = "foundational";
  }

  if (record) {
    record.conceptLabels = conceptLabels;
    record.modelContribution = modelContributions;
    record.literatureGroup = literatureGroup;
  }

  return {
    stage: context.stage,
    suggestedDecision,
    profileId: profile.id,
    profileVersion: profile.profileVersion,
    evaluatorVersion: ENGINE_VERSION,
    evaluatedAt: new Date().toISOString(),
    criterionResults,
    matchedCriteria,
    unknownCriteria,
    missingEvidence,
    screeningReason,
    isDecisionOutdated,
    modelContributions,
    conceptLabels,
    literatureGroup,
  };
}
