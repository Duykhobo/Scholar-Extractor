-- Migration 002: Pipeline da vong (B1, V1, V2, V3, FINAL), Background Jobs, Multi-source Provenance, Duplicate Groups & Snowballing
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BackgroundJobs')
BEGIN
    CREATE TABLE BackgroundJobs (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL,
        sessionId VARCHAR(100),
        stage VARCHAR(20) NOT NULL, -- B1, V1, V2, V3, FINAL
        status VARCHAR(30) NOT NULL, -- pending, running, paused, completed, failed, cancelled
        progress FLOAT DEFAULT 0,
        totalItems INT DEFAULT 0,
        processedItems INT DEFAULT 0,
        failedItems INT DEFAULT 0,
        checkpoints NVARCHAR(MAX),
        errorLog NVARCHAR(MAX),
        configJson NVARCHAR(MAX),
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_BackgroundJobs_Research ON BackgroundJobs(researchId);
    CREATE INDEX IX_BackgroundJobs_Status ON BackgroundJobs(status);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SourceProvenances')
BEGIN
    CREATE TABLE SourceProvenances (
        id VARCHAR(100) PRIMARY KEY,
        paperId VARCHAR(100) NOT NULL,
        source VARCHAR(100) NOT NULL,
        sourceRecordId VARCHAR(255),
        queryId VARCHAR(100),
        queryVersion VARCHAR(50), -- Q1, Q2, Q3
        method VARCHAR(50), -- api, serpapi, import_csv, import_bibtex, import_ris, active_tab, snowball_backward, snowball_forward, toc_expansion
        url NVARCHAR(2000),
        rawQuery NVARCHAR(MAX),
        actualQuery NVARCHAR(MAX),
        isEnrichmentOnly BIT DEFAULT 0,
        containerDoi VARCHAR(255),
        parentPaperId VARCHAR(100),
        retrievedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_SourceProvenances_Paper ON SourceProvenances(paperId);
    CREATE INDEX IX_SourceProvenances_Source ON SourceProvenances(source);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DuplicateGroups')
BEGIN
    CREATE TABLE DuplicateGroups (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL,
        canonicalId VARCHAR(100) NOT NULL,
        reason NVARCHAR(500),
        [rule] VARCHAR(50), -- exact_doi, title_exact, title_fuzzy, manual_group
        userConfirmed BIT DEFAULT 0,
        duplicateIdsJson NVARCHAR(MAX),
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_DuplicateGroups_Research ON DuplicateGroups(researchId);
    CREATE INDEX IX_DuplicateGroups_Canonical ON DuplicateGroups(canonicalId);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PipelineSnapshots')
BEGIN
    CREATE TABLE PipelineSnapshots (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL,
        stage VARCHAR(20) NOT NULL, -- B1, V1, V2, V3, FINAL
        recordCount INT DEFAULT 0,
        summaryJson NVARCHAR(MAX),
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_PipelineSnapshots_ResearchStage ON PipelineSnapshots(researchId, stage);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SnowballSeeds')
BEGIN
    CREATE TABLE SnowballSeeds (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL,
        paperId VARCHAR(100) NOT NULL,
        doi VARCHAR(255),
        title NVARCHAR(1000),
        direction VARCHAR(20) NOT NULL, -- backward, forward
        iteration INT DEFAULT 1,
        source VARCHAR(100),
        parentPaperId VARCHAR(100),
        discoveredAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_SnowballSeeds_Research ON SnowballSeeds(researchId);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FullTextReports')
BEGIN
    CREATE TABLE FullTextReports (
        id VARCHAR(100) PRIMARY KEY,
        paperId VARCHAR(100) NOT NULL,
        researchId VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        officialVenue NVARCHAR(500),
        actualUrl NVARCHAR(2000),
        pdfChecksum VARCHAR(64),
        pageCount INT,
        ocrStatus VARCHAR(30),
        matchConfidence FLOAT,
        detailsJson NVARCHAR(MAX),
        updatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_FullTextReports_Paper ON FullTextReports(paperId);
END;
