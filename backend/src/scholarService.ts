import fs from 'fs';
import path from 'path';
import { config } from './config';
import {
  ScholarSearchParams,
  SerpApiRawResponse,
  PaperRecord,
  SearchExecutionSummary
} from './types';
import { sanitizeObject } from './sanitizer';
import { evaluateScreeningV1 } from './screening';

export interface ScholarFetchResult {
  records: PaperRecord[];
  summary: SearchExecutionSummary;
  sanitizedEvidence: SerpApiRawResponse;
}

// Theo doi so request API da su dung trong phien
let totalApiRequestsUsed = 0;

export function getApiRequestsCount(): number {
  return totalApiRequestsUsed;
}

export function resetApiRequestsCount(): void {
  totalApiRequestsUsed = 0;
}

/**
 * Validate va chuan hoa tham so tim kiem
 * Backend chi chap nhan engine google_scholar va cac tham so hop le;
 * TUYET DOI khong tao proxy tuy y toi URL bat ky do client gui.
 */
export function validateSearchParams(params: ScholarSearchParams): {
  validParams: Record<string, string>;
  error?: string;
} {
  if (!params || typeof params.q !== 'string' || !params.q.trim()) {
    return { validParams: {}, error: 'Tham số truy vấn (q) là bắt buộc và không được rỗng.' };
  }

  const q = params.q.trim();
  const as_ylo = String(params.as_ylo ?? '2020').trim();
  const as_yhi = String(params.as_yhi ?? '2026').trim();
  const hl = String(params.hl ?? 'vi').trim();
  const start = Math.max(0, parseInt(String(params.start ?? 0), 10) || 0);
  const num = Math.min(20, Math.max(10, parseInt(String(params.num ?? 10), 10) || 10));

  // Kiem tra hop le cua nam
  if (!/^\d{4}$/.test(as_ylo) || !/^\d{4}$/.test(as_yhi)) {
    return { validParams: {}, error: 'Khoảng năm (as_ylo, as_yhi) phải là định dạng 4 chữ số hợp lệ.' };
  }

  return {
    validParams: {
      engine: 'google_scholar',
      q,
      as_ylo,
      as_yhi,
      hl,
      start: String(start),
      num: String(num)
    }
  };
}

/**
 * Trich xuat can than metadata tu publication_info ma khong suy doan lieu linh
 */
export function parsePublicationInfo(summary?: string, authorsList?: Array<{ name: string }>) {
  let authors = '';
  let venue = '';
  let year = '';
  let uncertain_authors = false;
  let uncertain_venue = false;
  let uncertain_year = false;

  // 1. Authors
  if (authorsList && Array.isArray(authorsList) && authorsList.length > 0) {
    authors = authorsList.map(a => a.name.trim()).filter(Boolean).join('; ');
  } else if (summary) {
    const parts = summary.split(' - ');
    if (parts.length > 0 && parts[0].trim()) {
      authors = parts[0].trim();
      uncertain_authors = true; // Trich tu summary, can xac minh
    } else {
      uncertain_authors = true;
    }
  } else {
    uncertain_authors = true;
  }

  // 2. Year va Venue tu summary
  if (summary) {
    const parts = summary.split(' - ');
    if (parts.length >= 2) {
      const middlePart = parts[1].trim();
      // Tim nam 4 chu so (19xx hoac 20xx)
      const yearMatch = middlePart.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        year = yearMatch[1];
        // Phan con lai coi la venue tiem nang
        venue = middlePart.replace(/\b(19\d\d|20\d\d)\b/, '').replace(/[,\s]+$/, '').trim();
      } else {
        venue = middlePart;
        uncertain_year = true;
      }
      uncertain_venue = true; // Can nguoi dung xac minh lai venue tu nguon goc
    } else {
      uncertain_year = true;
      uncertain_venue = true;
    }
  } else {
    uncertain_year = true;
    uncertain_venue = true;
  }

  return {
    authors,
    venue: venue || 'Google Scholar',
    year,
    uncertain_authors,
    uncertain_venue,
    uncertain_year
  };
}

/**
 * Goi SerpApi Google Scholar API voi retry co gioi han (toi da 2 lan, khong retry vo han)
 */
export async function fetchScholarFromSerpApi(
  rawParams: ScholarSearchParams,
  mockFetchFn?: (url: string) => Promise<any>
): Promise<ScholarFetchResult> {
  const { validParams, error: validationError } = validateSearchParams(rawParams);
  if (validationError) {
    throw new Error(`Tham số không hợp lệ: ${validationError}`);
  }

  if (!config.isKeyConfigured() && !mockFetchFn) {
    throw new Error('SERPAPI_KEY chưa được cấu hình trong biến môi trường backend (.env).');
  }

  // Xay dung URL goi toi SerpApi Search API
  const queryParams = new URLSearchParams({
    ...validParams,
    api_key: config.serpApiKey
  });
  const apiUrl = `${config.serpApiBaseUrl}?${queryParams.toString()}`;

  let lastError: Error | null = null;
  const maxRetries = 2; // Giu gioi han, khong retry vo han
  let rawJson: SerpApiRawResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      totalApiRequestsUsed++;
      let responseData: any;

      if (mockFetchFn) {
        responseData = await mockFetchFn(apiUrl);
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        try {
          const res = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errBody}`);
          }
          responseData = await res.json();
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      }

      if (responseData.error) {
        throw new Error(`Lỗi từ SerpApi: ${responseData.error}`);
      }

      rawJson = responseData as SerpApiRawResponse;
      break; // Thanh cong, thoat khoi vong lap retry
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff nhe (1 giay)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  if (!rawJson) {
    throw new Error(`Không thể kết nối tới SerpApi sau ${maxRetries} lần thử: ${lastError?.message || 'Lỗi không xác định'}`);
  }

  // 1. Loc bo toan bo du lieu nhay cam (SERPAPI_KEY) khoi rawJson truoc khi lam bang chung
  const sanitizedEvidence = sanitizeObject(rawJson);

  // 2. Lay thong tin tong quan
  const searchId = rawJson.search_metadata?.id || `scholar_${Date.now()}`;
  const responseStatus = rawJson.search_metadata?.status || 'Unknown';
  const fromCache = Boolean(rawJson.search_metadata?.from_cache);
  const cacheAge = rawJson.search_metadata?.cache_age;
  const totalReportedResults = rawJson.search_information?.total_results || 0;
  const today = new Date().toISOString().split('T')[0];

  // 3. Luu file bang chung JSON vao thu muc backend/evidence (da duoc sanitize)
  try {
    const evidenceDir = path.resolve(__dirname, '../evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const evidenceFilePath = path.join(evidenceDir, `${searchId}_start_${validParams.start}.json`);
    fs.writeFileSync(evidenceFilePath, JSON.stringify(sanitizedEvidence, null, 2), 'utf-8');
  } catch (fsErr) {
    console.error('[ScholarService] Cảnh báo không ghi được file bằng chứng:', fsErr);
  }

  // 4. Parse danh sach organic_results thanh PaperRecord
  const organicList = rawJson.organic_results || [];
  const records: PaperRecord[] = [];

  for (let i = 0; i < organicList.length; i++) {
    const item = organicList[i];
    const title = (item.title || '').trim();
    if (!title) continue;

    const pubMeta = parsePublicationInfo(item.publication_info?.summary, item.publication_info?.authors);
    const snippet = (item.snippet || '').trim();
    const url = item.link || (rawJson.search_metadata?.google_scholar_url || '');

    // Tuyet doi khong coi snippet la abstract
    const abstract = '';

    // Danh gia screening giai doan V1
    const screening = evaluateScreeningV1(title, snippet, abstract, pubMeta.year, pubMeta.venue);

    records.push({
      id: `${searchId}_${validParams.start}_${i + 1}`,
      source: 'Google Scholar',
      discoverySource: 'Google Scholar',
      collectionMethod: 'SerpApi',
      title,
      authors: pubMeta.authors,
      year: pubMeta.year,
      venue: pubMeta.venue,
      doi: '', // Google Scholar organic khong cung cap truc tiep DOI
      snippet,
      abstract,
      url,
      query: validParams.q,
      retrieval_date: today,
      search_id: searchId,

      // Flags xac minh
      uncertain_authors: pubMeta.uncertain_authors,
      uncertain_year: pubMeta.uncertain_year,
      uncertain_venue: pubMeta.uncertain_venue,
      uncertain_doi: true, // Luon can xac minh DOI vi khong co san
      missing_abstract: true, // Google Scholar khong co abstract toan van

      potentialDuplicate: false,

      screeningStage: screening.stage,
      matchedCriteria: screening.matchedCriteria,
      unknownCriteria: screening.unknownCriteria,
      missingEvidence: screening.missingEvidence,
      suggestedDecision: screening.suggestedDecision,
      screeningReason: screening.screeningReason,
      finalDecision: '', // De trong de nguoi dung xac nhan
      userNotes: ''
    });
  }

  const summary: SearchExecutionSummary = {
    searchId,
    responseStatus,
    fromCache,
    cacheAge,
    apiRequestsUsed: totalApiRequestsUsed,
    totalReportedResults,
    recordsCollectedThisPage: records.length,
    totalCollectedSoFar: records.length,
    totalUniqueSoFar: records.length,
    query: validParams.q,
    executedParams: validParams,
    timestamp: new Date().toISOString()
  };

  return {
    records,
    summary,
    sanitizedEvidence
  };
}
