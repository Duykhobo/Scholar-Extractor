import { ResearchProfile, Criterion, EvaluatorType, ReviewType, CriterionKind, ScreeningStage } from './types';

const VALID_REVIEW_TYPES: ReviewType[] = ['literature_review', 'systematic_review', 'scoping_review', 'custom'];
const VALID_CRITERION_KINDS: CriterionKind[] = ['inclusion', 'exclusion'];
const VALID_STAGES: ScreeningStage[] = ['metadata', 'title_abstract', 'full_text'];
const VALID_EVALUATORS: EvaluatorType[] = [
  'year_range',
  'publication_type',
  'language',
  'page_count',
  'full_text_availability',
  'keyword_group',
  'duplicate',
  'manual_assessment',
  'swt302_ep_bva'
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedProfile?: ResearchProfile;
}

/**
 * Xóa các ký tự điều khiển hoặc thẻ HTML script nguy hiểm từ chuỗi nhập vào
 */
function sanitizeText(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

/**
 * Kiểm tra tính hợp lệ của ResearchProfile tại runtime (Schema Validator)
 */
export function validateResearchProfile(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Dữ liệu hồ sơ phải là một JSON object hợp lệ.'] };
  }

  const raw = input as Record<string, any>;

  // 1. Kiểm tra các trường định danh cơ bản
  const id = sanitizeText(raw.id);
  if (!id) {
    errors.push('Trường `id` là bắt buộc và không được rỗng.');
  } else if (!/^[a-zA-Z0-9_\-\.]+$/.test(id)) {
    errors.push('Trường `id` chỉ được chứa chữ cái, số, gạch dưới, gạch ngang hoặc dấu chấm.');
  }

  const name = sanitizeText(raw.name);
  if (!name) {
    errors.push('Trường `name` (Tên nghiên cứu) là bắt buộc.');
  }

  const description = sanitizeText(raw.description);

  // 2. Research Questions
  if (!Array.isArray(raw.researchQuestions)) {
    errors.push('Trường `researchQuestions` phải là một danh sách (mảng các chuỗi).');
  }

  // 3. Review Type
  const reviewType = raw.reviewType as ReviewType;
  if (!VALID_REVIEW_TYPES.includes(reviewType)) {
    errors.push(`Trường \`reviewType\` không hợp lệ. Phải là một trong: ${VALID_REVIEW_TYPES.join(', ')}.`);
  }

  // 4. Search Strings
  if (!Array.isArray(raw.searchStrings)) {
    errors.push('Trường `searchStrings` phải là một mảng.');
  }

  // 5. Year Range
  let yearRange = raw.yearRange;
  if (yearRange && typeof yearRange === 'object') {
    const start = yearRange.start !== undefined ? Number(yearRange.start) : undefined;
    const end = yearRange.end !== undefined ? Number(yearRange.end) : undefined;
    if (start !== undefined && (isNaN(start) || start < 1900 || start > 2100)) {
      errors.push('Năm bắt đầu `yearRange.start` không hợp lệ (1900 - 2100).');
    }
    if (end !== undefined && (isNaN(end) || end < 1900 || end > 2100)) {
      errors.push('Năm kết thúc `yearRange.end` không hợp lệ (1900 - 2100).');
    }
    if (start !== undefined && end !== undefined && start > end) {
      errors.push('Năm bắt đầu không được lớn hơn năm kết thúc.');
    }
    yearRange = {
      start,
      end,
      enabled: Boolean(yearRange.enabled ?? (start !== undefined || end !== undefined))
    };
  }

  // 6. Page counts
  let minPageCount = raw.minPageCount !== undefined ? Number(raw.minPageCount) : undefined;
  let maxPageCount = raw.maxPageCount !== undefined ? Number(raw.maxPageCount) : undefined;
  if (minPageCount !== undefined && (isNaN(minPageCount) || minPageCount < 0)) {
    errors.push('`minPageCount` phải là số không âm.');
  }
  if (maxPageCount !== undefined && (isNaN(maxPageCount) || maxPageCount < 0)) {
    errors.push('`maxPageCount` phải là số không âm.');
  }
  if (minPageCount !== undefined && maxPageCount !== undefined && minPageCount > maxPageCount) {
    errors.push('`minPageCount` không được lớn hơn `maxPageCount`.');
  }

  // 7. Target Included Count
  let targetIncludedCount = raw.targetIncludedCount !== undefined ? Number(raw.targetIncludedCount) : undefined;
  if (targetIncludedCount !== undefined && (isNaN(targetIncludedCount) || targetIncludedCount < 0)) {
    errors.push('`targetIncludedCount` phải là số không âm.');
  }

  // 8. Criteria validation (SAFE: không cho phép JavaScript eval hay code độc hại)
  if (!Array.isArray(raw.criteria) || raw.criteria.length === 0) {
    errors.push('Trường `criteria` phải là một mảng chứa ít nhất một tiêu chí.');
  }

  const sanitizedCriteria: Criterion[] = [];
  if (Array.isArray(raw.criteria)) {
    for (let i = 0; i < raw.criteria.length; i++) {
      const c = raw.criteria[i];
      if (!c || typeof c !== 'object') {
        errors.push(`Tiêu chí tại vị trí #${i + 1} không phải là object hợp lệ.`);
        continue;
      }

      const cId = sanitizeText(c.id);
      if (!cId) {
        errors.push(`Tiêu chí #${i + 1} thiếu trường \`id\`.`);
      }

      const cLabel = sanitizeText(c.label) || cId;
      const cDesc = sanitizeText(c.description);

      if (!VALID_CRITERION_KINDS.includes(c.kind)) {
        errors.push(`Tiêu chí "${cId}" có trường \`kind\` không hợp lệ (${c.kind}). Phải là inclusion hoặc exclusion.`);
      }

      if (!VALID_STAGES.includes(c.stage)) {
        errors.push(`Tiêu chí "${cId}" có trường \`stage\` không hợp lệ (${c.stage}). Phải là metadata, title_abstract hoặc full_text.`);
      }

      if (!VALID_EVALUATORS.includes(c.evaluator)) {
        errors.push(`Tiêu chí "${cId}" có \`evaluator\` không được hỗ trợ (${c.evaluator}). Danh sách hỗ trợ: ${VALID_EVALUATORS.join(', ')}.`);
      }

      // Safe parameter sanitization
      let cleanParams: Record<string, any> = {};
      if (c.parameters && typeof c.parameters === 'object' && !Array.isArray(c.parameters)) {
        cleanParams = sanitizeParameters(c.evaluator, c.parameters);
      }

      sanitizedCriteria.push({
        id: cId,
        label: cLabel,
        description: cDesc,
        kind: c.kind,
        required: Boolean(c.required),
        stage: c.stage,
        evaluator: c.evaluator,
        parameters: cleanParams,
        evidenceRequirements: sanitizeText(c.evidenceRequirements)
      });
    }
  }

  // 9. Version and timestamps
  const profileVersion = typeof raw.profileVersion === 'number' && raw.profileVersion >= 1
    ? Math.floor(raw.profileVersion)
    : 1;

  const schemaVersion = sanitizeText(raw.schemaVersion) || '2.0.0';
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString();

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitizedProfile: ResearchProfile = {
    id,
    name,
    description,
    researchQuestions: (raw.researchQuestions || []).map((rq: any) => sanitizeText(rq)).filter(Boolean),
    reviewType,
    searchStrings: (raw.searchStrings || []).map((s: any, idx: number) => ({
      id: sanitizeText(s.id) || `str_${idx + 1}`,
      name: sanitizeText(s.name) || `Query ${idx + 1}`,
      query: sanitizeText(s.query),
      source: sanitizeText(s.source) || undefined,
      isDefault: Boolean(s.isDefault)
    })),
    yearRange,
    languageRequirements: Array.isArray(raw.languageRequirements)
      ? raw.languageRequirements.map((l: any) => sanitizeText(l)).filter(Boolean)
      : undefined,
    allowedPublicationTypes: Array.isArray(raw.allowedPublicationTypes)
      ? raw.allowedPublicationTypes.map((p: any) => sanitizeText(p)).filter(Boolean)
      : undefined,
    minPageCount,
    maxPageCount,
    targetIncludedCount,
    criteria: sanitizedCriteria,
    sourcePolicies: raw.sourcePolicies && typeof raw.sourcePolicies === 'object' ? raw.sourcePolicies : {},
    schemaVersion,
    profileVersion,
    createdAt,
    updatedAt
  };

  return {
    valid: true,
    errors: [],
    sanitizedProfile
  };
}

/**
 * Làm sạch và xác thực an toàn tham số của từng loại evaluator (Tuyệt đối không chạy eval hay code tùy ý)
 */
function sanitizeParameters(evaluator: EvaluatorType, params: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  switch (evaluator) {
    case 'year_range':
      if (params.startYear !== undefined) result.startYear = Number(params.startYear);
      if (params.endYear !== undefined) result.endYear = Number(params.endYear);
      break;

    case 'page_count':
      if (params.minPages !== undefined) result.minPages = Number(params.minPages);
      if (params.maxPages !== undefined) result.maxPages = Number(params.maxPages);
      break;

    case 'keyword_group':
      if (Array.isArray(params.keywords)) {
        result.keywords = params.keywords.map((k: any) => sanitizeText(k)).filter(Boolean);
      } else {
        result.keywords = [];
      }
      result.matchMode = params.matchMode === 'all' ? 'all' : 'any';
      if (Array.isArray(params.fields)) {
        result.fields = params.fields.filter((f: any) => ['title', 'abstract', 'full_text', 'snippet', 'keywords'].includes(f));
      } else {
        result.fields = ['title', 'abstract'];
      }
      result.caseSensitive = Boolean(params.caseSensitive);
      break;

    case 'publication_type':
      if (Array.isArray(params.allowedTypes)) {
        result.allowedTypes = params.allowedTypes.map((t: any) => sanitizeText(t)).filter(Boolean);
      }
      result.rejectTheses = Boolean(params.rejectTheses);
      result.rejectPreprints = Boolean(params.rejectPreprints);
      break;

    case 'language':
      if (Array.isArray(params.allowedLanguages)) {
        result.allowedLanguages = params.allowedLanguages.map((l: any) => sanitizeText(l)).filter(Boolean);
      }
      break;

    case 'duplicate':
      result.checkDoi = Boolean(params.checkDoi ?? true);
      result.checkTitle = Boolean(params.checkTitle ?? true);
      break;

    case 'full_text_availability':
      result.requireFullText = Boolean(params.requireFullText ?? true);
      break;

    case 'manual_assessment':
      result.prompt = sanitizeText(params.prompt);
      break;

    case 'swt302_ep_bva':
      if (params.checkScope) result.checkScope = sanitizeText(params.checkScope);
      if (params.checkTechnique) result.checkTechnique = sanitizeText(params.checkTechnique);
      if (params.checkEmpirical) result.checkEmpirical = sanitizeText(params.checkEmpirical);
      if (params.checkOutOfScope !== undefined) result.checkOutOfScope = Boolean(params.checkOutOfScope);
      break;

    default:
      break;
  }

  return result;
}
