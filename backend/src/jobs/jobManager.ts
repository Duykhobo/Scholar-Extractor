import fs from "fs";
import path from "path";
import { SourceAdapterRegistry } from "../adapters";
import { DbRepository } from "../db";
import { PipelineV1Dedup } from "../pipeline/dedupV1";
import { PipelineV3Retrieval } from "../pipeline/retrievalV3";
import { PipelineV2Screening } from "../pipeline/screeningV2";
import { ResearchProfile } from "../profiles";
import { BackgroundJob, CanonicalPaper, PaperRecord, PipelineStage } from "../types";

export interface CreateJobParams {
  researchId: string;
  sessionId?: string;
  stage: PipelineStage;
  config?: Record<string, any>;
  totalItems?: number;
}

export class BackgroundJobManager {
  private static jobs: Map<string, BackgroundJob> = new Map();
  private static activeWorkers: Map<string, { abortController: AbortController; isPaused: boolean }> = new Map();

  // In-memory data store for stage snapshots per researchId
  private static researchData: Map<
    string,
    {
      rawRecords: PaperRecord[];
      canonicalRecords: CanonicalPaper[];
      v2Results?: CanonicalPaper[];
      v3Results?: CanonicalPaper[];
    }
  > = new Map();

  static saveStoreSnapshot(researchId: string): void {
    const store = this.researchData.get(researchId);
    if (!store) return;
    try {
      const snapDir = path.join(process.cwd(), "data", "snapshots");
      if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });
      const snapPath = path.join(snapDir, `${researchId}.json`);
      fs.writeFileSync(snapPath, JSON.stringify(store), "utf-8");
      DbRepository.upsertPapersAndLinks(store.canonicalRecords, researchId).catch(() => {});
    } catch (e: any) {
      console.warn(`[JobManager] Không thể lưu store snapshot:`, e.message);
    }
  }

  static loadStoreSnapshot(researchId: string): boolean {
    try {
      const snapPath = path.join(process.cwd(), "data", "snapshots", `${researchId}.json`);
      if (fs.existsSync(snapPath)) {
        const raw = fs.readFileSync(snapPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.rawRecords || parsed.canonicalRecords)) {
          this.researchData.set(researchId, {
            rawRecords: parsed.rawRecords || [],
            canonicalRecords: parsed.canonicalRecords || [],
            v2Results: parsed.v2Results,
            v3Results: parsed.v3Results,
          });
          return true;
        }
      }
    } catch (e: any) {
      console.warn(`[JobManager] Không thể nạp store snapshot:`, e.message);
    }
    return false;
  }

  static getResearchStore(researchId: string) {
    if (!this.researchData.has(researchId)) {
      this.loadStoreSnapshot(researchId);
    }
    if (!this.researchData.has(researchId)) {
      this.researchData.set(researchId, {
        rawRecords: [],
        canonicalRecords: [],
      });
    }
    return this.researchData.get(researchId)!;
  }

  static createJob(params: CreateJobParams): BackgroundJob {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: BackgroundJob = {
      id: jobId,
      researchId: params.researchId,
      sessionId: params.sessionId,
      stage: params.stage,
      status: "pending",
      progress: 0,
      totalItems: params.totalItems || 0,
      processedItems: 0,
      failedItems: 0,
      checkpoints: { lastIndex: 0 },
      errorLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: params.config,
    };

    this.jobs.set(jobId, job);
    DbRepository.saveJob(job).catch((err) => console.warn("[JobManager] Lỗi lưu job vào DB:", err.message));
    return job;
  }

  static async initFromDatabase(): Promise<void> {
    try {
      // Phục hồi dữ liệu snapshots từ đĩa
      const snapDir = path.join(process.cwd(), "data", "snapshots");
      if (fs.existsSync(snapDir)) {
        const files = fs.readdirSync(snapDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            const rId = file.replace(/\.json$/, "");
            this.loadStoreSnapshot(rId);
          }
        }
      }

      const activeJobs = await DbRepository.getActiveJobs();
      for (const job of activeJobs) {
        if (job.status === "running") {
          job.status = "paused";
          job.message = "Đã tạm dừng do server khởi động lại (sẵn sàng tiếp tục)";
          await DbRepository.saveJob(job);
        }
        this.jobs.set(job.id, job);
      }
    } catch (e: any) {
      console.warn("[JobManager] Không thể nạp active jobs từ DB:", e.message);
    }
  }

  static getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  static getActiveJobForResearch(researchId: string): BackgroundJob | undefined {
    for (const job of this.jobs.values()) {
      if (
        job.researchId === researchId &&
        (job.status === "running" || job.status === "pending" || job.status === "paused")
      ) {
        return job;
      }
    }
    return undefined;
  }

  static getAllJobs(researchId?: string): BackgroundJob[] {
    const list = Array.from(this.jobs.values());
    if (researchId) return list.filter((j) => j.researchId === researchId);
    return list;
  }

  static async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    const worker = this.activeWorkers.get(jobId);
    if (!job || !worker) return false;

    worker.isPaused = true;
    job.status = "paused";
    job.updatedAt = new Date().toISOString();
    DbRepository.saveJob(job).catch(() => {});
    return true;
  }

  static async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    const worker = this.activeWorkers.get(jobId);
    if (!job || job.status !== "paused") return false;

    if (worker) {
      worker.isPaused = false;
      job.status = "running";
      job.updatedAt = new Date().toISOString();
      DbRepository.saveJob(job).catch(() => {});
      return true;
    }

    // Nếu worker cũ bị ngắt, chạy lại từ checkpoint
    return this.startJob(jobId);
  }

  static async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    const worker = this.activeWorkers.get(jobId);
    if (worker) {
      worker.abortController.abort();
      this.activeWorkers.delete(jobId);
    }
    if (job) {
      job.status = "cancelled";
      job.updatedAt = new Date().toISOString();
      DbRepository.saveJob(job).catch(() => {});
      return true;
    }
    return false;
  }

  static async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== "failed" && job.status !== "cancelled")) return false;

    job.status = "pending";
    job.failedItems = 0;
    job.errorLog = [];
    job.updatedAt = new Date().toISOString();
    return this.startJob(jobId);
  }

  /**
   * Bắt đầu chạy Job nền
   */
  static async startJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const abortController = new AbortController();
    this.activeWorkers.set(jobId, { abortController, isPaused: false });
    job.status = "running";
    job.updatedAt = new Date().toISOString();
    DbRepository.saveJob(job).catch(() => {});

    // Chạy ngầm không block caller
    (async () => {
      try {
        switch (job.stage) {
          case "B1":
            await this.runB1Worker(job, abortController);
            break;
          case "V1":
            await this.runV1Worker(job, abortController);
            break;
          case "V2":
            await this.runV2Worker(job, abortController);
            break;
          case "V3":
            await this.runV3Worker(job, abortController);
            break;
          case "FINAL":
            await this.runFinalWorker(job, abortController);
            break;
          default:
            throw new Error(`Giai đoạn pipeline không được hỗ trợ hoặc không hợp lệ: ${job.stage}`);
        }
      } catch (err: any) {
        if (abortController.signal.aborted) {
          job.status = "cancelled";
        } else {
          job.status = "failed";
          job.errorLog = job.errorLog || [];
          job.errorLog.push(`Lỗi thực thi: ${err.message}`);
        }
      } finally {
        this.activeWorkers.delete(jobId);
        job.updatedAt = new Date().toISOString();
        DbRepository.saveJob(job).catch(() => {});
      }
    })();

    return true;
  }

  private static async runV1Worker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const rawRecords = store.rawRecords;
    job.totalItems = rawRecords.length;

    const dedupRes = PipelineV1Dedup.processV1(rawRecords);
    store.canonicalRecords = dedupRes.canonicalRecords;

    job.processedItems = dedupRes.canonicalRecords.length;
    job.progress = 100;
    job.status = "completed";
    DbRepository.saveJob(job).catch(() => {});
    this.saveStoreSnapshot(job.researchId);
  }

  private static async runV2Worker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const canonical = store.canonicalRecords;
    job.totalItems = canonical.length;

    const profile: ResearchProfile = job.config?.profile;
    if (!profile) throw new Error("Thiếu cấu hình ResearchProfile cho vòng V2");

    const v2Res = PipelineV2Screening.processV2(canonical, profile);
    store.canonicalRecords = v2Res.records;
    store.v2Results = v2Res.records;

    job.processedItems = v2Res.records.length;
    job.progress = 100;
    job.status = "completed";
    DbRepository.saveJob(job).catch(() => {});
    this.saveStoreSnapshot(job.researchId);
  }

  private static async runV3Worker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const profile: ResearchProfile = job.config?.profile;
    if (!profile) throw new Error("Thiếu cấu hình ResearchProfile cho vòng V3");

    // Chỉ lấy các bài đạt điều kiện từ V2 (PassToFullText hoặc Include, và tùy chọn Unsure)
    const includeUnsure = job.config?.includeUnsure !== false;
    const candidates = store.canonicalRecords.filter(
      (r) =>
        r.v2Decision === "PassToFullText" ||
        (r.v2Decision as string) === "Include" ||
        (includeUnsure && r.v2Decision === "Unsure"),
    );

    job.totalItems = candidates.length;
    let startIndex = job.checkpoints?.lastIndex || 0;

    const batchSize = 3;
    for (let i = startIndex; i < candidates.length; i += batchSize) {
      if (abortController.signal.aborted) return;

      const workerState = this.activeWorkers.get(job.id);
      while (workerState && workerState.isPaused) {
        if (abortController.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const batch = candidates.slice(i, i + batchSize);
      const v3Res = await PipelineV3Retrieval.processV3(batch, profile, {
        autoFetchPdf: job.config?.autoFetchPdf !== false,
      });

      // Cập nhật lại vào canonicalRecords
      for (const updated of v3Res.records) {
        const idx = store.canonicalRecords.findIndex((c) => c.id === updated.id);
        if (idx !== -1) store.canonicalRecords[idx] = updated;
      }

      job.processedItems = Math.min(candidates.length, i + batch.length);
      job.checkpoints = { lastIndex: job.processedItems };
      job.progress = Math.round((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date().toISOString();
      DbRepository.saveJob(job).catch(() => {});
      this.saveStoreSnapshot(job.researchId);
    }

    job.status = "completed";
    job.progress = 100;
    job.message = `Đã hoàn tất thẩm định toàn văn V3 cho ${candidates.length} bài.`;
    DbRepository.saveJob(job).catch(() => {});
    this.saveStoreSnapshot(job.researchId);
  }

  private static async runB1Worker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const config = job.config || {};
    const query = (config.query || "").trim();
    if (!query) {
      throw new Error("Không có chuỗi tìm kiếm được cung cấp cho giai đoạn B1.");
    }

    const sourceName = config.source || "OpenAlex";
    const adapter = SourceAdapterRegistry.getAdapter(sourceName) || SourceAdapterRegistry.getAdapter("OpenAlex");
    if (!adapter) {
      throw new Error(`Không tìm thấy adapter cho nguồn: ${sourceName}`);
    }

    const maxPages = config.maxPages ? Number(config.maxPages) : 3;
    const pageSize = config.limit ? Number(config.limit) : 25;
    let cursor = (job.checkpoints?.cursor as string) || "*";
    let start = (job.checkpoints?.start as number) || 0;
    let pageCount = (job.checkpoints?.pageCount as number) || 0;
    job.totalItems = maxPages * pageSize;

    while (pageCount < maxPages && !abortController.signal.aborted) {
      const workerState = this.activeWorkers.get(job.id);
      while (workerState && workerState.isPaused) {
        if (abortController.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 1000));
      }

      pageCount++;
      job.message = `Đang thu thập trang ${pageCount}/${maxPages} từ ${adapter.sourceName}...`;
      const searchRes = await adapter.search({
        query,
        asYlo: config.asYlo,
        asYhi: config.asYhi,
        limit: pageSize,
        cursor,
        start,
        sessionId: job.sessionId,
        queryVersion: config.queryVersion || "Q1",
      });

      if (abortController.signal.aborted) return;

      if (searchRes.records && searchRes.records.length > 0) {
        for (const rec of searchRes.records) {
          rec.pipelineStage = "B1";
          rec.screeningStage = "V1";
        }
        store.rawRecords = [...store.rawRecords, ...searchRes.records];
      }

      job.processedItems = store.rawRecords.length;
      job.progress = Math.min(100, Math.round((pageCount / maxPages) * 100));
      job.checkpoints = {
        pageCount,
        cursor: searchRes.nextCursor,
        start: start + (searchRes.records?.length || 0),
        lastIndex: store.rawRecords.length,
      };
      job.updatedAt = new Date().toISOString();
      DbRepository.saveJob(job).catch(() => {});
      this.saveStoreSnapshot(job.researchId);

      if (!searchRes.hasMore || !searchRes.records || searchRes.records.length === 0) {
        break;
      }

      if (searchRes.nextCursor) {
        cursor = searchRes.nextCursor;
      }
      start += searchRes.records.length;
    }

    job.totalItems = store.rawRecords.length;
    job.processedItems = store.rawRecords.length;
    job.progress = 100;
    job.status = "completed";
    job.message = `Đã thu thập thành công ${store.rawRecords.length} bản ghi qua ${pageCount} trang từ ${adapter.sourceName}.`;
    DbRepository.saveJob(job).catch(() => {});
    this.saveStoreSnapshot(job.researchId);
  }

  private static async runFinalWorker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const included = store.canonicalRecords.filter((r) => r.finalDecision === "Include");
    job.totalItems = store.canonicalRecords.length;
    job.processedItems = included.length;
    job.progress = 100;
    job.status = "completed";
    job.message = `Đã chốt danh sách với ${included.length} bài Include.`;
    DbRepository.saveJob(job).catch(() => {});
    this.saveStoreSnapshot(job.researchId);
  }
}
