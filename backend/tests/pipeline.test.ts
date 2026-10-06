import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { SourceAdapterRegistry, UniversalFileImporter } from "../src/adapters";
import { EvidenceTableService } from "../src/evidenceTable";
import { BackgroundJobManager } from "../src/jobs/jobManager";
import { PipelineV1Dedup } from "../src/pipeline/dedupV1";
import { PipelineV3Retrieval } from "../src/pipeline/retrievalV3";
import { PipelineV2Screening } from "../src/pipeline/screeningV2";
import { PrismaService } from "../src/prisma/prismaService";
import { PRESET_SWT302 } from "../src/profiles/presets";
import { SnowballService } from "../src/snowballing/snowballService";
import { CanonicalPaper, PaperRecord } from "../src/types";

describe("Scholar-Extractor V3 Pipeline & Multi-Source Test Suite", () => {
  const sampleDir = path.resolve(__dirname, "../../lam/SLR");

  describe("1. Universal File Importer & Sample Files Schema Compatibility", () => {
    test("Import 01_all_records.csv: 73 records sau dedup, phân biệt tập kỷ yếu (EC-N) và chuẩn hóa queryVersion Q1/Q2/Q3", () => {
      const file01Path = path.join(sampleDir, "01_all_records.csv");
      assert.ok(fs.existsSync(file01Path), "01_all_records.csv phải tồn tại");

      const csvContent = fs.readFileSync(file01Path, "utf-8");
      const preview = UniversalFileImporter.parseCsv(csvContent, "01_all_records.csv");

      assert.equal(preview.totalRowsParsed, 73, "Tổng số dòng data phải là 73");
      assert.equal(preview.validRecords.length, 73, "73 records hợp lệ");
      assert.equal(preview.containersCount, 42, "Có đúng 42 tập kỷ yếu theo đúng ghi chú PRISMA của Lâm");
      assert.equal(preview.articlesCount, 31, "Có đúng 31 bài báo đơn theo đúng ghi chú PRISMA của Lâm");

      // Kiểm tra R01 là tập kỷ yếu
      const r01 = preview.validRecords.find((r) => r.id === "R01");
      assert.ok(r01);
      assert.equal(r01.isContainer, true);
      assert.equal(r01.suggestedDecision, "Exclude");
      assert.match(r01.screeningReason, /EC-N/);
      assert.equal(r01.queryVersion, "Q1;Q2;Q3", "V1;V2;V3 phải được chuyển thành Q1;Q2;Q3");

      // Kiểm tra R07 là bài báo bên trong tập kỷ yếu
      const r07 = preview.validRecords.find((r) => r.id === "R07");
      assert.ok(r07);
      assert.equal(r07.isContainer, false);
      assert.equal(r07.queryVersion, "Q2;Q3");
    });

    test("Import 02_after_screening_v1.csv: map vòng tiêu đề/tóm tắt sang V2 chuẩn (56 Exclude, 14 Include sơ bộ, 3 Unsure)", () => {
      const file02Path = path.join(sampleDir, "02_after_screening_v1.csv");
      assert.ok(fs.existsSync(file02Path));

      const csvContent = fs.readFileSync(file02Path, "utf-8");
      const preview = UniversalFileImporter.parseCsv(csvContent, "02_after_screening_v1.csv");

      assert.equal(preview.totalRowsParsed, 73);
      assert.equal(preview.suggestedPipelineStage, "V2");

      const excludes = preview.validRecords.filter((r) => r.suggestedDecision === "Exclude");
      const includes = preview.validRecords.filter((r) => r.suggestedDecision === "Include");
      const unsures = preview.validRecords.filter((r) => r.suggestedDecision === "Unsure");

      assert.equal(excludes.length, 56, "56 Exclude khớp chính xác");
      assert.equal(includes.length, 14, "14 Include sơ bộ");
      assert.equal(unsures.length, 3, "3 Unsure");
    });

    test("Import 03_final_included.csv: 17 ứng viên, cảnh báo không tự động gán toàn bộ thành final Include", () => {
      const file03Path = path.join(sampleDir, "03_final_included.csv");
      assert.ok(fs.existsSync(file03Path));

      const csvContent = fs.readFileSync(file03Path, "utf-8");
      const preview = UniversalFileImporter.parseCsv(csvContent, "03_final_included.csv");

      assert.equal(preview.totalRowsParsed, 17, "File 03 có 17 dòng ứng viên");
      assert.ok(preview.warnings.length > 0, "Phải có cảnh báo về việc 03 chứa cả đề xuất loại");

      // Kiểm tra R11 là đề xuất LOẠI EC-A
      const r11 = preview.validRecords.find((r) => r.id === "R11");
      assert.ok(r11);
      assert.equal(r11.suggestedDecision, "Exclude");
      assert.match(r11.screeningReason, /EC-A/);

      // Kiểm tra R57 là đề xuất LOẠI EC-S
      const r57 = preview.validRecords.find((r) => r.id === "R57");
      assert.ok(r57);
      assert.equal(r57.suggestedDecision, "Exclude");
      assert.match(r57.screeningReason, /EC-S/);
    });
  });

  describe("2. V1 — Normalization & Multi-Source Deduplication", () => {
    test("Cùng DOI từ 2 nguồn khác nhau (ACM & OpenAlex) tạo 1 Canonical Record và giữ đầy đủ Provenance", () => {
      const rawRecords: PaperRecord[] = [
        {
          id: "rec_acm_1",
          source: "ACM Digital Library",
          discoverySource: "ACM Digital Library",
          collectionMethod: "import_csv",
          title: "Search-Based Fuzzing For RESTful APIs",
          authors: "Author A",
          year: "2026",
          venue: "AST 2026",
          doi: "10.1145/3793654.3793747",
          snippet: "Snippet from ACM",
          abstract: "Abstract from ACM",
          url: "https://doi.org/10.1145/3793654.3793747",
          query: "REST API testing",
          retrieval_date: "2026-10-04",
          search_id: "s1",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          queryVersion: "Q1",
        },
        {
          id: "rec_openalex_1",
          source: "OpenAlex",
          discoverySource: "OpenAlex",
          collectionMethod: "api",
          title: "Search-Based Fuzzing For RESTful APIs",
          authors: "Author A; Author B",
          year: "2026",
          venue: "Proceedings of AST",
          doi: "https://doi.org/10.1145/3793654.3793747",
          snippet: "Snippet from OA",
          abstract: "Abstract from OpenAlex with rich description",
          url: "https://openalex.org/W12345",
          query: "REST API fuzzing",
          retrieval_date: "2026-10-05",
          search_id: "s2",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          queryVersion: "Q2",
        },
      ];

      const dedupResult = PipelineV1Dedup.processV1(rawRecords);

      assert.equal(dedupResult.stats.canonicalCount, 1, "Chỉ có 1 canonical paper");
      assert.equal(dedupResult.stats.exactDoiDuplicates, 1, "1 bản ghi trùng DOI");

      const canonical = dedupResult.canonicalRecords[0];
      assert.equal(canonical.doi, "10.1145/3793654.3793747");
      assert.equal(canonical.allSources.length, 2, "Bảo toàn cả 2 nguồn phát hiện");
      assert.ok(canonical.allSources.includes("ACM Digital Library"));
      assert.ok(canonical.allSources.includes("OpenAlex"));
      assert.equal(canonical.provenanceList.length, 2, "Lưu giữ đủ 2 provenance");
    });

    test("Hỗ trợ hoàn tác (unmerge) nhóm trùng lặp mà không làm mất dữ liệu gốc", () => {
      const rawRecords: PaperRecord[] = [
        {
          id: "rec_1",
          source: "S1",
          discoverySource: "S1",
          collectionMethod: "api",
          title: "A Study",
          authors: "Author",
          year: "2025",
          venue: "V",
          doi: "10.1234/test",
          snippet: "",
          abstract: "",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
        },
        {
          id: "rec_2",
          source: "S2",
          discoverySource: "S2",
          collectionMethod: "api",
          title: "A Study",
          authors: "Author",
          year: "2025",
          venue: "V",
          doi: "10.1234/test",
          snippet: "",
          abstract: "",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
        },
      ];

      const dedup = PipelineV1Dedup.processV1(rawRecords);
      assert.equal(dedup.canonicalRecords.length, 1);

      const unmerged = PipelineV1Dedup.unmergeGroup(
        dedup.canonicalRecords[0].id,
        dedup.canonicalRecords,
        rawRecords,
      );
      assert.equal(unmerged.length, 2, "Sau khi unmerge phải phục hồi đủ 2 record độc lập");
    });
  });

  describe("3. V2 — Title/Abstract Screening & State Governance", () => {
    test("Tập kỷ yếu (Container) bị loại trực tiếp tại V2 với mã EC-N", () => {
      const records: CanonicalPaper[] = [
        {
          id: "R01",
          source: "ACM DL",
          discoverySource: "ACM DL",
          collectionMethod: "import_csv",
          title: "Proceedings of the 19th International Conference",
          authors: "",
          year: "2026",
          venue: "",
          doi: "10.1145/1111",
          snippet: "",
          abstract: "",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: true,
          uncertain_year: false,
          uncertain_venue: true,
          uncertain_doi: false,
          missing_abstract: true,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          isContainer: true,
          allSources: ["ACM DL"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const v2Res = PipelineV2Screening.processV2(records, PRESET_SWT302);
      assert.equal(v2Res.records[0].v2Decision, "Exclude");
      assert.match(v2Res.records[0].screeningReason, /EC-N/);
      assert.equal(v2Res.stats.excludedByReason["EC-N"], 1);
    });

    test("Bài đạt IC sơ bộ ở vòng Tiêu đề/Tóm tắt nhận trạng thái PassToFullText (chưa phải final Include)", () => {
      const records: CanonicalPaper[] = [
        {
          id: "R_pass",
          source: "IEEE",
          discoverySource: "IEEE",
          collectionMethod: "api",
          title: "Automated RESTful API Testing with Boundary Value Analysis",
          authors: "John Doe",
          year: "2024",
          venue: "IEEE Transactions on Software Engineering",
          doi: "10.1109/TSE.2024.123",
          snippet: "",
          abstract:
            "This paper proposes a novel framework for REST API testing. We apply equivalence partitioning and boundary value analysis to generate HTTP request payloads, evaluating line coverage and fault detection on real-world web APIs.",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          isContainer: false,
          allSources: ["IEEE"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const v2Res = PipelineV2Screening.processV2(records, PRESET_SWT302);
      assert.equal(v2Res.records[0].v2Decision, "PassToFullText");
      assert.equal(v2Res.stats.passedToFullText, 1);
    });

    test("Bảo lưu quyết định thủ công của người dùng (manual finalDecision) khi chạy lại V2", () => {
      const records: CanonicalPaper[] = [
        {
          id: "R_user",
          source: "ACM",
          discoverySource: "ACM",
          collectionMethod: "api",
          title: "A borderline paper",
          authors: "Author",
          year: "2024",
          venue: "Conference",
          doi: "10.1145/2222",
          snippet: "",
          abstract: "Abstract...",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "Exclude", // Người dùng đã tự tay Exclude
          userNotes: "Đã kiểm tra thủ công không phù hợp",
          allSources: ["ACM"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const v2Res = PipelineV2Screening.processV2(records, PRESET_SWT302, { preserveManualDecisions: true });
      assert.equal(v2Res.records[0].finalDecision, "Exclude", "Quyết định thủ công Exclude được bảo lưu");
    });
  });

  describe("4. V3 — Full-Text Retrieval, Page Count & Strict Evidence Guardrails", () => {
    test("Bài có 3 trang (< 4 trang) bị bắt buộc loại theo EC-S ở V3", async () => {
      const candidates: CanonicalPaper[] = [
        {
          id: "R57",
          source: "ACM DL",
          discoverySource: "ACM DL",
          collectionMethod: "import_csv",
          title: "Automated generation of test oracles for RESTful APIs",
          authors: "Author",
          year: "2022",
          venue: "FSE 2022",
          doi: "10.1145/3540250.3559080",
          snippet: "",
          abstract: "We propose test oracles for RESTful APIs...",
          url: "https://doi.org/10.1145/3540250.3559080",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V2",
          v2Decision: "PassToFullText",
          page_count: 3, // < 4 trang
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          allSources: ["ACM DL"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const v3Res = await PipelineV3Retrieval.processV3(candidates, PRESET_SWT302, { autoFetchPdf: false });
      assert.equal(v3Res.records[0].suggestedDecision, "Exclude");
      assert.match(v3Res.records[0].screeningReason, /EC-S/);
      assert.equal(v3Res.stats.excludedByReason["EC-S"], 1);
    });

    test("Không tải được PDF không tự động bị gán EC-A khi chưa xác nhận unretrievable", async () => {
      const candidates: CanonicalPaper[] = [
        {
          id: "R_unretrieved",
          source: "IEEE",
          discoverySource: "IEEE",
          collectionMethod: "api",
          title: "A Paywalled Research Paper",
          authors: "Author",
          year: "2024",
          venue: "IEEE",
          doi: "10.1109/nonexistent.12345",
          snippet: "",
          abstract: "Abstract...",
          url: "https://paywalled.com",
          pdfUrl: "https://invalid-url-domain-12345.com/paper.pdf",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V2",
          v2Decision: "PassToFullText",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
          allSources: ["IEEE"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const v3Res = await PipelineV3Retrieval.processV3(candidates, PRESET_SWT302, { autoFetchPdf: true });
      assert.equal(v3Res.records[0].fullTextStatus, "paywalled");
      // Không được tự gán Exclude EC-A! Phải giữ Unsure để người dùng kiểm tra hoặc tải PDF
      assert.notEqual(v3Res.records[0].suggestedDecision, "Exclude");
    });
  });

  describe("5. Background Job Engine & Resiliency", () => {
    test("Tạo Job, Start, Pause, Resume và phục hồi trạng thái theo researchId", async () => {
      const job = BackgroundJobManager.createJob({
        researchId: "test_research_001",
        stage: "V1",
        totalItems: 10,
      });

      assert.ok(job.id);
      assert.equal(job.status, "pending");

      const store = BackgroundJobManager.getResearchStore("test_research_001");
      store.rawRecords = [
        {
          id: "p1",
          source: "S1",
          discoverySource: "S1",
          collectionMethod: "api",
          title: "Paper 1",
          authors: "A",
          year: "2024",
          venue: "V",
          doi: "10.1/1",
          snippet: "",
          abstract: "",
          url: "",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V1",
          matchedCriteria: [],
          suggestedDecision: "Unsure",
          screeningReason: "",
          finalDecision: "",
          userNotes: "",
        },
      ];

      await BackgroundJobManager.startJob(job.id);
      // Đợi job chạy xong
      await new Promise((r) => setTimeout(r, 50));

      const updatedJob = BackgroundJobManager.getJob(job.id);
      assert.ok(updatedJob);
      assert.equal(updatedJob.status, "completed");
      assert.equal(store.canonicalRecords.length, 1);
    });
  });

  describe("6. Snowballing Service & Loop Prevention", () => {
    test("Snowballing chặn vòng lặp lặp lại seed đã duyệt và giới hạn hạn mức", async () => {
      const result = await SnowballService.runSnowballing({
        researchId: "test_research",
        seeds: [
          { id: "seed_1", doi: "10.1145/3491038", title: "EvoMaster Paper" },
          { id: "seed_1", doi: "10.1145/3491038", title: "EvoMaster Paper Duplicate" }, // Trùng seed
        ],
        directions: ["backward"],
        maxIterations: 1,
        maxPapersPerSeed: 5,
        useOpenAlex: false,
        useSemanticScholar: false,
      });

      assert.equal(result.visitedSeedIds.length, 1, "Chỉ duyệt seed duy nhất một lần");
    });
  });

  describe("7. PRISMA 2020 Mathematical Balance & Drill-Down Integrity", () => {
    test("Số liệu PRISMA cân bằng toán học tuyệt đối và lưu danh sách ID cho từng ô", () => {
      const rawRecords: PaperRecord[] = [
        { id: "r1", source: "ACM", discoverySource: "ACM", collectionMethod: "api", title: "T1", authors: "", year: "2024", venue: "", doi: "10.1/1", snippet: "", abstract: "A", url: "", query: "", retrieval_date: "", search_id: "", uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: false, screeningStage: "V1", matchedCriteria: [], suggestedDecision: "Unsure", screeningReason: "", finalDecision: "", userNotes: "" },
        { id: "r2", source: "ACM", discoverySource: "ACM", collectionMethod: "api", title: "T1", authors: "", year: "2024", venue: "", doi: "10.1/1", snippet: "", abstract: "A", url: "", query: "", retrieval_date: "", search_id: "", uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: false, screeningStage: "V1", matchedCriteria: [], suggestedDecision: "Unsure", screeningReason: "", finalDecision: "", userNotes: "" },
        { id: "r3", source: "Snowballing", discoverySource: "Snowballing", collectionMethod: "snowball_backward", title: "T2", authors: "", year: "2024", venue: "", doi: "10.1/2", snippet: "", abstract: "B", url: "", query: "", retrieval_date: "", search_id: "", uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: false, screeningStage: "V1", matchedCriteria: [], suggestedDecision: "Unsure", screeningReason: "", finalDecision: "", userNotes: "" },
      ];

      const canonicalRecords: CanonicalPaper[] = [
        { ...rawRecords[0], pipelineStage: "V2", v2Decision: "PassToFullText", allSources: ["ACM"], provenanceList: [], mergedRecordIds: ["r2"] },
        { ...rawRecords[2], pipelineStage: "V2", v2Decision: "Exclude", screeningReason: "EC-O(1)", allSources: ["Snowballing"], provenanceList: [], mergedRecordIds: [] },
      ];

      const prisma = PrismaService.calculatePrismaFlow({
        rawRecords,
        canonicalRecords,
        duplicatesRemovedCount: 1,
        duplicateRecordIds: ["r2"],
      });

      // Kiểm tra cân bằng
      assert.equal(prisma.totalRawIdentified.count, 3);
      assert.equal(prisma.totalDatabaseRecords.count, 2);
      assert.equal(prisma.totalOtherRecords.count, 1);
      assert.equal(prisma.totalDatabaseRecords.count + prisma.totalOtherRecords.count, prisma.totalRawIdentified.count);

      assert.equal(prisma.duplicatesRemoved.count, 1);
      assert.equal(prisma.recordsAfterDuplicates.count, 2);
      assert.equal(prisma.totalRawIdentified.count - prisma.duplicatesRemoved.count, prisma.recordsAfterDuplicates.count);

      assert.equal(prisma.screenedTitleAbstract.count, 2);
      assert.equal(prisma.passedToFullText.count, 1);
      assert.equal(prisma.excludedTitleAbstract.count, 1);
      assert.equal(prisma.passedToFullText.count + prisma.excludedTitleAbstract.count + prisma.unsureTitleAbstract.count, prisma.screenedTitleAbstract.count);

      // Kiểm tra drill-down IDs
      assert.deepEqual(prisma.duplicatesRemoved.paperIds, ["r2"]);
      assert.deepEqual(prisma.passedToFullText.paperIds, ["r1"]);
    });

    test("Tạo Markdown prisma-flow.md chứa các bảng và phần đối soát", () => {
      const rawRecords: PaperRecord[] = [
        { id: "r1", source: "ACM DL", discoverySource: "ACM DL", collectionMethod: "api", title: "T1", authors: "", year: "2024", venue: "", doi: "10.1/1", snippet: "", abstract: "", url: "", query: "", retrieval_date: "", search_id: "", uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: false, screeningStage: "V1", matchedCriteria: [], suggestedDecision: "Unsure", screeningReason: "", finalDecision: "", userNotes: "" },
      ];
      const canonicalRecords: CanonicalPaper[] = [
        { ...rawRecords[0], pipelineStage: "V3", suggestedDecision: "Include", finalDecision: "Include", allSources: ["ACM DL"], provenanceList: [], mergedRecordIds: [] },
      ];

      const prisma = PrismaService.calculatePrismaFlow({
        rawRecords,
        canonicalRecords,
        duplicatesRemovedCount: 0,
      });

      const md = PrismaService.generatePrismaMarkdown(prisma, "SWT302 Test");
      assert.ok(md.includes("## 1. Nhận diện (Identification)"));
      assert.ok(md.includes("## 5. Đối soát cân bằng toán học (Check balance)"));
    });
  });

  describe("8. Evidence Table Service", () => {
    test("Trích xuất đúng các cột và format bảng evidence-table.md", () => {
      const includedRecords: CanonicalPaper[] = [
        {
          id: "r_inc",
          source: "ACM DL",
          discoverySource: "ACM DL",
          collectionMethod: "import_csv",
          title: "On the Faults Found in REST APIs by Automated Test Generation",
          authors: "Author",
          year: "2022",
          venue: "TOSEM 2022",
          doi: "10.1145/3491038",
          snippet: "",
          abstract: "EvoMaster evaluated on 8 case studies, discovering 415 faults with 15.9-87.7% line coverage.",
          url: "https://doi.org/10.1145/3491038",
          query: "",
          retrieval_date: "",
          search_id: "",
          uncertain_authors: false,
          uncertain_year: false,
          uncertain_venue: false,
          uncertain_doi: false,
          missing_abstract: false,
          screeningStage: "V3",
          suggestedDecision: "Include",
          finalDecision: "Include",
          userNotes: "Replication package at github.com/EMResearch/EvoMaster",
          allSources: ["ACM DL"],
          provenanceList: [],
          mergedRecordIds: [],
        },
      ];

      const rows = EvidenceTableService.buildEvidenceRows(includedRecords);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].toolOrModel, "EvoMaster");
      assert.equal(rows[0].codeUrl, "github.com/EMResearch/EvoMaster");
      assert.ok(rows[0].result.includes("%"));

      const md = EvidenceTableService.generateMarkdown(rows, "SWT302 ACM");
      assert.ok(md.includes("| # | Paper (tên + năm + venue + DOI) | Tool/LLM | Dataset | Metric | Kết quả | Code | Hạn chế | Gần RQ |"));
      assert.ok(md.includes("EvoMaster"));
    });
  });

  describe("9. Unpaywall, Crossref & Semantic Scholar Fallback (No Key / Fault Tolerant)", () => {
    test("Semantic Scholar là nguồn tùy chọn, không bắt buộc API key và không crash pipeline khi không có key", async () => {
      const s2Adapter = SourceAdapterRegistry.getAdapter("Semantic Scholar");
      assert.ok(s2Adapter);
      const caps = s2Adapter.getCapabilities();
      assert.equal(caps.requiresApiKey, false, "Semantic Scholar KHÔNG bắt buộc có API key");

      // Gọi thử fetchReferences với ID không tồn tại: phải trả về mảng rỗng mà KHÔNG throw exception
      const refs = await s2Adapter.fetchReferences("10.99999/nonexistent.test.doi");
      assert.ok(Array.isArray(refs), "Phải trả về mảng an toàn");
      assert.equal(refs.length, 0);
    });

    test("OpenAlex là nguồn chính: có đầy đủ capabilities, polite pool, không cần key", () => {
      const openAlex = SourceAdapterRegistry.getAdapter("OpenAlex");
      assert.ok(openAlex);
      const caps = openAlex.getCapabilities();
      assert.equal(caps.canSearch, true);
      assert.equal(caps.paginationType, "cursor");
      assert.equal(caps.canDiscoverFullText, true);
      assert.equal(caps.requiresApiKey, false);
    });

    test("UnpaywallService xử lý an toàn khi DOI rỗng hoặc không có bản mở", async () => {
      const { UnpaywallService } = await import("../src/unpaywallService");
      const resNull = await UnpaywallService.resolveOpenAccess("");
      assert.equal(resNull, null);
    });
  });
});

