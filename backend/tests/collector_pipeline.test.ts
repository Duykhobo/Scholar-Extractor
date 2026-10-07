import assert from "node:assert";
import test, { describe } from "node:test";
import { DataQualityL0 } from "../src/pipeline/dataQualityL0";
import { DedupL1 } from "../src/pipeline/dedupL1";
import { MetadataFilterL2 } from "../src/pipeline/metadataFilterL2";
import { KeywordFilterL3 } from "../src/pipeline/keywordFilterL3";
import { generateCanonicalCsv, generateRis, generateBibtex } from "../src/exporter";
import { CanonicalRecord, NormalizedRecord } from "../src/types";

describe("Scholar-Extractor Collector & Preliminary Filtering Pipeline Test Suite (L0 - L3)", () => {
  // ==========================================
  // L0: Chuẩn hóa và kiểm tra chất lượng dữ liệu
  // ==========================================
  test("L0: Chuẩn hóa DOI (bỏ url, chữ thường, trim)", () => {
    assert.strictEqual(
      DataQualityL0.normalizeDoi("https://doi.org/10.1016/j.jss.2021.106200"),
      "10.1016/j.jss.2021.106200"
    );
    assert.strictEqual(
      DataQualityL0.normalizeDoi("http://dx.doi.org/10.1109/ICSE.2020.0001"),
      "10.1109/icse.2020.0001"
    );
    assert.strictEqual(DataQualityL0.normalizeDoi("  10.1145/123456  "), "10.1145/123456");
  });

  test("L0: Gắn cờ thiếu trường, không loại bài chỉ vì thiếu DOI/abstract/PDF", () => {
    const raw: NormalizedRecord = {
      id: "rec_1",
      title: "Testing REST APIs with Equivalence Partitioning",
      authors: "John Doe",
      year: "2022",
      abstract: "", // Thiếu abstract
      doi: "", // Thiếu DOI
      venue: "IEEE TSE",
      source: "OpenAlex",
      sourceRecordId: "W123",
      landingPageUrl: "https://example.com/p1",
      retrievedAt: new Date().toISOString(),
    };

    const processed = DataQualityL0.processRecord(raw);
    assert.strictEqual(processed.qualityFlags.missing_abstract, true);
    assert.strictEqual(processed.qualityFlags.missing_doi, true);
    assert.strictEqual(processed.qualityFlags.missing_fulltext, true);
    assert.strictEqual(processed.qualityFlags.missing_title, false);
    assert.strictEqual(processed.qualityFlags.needs_data_review, false); // Có title & url -> không needs_data_review
  });

  test("L0: Bản ghi không có tiêu đề và không có định danh được đưa vào needs_data_review", () => {
    const raw: NormalizedRecord = {
      id: "rec_bad",
      title: "Untitled",
      authors: "",
      year: "",
      abstract: "",
      doi: "",
      venue: "",
      source: "Import",
      sourceRecordId: "",
      landingPageUrl: "",
      retrievedAt: new Date().toISOString(),
    };

    const processed = DataQualityL0.processRecord(raw);
    assert.strictEqual(processed.qualityFlags.needs_data_review, true);
  });

  // ==========================================
  // L1: Xử lý trùng
  // ==========================================
  test("L1: DOI khác cách viết vẫn nhận diện trùng chắc chắn và tự gộp vào 1 canonical", () => {
    const rec1: NormalizedRecord = {
      id: "rec_a",
      title: "Automated test generation for RESTful APIs",
      authors: "A. Smith",
      year: "2021",
      abstract: "Abstract version from OpenAlex",
      doi: "https://doi.org/10.1007/s10664-021-09999-x",
      venue: "Empirical Software Engineering",
      source: "OpenAlex",
      sourceRecordId: "W111",
      landingPageUrl: "https://doi.org/10.1007/s10664-021-09999-x",
      retrievedAt: new Date().toISOString(),
    };

    const rec2: NormalizedRecord = {
      id: "rec_b",
      title: "Automated Test Generation for RESTful APIs",
      authors: "A. Smith; B. Jones",
      year: "2021",
      abstract: "Abstract version from Crossref with more details",
      doi: "10.1007/S10664-021-09999-X", // Khác chữ hoa và không có protocol
      venue: "Empirical Software Engineering",
      source: "Crossref",
      sourceRecordId: "10.1007/s10664-021-09999-x",
      landingPageUrl: "https://doi.org/10.1007/s10664-021-09999-x",
      openAccessPdfUrl: "https://example.com/paper.pdf",
      retrievedAt: new Date().toISOString(),
    };

    const { canonicalRecords, exactDuplicateCount } = DedupL1.processExactDeduplication([rec1, rec2]);
    assert.strictEqual(canonicalRecords.length, 1);
    assert.strictEqual(exactDuplicateCount, 1);

    const canonical = canonicalRecords[0];
    assert.strictEqual(canonical.doi, "10.1007/s10664-021-09999-x");
    assert.strictEqual(canonical.mergedRecordIds.length, 2);
    assert.strictEqual(canonical.sourcesList.length, 2);
    assert.ok(canonical.sourcesList.includes("OpenAlex"));
    assert.ok(canonical.sourcesList.includes("Crossref"));
    assert.strictEqual(canonical.openAccessPdfUrl, "https://example.com/paper.pdf");
  });

  test("L1: Trùng tiêu đề mờ KHÔNG tự gộp mà tạo nhóm 'Có thể trùng' để người dùng xác nhận", () => {
    const rec1: CanonicalRecord = {
      id: "can_1",
      title: "A Survey on Automated REST API Testing Techniques",
      authors: "Alice Wang",
      year: "2023",
      abstract: "Full survey",
      doi: "10.1145/3540250.3549100",
      venue: "ACM Computing Surveys",
      source: "ACM DL",
      sourceRecordId: "acm_1",
      landingPageUrl: "",
      retrievedAt: new Date().toISOString(),
      mergedRecordIds: ["can_1"],
      sourcesList: ["ACM DL"],
      qualityFlags: {
        missing_title: false,
        missing_abstract: false,
        missing_year: false,
        missing_doi: false,
        missing_fulltext: false,
        needs_data_review: false,
      },
    };

    const rec2: CanonicalRecord = {
      id: "can_2",
      title: "A Comprehensive Survey on Automated REST API Testing Techniques",
      authors: "Alice Wang; Bob Chen",
      year: "2023",
      abstract: "arXiv preprint version",
      doi: "",
      venue: "arXiv.org",
      source: "arXiv",
      sourceRecordId: "arxiv_2301.0001",
      landingPageUrl: "https://arxiv.org/abs/2301.0001",
      retrievedAt: new Date().toISOString(),
      mergedRecordIds: ["can_2"],
      sourcesList: ["arXiv"],
      qualityFlags: {
        missing_title: false,
        missing_abstract: false,
        missing_year: false,
        missing_doi: true,
        missing_fulltext: false,
        needs_data_review: false,
      },
    };

    const suspected = DedupL1.findSuspectedDuplicates([rec1, rec2], "test_col", 0.75);
    assert.strictEqual(suspected.length, 1);
    assert.strictEqual(suspected[0].resolution, "unresolved");
    assert.ok(suspected[0].recordIds.includes("can_1"));
    assert.ok(suspected[0].recordIds.includes("can_2"));
  });

  // ==========================================
  // L2: Lọc điều kiện khách quan (Metadata Filters)
  // ==========================================
  test("L2: Khoảng năm xử lý đúng cả hai đầu (start, end) và trả về PASS / FAIL / UNKNOWN", () => {
    const config = {
      yearRange: { enabled: true, start: 2020, end: 2024 },
    };

    const recPass = { id: "p", year: "2020" } as CanonicalRecord;
    const recFail = { id: "f", year: "2019" } as CanonicalRecord;
    const recUnknown = { id: "u", year: "" } as CanonicalRecord;

    assert.strictEqual(MetadataFilterL2.evaluateRecord(recPass, config).overallStatus, "PASS");
    assert.strictEqual(MetadataFilterL2.evaluateRecord(recFail, config).overallStatus, "FAIL");
    assert.strictEqual(MetadataFilterL2.evaluateRecord(recUnknown, config).overallStatus, "UNKNOWN");
  });

  test("L2: Thiếu ngôn ngữ hoặc loại tài liệu trả về UNKNOWN (Needs checking), không tự loại", () => {
    const config = {
      language: { enabled: true, allowedLanguages: ["en", "english"] },
    };

    const recNoLang = { id: "nl", language: "" } as CanonicalRecord;
    const res = MetadataFilterL2.evaluateRecord(recNoLang, config);
    assert.strictEqual(res.overallStatus, "UNKNOWN");
    assert.ok(res.reasons.some((r) => r.includes("UNKNOWN")));
  });

  // ==========================================
  // L3: Kiểm tra từ khóa (Regex Word Boundary)
  // ==========================================
  test("L3: Từ khóa khớp chính xác từ/cụm từ theo word boundary, tránh substring sai (AAC không khớp ISAAC)", () => {
    const config = {
      version: "v1.0",
      groups: [
        {
          id: "g1",
          name: "AAC",
          terms: ["AAC", "augmentative communication"],
        },
      ],
      exclusionTerms: ["animal"],
      scope: "title_abstract" as const,
    };

    // Bài 1: Có từ "ISAAC" (hội quốc tế) nhưng không có từ đứng riêng "AAC" -> NO_MATCH
    const rec1 = {
      id: "r1",
      title: "Conference Proceedings of ISAAC International Society",
      abstract: "This paper introduces ISAAC conference events.",
    } as CanonicalRecord;

    const res1 = KeywordFilterL3.evaluateRecord(rec1, config);
    assert.strictEqual(res1.status, "NO_MATCH");
    assert.strictEqual(res1.matchedTerms.length, 0);

    // Bài 2: Có từ đứng riêng "AAC" -> MATCH
    const rec2 = {
      id: "r2",
      title: "Using high-tech AAC devices for children",
      abstract: "We evaluate communication outcomes with AAC apps.",
    } as CanonicalRecord;

    const res2 = KeywordFilterL3.evaluateRecord(rec2, config);
    assert.strictEqual(res2.status, "MATCH");
    assert.ok(res2.matchedTerms.includes("AAC"));
  });

  test("L3: Bài báo có thể vừa MATCH vừa EXCLUSION_TERM_HIT và không tự biến thành Include/Exclude", () => {
    const config = {
      version: "v1.0",
      groups: [
        {
          id: "g_pop",
          name: "Children",
          terms: ["children", "pediatric"],
        },
      ],
      exclusionTerms: ["animal model", "mouse"],
      scope: "title_abstract" as const,
    };

    const rec = {
      id: "r_both",
      title: "Pediatric assessment of vision loss",
      abstract: "We compared human children responses to a mouse model in laboratory.",
    } as CanonicalRecord;

    const res = KeywordFilterL3.evaluateRecord(rec, config);
    assert.strictEqual(res.status, "MATCH");
    assert.strictEqual(res.hasExclusionHit, true);
    assert.ok(res.exclusionMatches.includes("mouse"));
  });

  test("L3: Thiếu abstract khi scope=title_abstract trả về INSUFFICIENT_DATA nếu title chưa đủ từ", () => {
    const config = {
      version: "v1.0",
      groups: [
        { id: "g1", name: "G1", terms: ["special education"] },
        { id: "g2", name: "G2", terms: ["empathy"] },
      ],
      exclusionTerms: [],
      scope: "title_abstract" as const,
    };

    const rec = {
      id: "r_miss_abs",
      title: "A Study in Special Education",
      abstract: "", // Thiếu abstract
    } as CanonicalRecord;

    const res = KeywordFilterL3.evaluateRecord(rec, config);
    assert.strictEqual(res.status, "INSUFFICIENT_DATA");
  });

  // ==========================================
  // Exporter: Định dạng RIS, BibTeX, CSV
  // ==========================================
  test("Export: RIS và BibTeX sinh đúng định dạng chuẩn", () => {
    const sampleRecord: CanonicalRecord = {
      id: "doi_10_1016_j_jss_2021",
      title: "Automated REST API Test Generation",
      authors: "Nguyen Van A; Tran B",
      year: "2022",
      publicationDate: "2022-05-15",
      abstract: "A novel approach using boundary value analysis.",
      doi: "10.1016/j.jss.2021",
      venue: "Journal of Systems and Software",
      publisher: "Elsevier",
      documentType: "journal-article",
      source: "OpenAlex",
      sourceRecordId: "W999",
      landingPageUrl: "https://doi.org/10.1016/j.jss.2021",
      openAccessPdfUrl: "https://example.com/test.pdf",
      retrievedAt: new Date().toISOString(),
      mergedRecordIds: ["doi_10_1016_j_jss_2021"],
      sourcesList: ["OpenAlex"],
      qualityFlags: {
        missing_title: false,
        missing_abstract: false,
        missing_year: false,
        missing_doi: false,
        missing_fulltext: false,
        needs_data_review: false,
      },
      latestFilterResult: {
        filterRunId: "f1",
        metadataStatus: "PASS",
        metadataReasons: ["Đạt năm 2022"],
        keywordStatus: "MATCH",
        hasExclusionHit: false,
        matchedTerms: ["REST API"],
      },
    };

    // 1. Kiểm tra RIS
    const risText = generateRis([sampleRecord]);
    assert.ok(risText.includes("TY  - JOUR"));
    assert.ok(risText.includes("TI  - Automated REST API Test Generation"));
    assert.ok(risText.includes("AU  - Nguyen Van A"));
    assert.ok(risText.includes("DO  - 10.1016/j.jss.2021"));
    assert.ok(risText.includes("ER  -"));

    // 2. Kiểm tra BibTeX
    const bibText = generateBibtex([sampleRecord]);
    assert.ok(bibText.includes("@article{"));
    assert.ok(bibText.includes("title = {Automated REST API Test Generation}"));
    assert.ok(bibText.includes("year = {2022}"));
    assert.ok(bibText.includes("doi = {10.1016/j.jss.2021}"));

    // 3. Kiểm tra Canonical CSV
    const csvText = generateCanonicalCsv([sampleRecord]);
    assert.ok(csvText.includes("canonical_id,title,authors"));
    assert.ok(csvText.includes("PASS"));
    assert.ok(csvText.includes("MATCH"));
  });
});
