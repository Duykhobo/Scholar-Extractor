import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { fetchScholarFromSerpApi, getApiRequestsCount } from './scholarService';
import { deduplicateRecords } from './dedup';
import { appendSearchLog } from './searchLogger';
import { exportToCsv, exportScreeningCsv, exportFullScreeningCsv, exportApa7References } from './exporter';
import { sanitizeObject, sanitizeString } from './sanitizer';
import { analyzeTabAgainstRecord } from './evidenceAnalyzer';
import { parsePdfBuffer, parsePdfFromUrl, extractAbstractFromPdfPages } from './pdfService';
import { BUILTIN_PRESETS, PRESET_GENERIC, validateResearchProfile, ResearchProfile, evaluateProfileScreening } from './profiles';
import { evaluateScreeningV1 } from './screening';
import { PaperRecord, TabExtractedData } from './types';
import { runMigrations, DbRepository, isDbOnline } from './db';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint - Khong bao gio tra ve gia tri key
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SerpApi Google Scholar Backend',
    isKeyConfigured: config.isKeyConfigured(),
    totalApiRequestsUsed: getApiRequestsCount(),
    dbConnected: isDbOnline(),
    timestamp: new Date().toISOString()
  });
});

// Database status & sync endpoints
app.get('/api/db/status', async (req: Request, res: Response) => {
  const stats = await DbRepository.getStats();
  res.json({
    success: true,
    ...stats
  });
});

app.post('/api/db/sync', async (req: Request, res: Response) => {
  try {
    const { profile, session, records } = req.body as {
      profile?: ResearchProfile;
      session?: any;
      records?: PaperRecord[];
    };

    if (profile) {
      await DbRepository.upsertProfile(profile);
    }
    if (session && profile) {
      await DbRepository.saveSession({
        ...session,
        researchId: profile.id
      });
    }
    let savedCount = 0;
    if (records && records.length > 0 && profile) {
      const dbRes = await DbRepository.upsertPapersAndLinks(records, profile.id, session?.id);
      savedCount = dbRes.savedCount;
    }

    res.json({
      success: true,
      savedRecords: savedCount,
      dbConnected: isDbOnline()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Ham kiem tra an toan duong dan (Path Traversal Protection)
 */
export function getSafeOutputPath(
  filename?: string,
  defaultName: string = '01_all_records.csv'
): { safePath?: string; error?: string } {
  const rawName = (filename || defaultName).trim();
  // Chi cho phep ten file an toan (chu cai, chu so, dau gach ngang/duoi va dau cham)
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(rawName)) {
    return { error: 'Tên file không hợp lệ. Chỉ cho phép chữ cái, chữ số, gạch dưới, gạch ngang và dấu chấm.' };
  }

  // Khong cho phep ky tu dieu huong duong dan
  if (rawName.includes('..') || rawName.includes('/') || rawName.includes('\\')) {
    return { error: 'Phát hiện ký tự điều hướng thư mục nguy hiểm.' };
  }

  const allowedDir = config.workspaceDir;
  const targetPath = path.resolve(allowedDir, rawName);

  // Dam bao duong dan tuyet doi bat dau bang thu muc workspace cho phep
  if (!targetPath.startsWith(allowedDir)) {
    return { error: 'Truy cập bị từ chối: Đường dẫn nằm ngoài thư mục dự án cho phép.' };
  }

  return { safePath: targetPath };
}

/**
 * POST /api/scholar/search
 * Endpoint duy nhat de lay du lieu Google Scholar qua SerpApi.
 * Nhan tham so duoc kiem tra nghiem ngat, TUYET DOI khong tao proxy tuy y toi URL tu client.
 */
app.post('/api/scholar/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { q, as_ylo, as_yhi, hl, start, num, profile, researchId } = req.body;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Tham số `q` (chuỗi tìm kiếm nguyên văn) là bắt buộc.'
      });
    }

    if (!profile && researchId) {
      profile = BUILTIN_PRESETS.find((p) => p.id === researchId);
    }
    if (!profile) {
      profile = PRESET_GENERIC;
    }

    const result = await fetchScholarFromSerpApi(
      {
        q,
        as_ylo,
        as_yhi,
        hl,
        start,
        num
      },
      undefined,
      profile
    );

    // Sanitization layer truoc khi tra response cho client
    const sanitizedResponse = sanitizeObject({
      success: true,
      records: result.records,
      summary: result.summary,
      evidence: result.sanitizedEvidence
    });

    res.json(sanitizedResponse);
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/scholar/rescreen
 * Tái đánh giá toàn bộ danh sách paper theo hồ sơ nghiên cứu đã chọn
 */
app.post('/api/scholar/rescreen', (req: Request, res: Response) => {
  try {
    let { records, profile, researchId } = req.body as {
      records: PaperRecord[];
      profile?: ResearchProfile;
      researchId?: string;
    };

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Danh sách `records` là bắt buộc.' });
    }

    if (!profile && researchId) {
      profile = BUILTIN_PRESETS.find((p) => p.id === researchId);
    }
    const activeEvalProfile = profile || PRESET_GENERIC;

    const updatedRecords = records.map((record) => {
      let matchedCriteria: string[] = [];
      let unknownCriteria: string[] = [];
      let missingEvidence: string[] = [];
      let suggestedDecision: 'Include' | 'Exclude' | 'Unsure' = 'Unsure';
      let screeningReason = '';

      if (activeEvalProfile.id === 'preset_swt302') {
        const screening = evaluateScreeningV1(
          record.title,
          record.snippet || '',
          record.abstract || '',
          record.year,
          record.venue
        );
        matchedCriteria = screening.matchedCriteria;
        unknownCriteria = screening.unknownCriteria;
        missingEvidence = screening.missingEvidence;
        suggestedDecision = screening.suggestedDecision;
        screeningReason = screening.screeningReason;
      } else {
        const pEval = evaluateProfileScreening(
          activeEvalProfile,
          {
            title: record.title,
            authors: record.authors,
            year: record.year,
            venue: record.venue,
            snippet: record.snippet || '',
            abstract: record.abstract || '',
          } as any,
          { stage: record.abstract ? 'title_abstract' : 'metadata' }
        );
        matchedCriteria = pEval.matchedCriteria;
        unknownCriteria = pEval.unknownCriteria;
        missingEvidence = pEval.missingEvidence;
        suggestedDecision = pEval.suggestedDecision;
        screeningReason = pEval.screeningReason;
      }

      return {
        ...record,
        researchId: activeEvalProfile.id,
        profileVersion: activeEvalProfile.profileVersion,
        matchedCriteria,
        unknownCriteria,
        missingEvidence,
        suggestedDecision,
        screeningReason,
      };
    });

    res.json({
      success: true,
      records: updatedRecords,
      total: updatedRecords.length,
      profileId: activeEvalProfile.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/dedup
 * Khử trùng lặp: DOI trùng tuyệt đối thì lọc bỏ; Title trùng nhưng khác DOI thì giữ lại và đánh dấu potentialDuplicate
 */
app.post('/api/scholar/dedup', (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng bản ghi.' });
    }

    const { uniqueRecords, dedupStats } = deduplicateRecords(records);
    res.json({
      success: true,
      uniqueRecords,
      dedupStats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/log
 * Ghi nhật ký tìm kiếm vào search-log.md (Ghi nhận số paper ứng viên bổ trợ ngoài PRISMA)
 */
app.post('/api/scholar/log', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.query) {
      return res.status(400).json({ error: 'Payload không hợp lệ.' });
    }

    const logResult = appendSearchLog(payload);
    if (!logResult.success) {
      return res.status(500).json({ error: logResult.error });
    }

    res.json({
      success: true,
      message: 'Đã lưu nhật ký vào search-log.md thành công.',
      path: logResult.path
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export
 * Xuất file CSV chuẩn 10 cột UTF-8 BOM (Metadata)
 */
app.post('/api/scholar/export', (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng.' });
    }

    const { safePath, error } = getSafeOutputPath(filename, '01_all_records.csv');
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const exportResult = exportToCsv(records, safePath);
    if (!exportResult.success) {
      return res.status(500).json({ error: exportResult.error });
    }

    res.json({
      success: true,
      message: `Đã xuất ${records.length} bản ghi metadata ra file CSV thành công.`,
      filePath: exportResult.filePath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-screening
 * Xuất file CSV phân loại sàng lọc riêng (02_screening_decisions.csv)
 */
app.post('/api/scholar/export-screening', (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng.' });
    }

    const { safePath, error } = getSafeOutputPath(filename, '02_screening_decisions.csv');
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const exportResult = exportScreeningCsv(records, safePath);
    if (!exportResult.success) {
      return res.status(500).json({ error: exportResult.error });
    }

    res.json({
      success: true,
      message: `Đã xuất ${records.length} bản ghi thẩm định sàng lọc ra file CSV thành công.`,
      filePath: exportResult.filePath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-session
 * Xuất file JSON backup toàn bộ phiên làm việc (toàn bộ các trang và evidence đã lọc sạch)
 */
app.post('/api/scholar/export-session', (req: Request, res: Response) => {
  try {
    const { sessionData, filename } = req.body;
    if (!sessionData) {
      return res.status(400).json({ error: 'Tham số `sessionData` là bắt buộc.' });
    }

    const defaultFilename = `session_backup_${Date.now()}.json`;
    const { safePath, error } = getSafeOutputPath(filename, defaultFilename);
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const sanitizedData = sanitizeObject(sessionData);
    fs.writeFileSync(safePath, JSON.stringify(sanitizedData, null, 2), 'utf-8');

    res.json({
      success: true,
      message: 'Đã lưu backup toàn bộ phiên làm việc thành công.',
      filePath: safePath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scholar/presets
 * Trả về danh sách 3 preset hồ sơ nghiên cứu mẫu
 */
app.get('/api/scholar/presets', (req: Request, res: Response) => {
  res.json({
    success: true,
    presets: BUILTIN_PRESETS
  });
});

/**
 * POST /api/scholar/profiles/validate
 * Kiểm tra tính hợp lệ của ResearchProfile tại runtime
 */
app.post('/api/scholar/profiles/validate', (req: Request, res: Response) => {
  const result = validateResearchProfile(req.body);
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      errors: result.errors
    });
  }
  res.json({
    success: true,
    profile: result.sanitizedProfile
  });
});

/**
 * POST /api/scholar/export-full
 * Xuất file CSV sàng lọc đầy đủ chuẩn hóa đa nghiên cứu
 */
app.post('/api/scholar/export-full', (req: Request, res: Response) => {
  try {
    const { records, filename, researchId, profileVersion, sessionId } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng.' });
    }

    const { safePath, error } = getSafeOutputPath(filename, '02_screening_decisions_full.csv');
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const exportResult = exportFullScreeningCsv(records, safePath, { researchId, profileVersion, sessionId });
    if (!exportResult.success) {
      return res.status(500).json({ error: exportResult.error });
    }

    res.json({
      success: true,
      message: `Đã xuất ${records.length} bản ghi sàng lọc đầy đủ thành công.`,
      filePath: exportResult.filePath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-apa7
 * Xuất danh mục trích dẫn chuẩn APA 7th Edition (phân tách bài đầy đủ và bài cần bổ sung)
 */
app.post('/api/scholar/export-apa7', (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng.' });
    }

    const { safePath, error } = getSafeOutputPath(filename, '03_references_apa7.txt');
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const result = exportApa7References(records, safePath);
    if (!result.success) {
      return res.status(500).json({ error: 'Không thể xuất danh mục APA 7.' });
    }

    res.json({
      success: true,
      message: `Đã định dạng ${records.length} bài báo theo chuẩn APA 7 (${result.completeCount} bài đầy đủ, ${result.incompleteCount} bài cần bổ sung).`,
      filePath: result.filePath,
      textContent: result.textContent,
      completeCount: result.completeCount,
      incompleteCount: result.incompleteCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/analyze-tab
 * Phân tích đối chiếu metadata và full-text từ trang web/PDF với record đang chọn
 */
app.post('/api/scholar/analyze-tab', async (req: Request, res: Response) => {
  try {
    const { record, tabData, autoFetchPdf, profile } = req.body as {
      record: PaperRecord;
      tabData: TabExtractedData;
      autoFetchPdf?: boolean;
      profile?: ResearchProfile;
    };

    if (!record || !tabData) {
      return res.status(400).json({ error: 'Cần cung cấp cả `record` và `tabData`.' });
    }

    // Nếu tabData có pdfUrl và chưa có pages, thử tải và parse PDF nếu autoFetchPdf = true
    if (autoFetchPdf && tabData.pdfUrl && (!tabData.pages || tabData.pages.length === 0)) {
      try {
        const pdfRes = await parsePdfFromUrl(tabData.pdfUrl);
        if (pdfRes.success) {
          tabData.pages = pdfRes.pages;
          tabData.pageCount = pdfRes.pageCount;
          tabData.rawText = pdfRes.rawText;
          tabData.isImagePdf = pdfRes.isImagePdf;
          tabData.method = `${tabData.method} + PDF.js (${pdfRes.pageCount} trang)`;
        }
      } catch (pdfErr) {
        console.warn('[Server] Không tự động tải được PDF:', pdfErr);
      }
    }

    // Nếu tabData chưa có abstract nhưng có pages, thử trích xuất abstract từ các trang đầu của PDF
    if ((!tabData.abstract || tabData.abstract.trim().length === 0) && tabData.pages && tabData.pages.length > 0) {
      const extractedAbs = extractAbstractFromPdfPages(tabData.pages);
      if (extractedAbs) {
        tabData.abstract = extractedAbs;
      }
    }

    const analysis = analyzeTabAgainstRecord(record, tabData, profile);
    res.json({
      success: true,
      data: analysis,
      analysis
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/parse-pdf
 * Trích xuất nội dung văn bản từng trang của tệp PDF từ URL hoặc Base64
 */
app.post('/api/scholar/parse-pdf', async (req: Request, res: Response) => {
  try {
    const { url, base64Data } = req.body as { url?: string; base64Data?: string };
    if (!url && !base64Data) {
      return res.status(400).json({ error: 'Vui lòng cung cấp `url` hoặc `base64Data` của tệp PDF.' });
    }

    let result;
    if (base64Data) {
      const buf = Buffer.from(base64Data, 'base64');
      const uint8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      result = await parsePdfBuffer(uint8);
    } else if (url) {
      result = await parsePdfFromUrl(url);
    }

    if (!result) {
      return res.status(500).json({ success: false, error: 'Không thể xử lý tệp PDF.' });
    }

    let extractedAbstract: string | undefined;
    if (result.success && result.pages && result.pages.length > 0) {
      extractedAbstract = extractAbstractFromPdfPages(result.pages);
    }

    res.json({
      ...result,
      extractedAbstract
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware - dam bao khong tra ve key trong bat ky thong bao loi nao
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const cleanErrMsg = sanitizeString(err.message || 'Lỗi máy chủ nội bộ');
  console.error('[Backend Error]', cleanErrMsg);
  res.status(err.status || 500).json({
    success: false,
    error: cleanErrMsg
  });
});

export { app };

if (require.main === module) {
  runMigrations().catch((err) => console.log('[DB] Migration note:', err.message));
  app.listen(config.port, () => {
    console.log(`[SLR Backend] Đang chạy tại http://localhost:${config.port}`);
    console.log(`[SLR Backend] Trạng thái SERPAPI_KEY: ${config.isKeyConfigured() ? '✓ Đã cấu hình hợp lệ' : '✗ Chưa cấu hình'}`);
  });
}
