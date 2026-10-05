import sql from 'mssql';
import { getDbPool } from './connection';
import { ResearchProfile } from '../profiles/types';
import { PaperRecord } from '../types';

export class DbRepository {
  /**
   * Lưu hoặc cập nhật Hồ sơ Nghiên cứu (ResearchProfile)
   */
  static async upsertProfile(profile: ResearchProfile): Promise<boolean> {
    const pool = await getDbPool();
    if (!pool) return false;

    try {
      const req = pool.request();
      req.input('id', sql.VarChar(100), profile.id);
      req.input('name', sql.NVarChar(255), profile.name);
      req.input('description', sql.NVarChar(sql.MAX), profile.description || '');
      req.input('reviewType', sql.VarChar(50), profile.reviewType || 'systematic_review');
      req.input('targetIncludedCount', sql.Int, profile.targetIncludedCount || 20);
      req.input('profileVersion', sql.Int, profile.profileVersion || 1);
      req.input('configJson', sql.NVarChar(sql.MAX), JSON.stringify(profile));

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
      console.warn('[DB] Loi upsertProfile:', err.message);
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
      req.input('id', sql.VarChar(100), session.id);
      req.input('researchId', sql.VarChar(100), session.researchId);
      req.input('query', sql.NVarChar(sql.MAX), session.query || '');
      req.input('asYlo', sql.VarChar(10), session.asYlo || '');
      req.input('asYhi', sql.VarChar(10), session.asYhi || '');
      req.input('hl', sql.VarChar(10), session.hl || 'vi');
      req.input('totalReported', sql.Int, session.totalReportedResults || 0);
      req.input('actualRecords', sql.Int, session.actualRecordsCount || 0);
      req.input('uniqueRecords', sql.Int, session.uniqueRecordsCount || 0);
      req.input('apiRequests', sql.Int, session.apiRequestsUsed || 0);

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
      console.warn('[DB] Loi saveSession:', err.message);
      return false;
    }
  }

  /**
   * Lưu các bài báo (Papers) và liên kết với nghiên cứu (ResearchPaperLinks)
   */
  static async upsertPapersAndLinks(
    records: PaperRecord[],
    researchId: string,
    sessionId?: string
  ): Promise<{ savedCount: number; error?: string }> {
    const pool = await getDbPool();
    if (!pool) return { savedCount: 0, error: 'Database offline' };

    let saved = 0;
    for (const record of records) {
      try {
        const req = pool.request();
        req.input('id', sql.VarChar(100), record.id);
        req.input('doi', sql.VarChar(255), record.doi || null);
        req.input('title', sql.NVarChar(1000), (record.title || '').slice(0, 1000));
        req.input('authors', sql.NVarChar(1000), (record.authors || '').slice(0, 1000));
        req.input('year', sql.Int, record.year || null);
        req.input('venue', sql.NVarChar(500), (record.venue || '').slice(0, 500));
        req.input('abstract', sql.NVarChar(sql.MAX), record.abstract || '');
        req.input('snippet', sql.NVarChar(sql.MAX), record.snippet || '');
        req.input('url', sql.NVarChar(2000), (record.url || '').slice(0, 2000));
        req.input('pdfPath', sql.NVarChar(1000), (record.pdfUrl || '').slice(0, 1000));
        req.input('isPdfVerified', sql.Bit, record.isPdfVerified ? 1 : 0);
        req.input('discoverySource', sql.VarChar(100), record.discoverySource || 'Google Scholar');
        req.input('collectionMethod', sql.VarChar(100), record.collectionMethod || 'SerpApi');

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
        linkReq.input('linkId', sql.VarChar(100), linkId);
        linkReq.input('researchId', sql.VarChar(100), researchId);
        linkReq.input('paperId', sql.VarChar(100), record.id);
        linkReq.input('sessionId', sql.VarChar(100), sessionId || record.sessionId || null);
        linkReq.input('screeningStage', sql.VarChar(20), record.screeningStage || 'V1');
        linkReq.input('suggestedDecision', sql.VarChar(20), record.suggestedDecision || 'Unsure');
        linkReq.input('finalDecision', sql.VarChar(20), record.finalDecision || '');
        linkReq.input('screeningReason', sql.NVarChar(sql.MAX), record.screeningReason || '');
        linkReq.input('userNotes', sql.NVarChar(sql.MAX), record.userNotes || '');
        linkReq.input('modelContribution', sql.VarChar(20), record.modelContribution || null);
        linkReq.input('literatureGroup', sql.VarChar(50), record.literatureGroup || null);
        linkReq.input('conceptLabels', sql.NVarChar(500), (record.conceptLabels || []).join('; '));

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
        papersCount: row.papersCount || 0
      };
    } catch {
      return { connected: true, profilesCount: 0, sessionsCount: 0, papersCount: 0 };
    }
  }
}
