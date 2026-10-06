import { DbRepository } from "../db";
import { PipelineV1Dedup } from "../pipeline/dedupV1";
import { PipelineV3Retrieval } from "../pipeline/retrievalV3";
import { PipelineV2Screening } from "../pipeline/screeningV2";
import { ResearchProfile } from "../profiles";
import { SnowballConfig, SnowballService } from "../snowballing/snowballService";
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

  static getResearchStore(researchId: string) {
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
    return job;
  }

  static getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  static getActiveJobForResearch(researchId: string): BackgroundJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.researchId === researchId && (job.status === "running" || job.status === "pending" || job.status === "paused")) {
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

    // Chạy ngầm không block caller
    (async () => {
      try {
        switch (job.stage) {
          case "V1":
            await this.runV1Worker(job, abortController);
            break;
          case "V2":
            await this.runV2Worker(job, abortController);
            break;
          case "V3":
            await this.runV3Worker(job, abortController);
            break;
          default:
            job.status = "completed";
            job.progress = 100;
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
  }

  private static async runV3Worker(job: BackgroundJob, abortController: AbortController) {
    const store = this.getResearchStore(job.researchId);
    const profile: ResearchProfile = job.config?.profile;
    if (!profile) throw new Error("Thiếu cấu hình ResearchProfile cho vòng V3");

    // Chỉ lấy các bài đạt điều kiện từ V2 (PassToFullText và tùy chọn Unsure)
    const includeUnsure = job.config?.includeUnsure !== false;
    const candidates = store.canonicalRecords.filter(
      (r) => r.v2Decision === "PassToFullText" || (includeUnsure && r.v2Decision === "Unsure"),
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
    }

    job.status = "completed";
    job.progress = 100;
  }
}
