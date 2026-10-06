import sql from "mssql";
import { ResearchProfile } from "../profiles/types";
import { BackgroundJob, PaperRecord } from "../types";
import { getDbPool } from "./connection";

export class DbRepository {
  /**
   * Lưu hoặc cập nhật Hồ sơ Nghiên cứu (ResearchProfile)
   */
  static async upsertProfile(profile: ResearchProfile): Promise<boolean> {
    const pool = await getDbPool();
    if (!pool) return false;

    try {
      const req = pool.request();
      req.input("id", sql.VarChar(100), profile.id);
      req.input("name", sql.NVarChar(255), profile.name);
      req.input("description", sql.NVarChar(sql.MAX), profile.description || "");
      req.input("reviewType", sql.VarChar(50), profile.reviewType || "systematic_review");
      req.input("targetIncludedCount", sql.Int, profile.targetIncludedCount || 20);
      req.input("profileVersion", sql.Int, profile.profileVersion || 1);
      req.input("configJson", sql.NVarChar(sql.MAX), JSON.stringify(profile));

      await req.query(`
        MERGE INTO ResearchProfiles AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET 
            name = @name, 
            description = @description, 
            reviewType = @reviewType, 
            targetIncludedCount = @targetIncludedCount, 
            profileVersion = @profileVersion, 
            configJson = @configJson, 
            updatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, name, description, reviewType, targetIncludedCount, profileVersion, configJson)
          VALUES (@id, @name, @description, @reviewType, @targetIncludedCount, @profileVersion, @configJson);
      `);
      return true;
    } catch (err: any) {
      console.warn("[DB] Loi upsertProfile:", err.message);
      return false;
    }
  }

  /**
   * Lưu thông tin Phiên tìm kiếm (ResearchSession)
   */
  static async saveSession(session: {
    id: string;
    researchId: string;
    query?: string;
    asYlo?: string;
    asYhi?: string;
    hl?: string;
    totalReportedResults?: number;
    actualRecordsCount?: number;
    uniqueRecordsCount?: number;
    apiRequestsUsed?: number;
  }): Promise<boolean> {
    const pool = await getDbPool();
    if (!pool) return false;

    try {
      const req = pool.request();
      req.input("id", sql.VarChar(100), session.id);
      req.input("researchId", sql.VarChar(100), session.researchId);
      req.input("query", sql.NVarChar(sql.MAX), session.query || "");
      req.input("asYlo", sql.VarChar(10), session.asYlo || "");
      req.input("asYhi", sql.VarChar(10), session.asYhi || "");
      req.input("hl", sql.VarChar(10), session.hl || "vi");
      req.input("totalReported", sql.Int, session.totalReportedResults || 0);
      req.input("actualRecords", sql.Int, session.actualRecordsCount || 0);
      req.input("uniqueRecords", sql.Int, session.uniqueRecordsCount || 0);
      req.input("apiRequests", sql.Int, session.apiRequestsUsed || 0);

      await req.query(`
        MERGE INTO ResearchSessions AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET 
            query = @query, 
            asYlo = @asYlo, 
            asYhi = @asYhi, 
            hl = @hl, 
            totalReportedResults = @totalReported, 
            actualRecordsCount = @actualRecords, 
            uniqueRecordsCount = @uniqueRecords, 
            apiRequestsUsed = @apiRequests, 
            updatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, researchId, query, asYlo, asYhi, hl, totalReportedResults, actualRecordsCount, uniqueRecordsCount, apiRequestsUsed)
          VALUES (@id, @researchId, @query, @asYlo, @asYhi, @hl, @totalReported, @actualRecords, @uniqueRecords, @apiRequests);
      `);
      return true;
    } catch (err: any) {
      console.warn("[DB] Loi saveSession:", err.message);
      return false;
    }
  }

  /**
   * Lưu các bài báo (Papers) và liên kết với nghiên cứu (ResearchPaperLinks)
   */
  static async upsertPapersAndLinks(
    records: PaperRecord[],
    researchId: string,
    sessionId?: string,
  ): Promise<{ savedCount: number; error?: string }> {
    const pool = await getDbPool();
    if (!pool) return { savedCount: 0, error: "Database offline" };

    let saved = 0;
    for (const record of records) {
      try {
        const req = pool.request();
        req.input("id", sql.VarChar(100), record.id);
        req.input("doi", sql.VarChar(255), record.doi || null);
        req.input("title", sql.NVarChar(1000), (record.title || "").slice(0, 1000));
        req.input("authors", sql.NVarChar(1000), (record.authors || "").slice(0, 1000));
        const parsedYear = record.year ? parseInt(String(record.year).trim(), 10) : null;
        req.input("year", sql.Int, isNaN(parsedYear as number) ? null : parsedYear);
        req.input("venue", sql.NVarChar(500), (record.venue || "").slice(0, 500));
        req.input("abstract", sql.NVarChar(sql.MAX), record.abstract || "");
        req.input("snippet", sql.NVarChar(sql.MAX), record.snippet || "");
        req.input("url", sql.NVarChar(2000), (record.url || "").slice(0, 2000));
        req.input("pdfPath", sql.NVarChar(1000), (record.pdfUrl || "").slice(0, 1000));
        req.input("isPdfVerified", sql.Bit, (record as any).isPdfVerified ? 1 : 0);
        req.input("discoverySource", sql.VarChar(100), record.discoverySource || "Google Scholar");
        req.input("collectionMethod", sql.VarChar(100), record.collectionMethod || "SerpApi");

        // 1. Upsert master Paper
        await req.query(`
          MERGE INTO Papers AS target
          USING (SELECT @id AS id) AS src
          ON (target.id = src.id)
          WHEN MATCHED THEN
            UPDATE SET 
              doi = COALESCE(@doi, target.doi),
              title = @title,
              authors = @authors,
              year = @year,
              venue = @venue,
              abstract = CASE WHEN LEN(@abstract) > LEN(target.abstract) THEN @abstract ELSE target.abstract END,
              snippet = @snippet,
              url = @url,
              pdfPath = COALESCE(@pdfPath, target.pdfPath),
              isPdfVerified = @isPdfVerified
          WHEN NOT MATCHED THEN
            INSERT (id, doi, title, authors, year, venue, abstract, snippet, url, pdfPath, isPdfVerified, discoverySource, collectionMethod)
            VALUES (@id, @doi, @title, @authors, @year, @venue, @abstract, @snippet, @url, @pdfPath, @isPdfVerified, @discoverySource, @collectionMethod);
        `);

        // 2. Upsert ResearchPaperLink
        const linkId = `${researchId}__${record.id}`;
        const linkReq = pool.request();
        linkReq.input("linkId", sql.VarChar(100), linkId);
        linkReq.input("researchId", sql.VarChar(100), researchId);
        linkReq.input("paperId", sql.VarChar(100), record.id);
        linkReq.input("sessionId", sql.VarChar(100), sessionId || record.sessionId || null);
        linkReq.input("screeningStage", sql.VarChar(20), record.screeningStage || "V1");
        linkReq.input("suggestedDecision", sql.VarChar(20), record.suggestedDecision || "Unsure");
        linkReq.input("finalDecision", sql.VarChar(20), record.finalDecision || "");
        linkReq.input("screeningReason", sql.NVarChar(sql.MAX), record.screeningReason || "");
        linkReq.input("userNotes", sql.NVarChar(sql.MAX), record.userNotes || "");

        const modelContribStr = Array.isArray(record.modelContribution)
          ? record.modelContribution.join(", ")
          : record.modelContribution ? String(record.modelContribution) : null;
        linkReq.input("modelContribution", sql.VarChar(100), modelContribStr ? modelContribStr.slice(0, 100) : null);

        const litGroupStr = record.literatureGroup ? String(record.literatureGroup).slice(0, 50) : null;
        linkReq.input("literatureGroup", sql.VarChar(50), litGroupStr);

        const conceptLabelsStr = Array.isArray(record.conceptLabels)
          ? record.conceptLabels.join("; ")
          : (record.conceptLabels ? String(record.conceptLabels) : "");
        linkReq.input("conceptLabels", sql.NVarChar(500), conceptLabelsStr.slice(0, 500));

        await linkReq.query(`
          MERGE INTO ResearchPaperLinks AS target
          USING (SELECT @linkId AS id) AS src
          ON (target.id = src.id)
          WHEN MATCHED THEN
            UPDATE SET 
              screeningStage = @screeningStage,
              suggestedDecision = @suggestedDecision,
              finalDecision = @finalDecision,
              screeningReason = @screeningReason,
              userNotes = @userNotes,
              modelContribution = @modelContribution,
              literatureGroup = @literatureGroup,
              conceptLabels = @conceptLabels,
              updatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (id, researchId, paperId, sessionId, screeningStage, suggestedDecision, finalDecision, screeningReason, userNotes, modelContribution, literatureGroup, conceptLabels)
            VALUES (@linkId, @researchId, @paperId, @sessionId, @screeningStage, @suggestedDecision, @finalDecision, @screeningReason, @userNotes, @modelContribution, @literatureGroup, @conceptLabels);
        `);

        saved++;
      } catch (err: any) {
        console.warn(`[DB] Loi luu record ${record.id}:`, err.message);
      }
    }

    return { savedCount: saved };
  }

  /**
   * Lay trang thai ket noi va so luong ban ghi
   */
  static async getStats(): Promise<{
    connected: boolean;
    profilesCount: number;
    sessionsCount: number;
    papersCount: number;
  }> {
    const pool = await getDbPool();
    if (!pool) {
      return { connected: false, profilesCount: 0, sessionsCount: 0, papersCount: 0 };
    }

    try {
      const res = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM ResearchProfiles) AS profilesCount,
          (SELECT COUNT(*) FROM ResearchSessions) AS sessionsCount,
          (SELECT COUNT(*) FROM Papers) AS papersCount;
      `);
      const row = res.recordset[0] || {};
      return {
        connected: true,
        profilesCount: row.profilesCount || 0,
        sessionsCount: row.sessionsCount || 0,
        papersCount: row.papersCount || 0,
      };
    } catch {
      return { connected: true, profilesCount: 0, sessionsCount: 0, papersCount: 0 };
    }
  }

  /**
   * Lưu hoặc cập nhật thông tin Background Job xuống SQL Server
   */
  static async saveJob(job: BackgroundJob): Promise<boolean> {
    const pool = await getDbPool();
    if (!pool) return false;
    try {
      const req = pool.request();
      req.input("id", sql.VarChar(100), job.id);
      req.input("researchId", sql.VarChar(100), job.researchId);
      req.input("sessionId", sql.VarChar(100), job.sessionId || null);
      req.input("stage", sql.VarChar(20), job.stage);
      req.input("status", sql.VarChar(30), job.status);
      req.input("progress", sql.Float, job.progress || 0);
      req.input("totalItems", sql.Int, job.totalItems || 0);
      req.input("processedItems", sql.Int, job.processedItems || 0);
      req.input("failedItems", sql.Int, job.failedItems || 0);
      req.input("checkpoints", sql.NVarChar(sql.MAX), JSON.stringify(job.checkpoints || {}));
      req.input("errorLog", sql.NVarChar(sql.MAX), JSON.stringify(job.errorLog || []));
      req.input("configJson", sql.NVarChar(sql.MAX), JSON.stringify(job.config || {}));

      await req.query(`
        MERGE INTO BackgroundJobs AS target
        USING (SELECT @id AS id) AS src
        ON (target.id = src.id)
        WHEN MATCHED THEN
          UPDATE SET
            status = @status,
            progress = @progress,
            totalItems = @totalItems,
            processedItems = @processedItems,
            failedItems = @failedItems,
            checkpoints = @checkpoints,
            errorLog = @errorLog,
            configJson = @configJson,
            updatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, researchId, sessionId, stage, status, progress, totalItems, processedItems, failedItems, checkpoints, errorLog, configJson)
          VALUES (@id, @researchId, @sessionId, @stage, @status, @progress, @totalItems, @processedItems, @failedItems, @checkpoints, @errorLog, @configJson);
      `);
      return true;
    } catch (err: any) {
      console.warn(`[DB] Lỗi saveJob ${job.id}:`, err.message);
      return false;
    }
  }

  /**
   * Lấy thông tin Background Job theo ID
   */
  static async getJob(jobId: string): Promise<BackgroundJob | null> {
    const pool = await getDbPool();
    if (!pool) return null;
    try {
      const res = await pool.request().input("id", sql.VarChar(100), jobId).query(`
        SELECT * FROM BackgroundJobs WHERE id = @id
      `);
      if (res.recordset.length === 0) return null;
      const row = res.recordset[0];
      return {
        id: row.id,
        researchId: row.researchId,
        sessionId: row.sessionId || undefined,
        stage: row.stage,
        status: row.status,
        progress: row.progress || 0,
        totalItems: row.totalItems || 0,
        processedItems: row.processedItems || 0,
        failedItems: row.failedItems || 0,
        checkpoints: row.checkpoints ? JSON.parse(row.checkpoints) : {},
        errorLog: row.errorLog ? JSON.parse(row.errorLog) : [],
        config: row.configJson ? JSON.parse(row.configJson) : {},
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Lấy danh sách các jobs đang hoạt động (pending, running, paused)
   */
  static async getActiveJobs(researchId?: string): Promise<BackgroundJob[]> {
    const pool = await getDbPool();
    if (!pool) return [];
    try {
      const req = pool.request();
      let query = `SELECT * FROM BackgroundJobs WHERE status IN ('pending', 'running', 'paused')`;
      if (researchId) {
        req.input("researchId", sql.VarChar(100), researchId);
        query += ` AND researchId = @researchId`;
      }
      query += ` ORDER BY updatedAt DESC`;
      const res = await req.query(query);
      return res.recordset.map((row: any) => ({
        id: row.id,
        researchId: row.researchId,
        sessionId: row.sessionId || undefined,
        stage: row.stage,
        status: row.status,
        progress: row.progress || 0,
        totalItems: row.totalItems || 0,
        processedItems: row.processedItems || 0,
        failedItems: row.failedItems || 0,
        checkpoints: row.checkpoints ? JSON.parse(row.checkpoints) : {},
        errorLog: row.errorLog ? JSON.parse(row.errorLog) : [],
        config: row.configJson ? JSON.parse(row.configJson) : {},
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
