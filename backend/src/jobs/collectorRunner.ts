import { SourceAdapterRegistry } from "../adapters";
import { CollectionStore } from "../db/collectionStore";
import { NormalizedRecord, SearchRun, SearchRunStatus, SnowballConfig } from "../types";

export interface StartRunParams {
  collectionId: string;
  source: string;
  query: string;
  filters?: {
    yearStart?: number;
    yearEnd?: number;
    documentType?: string;
    maxResults?: number;
    [key: string]: any;
  };
}

export class CollectorRunner {
  private static activeJobs: Map<
    string,
    {
      abortController: AbortController;
      isPaused: boolean;
      shouldStop: boolean;
      loopActive: boolean;
    }
  > = new Map();

  /**
   * Khởi tạo một Search Run mới và bắt đầu chạy nền
   */
  static async startRun(params: StartRunParams): Promise<SearchRun> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const adapter = SourceAdapterRegistry.getAdapter(params.source);
    const actualQuery = adapter ? adapter.transformQuery(params.query).actualQuery : params.query;

    const run: SearchRun = {
      id: runId,
      collectionId: params.collectionId,
      source: params.source,
      userQuery: params.query,
      actualQuery,
      filters: params.filters || {},
      status: "running",
      progressPercent: 0,
      itemsReceived: 0,
      itemsSaved: 0,
      itemsError: 0,
      checkpoint: { offset: 0, cursor: "*" },
      startedAt: new Date().toISOString(),
      errorLog: [],
    };

    CollectionStore.saveRun(run);

    const abortController = new AbortController();
    this.activeJobs.set(runId, {
      abortController,
      isPaused: false,
      shouldStop: false,
      loopActive: true,
    });

    // Chạy bất đồng bộ trong background không đợi phản hồi HTTP
    this.executeRunLoop(runId).catch((err) => {
      console.error(`[CollectorRunner] Lỗi ngoại lệ trong run ${runId}:`, err);
    });

    return run;
  }

  /**
   * Tạm dừng an toàn một lượt tìm kiếm đang chạy
   */
  static pauseRun(runId: string): boolean {
    const job = this.activeJobs.get(runId);
    if (!job) {
      const run = CollectionStore.getRun(runId);
      if (run && run.status === "running") {
        run.status = "paused";
        CollectionStore.saveRun(run);
        return true;
      }
      return false;
    }

    job.isPaused = true;
    const run = CollectionStore.getRun(runId);
    if (run) {
      run.status = "paused";
      CollectionStore.saveRun(run);
    }
    return true;
  }

  /**
   * Tiếp tục một lượt tìm kiếm từ checkpoint
   */
  static resumeRun(runId: string): boolean {
    const run = CollectionStore.getRun(runId);
    if (!run || run.status !== "paused") return false;

    let job = this.activeJobs.get(runId);
    if (!job) {
      job = {
        abortController: new AbortController(),
        isPaused: false,
        shouldStop: false,
        loopActive: true,
      };
      this.activeJobs.set(runId, job);
    } else {
      job.isPaused = false;
      job.shouldStop = false;
    }

    run.status = "running";
    CollectionStore.saveRun(run);

    if (!job.loopActive) {
      job.loopActive = true;
      this.executeRunLoop(runId).catch((err) => {
        console.error(`[CollectorRunner] Lỗi ngoại lệ khi resume run ${runId}:`, err);
      });
    }

    return true;
  }

  /**
   * Hủy bỏ lượt tìm kiếm nhưng giữ nguyên toàn bộ dữ liệu đã thu thập
   */
  static cancelRun(runId: string): boolean {
    const job = this.activeJobs.get(runId);
    if (job) {
      job.shouldStop = true;
      job.abortController.abort();
    }

    const run = CollectionStore.getRun(runId);
    if (run) {
      run.status = "cancelled";
      run.completedAt = new Date().toISOString();
      CollectionStore.saveRun(run);
      return true;
    }
    return false;
  }

  /**
   * Vòng lặp thu thập phân trang độc lập
   */
  private static async executeRunLoop(runId: string): Promise<void> {
    const run = CollectionStore.getRun(runId);
    if (!run) return;

    const adapter = SourceAdapterRegistry.getAdapter(run.source);
    if (!adapter) {
      run.status = "failed";
      run.errorLog.push(`Không tìm thấy Adapter cho nguồn "${run.source}".`);
      run.completedAt = new Date().toISOString();
      CollectionStore.saveRun(run);
      return;
    }

    const maxResults = run.filters.maxResults || 100;
    const batchLimit = 25;

    let offset = run.checkpoint?.offset || 0;
    let cursor = run.checkpoint?.cursor || "*";
    let hasMore = true;

    while (hasMore && run.itemsReceived < maxResults) {
      const job = this.activeJobs.get(runId);
      if (!job || job.shouldStop) {
        break;
      }

      if (job.isPaused) {
        // Đã tạm dừng, lưu checkpoint và thoát vòng lặp
        run.checkpoint = { offset, cursor };
        run.status = "paused";
        CollectionStore.saveRun(run);
        return;
      }

      const currentLimit = Math.min(batchLimit, maxResults - run.itemsReceived);

      try {
        const searchResult = await adapter.search({
          query: run.userQuery,
          start: offset,
          limit: currentLimit,
          cursor,
          asYlo: run.filters.yearStart,
          asYhi: run.filters.yearEnd,
        }, job.abortController.signal);

        if (searchResult.totalReported !== undefined) {
          run.totalReported = searchResult.totalReported;
        }

        const rawRecords = searchResult.records || [];
        if (rawRecords.length === 0) {
          hasMore = false;
          break;
        }

        // Chuyển đổi sang NormalizedRecord
        const normalizedBatch: NormalizedRecord[] = rawRecords.map((r) => ({
          id: r.id,
          collectionId: run.collectionId,
          searchRunId: run.id,
          title: r.title,
          authors: r.authors,
          year: r.year,
          publicationDate: r.publicationDate || (r.year ? r.year.toString() : "UNKNOWN"),
          abstract: r.abstract || r.snippet || "",
          doi: r.doi,
          venue: r.venue,
          documentType: r.publicationType || r.documentType,
          language: r.language,
          source: r.source,
          sourceRecordId: r.id,
          landingPageUrl: r.url,
          openAccessPdfUrl: r.pdfUrl,
          retrievedAt: new Date().toISOString(),
          rawPayload: r,
        }));

        // Lưu batch vào kho dữ liệu bền vững
        const { savedCount } = CollectionStore.saveBatchRecords(
          run.collectionId,
          run.id,
          normalizedBatch
        );

        run.itemsReceived += rawRecords.length;
        run.itemsSaved += savedCount;

        // Cập nhật tiến độ
        if (run.totalReported && run.totalReported > 0) {
          const denominator = Math.min(run.totalReported, maxResults);
          run.progressPercent = Math.min(100, Math.round((run.itemsReceived / denominator) * 100));
        }

        // Cập nhật checkpoint
        offset += rawRecords.length;
        if (searchResult.nextCursor) {
          cursor = searchResult.nextCursor;
        }
        run.checkpoint = { offset, cursor };
        hasMore = searchResult.hasMore;

        // Lưu tiến trình của run ra đĩa
        CollectionStore.saveRun(run);

        // Nghỉ một khoảng nhỏ tránh rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err: any) {
        console.error(`[CollectorRunner] Lỗi trong batch của run ${runId}:`, err.message);
        run.itemsError += 1;
        run.errorLog.push(`[${new Date().toISOString()}] Lỗi tại offset ${offset}: ${err.message}`);
        CollectionStore.saveRun(run);

        // Nếu gặp lỗi, retry nhẹ hoặc dừng nếu lỗi nghiêm trọng
        await new Promise((resolve) => setTimeout(resolve, 2000));
        break;
      }
    }

    // Đánh giá trạng thái kết thúc
    const finalJob = this.activeJobs.get(runId);
    if (finalJob?.isPaused) {
      run.status = "paused";
    } else if (finalJob?.shouldStop || run.status === "cancelled") {
      run.status = "cancelled";
    } else if (run.itemsError > 0 && run.itemsSaved > 0) {
      run.status = "completed_with_errors";
    } else if (run.itemsError > 0 && run.itemsSaved === 0) {
      run.status = "failed";
    } else {
      run.status = "completed";
      run.progressPercent = 100;
    }

    run.completedAt = new Date().toISOString();
    CollectionStore.saveRun(run);
    if (finalJob) {
      finalJob.loopActive = false;
      if (run.status !== "paused") {
        this.activeJobs.delete(runId);
      }
    }
  }

  /**
   * Thực hiện Snowballing (backward: references, forward: citations)
   */
  static async startSnowballing(
    collectionId: string,
    config: SnowballConfig
  ): Promise<SearchRun> {
    const runId = `snowball_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sourceName = config.source || "OpenAlex";
    const adapter = SourceAdapterRegistry.getAdapter(sourceName) || SourceAdapterRegistry.getAdapter("OpenAlex")!;

    const run: SearchRun = {
      id: runId,
      collectionId,
      source: `Snowballing (${adapter.sourceName})`,
      userQuery: `Seeds: ${config.seeds.join(", ")} [${config.direction}]`,
      actualQuery: `Snowballing depth=${config.maxDepth}, maxPerSeed=${config.maxPapersPerSeed}`,
      filters: {
        direction: config.direction,
        maxDepth: config.maxDepth,
        maxResults: config.maxPapersPerSeed * config.seeds.length,
      },
      status: "running",
      itemsReceived: 0,
      itemsSaved: 0,
      itemsError: 0,
      startedAt: new Date().toISOString(),
      errorLog: [],
    };

    CollectionStore.saveRun(run);

    // Chạy snowballing ngầm
    (async () => {
      const visitedIds = new Set<string>();

      for (const seed of config.seeds) {
        if (visitedIds.has(seed)) continue;
        visitedIds.add(seed);

        try {
          let discovered: any[] = [];

          if (config.direction === "backward" || config.direction === "both") {
            const refs = await adapter.fetchReferences(seed);
            discovered.push(...refs);
          }

          if (config.direction === "forward" || config.direction === "both") {
            const cits = await adapter.fetchCitations(seed);
            discovered.push(...cits);
          }

          // Giới hạn số bài trên mỗi seed
          const trimmed = discovered.slice(0, config.maxPapersPerSeed);

          const normalizedBatch: NormalizedRecord[] = trimmed.map((p) => ({
            id: p.id,
            collectionId,
            searchRunId: run.id,
            title: p.title,
            authors: p.authors,
            year: p.year,
            publicationDate: p.retrieval_date,
            abstract: p.abstract || p.snippet || "",
            doi: p.doi,
            venue: p.venue,
            source: `${adapter.sourceName} (Snowball)`,
            sourceRecordId: p.id,
            landingPageUrl: p.url,
            openAccessPdfUrl: p.pdfUrl,
            retrievedAt: new Date().toISOString(),
            rawPayload: p,
          }));

          const { savedCount } = CollectionStore.saveBatchRecords(collectionId, run.id, normalizedBatch);
          run.itemsReceived += trimmed.length;
          run.itemsSaved += savedCount;
          CollectionStore.saveRun(run);

          await new Promise((r) => setTimeout(r, 1000));
        } catch (err: any) {
          run.itemsError++;
          run.errorLog.push(`[${seed}] Lỗi snowballing: ${err.message}`);
          CollectionStore.saveRun(run);
        }
      }

      run.status = run.itemsError > 0 && run.itemsSaved === 0 ? "failed" : "completed";
      run.completedAt = new Date().toISOString();
      run.progressPercent = 100;
      CollectionStore.saveRun(run);
    })().catch((err) => {
      console.error(`[CollectorRunner] Lỗi fatal snowballing:`, err);
    });

    return run;
  }
}
