-- Migration 001: Schema khoi tao co so du lieu cho Scholar Extractor
-- Ho tro quan he: Nghien cuu (Profiles) -> Phien tim kiem (Sessions) -> Bai bao (Papers) -> Danh gia & Bang chung

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ResearchProfiles')
BEGIN
    CREATE TABLE ResearchProfiles (
        id VARCHAR(100) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        reviewType VARCHAR(50) DEFAULT 'systematic_review',
        targetIncludedCount INT DEFAULT 20,
        profileVersion INT DEFAULT 1,
        configJson NVARCHAR(MAX),
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ResearchSessions')
BEGIN
    CREATE TABLE ResearchSessions (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES ResearchProfiles(id) ON DELETE CASCADE,
        query NVARCHAR(MAX),
        asYlo VARCHAR(10),
        asYhi VARCHAR(10),
        hl VARCHAR(10),
        totalReportedResults INT DEFAULT 0,
        actualRecordsCount INT DEFAULT 0,
        uniqueRecordsCount INT DEFAULT 0,
        apiRequestsUsed INT DEFAULT 0,
        startedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Papers')
BEGIN
    CREATE TABLE Papers (
        id VARCHAR(100) PRIMARY KEY,
        doi VARCHAR(255),
        title NVARCHAR(1000) NOT NULL,
        authors NVARCHAR(1000),
        year INT,
        venue NVARCHAR(500),
        abstract NVARCHAR(MAX),
        snippet NVARCHAR(MAX),
        url NVARCHAR(2000),
        pdfPath NVARCHAR(1000),
        isPdfVerified BIT DEFAULT 0,
        discoverySource VARCHAR(100) DEFAULT 'Google Scholar',
        collectionMethod VARCHAR(100) DEFAULT 'SerpApi',
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_Papers_Doi ON Papers(doi) WHERE doi IS NOT NULL;
    CREATE INDEX IX_Papers_Year ON Papers(year);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ResearchPaperLinks')
BEGIN
    CREATE TABLE ResearchPaperLinks (
        id VARCHAR(100) PRIMARY KEY,
        researchId VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES ResearchProfiles(id) ON DELETE CASCADE,
        paperId VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES Papers(id) ON DELETE CASCADE,
        sessionId VARCHAR(100),
        screeningStage VARCHAR(20) DEFAULT 'V1',
        suggestedDecision VARCHAR(20) DEFAULT 'Unsure',
        finalDecision VARCHAR(20) DEFAULT '',
        screeningReason NVARCHAR(MAX),
        userNotes NVARCHAR(MAX),
        modelContribution VARCHAR(20),
        literatureGroup VARCHAR(50),
        conceptLabels NVARCHAR(500),
        updatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Research_Paper UNIQUE (researchId, paperId)
    );
    CREATE INDEX IX_ResearchPaperLinks_Research ON ResearchPaperLinks(researchId);
    CREATE INDEX IX_ResearchPaperLinks_Decision ON ResearchPaperLinks(finalDecision);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ScreeningCriterionResults')
BEGIN
    CREATE TABLE ScreeningCriterionResults (
        id INT IDENTITY(1,1) PRIMARY KEY,
        linkId VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES ResearchPaperLinks(id) ON DELETE CASCADE,
        criterionId VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL, -- met, not_met, unknown
        reason NVARCHAR(MAX),
        stage VARCHAR(20)
    );
    CREATE INDEX IX_CriterionResults_LinkId ON ScreeningCriterionResults(linkId);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PaperEvidence')
BEGIN
    CREATE TABLE PaperEvidence (
        id INT IDENTITY(1,1) PRIMARY KEY,
        linkId VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES ResearchPaperLinks(id) ON DELETE CASCADE,
        type VARCHAR(50),
        term NVARCHAR(255),
        context NVARCHAR(MAX),
        page INT,
        anchor VARCHAR(255),
        section NVARCHAR(255),
        isValidEvidence BIT DEFAULT 1,
        reason NVARCHAR(MAX)
    );
    CREATE INDEX IX_PaperEvidence_LinkId ON PaperEvidence(linkId);
END;
