import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { SourceAdapterRegistry, UniversalFileImporter } from "./adapters";
import { config } from "./config";
import { DbRepository, isDbOnline, runMigrations } from "./db";
import { deduplicateRecords } from "./dedup";
import { extractDoiFromString, fetchCrossrefMetadata } from "./doiService";
import { analyzeTabAgainstRecord } from "./evidenceAnalyzer";
import { EvidenceTableService } from "./evidenceTable";
import {
  exportApa7References,
  exportDuplicateLogCsv,
  exportFullScreeningCsv,
  exportScreeningCsv,
  exportScreeningV2Csv,
  exportToCsv,
} from "./exporter";
import { BackgroundJobManager } from "./jobs/jobManager";
import { extractAbstractFromPdfPages, extractVenueFromPdfPages, parsePdfBuffer, parsePdfFromUrl } from "./pdfService";
import { PrismaService } from "./prisma/prismaService";
import {
  BUILTIN_PRESETS,
  evaluateProfileScreening,
  PRESET_GENERIC,
  ResearchProfile,
  validateResearchProfile,
} from "./profiles";
import { sanitizeObject, sanitizeString } from "./sanitizer";
import { fetchScholarFromSerpApi, getApiRequestsCount } from "./scholarService";
import { appendSearchLog, SearchLoggerService } from "./searchLogger";
import { SnowballService } from "./snowballing/snowballService";
import { CanonicalPaper, PaperRecord, TabExtractedData, Collection, MetadataFilterConfig, KeywordFilterConfig, SearchRun, NormalizedRecord } from "./types";
import { UnpaywallService } from "./unpaywallService";
import { CollectionStore } from "./db/collectionStore";
import { CollectorRunner } from "./jobs/collectorRunner";
import {
  generateCanonicalCsv,
  generateDuplicateMappingCsv,
  generateFilterLogCsv,
  generateRis,
  generateBibtex,
  generateSearchLogCsv,
  getCadimaRayyanGuideMarkdown,
} from "./exporter";
import slrProjectRouter from "./routes/slrProjectRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb", type: ["text/*", "application/x-research-info-systems", "application/x-bibtex"] }));

// SLR Multi-Project Literature Review API
app.use("/api/projects", slrProjectRouter);

// Health check endpoint - Khong bao gio tra ve gia tri key
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "SerpApi Google Scholar Backend",
    isKeyConfigured: config.isKeyConfigured(),
    totalApiRequestsUsed: getApiRequestsCount(),
    dbConnected: isDbOnline(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Scholar Extractor Collector Backend",
    timestamp: new Date().toISOString(),
  });
});

// Database status & sync endpoints
app.get("/api/db/status", async (req: Request, res: Response) => {
  const stats = await DbRepository.getStats();
  res.json({
    success: true,
    ...stats,
  });
});

app.post("/api/db/sync", async (req: Request, res: Response) => {
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
        researchId: profile.id,
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
      dbConnected: isDbOnline(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Profile Management Endpoints
app.get("/api/profiles", async (req: Request, res: Response) => {
  try {
    const dbProfiles = await DbRepository.getAllProfiles().catch(() => []);
    const all = [...BUILTIN_PRESETS];
    for (const dp of dbProfiles) {
      if (!all.some((p) => p.id === dp.id)) {
        all.push(dp);
      }
    }
    res.json({ success: true, profiles: all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profiles", async (req: Request, res: Response) => {
  try {
    const profile = req.body as ResearchProfile;
    if (!profile || !profile.id || !profile.name) {
      return res.status(400).json({ error: "Profile phải có `id` và `name`." });
    }

    const validation = validateResearchProfile(profile);
    const effectiveProfile: ResearchProfile =
      validation.valid && validation.sanitizedProfile ? validation.sanitizedProfile : profile;

    await DbRepository.upsertProfile(effectiveProfile).catch((err) => {
      console.warn("[Server] upsertProfile warning:", err.message);
    });

    BackgroundJobManager.getResearchStore(effectiveProfile.id);
    BackgroundJobManager.saveStoreSnapshot(effectiveProfile.id);

    res.json({
      success: true,
      profile: effectiveProfile,
      validation,
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
  defaultName: string = "01_all_records.csv",
): { safePath?: string; error?: string } {
  const rawName = (filename || defaultName).trim();
  // Chi cho phep ten file an toan (chu cai, chu so, dau gach ngang/duoi va dau cham)
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(rawName)) {
    return { error: "Tên file không hợp lệ. Chỉ cho phép chữ cái, chữ số, gạch dưới, gạch ngang và dấu chấm." };
  }

  // Khong cho phep ky tu dieu huong duong dan
  if (rawName.includes("..") || rawName.includes("/") || rawName.includes("\\")) {
    return { error: "Phát hiện ký tự điều hướng thư mục nguy hiểm." };
  }

  const allowedDir = config.workspaceDir;
  const targetPath = path.resolve(allowedDir, rawName);

  // Dam bao duong dan tuyet doi bat dau bang thu muc workspace cho phep
  if (!targetPath.startsWith(allowedDir)) {
    return { error: "Truy cập bị từ chối: Đường dẫn nằm ngoài thư mục dự án cho phép." };
  }

  return { safePath: targetPath };
}

/**
 * POST /api/scholar/search
 * Endpoint duy nhat de lay du lieu Google Scholar qua SerpApi.
 * Nhan tham so duoc kiem tra nghiem ngat, TUYET DOI khong tao proxy tuy y toi URL tu client.
 */
app.post("/api/scholar/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { q, as_ylo, as_yhi, hl, start, num, profile, researchId } = req.body;

    if (!q || typeof q !== "string") {
      return res.status(400).json({
        error: "Tham số `q` (chuỗi tìm kiếm nguyên văn) là bắt buộc.",
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
        num,
      },
      undefined,
      profile,
    );

    // Ghi nhật ký thực thi tìm kiếm thực tế vào SearchLogger
    try {
      const activeResearchId = researchId || profile?.id || "preset_swt302";
      SearchLoggerService.recordSearchExecution({
        researchId: activeResearchId,
        queryVersion: "Q1",
        requestedSource: "Google Scholar",
        actualSource: "Google Scholar",
        actualApiQuery: q,
        filters: { as_ylo, as_yhi, hl },
        pagesProcessed: 1,
        reportedResults: result.summary?.totalReportedResults || 0,
        actualReceivedRecords: result.records?.length || 0,
        newDiscoveryRecords: result.records?.length || 0,
        newCanonicalRecords: result.records?.length || 0,
        status: "completed",
        timestamp: new Date().toISOString(),
      });
    } catch {}

    // Sanitization layer truoc khi tra response cho client
    const sanitizedResponse = sanitizeObject({
      success: true,
      records: result.records,
      summary: result.summary,
      evidence: result.sanitizedEvidence,
    });

    res.json(sanitizedResponse);
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/scholar/dedup
 * Khử trùng lặp: DOI trùng tuyệt đối thì lọc bỏ; Title trùng nhưng khác DOI thì giữ lại và đánh dấu potentialDuplicate
 */
app.post("/api/scholar/dedup", (req: Request, res: Response) => {
  try {
    const { records, researchId } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng bản ghi." });
    }

    const { uniqueRecords, dedupStats } = deduplicateRecords(records);

    if (researchId) {
      const store = BackgroundJobManager.getResearchStore(researchId);
      store.rawRecords = records;
      store.canonicalRecords = uniqueRecords as CanonicalPaper[];
      BackgroundJobManager.saveStoreSnapshot(researchId);
    }

    res.json({
      success: true,
      uniqueRecords,
      canonicalRecords: uniqueRecords,
      dedupStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/log
 * Ghi nhật ký tìm kiếm vào search-log.md (Ghi nhận số paper ứng viên bổ trợ ngoài PRISMA)
 */
app.post("/api/scholar/log", (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.query) {
      return res.status(400).json({ error: "Payload không hợp lệ." });
    }

    const logResult = appendSearchLog(payload);
    if (!logResult.success) {
      return res.status(500).json({ error: logResult.error });
    }

    res.json({
      success: true,
      message: "Đã lưu nhật ký vào search-log.md thành công.",
      path: logResult.path,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export
 * Xuất file CSV chuẩn 10 cột UTF-8 BOM (Metadata)
 */
app.post("/api/scholar/export", (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const { safePath, error } = getSafeOutputPath(filename, "01_all_records.csv");
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
      filePath: exportResult.filePath,
      csvContent: exportResult.csvContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-screening
 * Xuất file CSV phân loại sàng lọc riêng (02_screening_decisions.csv)
 */
app.post("/api/scholar/export-screening", (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const { safePath, error } = getSafeOutputPath(filename, "02_screening_decisions.csv");
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
      filePath: exportResult.filePath,
      csvContent: exportResult.csvContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-session
 * Xuất file JSON backup toàn bộ phiên làm việc (toàn bộ các trang và evidence đã lọc sạch)
 */
app.post("/api/scholar/export-session", (req: Request, res: Response) => {
  try {
    const { sessionData, filename } = req.body;
    if (!sessionData) {
      return res.status(400).json({ error: "Tham số `sessionData` là bắt buộc." });
    }

    const defaultFilename = `session_backup_${Date.now()}.json`;
    const { safePath, error } = getSafeOutputPath(filename, defaultFilename);
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const sanitizedData = sanitizeObject(sessionData);
    fs.writeFileSync(safePath, JSON.stringify(sanitizedData, null, 2), "utf-8");

    res.json({
      success: true,
      message: "Đã lưu backup toàn bộ phiên làm việc thành công.",
      filePath: safePath,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scholar/presets
 * Trả về danh sách 3 preset hồ sơ nghiên cứu mẫu
 */
app.get("/api/scholar/presets", (req: Request, res: Response) => {
  res.json({
    success: true,
    presets: BUILTIN_PRESETS,
  });
});

/**
 * POST /api/scholar/profiles/validate
 * Kiểm tra tính hợp lệ của ResearchProfile tại runtime
 */
app.post("/api/scholar/profiles/validate", (req: Request, res: Response) => {
  const result = validateResearchProfile(req.body);
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      errors: result.errors,
    });
  }
  res.json({
    success: true,
    profile: result.sanitizedProfile,
  });
});

/**
 * POST /api/scholar/export-full
 * Xuất file CSV sàng lọc đầy đủ chuẩn hóa đa nghiên cứu
 */
app.post("/api/scholar/export-full", (req: Request, res: Response) => {
  try {
    const { records, filename, researchId, profileVersion, sessionId } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const { safePath, error } = getSafeOutputPath(filename, "02_screening_decisions_full.csv");
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
      filePath: exportResult.filePath,
      csvContent: exportResult.csvContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-apa7
 * Xuất danh mục trích dẫn chuẩn APA 7th Edition (phân tách bài đầy đủ và bài cần bổ sung)
 */
app.post("/api/scholar/export-apa7", (req: Request, res: Response) => {
  try {
    const { records, filename, onlyFinalIncluded } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const { safePath, error } = getSafeOutputPath(filename, "03_references_apa7.txt");
    if (error || !safePath) {
      return res.status(400).json({ error });
    }

    const result = exportApa7References(records, safePath, { onlyFinalIncluded });
    if (!result.success) {
      return res.status(500).json({ error: "Không thể xuất danh mục APA 7." });
    }

    res.json({
      success: true,
      message: `Đã định dạng ${records.length} bài báo theo chuẩn APA 7 (${result.completeCount} bài đầy đủ, ${result.incompleteCount} bài cần bổ sung).`,
      filePath: result.filePath,
      textContent: result.textContent,
      completeCount: result.completeCount,
      incompleteCount: result.incompleteCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/rescreen
 * Tái sàng lọc toàn bộ danh sách bài báo theo một ResearchProfile mới hoặc được cập nhật
 * BẢO TOÀN TUYỆT ĐỐI finalDecision và userNotes của người dùng!
 */
app.post("/api/scholar/rescreen", (req: Request, res: Response) => {
  try {
    const { records, profile, researchId } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const effectiveProfile: ResearchProfile =
      profile || BUILTIN_PRESETS.find((p) => p.id === researchId) || BUILTIN_PRESETS[0];

    const updatedRecords = records.map((record: PaperRecord) => {
      const recAny = record as any;
      const isV2 = Boolean(
        (recAny.full_text && recAny.full_text.length > 100) ||
        (record.page_count && record.page_count > 0) ||
        record.screeningStage === "V2",
      );

      const profileEval = evaluateProfileScreening(effectiveProfile, record, {
        stage: isV2 ? "full_text" : "title_abstract",
        fullText: recAny.full_text || "",
        pageCount: record.page_count,
        isImagePdf: false,
      });

      return {
        ...record,
        researchId: effectiveProfile.id,
        profileVersion: effectiveProfile.profileVersion,
        screeningStage: isV2 ? "V2" : "V1",
        suggestedDecision: profileEval.suggestedDecision,
        matchedCriteria: profileEval.matchedCriteria,
        unknownCriteria: profileEval.unknownCriteria,
        missingEvidence: profileEval.missingEvidence,
        screeningReason: profileEval.screeningReason,
        conceptLabels: profileEval.conceptLabels,
        modelContribution: profileEval.modelContributions,
        literatureGroup: profileEval.literatureGroup,
        // BẢO TOÀN TUYỆT ĐỐI QUYẾT ĐỊNH CỦA NGƯỜI DÙNG
        finalDecision: record.finalDecision || "",
        userNotes: record.userNotes || "",
      };
    });

    res.json({
      success: true,
      records: updatedRecords,
      total: updatedRecords.length,
      profileName: effectiveProfile.name,
      profileVersion: effectiveProfile.profileVersion,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/screen-batch
 * Quét tự động V2 hàng loạt theo ResearchProfile
 */
app.post("/api/scholar/screen-batch", (req: Request, res: Response) => {
  try {
    const { records, profile, researchId } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Tham số `records` phải là mảng." });
    }

    const effectiveProfile: ResearchProfile =
      profile || BUILTIN_PRESETS.find((p) => p.id === researchId) || BUILTIN_PRESETS[0];

    const scoredRecords = records.map((record: PaperRecord) => {
      const recAny = record as any;
      const isV2 = Boolean(
        (recAny.full_text && recAny.full_text.length > 100) ||
        (record.page_count && record.page_count > 0) ||
        record.screeningStage === "V2",
      );

      const profileEval = evaluateProfileScreening(effectiveProfile, record, {
        stage: isV2 ? "full_text" : "title_abstract",
        fullText: recAny.full_text || "",
        pageCount: record.page_count,
      });

      return {
        ...record,
        profileVersion: effectiveProfile.profileVersion,
        isDecisionOutdated: false,
        suggestedDecision: profileEval.suggestedDecision,
        matchedCriteria: profileEval.matchedCriteria,
        unknownCriteria: profileEval.unknownCriteria,
        missingEvidence: profileEval.missingEvidence,
        screeningReason: profileEval.screeningReason,
        conceptLabels: profileEval.conceptLabels,
        modelContribution: profileEval.modelContributions,
        literatureGroup: profileEval.literatureGroup,
        criterionResults: profileEval.criterionResults,
      };
    });

    const activeResearchId = researchId || effectiveProfile.id;
    if (activeResearchId) {
      const store = BackgroundJobManager.getResearchStore(activeResearchId);
      if (store.canonicalRecords.length > 0) {
        for (const sr of scoredRecords) {
          const match = store.canonicalRecords.find((r) => r.id === sr.id);
          if (match) {
            match.suggestedDecision = sr.suggestedDecision;
            match.screeningReason = sr.screeningReason;
            match.matchedCriteria = sr.matchedCriteria;
            match.unknownCriteria = sr.unknownCriteria;
            match.missingEvidence = sr.missingEvidence;
          }
        }
        BackgroundJobManager.saveStoreSnapshot(activeResearchId);
      }
    }

    res.json({
      success: true,
      records: scoredRecords,
      totalScored: scoredRecords.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fulltext/unpaywall
 * Tìm toàn văn Open Access qua Unpaywall
 */
app.get("/api/fulltext/unpaywall", async (req: Request, res: Response) => {
  try {
    const doi = req.query.doi as string;
    if (!doi) {
      return res.status(400).json({ error: "Thiếu query param `doi`." });
    }
    const result = await UnpaywallService.resolveOpenAccess(doi);
    if (!result) {
      return res.json({ success: true, pdfUrl: null, isOpenAccess: false });
    }
    res.json({
      success: true,
      pdfUrl: result.pdfUrl || null,
      isOpenAccess: result.isOa,
      landingPageUrl: result.landingPageUrl,
      version: result.version,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/add-seed
 * Thêm bài báo hạt giống thủ công vào pipeline store
 */
app.post("/api/scholar/add-seed", async (req: Request, res: Response) => {
  try {
    const { doi, title, researchId } = req.body;
    let crossrefMeta: any = null;
    if (doi) {
      crossrefMeta = await fetchCrossrefMetadata(doi).catch(() => null);
    }
    const seedRecord: PaperRecord = {
      id: `seed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: crossrefMeta?.title || title || `Bài seed (DOI: ${doi})`,
      doi: doi || "",
      authors: Array.isArray(crossrefMeta?.authors) ? crossrefMeta.authors.join("; ") : crossrefMeta?.authors || "",
      year: String(crossrefMeta?.year || new Date().getFullYear()),
      venue: crossrefMeta?.venue || "Seed Reference",
      source: "Seed DOI",
      discoverySource: "Seed Paper",
      collectionMethod: "Manual Seed",
      snippet: "",
      abstract: "",
      url: doi ? `https://doi.org/${doi}` : "",
      query: "manual_seed",
      search_id: `seed_${Date.now()}`,
      retrieval_date: new Date().toISOString(),
      uncertain_authors: false,
      uncertain_year: false,
      uncertain_venue: false,
      uncertain_doi: false,
      missing_abstract: false,
      screeningStage: "B1",
      matchedCriteria: [],
      suggestedDecision: "Include",
      finalDecision: "" as any,
      userNotes: "",
      screeningReason: "Bài tham chiếu hạt giống (Seed paper) được chỉ định thủ công.",
    } as unknown as PaperRecord;

    if (researchId) {
      const store = BackgroundJobManager.getResearchStore(researchId);
      store.rawRecords = [...store.rawRecords, seedRecord];
      BackgroundJobManager.saveStoreSnapshot(researchId);
    }

    res.json({
      success: true,
      record: seedRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/analyze-tab
 * Phân tích đối chiếu metadata và full-text từ trang web/PDF với record đang chọn
 */
app.post("/api/scholar/analyze-tab", async (req: Request, res: Response) => {
  try {
    const { record, tabData, autoFetchPdf, profile } = req.body as {
      record: PaperRecord;
      tabData: TabExtractedData;
      autoFetchPdf?: boolean;
      profile?: ResearchProfile;
    };

    if (!record || !tabData) {
      return res.status(400).json({ error: "Cần cung cấp cả `record` và `tabData`." });
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
        console.warn("[Server] Không tự động tải được PDF:", pdfErr);
      }
    }

    // Nếu tabData chưa có abstract nhưng có pages, thử trích xuất abstract từ các trang đầu của PDF
    if ((!tabData.abstract || tabData.abstract.trim().length === 0) && tabData.pages && tabData.pages.length > 0) {
      const extractedAbs = extractAbstractFromPdfPages(tabData.pages);
      if (extractedAbs) {
        tabData.abstract = extractedAbs;
      }
    }

    // Tự động nhận diện venue hội nghị/tạp chí từ Header/Running head của PDF (ví dụ SBES '25, ICSE, IEEE Transactions)
    const isVenueUnverified = !tabData.venue || /^(arxiv|google\s*scholar|n\/a|unknown)\b/i.test(tabData.venue.trim());
    if (isVenueUnverified && tabData.pages && tabData.pages.length > 0) {
      const venueExtracted = extractVenueFromPdfPages(tabData.pages);
      if (venueExtracted) {
        tabData.venue = venueExtracted.venue;
        (tabData as any).publicationType = venueExtracted.pubType;
      }
    }

    // Tự động tra cứu Crossref DOI để chuẩn hóa Venue (container-title) và publicationType (journal-article/proceedings)
    let targetDoi = (tabData.doi || record.doi || "").trim();
    if (!targetDoi) {
      targetDoi =
        extractDoiFromString(tabData.sourceUrl || record.url) ||
        (tabData.pages?.[0]?.text ? extractDoiFromString(tabData.pages[0].text) : "") ||
        (tabData.rawText ? extractDoiFromString(tabData.rawText) : "") ||
        "";
      if (targetDoi) tabData.doi = targetDoi;
    }
    if (targetDoi) {
      try {
        const crossref = await fetchCrossrefMetadata(targetDoi);
        if (crossref) {
          if (crossref.venue && isVenueUnverified) {
            tabData.venue = crossref.venue;
          }
          if (crossref.publicationType && crossref.publicationType !== "unknown") {
            (tabData as any).publicationType = crossref.publicationType;
          }
          if ((!tabData.abstract || tabData.abstract.trim().length === 0) && crossref.abstract) {
            tabData.abstract = crossref.abstract;
          }
          if (!tabData.year && crossref.year) {
            tabData.year = crossref.year;
          }
        }
      } catch (doiErr) {
        // bỏ qua lỗi mạng Crossref nếu có
      }
    }

    const analysis = analyzeTabAgainstRecord(record, tabData, profile);
    res.json({
      success: true,
      data: analysis,
      analysis,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/parse-pdf
 * Trích xuất nội dung văn bản từng trang của tệp PDF từ URL hoặc Base64
 */
app.post("/api/scholar/parse-pdf", async (req: Request, res: Response) => {
  try {
    const { url, base64Data } = req.body as { url?: string; base64Data?: string };
    if (!url && !base64Data) {
      return res.status(400).json({ error: "Vui lòng cung cấp `url` hoặc `base64Data` của tệp PDF." });
    }

    let result;
    if (base64Data) {
      const buf = Buffer.from(base64Data, "base64");
      const uint8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      result = await parsePdfBuffer(uint8);
    } else if (url) {
      result = await parsePdfFromUrl(url);
    }

    if (!result) {
      return res.status(500).json({ success: false, error: "Không thể xử lý tệp PDF." });
    }

    let extractedAbstract: string | undefined;
    if (result.success && result.pages && result.pages.length > 0) {
      extractedAbstract = extractAbstractFromPdfPages(result.pages);
    }

    res.json({
      ...result,
      extractedAbstract,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// PIPELINE DA NGUON, QUAN LY JOBS NEN, SNOWBALLING & PRISMA API
// =========================================================================

/**
 * GET /api/sources/capabilities
 * Danh sách khả năng của tất cả các nguồn (OpenAlex, Semantic Scholar, Google Scholar, ACM DL, IEEE Xplore)
 */
app.get("/api/sources/capabilities", (req: Request, res: Response) => {
  res.json({
    success: true,
    capabilities: SourceAdapterRegistry.getAllCapabilities(),
  });
});

/**
 * POST /api/sources/search
 * Tìm kiếm qua adapter của nguồn cụ thể
 */
app.post("/api/sources/search", async (req: Request, res: Response) => {
  try {
    const { sourceName, query, queryVersion, asYlo, asYhi, start, limit, cursor, sessionId, researchId } = req.body;
    if (!sourceName || !query) {
      return res.status(400).json({ error: "Thiếu `sourceName` hoặc `query`." });
    }

    const adapter = SourceAdapterRegistry.getAdapter(sourceName);
    if (!adapter) {
      return res.status(404).json({ error: `Nguồn '${sourceName}' không tồn tại hoặc chưa được hỗ trợ.` });
    }

    const result = await adapter.search({
      query,
      queryVersion: queryVersion || "Q1",
      asYlo,
      asYhi,
      start,
      limit,
      cursor,
      sessionId,
      researchId,
    });

    // Ghi nhật ký thực thi tìm kiếm thực tế vào SearchLogger
    try {
      const activeResearchId = researchId || "preset_swt302";
      SearchLoggerService.recordSearchExecution({
        researchId: activeResearchId,
        queryVersion: queryVersion || "Q1",
        requestedSource: sourceName,
        actualSource: adapter.sourceName,
        actualApiQuery: query,
        filters: { asYlo, asYhi },
        pagesProcessed: 1,
        reportedResults: result.totalReported || 0,
        actualReceivedRecords: result.records?.length || 0,
        newDiscoveryRecords: result.records?.length || 0,
        newCanonicalRecords: result.records?.length || 0,
        status: "completed",
        timestamp: new Date().toISOString(),
      });
    } catch {}

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/import-file
 * Phân tích tệp tải lên (CSV, BibTeX, RIS) hỗ trợ schema tiếng Việt và tệp mẫu
 */
app.post("/api/pipeline/import-file", async (req: Request, res: Response) => {
  try {
    const { content, fileName, researchId } = req.body as {
      content: string;
      fileName: string;
      researchId?: string;
    };

    if (!content) {
      return res.status(400).json({ error: "Nội dung tệp rỗng." });
    }

    let preview;
    if (fileName && (fileName.endsWith(".bib") || fileName.endsWith(".bibtex"))) {
      preview = UniversalFileImporter.parseBibtex(content, fileName);
    } else {
      preview = UniversalFileImporter.parseCsv(content, fileName || "uploaded.csv");
    }

    // Nếu có researchId, lưu vào store bộ nhớ / database và lưu snapshot
    if (researchId && preview.validRecords.length > 0) {
      const store = BackgroundJobManager.getResearchStore(researchId);
      store.rawRecords = [...store.rawRecords, ...preview.validRecords];
      BackgroundJobManager.saveStoreSnapshot(researchId);
    }

    res.json({
      success: true,
      preview,
      records: preview.validRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/run-stage
 * Chạy đồng bộ một giai đoạn pipeline (B1, V1, V2, V3, FINAL)
 */
app.post("/api/pipeline/run-stage", async (req: Request, res: Response) => {
  try {
    const { stage, researchId, sessionId, records, profile, options } = req.body as {
      stage: "B1" | "V1" | "V2" | "V3" | "FINAL";
      researchId: string;
      sessionId?: string;
      records?: PaperRecord[];
      profile?: ResearchProfile;
      options?: Record<string, any>;
    };

    if (!stage || !researchId) {
      return res.status(400).json({ error: "Cần cung cấp `stage` và `researchId`." });
    }

    const store = BackgroundJobManager.getResearchStore(researchId);
    if (records && records.length > 0) {
      if (stage === "V1" || stage === "B1") store.rawRecords = records;
      else store.canonicalRecords = records as CanonicalPaper[];
    }

    const effectiveProfile = profile || BUILTIN_PRESETS.find((p) => p.id === researchId) || PRESET_GENERIC;

    // Tạo Background Job và khởi chạy nền (asynchronous non-blocking)
    const job = BackgroundJobManager.createJob({
      researchId,
      sessionId,
      stage,
      config: {
        ...req.body,
        profile: effectiveProfile,
      },
      totalItems: stage === "B1" ? 25 : stage === "V1" ? store.rawRecords.length : store.canonicalRecords.length,
    });

    BackgroundJobManager.startJob(job.id).catch((err) => {
      console.error(`[JobManager] Lỗi thực thi job ${job.id}:`, err.message);
    });

    res.json({
      success: true,
      jobId: job.id,
      job,
      stage,
      status: "running",
      message: `Đã khởi chạy tác vụ chạy nền cho giai đoạn ${stage}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pipeline/stage-data
 * Lấy dữ liệu pipeline hiện tại theo researchId
 */
app.get("/api/pipeline/stage-data", (req: Request, res: Response) => {
  const researchId = (req.query.researchId as string) || "preset_swt302";
  const store = BackgroundJobManager.getResearchStore(researchId);
  res.json({
    success: true,
    researchId,
    rawCount: store.rawRecords.length,
    canonicalCount: store.canonicalRecords.length,
    canonicalRecords: store.canonicalRecords,
    records: store.canonicalRecords,
    rawRecords: store.rawRecords,
  });
});

/**
 * POST /api/pipeline/decision
 * Đồng bộ quyết định sàng lọc theo từng vòng từ UI vào backend pipeline store
 */
app.post("/api/pipeline/decision", (req: Request, res: Response) => {
  try {
    const {
      researchId,
      paperId,
      stage,
      decision,
      v2Decision,
      v3Decision,
      finalDecision,
      userNotes,
      reason,
      protocolVersion,
    } = req.body;

    if (!researchId || !paperId) {
      return res.status(400).json({ error: "Cần `researchId` và `paperId`." });
    }

    const store = BackgroundJobManager.getResearchStore(researchId);
    let paper = store.canonicalRecords.find((r) => r.id === paperId);
    if (!paper) {
      const rawMatch = store.rawRecords.find((r) => r.id === paperId);
      if (rawMatch) paper = rawMatch as any;
    }

    if (!paper) {
      return res.status(404).json({ error: "Không tìm thấy bài báo trong pipeline store." });
    }

    // 1. Cập nhật V2 Decision (chuẩn hóa "Include" thành "PassToFullText" cho V2)
    const rawV2 = v2Decision !== undefined ? v2Decision : stage === "V2" ? decision : undefined;
    if (rawV2 !== undefined) {
      paper.v2Decision = (rawV2 === "Include" ? "PassToFullText" : rawV2) as any;
    }

    // 2. Cập nhật V3 Decision
    const rawV3 = v3Decision !== undefined ? v3Decision : stage === "V3" ? decision : undefined;
    if (rawV3 !== undefined) {
      paper.v3Decision = rawV3 as any;
    }

    // 3. Cập nhật Final Decision: CHỈ cập nhật khi trường được truyền lên thực tế
    if (finalDecision !== undefined) {
      paper.finalDecision = finalDecision as any;
      paper.isDecisionOutdated = false;
    } else if (stage === "FINAL" && decision !== undefined) {
      paper.finalDecision = decision as any;
      paper.isDecisionOutdated = false;
    } else if (!stage && !v2Decision && !v3Decision && decision !== undefined) {
      paper.finalDecision = decision as any;
      paper.isDecisionOutdated = false;
    }

    if (userNotes !== undefined) paper.userNotes = userNotes;
    if (reason !== undefined) paper.screeningReason = reason;
    if (protocolVersion !== undefined) {
      paper.protocolVersion = protocolVersion;
      paper.isDecisionOutdated = false;
    }

    BackgroundJobManager.saveStoreSnapshot(researchId);
    res.json({ success: true, paper });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/records/:id
 * Cập nhật quyết định, ghi chú, trạng thái của từng bài báo
 */
app.patch("/api/records/:id", (req: Request, res: Response) => {
  try {
    const paperId = req.params.id;
    const {
      researchId,
      userNotes,
      finalDecision,
      v2Decision,
      v3Decision,
      stage,
      decision,
      screeningReason,
      isDecisionOutdated,
      protocolVersion,
    } = req.body;

    let store = researchId ? BackgroundJobManager.getResearchStore(researchId) : null;
    let paper: any = null;
    let activeResearchId = researchId;

    if (store) {
      paper = store.canonicalRecords.find((r) => r.id === paperId) || store.rawRecords.find((r) => r.id === paperId);
    }

    if (!paper) {
      for (const [rId, s] of (BackgroundJobManager as any).researchData.entries()) {
        const found =
          s.canonicalRecords.find((r: any) => r.id === paperId) || s.rawRecords.find((r: any) => r.id === paperId);
        if (found) {
          paper = found;
          store = s;
          activeResearchId = rId;
          break;
        }
      }
    }

    if (!paper) {
      return res.status(404).json({ error: `Không tìm thấy bài báo ${paperId} trong pipeline store.` });
    }

    if (userNotes !== undefined) paper.userNotes = userNotes;
    if (finalDecision !== undefined) {
      paper.finalDecision = finalDecision;
      paper.isDecisionOutdated = false;
    }
    if (v2Decision !== undefined) {
      paper.v2Decision = v2Decision === "Include" ? "PassToFullText" : v2Decision;
    }
    if (v3Decision !== undefined) paper.v3Decision = v3Decision;
    if (decision !== undefined) {
      if (stage === "V2") paper.v2Decision = decision === "Include" ? "PassToFullText" : decision;
      else if (stage === "V3") paper.v3Decision = decision;
      else {
        paper.finalDecision = decision;
        paper.isDecisionOutdated = false;
      }
    }
    if (screeningReason !== undefined) paper.screeningReason = screeningReason;
    if (isDecisionOutdated !== undefined) paper.isDecisionOutdated = isDecisionOutdated;
    if (protocolVersion !== undefined) paper.protocolVersion = protocolVersion;

    if (activeResearchId) {
      BackgroundJobManager.saveStoreSnapshot(activeResearchId);
    }

    res.json({ success: true, paper });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/protocol/change
 * Ghi nhật ký thay đổi protocol vào audit log
 */
app.post("/api/protocol/change", (req: Request, res: Response) => {
  try {
    const { researchId, record } = req.body;
    if (!researchId || !record) {
      return res.status(400).json({ error: "Cần `researchId` và `record`." });
    }
    SearchLoggerService.recordProtocolChange(researchId, record);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/snowball
 * Thực thi Snowballing lùi và tiến
 */
app.post("/api/pipeline/snowball", async (req: Request, res: Response) => {
  try {
    const { researchId, seeds, directions, maxIterations, maxPapersPerSeed } = req.body;
    if (!researchId || !seeds || seeds.length === 0) {
      return res.status(400).json({ error: "Thiếu `researchId` hoặc danh sách `seeds`." });
    }

    const result = await SnowballService.runSnowballing({
      researchId,
      seeds,
      directions: directions || ["backward", "forward"],
      maxIterations: maxIterations || 1,
      maxPapersPerSeed: maxPapersPerSeed || 15,
    });

    if (result.newPapers.length > 0) {
      const store = BackgroundJobManager.getResearchStore(researchId);
      store.rawRecords = [...store.rawRecords, ...result.newPapers];
      BackgroundJobManager.saveStoreSnapshot(researchId);
    }

    // Ghi nhật ký Snowballing thực tế vào SearchLogger
    for (const seed of seeds) {
      SearchLoggerService.recordSnowballExecution({
        runId: `snowball-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        researchId,
        seedDoiOrId: seed.doi || seed.title || "seed",
        seedTitle: seed.title || seed.doi || "seed",
        iteration: maxIterations || 1,
        direction: (directions && directions.length === 1 ? directions[0] : "both") as any,
        source: "OpenAlex",
        relationsReceived: result.totalDiscovered || 0,
        newPapersFound: result.newPapers.length || 0,
        stopCondition: `Hoàn tất sau ${maxIterations || 1} vòng (${result.newPapers.length} bài mới)`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/snowball/:direction
 * Snowballing backward (references) hoặc forward (citations)
 */
app.post("/api/snowball/:direction", async (req: Request, res: Response) => {
  try {
    const directionParam = req.params.direction;
    const direction: "backward" | "forward" = directionParam === "forward" ? "forward" : "backward";
    const { seedDoi, seedTitle, researchId, maxRecords } = req.body;

    if (!seedDoi) {
      return res.status(400).json({ error: "Thiếu `seedDoi`." });
    }

    const activeResearchId = researchId || "preset_swt302";
    const result = await SnowballService.runSnowballing({
      researchId: activeResearchId,
      seeds: [{ id: `seed_${Date.now()}`, doi: seedDoi, title: seedTitle || "Seed Paper" }],
      directions: [direction],
      maxIterations: 1,
      maxPapersPerSeed: maxRecords || 25,
    });

    if (result.newPapers.length > 0) {
      const store = BackgroundJobManager.getResearchStore(activeResearchId);
      store.rawRecords = [...store.rawRecords, ...result.newPapers];
      BackgroundJobManager.saveStoreSnapshot(activeResearchId);
    }

    SearchLoggerService.recordSnowballExecution({
      runId: `snowball-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      researchId: activeResearchId,
      seedDoiOrId: seedDoi,
      seedTitle: seedTitle || seedDoi,
      iteration: 1,
      direction,
      source: "OpenAlex",
      relationsReceived: result.totalDiscovered || 0,
      newPapersFound: result.newPapers.length || 0,
      stopCondition: `Hoàn tất Snowballing ${direction} (${result.newPapers.length} bài mới)`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      records: result.newPapers,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/create
 * Tạo Background Job mới
 */
app.post("/api/jobs/create", (req: Request, res: Response) => {
  try {
    const { researchId, sessionId, stage, config, totalItems } = req.body;
    if (!researchId || !stage) {
      return res.status(400).json({ error: "Cần `researchId` và `stage`." });
    }

    const job = BackgroundJobManager.createJob({
      researchId,
      sessionId,
      stage,
      config,
      totalItems,
    });

    res.json({ success: true, job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/start
 */
app.post("/api/jobs/:id/start", async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const started = await BackgroundJobManager.startJob(jobId);
  res.json({ success: started, job: BackgroundJobManager.getJob(jobId) });
});

/**
 * POST /api/jobs/:id/pause
 */
app.post("/api/jobs/:id/pause", async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const paused = await BackgroundJobManager.pauseJob(jobId);
  res.json({ success: paused, job: BackgroundJobManager.getJob(jobId) });
});

/**
 * POST /api/jobs/:id/resume
 */
app.post("/api/jobs/:id/resume", async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const resumed = await BackgroundJobManager.resumeJob(jobId);
  res.json({ success: resumed, job: BackgroundJobManager.getJob(jobId) });
});

/**
 * POST /api/jobs/:id/cancel
 */
app.post("/api/jobs/:id/cancel", async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const cancelled = await BackgroundJobManager.cancelJob(jobId);
  res.json({ success: cancelled, job: BackgroundJobManager.getJob(jobId) });
});

/**
 * POST /api/jobs/:id/retry
 */
app.post("/api/jobs/:id/retry", async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const retried = await BackgroundJobManager.retryJob(jobId);
  res.json({ success: retried, job: BackgroundJobManager.getJob(jobId) });
});

/**
 * GET /api/jobs/active
 * ĐẶT TRƯỚC /api/jobs/:id để Express không nuốt nhầm "active" thành job ID
 */
app.get("/api/jobs/active", (req: Request, res: Response) => {
  const researchId = (req.query.researchId as string) || "preset_swt302";
  const activeJob = BackgroundJobManager.getActiveJobForResearch(researchId);
  if (!activeJob) {
    return res.json({ success: true, activeJob: null, job: null });
  }
  res.json({ success: true, activeJob, job: activeJob, ...activeJob });
});

/**
 * GET /api/jobs/:id và GET /api/jobs/:id/status
 */
const handleGetJob = (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const job = BackgroundJobManager.getJob(jobId);
  if (!job) return res.status(404).json({ error: "Không tìm thấy job." });
  res.json({ success: true, job, ...job });
};

app.get("/api/jobs/:id", handleGetJob);
app.get("/api/jobs/:id/status", handleGetJob);

/**
 * GET /api/prisma/flow
 * Tính toán số liệu PRISMA 2020 và sinh Markdown
 */
app.get("/api/prisma/flow", (req: Request, res: Response) => {
  try {
    const researchId = (req.query.researchId as string) || "preset_swt302";
    const store = BackgroundJobManager.getResearchStore(researchId);

    const dupCount = Math.max(0, store.rawRecords.length - store.canonicalRecords.length);
    const prismaData = PrismaService.calculatePrismaFlow({
      rawRecords: store.rawRecords,
      canonicalRecords: store.canonicalRecords,
      duplicatesRemovedCount: dupCount,
    });

    const isIdBalanced =
      prismaData.totalDatabaseRecords.count + prismaData.totalOtherRecords.count ===
      prismaData.totalRawIdentified.count;
    const isDedupBalanced =
      prismaData.totalRawIdentified.count - prismaData.duplicatesRemoved.count ===
      prismaData.recordsAfterDuplicates.count;
    const isV2Balanced =
      prismaData.passedToFullText.count +
        prismaData.excludedTitleAbstract.count +
        prismaData.unsureTitleAbstract.count ===
      prismaData.screenedTitleAbstract.count;
    const isV3Balanced =
      prismaData.reportsAssessedForEligibility.count +
        prismaData.reportsNotRetrieved.count +
        (prismaData.reportsPendingRetrieval ? prismaData.reportsPendingRetrieval.count : 0) ===
      prismaData.reportsSoughtForRetrieval.count;
    const isMathematicallyBalanced = isIdBalanced && isDedupBalanced && isV2Balanced && isV3Balanced;

    const markdown = PrismaService.generatePrismaMarkdown(prismaData, researchId);

    res.json({
      success: true,
      data: prismaData,
      markdown,
      isMathematicallyBalanced,
      identificationDatabases: prismaData.totalDatabaseRecords.count,
      identificationOther: prismaData.totalOtherRecords.count,
      totalIdentification: prismaData.totalRawIdentified.count,
      duplicatesRemoved: prismaData.duplicatesRemoved.count,
      screenedV2: prismaData.screenedTitleAbstract.count,
      excludedV2: prismaData.excludedTitleAbstract.count,
      soughtFullText: prismaData.reportsSoughtForRetrieval.count,
      assessedFullText: prismaData.reportsAssessedForEligibility.count,
      excludedV3: prismaData.excludedFullText.count,
      includedTotal: prismaData.studiesIncluded.count,
      drilldown: {
        identificationDatabases: {
          cellName: "Cơ sở dữ liệu (Database searches)",
          count: prismaData.totalDatabaseRecords.count,
          paperIds: prismaData.totalDatabaseRecords.paperIds,
        },
        identificationOther: {
          cellName: "Nguồn khác / Snowballing",
          count: prismaData.totalOtherRecords.count,
          paperIds: prismaData.totalOtherRecords.paperIds,
        },
        duplicatesRemoved: {
          cellName: "Bản ghi trùng lặp đã loại bỏ",
          count: prismaData.duplicatesRemoved.count,
          paperIds: prismaData.duplicatesRemoved.paperIds,
        },
        screenedV2: {
          cellName: "Bản ghi đưa vào sàng lọc V2",
          count: prismaData.screenedTitleAbstract.count,
          paperIds: prismaData.screenedTitleAbstract.paperIds,
        },
        excludedV2: {
          cellName: "Bị loại tại V2 (Tiêu đề/Tóm tắt)",
          count: prismaData.excludedTitleAbstract.count,
          paperIds: prismaData.excludedTitleAbstract.paperIds,
        },
        soughtFullText: {
          cellName: "Báo cáo cần tìm toàn văn (V3)",
          count: prismaData.reportsSoughtForRetrieval.count,
          paperIds: prismaData.reportsSoughtForRetrieval.paperIds,
        },
        assessedFullText: {
          cellName: "Báo cáo đọc và thẩm định toàn văn (V3)",
          count: prismaData.reportsAssessedForEligibility.count,
          paperIds: prismaData.reportsAssessedForEligibility.paperIds,
        },
        excludedV3: {
          cellName: "Bị loại sau khi đọc toàn văn (V3)",
          count: prismaData.excludedFullText.count,
          paperIds: prismaData.excludedFullText.paperIds,
        },
        includedTotal: {
          cellName: "Nghiên cứu chính thức được chọn (Included)",
          count: prismaData.studiesIncluded.count,
          paperIds: prismaData.studiesIncluded.paperIds,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/prisma/export
 * Lưu file prisma-flow.md vào thư mục dự án
 */
app.post("/api/prisma/export", async (req: Request, res: Response) => {
  try {
    const { researchId, filename } = req.body;
    const store = BackgroundJobManager.getResearchStore(researchId || "preset_swt302");
    const dupCount = Math.max(0, store.rawRecords.length - store.canonicalRecords.length);
    const prismaData = PrismaService.calculatePrismaFlow({
      rawRecords: store.rawRecords,
      canonicalRecords: store.canonicalRecords,
      duplicatesRemovedCount: dupCount,
    });
    const markdown = PrismaService.generatePrismaMarkdown(prismaData, researchId);

    const safeFile = getSafeOutputPath(filename, "prisma-flow.md");
    if (safeFile.error || !safeFile.safePath) {
      return res.status(400).json({ error: safeFile.error });
    }

    fs.writeFileSync(safeFile.safePath, markdown, "utf-8");
    res.json({
      success: true,
      filePath: safeFile.safePath,
      content: markdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/prisma/export-md
 * Trả về nội dung Markdown của sơ đồ PRISMA 2020
 */
app.get("/api/prisma/export-md", (req: Request, res: Response) => {
  try {
    const researchId = (req.query.researchId as string) || "preset_swt302";
    const store = BackgroundJobManager.getResearchStore(researchId);
    const dupCount = Math.max(0, store.rawRecords.length - store.canonicalRecords.length);
    const prismaData = PrismaService.calculatePrismaFlow({
      rawRecords: store.rawRecords,
      canonicalRecords: store.canonicalRecords,
      duplicatesRemovedCount: dupCount,
    });
    const markdown = PrismaService.generatePrismaMarkdown(prismaData, researchId);
    res.setHeader("Content-Disposition", `attachment; filename="prisma-flow.md"`);
    res.type("text/markdown; charset=utf-8").send(markdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/evidence-table
 */
app.get("/api/evidence-table", (req: Request, res: Response) => {
  try {
    const researchId = (req.query.researchId as string) || "preset_swt302";
    const store = BackgroundJobManager.getResearchStore(researchId);
    const included = store.canonicalRecords.filter(
      (r) => r.finalDecision === "Include" || (r.finalDecision === "" && r.suggestedDecision === "Include"),
    );

    const rows = EvidenceTableService.buildEvidenceRows(included);
    const markdown = EvidenceTableService.generateMarkdown(rows, researchId);

    res.json({
      success: true,
      rows,
      markdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/evidence-table/export
 */
app.post("/api/evidence-table/export", (req: Request, res: Response) => {
  try {
    const { researchId, filename } = req.body;
    const store = BackgroundJobManager.getResearchStore(researchId || "preset_swt302");
    const included = store.canonicalRecords.filter(
      (r) => r.finalDecision === "Include" || (r.finalDecision === "" && r.suggestedDecision === "Include"),
    );
    const rows = EvidenceTableService.buildEvidenceRows(included);
    const markdown = EvidenceTableService.generateMarkdown(rows, researchId);

    const safeFile = getSafeOutputPath(filename, "evidence-table.md");
    if (safeFile.error || !safeFile.safePath) {
      return res.status(400).json({ error: safeFile.error });
    }

    fs.writeFileSync(safeFile.safePath, markdown, "utf-8");
    res.json({
      success: true,
      filePath: safeFile.safePath,
      content: markdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/evidence-table/export-md
 * Trả về nội dung Markdown của Evidence Table
 */
app.get("/api/evidence-table/export-md", (req: Request, res: Response) => {
  try {
    const researchId = (req.query.researchId as string) || "preset_swt302";
    const store = BackgroundJobManager.getResearchStore(researchId);
    const included = store.canonicalRecords.filter(
      (r) => r.finalDecision === "Include" || (r.finalDecision === "" && r.suggestedDecision === "Include"),
    );
    const rows = EvidenceTableService.buildEvidenceRows(included);
    const markdown = EvidenceTableService.generateMarkdown(rows, researchId);
    res.setHeader("Content-Disposition", `attachment; filename="evidence-table.md"`);
    res.type("text/markdown; charset=utf-8").send(markdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-duplicate-log
 */
app.post("/api/scholar/export-duplicate-log", (req: Request, res: Response) => {
  try {
    const { groups, filename } = req.body;
    const safeFile = getSafeOutputPath(filename, "01_duplicate_log.csv");
    if (safeFile.error || !safeFile.safePath) return res.status(400).json({ error: safeFile.error });

    const result = exportDuplicateLogCsv(groups || [], safeFile.safePath);
    res.json({
      success: true,
      filePath: result.filePath,
      csvContent: result.csvContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/export/duplicates
 * Tải tệp CSV danh sách các bản ghi trùng lặp đã loại bỏ
 */
app.get("/api/export/duplicates", (req: Request, res: Response) => {
  try {
    const researchId = (req.query.researchId as string) || "preset_swt302";
    const store = BackgroundJobManager.getResearchStore(researchId);
    const groups: any[] = [];
    const dupMap = new Map<string, string[]>();
    for (const r of store.rawRecords) {
      if (r.potentialDuplicate && r.duplicateOfId) {
        if (!dupMap.has(r.duplicateOfId)) dupMap.set(r.duplicateOfId, []);
        dupMap.get(r.duplicateOfId)!.push(r.id);
      }
    }
    let gIdx = 1;
    for (const [canonId, dupIds] of dupMap.entries()) {
      groups.push({
        id: `dup_group_${gIdx++}`,
        canonicalId: canonId,
        duplicateIds: dupIds,
        reason: "Trùng tiêu đề hoặc DOI",
        rule: "exact_doi_or_title",
        userConfirmed: false,
        createdAt: new Date().toISOString(),
      });
    }
    const result = exportDuplicateLogCsv(groups);
    res.setHeader("Content-Disposition", `attachment; filename="01_duplicates_removed.csv"`);
    res.type("text/csv; charset=utf-8").send(result.csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scholar/export-v2
 */
app.post("/api/scholar/export-v2", (req: Request, res: Response) => {
  try {
    const { records, filename } = req.body;
    const safeFile = getSafeOutputPath(filename, "02_screening_v2.csv");
    if (safeFile.error || !safeFile.safePath) return res.status(400).json({ error: safeFile.error });

    const result = exportScreeningV2Csv(records || [], safeFile.safePath);
    res.json({
      success: true,
      filePath: result.filePath,
      csvContent: result.csvContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CÁC ENDPOINT REST API MỚI CHO THU THẬP & LỌC SƠ BỘ (L0 - L3)
// ==========================================

// 1. Quản lý Collection
app.get("/api/collections", (req: Request, res: Response) => {
  const list = CollectionStore.getAllCollections();
  if (req.query.format === "object") {
    return res.json({ success: true, collections: list });
  }
  res.json(list);
});

app.post("/api/collections", (req: Request, res: Response) => {
  try {
    const { id, name, description, notes, picoNotes } = req.body;
    if (!name) return res.status(400).json({ error: "Tên collection là bắt buộc." });
    const col: Collection = {
      id: id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description || "",
      notes: notes || picoNotes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = CollectionStore.saveCollection(col);
    res.json({ success: true, ...saved, collection: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import file thủ công (CSV / RIS / BibTeX) vào Collection
app.post("/api/collections/:id/import-file", express.raw({ type: "*/*", limit: "50mb" }), async (req: Request, res: Response) => {
  try {
    const colId = req.params.id as string;
    const col = CollectionStore.getCollection(colId);
    if (!col) return res.status(404).json({ error: "Không tìm thấy collection." });

    let rawText = "";
    let fileName = (req.query.fileName as string) || "imported_file";

    if (typeof req.body === "string") {
      rawText = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      const str = req.body.toString("utf-8");
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("multipart/form-data")) {
        const matchName = str.match(/filename="([^"]+)"/i);
        if (matchName) fileName = matchName[1];
        const bodyStart = str.indexOf("\r\n\r\n");
        const bodyEnd = str.lastIndexOf("\r\n--");
        if (bodyStart !== -1 && bodyEnd !== -1) {
          rawText = str.slice(bodyStart + 4, bodyEnd);
        } else {
          rawText = str;
        }
      } else {
        rawText = str;
      }
    } else if (req.body && typeof req.body === "object") {
      rawText = req.body.content || "";
      if (req.body.fileName) fileName = req.body.fileName;
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: "Nội dung tệp rỗng." });
    }

    let parsedResult;
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".ris") || rawText.includes("TY  -")) {
      parsedResult = UniversalFileImporter.parseRis(rawText, fileName);
    } else if (lowerName.endsWith(".bib") || /@\w+\s*\{/i.test(rawText)) {
      parsedResult = UniversalFileImporter.parseBibtex(rawText, fileName);
    } else {
      parsedResult = UniversalFileImporter.parseCsv(rawText, fileName);
    }

    const runId = `import_${Date.now()}`;
    const run: SearchRun = {
      id: runId,
      collectionId: colId,
      source: `File Import: ${fileName}`,
      userQuery: fileName,
      actualQuery: fileName,
      filters: {},
      status: "completed",
      itemsReceived: parsedResult.validRecords.length,
      itemsSaved: parsedResult.validRecords.length,
      itemsError: parsedResult.rowErrors.length,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      errorLog: parsedResult.rowErrors.map((e) => `Row ${e.row}: ${e.error}`),
    };
    CollectionStore.saveRun(run);

    const normalizedRecords: NormalizedRecord[] = parsedResult.validRecords.map((r, idx) => ({
      id: r.id || `imp_${Date.now()}_${idx}`,
      collectionId: colId,
      searchRunId: runId,
      source: r.source || `Import: ${fileName}`,
      sourceRecordId: r.id || r.doi || "",
      title: r.title || "Untitled",
      authors: r.authors || "",
      year: String(r.year || ""),
      publicationDate: r.retrieval_date,
      venue: r.venue || "",
      doi: r.doi || "",
      abstract: r.abstract || r.snippet || "",
      landingPageUrl: r.url || "",
      openAccessPdfUrl: r.pdfUrl || "",
      documentType: r.publicationType || "unknown",
      retrievedAt: new Date().toISOString(),
      rawPayload: r as any,
    }));

    const saveStats = CollectionStore.saveBatchRecords(colId, runId, normalizedRecords);
    res.json({
      success: true,
      importedCount: saveStats.savedCount,
      totalParsed: parsedResult.totalRowsParsed,
      runId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/collections/:id/suspected-duplicates", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const list = CollectionStore.getSuspectedDuplicates(collectionId);
  res.json(list);
});

app.get("/api/collections/:id/canonical-records", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const list = CollectionStore.getCanonicalRecords(collectionId);
  res.json(list);
});

app.get("/api/collections/:id", (req: Request, res: Response) => {
  const colId = req.params.id as string;
  const col = CollectionStore.getCollection(colId);
  if (!col) return res.status(404).json({ error: "Không tìm thấy collection." });

  const rawRecords = CollectionStore.getRecordsByCollection(colId);
  const canonicalRecords = CollectionStore.getCanonicalRecords(colId);
  const suspectedGroups = CollectionStore.getSuspectedDuplicates(colId);
  const filterRuns = CollectionStore.getFilterRuns(colId);
  const searchRuns = CollectionStore.getRunsByCollection(colId);

  // Thống kê metadata và từ khóa từ kết quả mới nhất
  let passCount = 0;
  let failCount = 0;
  let unknownCount = 0;
  let matchCount = 0;
  let noMatchCount = 0;
  let insufficientCount = 0;
  let exclusionHitCount = 0;

  for (const c of canonicalRecords) {
    const fRes = c.latestFilterResult;
    if (fRes) {
      if (fRes.metadataStatus === "PASS") passCount++;
      else if (fRes.metadataStatus === "FAIL") failCount++;
      else unknownCount++;

      if (fRes.keywordStatus === "MATCH") matchCount++;
      else if (fRes.keywordStatus === "NO_MATCH") noMatchCount++;
      else if (fRes.keywordStatus === "INSUFFICIENT_DATA") insufficientCount++;

      if (fRes.hasExclusionHit) exclusionHitCount++;
    } else {
      unknownCount++;
    }
  }

  res.json({
    success: true,
    collection: col,
    stats: {
      rawCount: rawRecords.length,
      canonicalCount: canonicalRecords.length,
      suspectedGroupsCount: suspectedGroups.filter((g) => g.resolution === "unresolved").length,
      runsCount: searchRuns.length,
      metadata: { passCount, failCount, unknownCount },
      keyword: { matchCount, noMatchCount, insufficientCount, exclusionHitCount },
    },
    latestFilterRun: filterRuns[0] || null,
  });
});

app.delete("/api/collections/:id", (req: Request, res: Response) => {
  const ok = CollectionStore.deleteCollection(req.params.id as string);
  res.json({ success: ok });
});

// 2. Search Runs & Collector Control
app.get("/api/collections/:id/runs", (req: Request, res: Response) => {
  const runs = CollectionStore.getRunsByCollection(req.params.id as string);
  res.json({ success: true, runs });
});

app.post("/api/collector/start", async (req: Request, res: Response) => {
  try {
    const { collectionId, source, query, filters } = req.body;
    if (!collectionId || !source || !query) {
      return res.status(400).json({ error: "Cần collectionId, source và query." });
    }
    const run = await CollectorRunner.startRun({ collectionId, source, query, filters });
    res.json({ success: true, run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/collector/pause", (req: Request, res: Response) => {
  const { runId } = req.body;
  const ok = CollectorRunner.pauseRun(runId);
  res.json({ success: ok });
});

app.post("/api/collector/resume", (req: Request, res: Response) => {
  const { runId } = req.body;
  const ok = CollectorRunner.resumeRun(runId);
  res.json({ success: ok });
});

app.post("/api/collector/cancel", (req: Request, res: Response) => {
  const { runId } = req.body;
  const ok = CollectorRunner.cancelRun(runId);
  res.json({ success: ok });
});

app.get("/api/collector/status/:runId", (req: Request, res: Response) => {
  const run = CollectionStore.getRun(req.params.runId as string);
  if (!run) return res.status(404).json({ error: "Không tìm thấy run." });
  res.json({ success: true, run });
});

app.post("/api/collector/snowball", async (req: Request, res: Response) => {
  try {
    const { collectionId, seeds, direction, maxDepth, maxPapersPerSeed, source } = req.body;
    if (!collectionId || !seeds || seeds.length === 0) {
      return res.status(400).json({ error: "Cần collectionId và danh sách seeds." });
    }
    const run = await CollectorRunner.startSnowballing(collectionId, {
      seeds,
      direction: direction || "both",
      maxDepth: maxDepth || 1,
      maxPapersPerSeed: maxPapersPerSeed || 20,
      source: source || "OpenAlex",
    });
    res.json({ success: true, run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Pipeline L0 - L1 (Deduplication)
app.post("/api/pipeline/l0-l1/run", (req: Request, res: Response) => {
  try {
    const { collectionId } = req.body;
    if (!collectionId) return res.status(400).json({ error: "Cần collectionId." });
    const result = CollectionStore.runL0L1Pipeline(collectionId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pipeline/l1/suspected", (req: Request, res: Response) => {
  const collectionId = (req.query.collectionId as string) || "";
  if (!collectionId) return res.status(400).json({ error: "Cần collectionId." });
  const list = CollectionStore.getSuspectedDuplicates(collectionId);
  res.json({ success: true, groups: list });
});

app.post("/api/pipeline/l1/resolve-suspected", (req: Request, res: Response) => {
  try {
    const { collectionId, groupId, resolution, targetCanonicalId } = req.body;
    if (!collectionId || !groupId || !resolution) {
      return res.status(400).json({ error: "Thiếu tham số resolution." });
    }
    const ok = CollectionStore.resolveSuspectedDuplicate(
      collectionId,
      groupId,
      resolution,
      targetCanonicalId
    );
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Pipeline L2 (Metadata Filter)
app.post("/api/pipeline/l2/run", (req: Request, res: Response) => {
  try {
    const { collectionId, config: filterConfig } = req.body as {
      collectionId: string;
      config: MetadataFilterConfig;
    };
    if (!collectionId || !filterConfig) {
      return res.status(400).json({ error: "Cần collectionId và config." });
    }
    const run = CollectionStore.runL2Pipeline(collectionId, filterConfig);
    res.json({ success: true, filterRun: run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Pipeline L3 (Keyword Filter)
app.post("/api/pipeline/l3/run", (req: Request, res: Response) => {
  try {
    const { collectionId, config: keywordConfig } = req.body as {
      collectionId: string;
      config: KeywordFilterConfig;
    };
    if (!collectionId || !keywordConfig) {
      return res.status(400).json({ error: "Cần collectionId và config." });
    }
    const run = CollectionStore.runL3Pipeline(collectionId, keywordConfig);
    res.json({ success: true, filterRun: run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pipeline/filter-runs", (req: Request, res: Response) => {
  const collectionId = (req.query.collectionId as string) || "";
  if (!collectionId) return res.status(400).json({ error: "Cần collectionId." });
  const runs = CollectionStore.getFilterRuns(collectionId);
  res.json({ success: true, filterRuns: runs });
});

// 6. Data Inspection & Records List
app.get("/api/collections/:id/records", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const { type, metadataFilter, keywordFilter, search, missingFlag } = req.query as Record<
    string,
    string
  >;

  let list: any[] =
    type === "raw"
      ? CollectionStore.getRecordsByCollection(collectionId)
      : CollectionStore.getCanonicalRecords(collectionId);

  // Lọc theo metadataFilter: all | PASS | FAIL | UNKNOWN | PASS_AND_UNKNOWN
  if (metadataFilter && metadataFilter !== "all") {
    if (metadataFilter === "PASS_AND_UNKNOWN") {
      list = list.filter((r) => {
        const s = r.latestFilterResult?.metadataStatus || "UNKNOWN";
        return s === "PASS" || s === "UNKNOWN";
      });
    } else {
      list = list.filter((r) => (r.latestFilterResult?.metadataStatus || "UNKNOWN") === metadataFilter);
    }
  }

  // Lọc theo keywordFilter: all | MATCH | NO_MATCH | INSUFFICIENT_DATA | EXCLUSION_HIT
  if (keywordFilter && keywordFilter !== "all") {
    if (keywordFilter === "EXCLUSION_HIT") {
      list = list.filter((r) => r.latestFilterResult?.hasExclusionHit);
    } else {
      list = list.filter((r) => r.latestFilterResult?.keywordStatus === keywordFilter);
    }
  }

  // Lọc theo missing flag
  if (missingFlag && missingFlag !== "all") {
    list = list.filter((r) => r.qualityFlags?.[missingFlag]);
  }

  // Lọc theo từ khóa tìm kiếm
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.authors && r.authors.toLowerCase().includes(q)) ||
        (r.doi && r.doi.toLowerCase().includes(q)) ||
        (r.venue && r.venue.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, total: list.length, records: list });
});

// 7. Export APIs
app.get("/api/collections/:id/export", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const col = CollectionStore.getCollection(collectionId);
  const format = (req.query.format as string) || "csv";
  const subset = (req.query.subset as string) || "pass_and_unknown";

  const canonicals = CollectionStore.getCanonicalRecords(collectionId);
  const rawList = CollectionStore.getRecordsByCollection(collectionId);

  let targetRecords: any[] = canonicals;

  if (subset === "all_raw") {
    targetRecords = rawList;
  } else if (subset === "unique") {
    targetRecords = canonicals;
  } else if (subset === "pass_and_unknown") {
    targetRecords = canonicals.filter((r) => {
      const s = r.latestFilterResult?.metadataStatus || "UNKNOWN";
      return s === "PASS" || s === "UNKNOWN";
    });
  } else if (subset === "pass_only") {
    targetRecords = canonicals.filter((r) => r.latestFilterResult?.metadataStatus === "PASS");
  } else if (subset === "fail_only") {
    targetRecords = canonicals.filter((r) => r.latestFilterResult?.metadataStatus === "FAIL");
  } else if (subset === "keyword_match") {
    targetRecords = canonicals.filter((r) => r.latestFilterResult?.keywordStatus === "MATCH");
  } else if (subset === "keyword_exclusion") {
    targetRecords = canonicals.filter((r) => r.latestFilterResult?.hasExclusionHit);
  }

  const baseFileName = `collection_${collectionId}_${subset}`;

  if (format === "ris") {
    const risContent = generateRis(targetRecords);
    res.setHeader("Content-Type", "application/x-research-info-systems; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.ris"`);
    return res.send(risContent);
  }

  if (format === "bibtex" || format === "bib") {
    const bibContent = generateBibtex(targetRecords);
    res.setHeader("Content-Type", "application/x-bibtex; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.bib"`);
    return res.send(bibContent);
  }

  if (format === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.json"`);
    return res.json({
      collection: col,
      subset,
      totalRecords: targetRecords.length,
      records: targetRecords,
    });
  }

  // Mặc định CSV
  const csvContent = generateCanonicalCsv(targetRecords);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.csv"`);
  return res.send(csvContent);
});

app.get("/api/collections/:id/export/search-log", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const runs = CollectionStore.getRunsByCollection(collectionId);
  const format = req.query.format || "csv";

  if (format === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="search-log_${collectionId}.json"`);
    return res.json({ collectionId, totalRuns: runs.length, runs });
  }

  const csv = generateSearchLogCsv(runs);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="search-log_${collectionId}.csv"`);
  return res.send(csv);
});

app.get("/api/collections/:id/export/filter-log", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const fRuns = CollectionStore.getFilterRuns(collectionId);
  const csv = generateFilterLogCsv(fRuns);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="filter-log_${collectionId}.csv"`);
  return res.send(csv);
});

app.get("/api/collections/:id/export/duplicate-mapping", (req: Request, res: Response) => {
  const collectionId = req.params.id as string;
  const canonicals = CollectionStore.getCanonicalRecords(collectionId);
  const suspected = CollectionStore.getSuspectedDuplicates(collectionId);
  const csv = generateDuplicateMappingCsv(canonicals, suspected);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="duplicate-mapping_${collectionId}.csv"`);
  return res.send(csv);
});

app.get("/api/guide/cadima-rayyan", (req: Request, res: Response) => {
  const md = getCadimaRayyanGuideMarkdown();
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.send(md);
});
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const cleanErrMsg = sanitizeString(err.message || "Lỗi máy chủ nội bộ");
  console.error("[Backend Error]", cleanErrMsg);
  res.status(err.status || 500).json({
    success: false,
    error: cleanErrMsg,
  });
});

export { app };

if (require.main === module) {
  runMigrations()
    .then(() => BackgroundJobManager.initFromDatabase())
    .catch((err) => console.log("[DB] Migration/Job note:", err.message));
  app.listen(config.port, () => {
    console.log(`[SLR Backend] Đang chạy tại http://localhost:${config.port}`);
    console.log(
      `[SLR Backend] Trạng thái SERPAPI_KEY: ${config.isKeyConfigured() ? "✓ Đã cấu hình hợp lệ" : "✗ Chưa cấu hình"}`,
    );
  });
}
