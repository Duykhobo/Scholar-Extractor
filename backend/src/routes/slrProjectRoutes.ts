import { Router, Request, Response } from "express";
import { ProjectStore } from "../db/projectStore";
import { ScreeningService } from "../services/screeningService";
import { EvidenceService } from "../services/evidenceService";
import { PrismaCalculator } from "../services/prismaCalculator";
import { ValidationService } from "../services/validationService";
import { ExportPackageService } from "../services/exportPackageService";
import { UniversalFileImporter } from "../adapters/fileimport";
import {
  Project,
  Criterion,
  QueryVersion,
  SearchRun,
  CanonicalRecord,
  ScreeningDecision,
  FullTextAttempt,
  EvidenceEntry,
} from "../types";

const router = Router();

const getProjectId = (req: Request): string => {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : (raw || "");
};

// ==========================================
// 1. PROJECTS CRUD & PRESETS
// ==========================================

// Lấy danh sách toàn bộ dự án
router.get("/", (req: Request, res: Response) => {
  try {
    const projects = ProjectStore.getAllProjects();
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy chi tiết dự án
router.get("/:id", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const p = ProjectStore.getProject(pid);
    if (!p) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án với ID: " + pid });
    }
    res.json({ success: true, data: p });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tạo dự án mới (Hỗ trợ tạo từ preset hoặc tạo trống)
router.post("/", (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const preset = body.preset; // "blank" | "sample_swt302" | "aac_visual"

    let newProject: Project;
    const now = new Date().toISOString();
    const projectId = body.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (preset === "blank") {
      newProject = {
        id: projectId,
        name: body.name || "Dự án Literature Review mới",
        rqCode: body.rqCode || "RQ1",
        teamName: body.teamName || "Nhóm nghiên cứu",
        rq: body.rq || "",
        h0: body.h0 || "",
        h1: body.h1 || "",
        framework: body.framework || "PICO",
        pico: body.pico || { population: "", intervention: "", comparison: "", outcome: "" },
        members: body.members || [
          {
            id: `mem_${Date.now()}`,
            name: "Reviewer 1",
            role: "Trưởng nhóm nghiên cứu",
            assignedSources: [],
            isReviewer: true,
            isExtractor: true,
            plannedAuthorOrder: 1,
            confirmedFinalDraft: false,
          },
        ],
        searchPeriod: body.searchPeriod || {
          startDate: new Date().toISOString().split("T")[0],
          timezone: "Asia/Ho_Chi_Minh",
        },
        reportLanguage: body.reportLanguage || "vi",
        activeProtocolVersion: "1.0",
        activeStage: "PROJECT",
        createdAt: now,
        updatedAt: now,
      };

      ProjectStore.saveProject(newProject);

      // Tạo protocol ban đầu
      ProjectStore.saveProtocol(projectId, {
        version: "1.0",
        projectId,
        title: "Protocol khởi tạo",
        reasonForChange: "Khởi tạo dự án",
        createdAt: now,
        criteria: [
          {
            id: `crit_ic_${Date.now()}_1`,
            code: "IC-1",
            name: "Phù hợp chủ đề nghiên cứu",
            description: "Bài báo đề cập trực tiếp đến câu hỏi nghiên cứu.",
            kind: "inclusion",
            stage: "both",
            evaluationMethod: "manual",
            isActive: true,
          },
          {
            id: `crit_ec_${Date.now()}_1`,
            code: "EC-1",
            name: "Không có thực nghiệm",
            description: "Chỉ là tài liệu tổng quan ngắn hoặc ý tưởng chưa đánh giá.",
            kind: "exclusion",
            stage: "v1",
            evaluationMethod: "manual",
            isActive: true,
          },
        ],
        sourcePolicies: {
          "IEEE Xplore": { role: "primary" },
          "ACM Digital Library": { role: "primary" },
          "Google Scholar": { role: "supplementary" },
        },
      });
    } else {
      // Custom creation
      newProject = {
        id: projectId,
        name: body.name || "Dự án Literature Review",
        rqCode: body.rqCode || "RQ1",
        teamName: body.teamName || "Nhóm nghiên cứu",
        rq: body.rq || "",
        h0: body.h0 || "",
        h1: body.h1 || "",
        framework: body.framework || "PICO",
        pico: body.pico || { population: "", intervention: "", comparison: "", outcome: "" },
        members: body.members || [],
        searchPeriod: body.searchPeriod || { timezone: "Asia/Ho_Chi_Minh" },
        reportLanguage: body.reportLanguage || "vi",
        activeProtocolVersion: body.activeProtocolVersion || "1.0",
        activeStage: body.activeStage || "PROJECT",
        createdAt: now,
        updatedAt: now,
      };
      ProjectStore.saveProject(newProject);
    }

    res.status(201).json({ success: true, data: newProject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật dự án
router.put("/:id", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const existing = ProjectStore.getProject(pid);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án" });
    }
    const updated: Project = {
      ...existing,
      ...req.body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    ProjectStore.saveProject(updated);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa dự án
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const success = ProjectStore.deleteProject(pid);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. PROTOCOL & IC/EC
// ==========================================

router.get("/:id/protocol", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const protocols = ProjectStore.getProtocols(pid);
    const project = ProjectStore.getProject(pid);
    const active = protocols.find((p) => p.version === project?.activeProtocolVersion) || protocols[0];
    res.json({ success: true, active, allVersions: protocols });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/protocol", (req: Request, res: Response) => {
  try {
    const { version, title, changeReason, criteria, sourcePolicies } = req.body;
    if (!version || !changeReason) {
      return res.status(400).json({
        success: false,
        error: "Bắt buộc phải có mã version và lý do thay đổi (changeReason) để lưu vết lịch sử.",
      });
    }

    const pid = getProjectId(req);
    const project = ProjectStore.getProject(pid);
    if (!project) return res.status(404).json({ success: false, error: "Không tìm thấy dự án" });

    const newProtocol = {
      version,
      projectId: pid,
      title: title || `Protocol v${version}`,
      reasonForChange: changeReason,
      changeReason,
      createdAt: new Date().toISOString(),
      criteria: criteria || [],
      sourcePolicies: sourcePolicies || {},
    };

    const result = ProjectStore.saveProtocol(pid, newProtocol, changeReason);
    project.activeProtocolVersion = version;
    ProjectStore.saveProject(project);

    res.json({
      success: true,
      data: result.protocol,
      affectedDecisionsCount: result.affectedDecisionsCount,
      message: `Đã áp dụng Protocol v${version}. Có ${result.affectedDecisionsCount} quyết định cũ cần đối soát lại.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. SEARCH & SEARCH RUNS
// ==========================================

router.get("/:id/queries", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const queries = ProjectStore.getQueries(pid);
    res.json({ success: true, data: queries });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/queries", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const body = req.body;
    const query: QueryVersion = {
      id: body.id || `q_${Date.now()}`,
      projectId: pid,
      versionTag: body.versionTag || "Q1",
      rawQuery: body.rawQuery || "",
      targetDatabase: body.targetDatabase || "Google Scholar",
      searchFields: body.searchFields || "Title/Abstract",
      filtersApplied: body.filtersApplied || {},
      expansionRuleApplied: body.expansionRuleApplied,
      createdAt: new Date().toISOString(),
    };
    ProjectStore.saveQuery(pid, query);
    res.json({ success: true, data: query });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/runs", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const runs = ProjectStore.getSearchRuns(pid);
    res.json({ success: true, data: runs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/runs", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const body = req.body;
    const run: SearchRun = {
      id: body.id || `run_${Date.now()}`,
      collectionId: pid,
      source: body.source || "Google Scholar",
      userQuery: body.userQuery || body.actualQuery || "",
      actualQuery: body.actualQuery || body.userQuery || "",
      filters: body.filters || {},
      status: body.status || "completed",
      itemsReceived: body.itemsReceived || 0,
      itemsSaved: body.itemsSaved || 0,
      itemsError: body.itemsError || 0,
      searchUrl: body.searchUrl || "",
      totalFoundSource: body.totalFoundSource !== undefined ? body.totalFoundSource : body.itemsReceived,
      importedCount: body.importedCount !== undefined ? body.importedCount : body.itemsSaved,
      failedCount: body.failedCount !== undefined ? body.failedCount : body.itemsError,
      executedAt: body.executedAt || new Date().toISOString(),
      executedBy: body.executedBy || "Reviewer",
      startedAt: body.startedAt || new Date().toISOString(),
      completedAt: body.completedAt || new Date().toISOString(),
      errorLog: body.errorLog || [],
    };
    ProjectStore.saveSearchRun(pid, run);
    res.json({ success: true, data: run });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. RECORDS & DEDUPLICATION
// ==========================================

router.get("/:id/records", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const records = ProjectStore.getRecords(pid);
    res.json({ success: true, count: records.length, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/records/import", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const { content, filename, defaultSource } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: "Nội dung file không được để trống" });
    }

    const preview = UniversalFileImporter.parseCsv(content, filename || "import.csv");
    const recordsToAdd: CanonicalRecord[] = [];

    for (const rec of preview.validRecords) {
      const displayId = (rec as any).displayId || rec.id || `R${Date.now() % 10000}`;
      const canonical: CanonicalRecord = {
        id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        collectionId: pid,
        searchRunId: "run_import",
        sourceRecordId: rec.doi || rec.id || displayId,
        title: rec.title || "Không có tiêu đề",
        normalizedTitle: (rec.title || "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim(),
        authors: rec.authors || "",
        year: rec.year || "",
        abstract: rec.abstract || "",
        doi: rec.doi || "",
        venue: rec.venue || "",
        source: rec.source || defaultSource || "Imported File",
        landingPageUrl: rec.url || "",
        url: rec.url || "",
        displayId,
        version: "1",
        docType: rec.isContainer ? "proceedings" : "article",
        isContainer: rec.isContainer || false,
        retrievedAt: new Date().toISOString(),
        mergedRecordIds: [],
        sourcesList: [rec.source || defaultSource || "Imported File"],
        qualityFlags: {
          missing_title: !rec.title,
          missing_abstract: !rec.abstract,
          missing_year: !rec.year,
          missing_doi: !rec.doi,
          missing_fulltext: false,
          needs_data_review: !rec.title && !rec.doi,
        },
      };
      recordsToAdd.push(canonical);
    }

    ProjectStore.saveRecords(pid, recordsToAdd);

    res.json({
      success: true,
      totalParsed: preview.totalRowsParsed,
      validCount: preview.validRecords.length,
      invalidCount: preview.rowErrors.length,
      warnings: preview.warnings,
      rowErrors: preview.rowErrors,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/duplicates", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const dups = ProjectStore.getDuplicates(pid);
    res.json({ success: true, count: dups.length, data: dups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/duplicates/resolve", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const { candidateId, resolution, resolvedBy } = req.body;
    if (!candidateId || !resolution) {
      return res.status(400).json({ success: false, error: "Thiếu candidateId hoặc resolution" });
    }
    const ok = ProjectStore.resolveDuplicate(pid, candidateId, resolution, resolvedBy);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. SCREENING V1
// ==========================================

router.get("/:id/screening-v1", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const records = ProjectStore.getRecords(pid);
    const allDecisions = ProjectStore.getAllDecisions(pid);

    const list = records.map((r) => {
      const decList = allDecisions.get(r.id) || [];
      const v1Dec = decList.find((d) => d.stage === "v1");
      return {
        record: r,
        decision: v1Dec || {
          recordId: r.id,
          stage: "v1",
          decision: "PENDING",
        },
      };
    });

    res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/screening-v1/decision", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const { recordId, decision, primaryReason, secondaryReasons, notes, decidedBy } = req.body;
    if (!recordId || !decision) {
      return res.status(400).json({ success: false, error: "Thiếu recordId hoặc decision" });
    }

    const saved = ScreeningService.recordDecisionV1(
      pid,
      recordId,
      decision,
      primaryReason,
      secondaryReasons,
      notes,
      decidedBy
    );

    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. FULL-TEXT & SCREENING V2
// ==========================================

router.get("/:id/fulltext", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const attempts = ProjectStore.getFullTextAttempts(pid);
    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/fulltext/attempt", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const body = req.body;
    const attempt: FullTextAttempt = {
      id: body.id || `ft_${Date.now()}`,
      recordId: body.recordId,
      projectId: pid,
      status: body.status || "NOT_ATTEMPTED",
      url: body.url,
      source: body.source,
      version: body.version,
      pageCount: body.pageCount,
      isImagePdf: body.isImagePdf,
      notes: body.notes,
      attemptedAt: new Date().toISOString(),
      attemptedBy: body.attemptedBy,
    };
    ProjectStore.saveFullTextAttempt(pid, attempt);
    res.json({ success: true, data: attempt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/screening-v2", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const records = ProjectStore.getRecords(pid);
    const allDecisions = ProjectStore.getAllDecisions(pid);
    const ftList = ProjectStore.getFullTextAttempts(pid);
    const ftMap = new Map<string, FullTextAttempt>();
    ftList.forEach((f) => ftMap.set(f.recordId, f));

    // Lọc các bản ghi qua V1 (INCLUDE + UNSURE)
    const candidates = records
      .filter((r) => {
        const dList = allDecisions.get(r.id) || [];
        const v1 = dList.find((d) => d.stage === "v1");
        return v1 && (v1.decision === "INCLUDE" || v1.decision === "UNSURE");
      })
      .map((r) => {
        const dList = allDecisions.get(r.id) || [];
        const v1Dec = dList.find((d) => d.stage === "v1");
        const v2Dec = dList.find((d) => d.stage === "v2");
        return {
          record: r,
          v1Decision: v1Dec,
          v2Decision: v2Dec || { recordId: r.id, stage: "v2", decision: "PENDING" },
          fullTextAttempt: ftMap.get(r.id) || { status: "NOT_ATTEMPTED" },
        };
      });

    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/screening-v2/decision", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const { recordId, decision, primaryReason, secondaryReasons, notes, decidedBy, fullTextStatus, pageCount } =
      req.body;

    const result = ScreeningService.recordDecisionV2(
      pid,
      recordId,
      decision,
      fullTextStatus || "NOT_ATTEMPTED",
      pageCount,
      primaryReason,
      secondaryReasons,
      notes,
      decidedBy
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. EVIDENCE TABLE (8 CỘT)
// ==========================================

router.get("/:id/evidence", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const list = EvidenceService.getEntries(pid);
    const validation = EvidenceService.validateEvidenceCompleteness(pid);
    res.json({ success: true, count: list.length, data: list, completeness: validation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/evidence", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const body = req.body;
    if (!body.recordId) {
      return res.status(400).json({ success: false, error: "Thiếu recordId" });
    }
    const saved = EvidenceService.saveEntry(pid, body);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. PRISMA & VALIDATION
// ==========================================

router.get("/:id/prisma", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const metrics = PrismaCalculator.calculate(pid);
    const markdown = PrismaCalculator.generatePrismaMarkdown(pid);
    res.json({ success: true, metrics, markdown });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/validate", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const report = ValidationService.validate(pid);
    const markdown = ValidationService.generateValidationMarkdown(pid);
    res.json({ success: true, report, markdown });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. EXPORT COMPLETE ZIP & BACKUP
// ==========================================

router.get("/:id/export-zip", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const { zipBuffer, filename, report } = ExportPackageService.exportCompleteZip(pid);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-SLR-Status", report.status);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/backup", (req: Request, res: Response) => {
  try {
    const pid = getProjectId(req);
    const backup = ProjectStore.exportProjectBackup(pid);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="backup_${pid}.json"`);
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/restore", (req: Request, res: Response) => {
  try {
    const backup = req.body;
    if (!backup || !backup.project) {
      return res.status(400).json({ success: false, error: "Dữ liệu backup JSON không hợp lệ" });
    }
    const restored = ProjectStore.importProjectBackup(backup);
    res.json({ success: true, data: restored });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
