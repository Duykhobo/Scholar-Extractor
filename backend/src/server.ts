import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { fetchScholarFromSerpApi, getApiRequestsCount } from './scholarService';
import { deduplicateRecords } from './dedup';
import { appendSearchLog } from './searchLogger';
import { exportToCsv } from './exporter';
import { sanitizeObject, sanitizeString } from './sanitizer';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint - Khong bao gio tra ve gia tri key
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SerpApi Google Scholar Backend',
    isKeyConfigured: config.isKeyConfigured(),
    totalApiRequestsUsed: getApiRequestsCount(),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/scholar/search
 * Endpoint duy nhat de lay du lieu Google Scholar qua SerpApi.
 * Nhan tham so duoc kiem tra nghiem ngat, TUYET DOI khong tao proxy tuy y toi URL tu client.
 */
app.post('/api/scholar/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, as_ylo, as_yhi, hl, start, num } = req.body;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Tham số `q` (chuỗi tìm kiếm nguyên văn) là bắt buộc.'
      });
    }

    const result = await fetchScholarFromSerpApi({
      q,
      as_ylo,
      as_yhi,
      hl,
      start,
      num
    });

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
 * POST /api/scholar/dedup
 * Khử trùng lặp danh sách bản ghi theo DOI và Tiêu đề chuẩn hóa
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
 * Ghi nhật ký tìm kiếm vào search-log.md
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
 * Xuất file CSV chuẩn 10 cột UTF-8 BOM
 */
app.post('/api/scholar/export', (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Tham số `records` phải là mảng.' });
    }

    const defaultFilename = filename || '01_all_records.csv';
    const outputPath = path.resolve(__dirname, '../../../', defaultFilename);

    const exportResult = exportToCsv(records, outputPath);
    if (!exportResult.success) {
      return res.status(500).json({ error: exportResult.error });
    }

    res.json({
      success: true,
      message: `Đã xuất ${records.length} bản ghi ra file CSV thành công.`,
      filePath: exportResult.filePath
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
  app.listen(config.port, () => {
    console.log(`[SLR Backend] Đang chạy tại http://localhost:${config.port}`);
    console.log(`[SLR Backend] Trạng thái SERPAPI_KEY: ${config.isKeyConfigured() ? '✓ Đã cấu hình hợp lệ' : '✗ Chưa cấu hình'}`);
  });
}
