import fs from "fs";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import path from "path";

import { config } from "../src/config";
import { cleanDoi, deduplicateRecords } from "../src/dedup";
import { exportScreeningCsv } from "../src/exporter";
import { sanitizeObject, sanitizeString } from "../src/sanitizer";
import { fetchScholarFromSerpApi, validateSearchParams } from "../src/scholarService";
import {
  evaluateScreeningV1,
  evaluateScreeningV2,
  hasEpOrBva,
  hasQuantitativeTableOrFigure,
  hasRestApiScope,
  isConferenceOrJournal,
  isEnglishVerified,
} from "../src/screening";
import { appendSearchLog } from "../src/searchLogger";
import { getSafeOutputPath } from "../src/server";
import { PaperRecord } from "../src/types";

describe("1. Parameter Validation & Security Gate", () => {
  test("validateSearchParams accepts valid parameters with defaults", () => {
    const { validParams, error } = validateSearchParams({
      q: "automated test case generation REST API",
    });
    assert.equal(error, undefined);
    assert.equal(validParams.engine, "google_scholar");
    assert.equal(validParams.q, "automated test case generation REST API");
    assert.equal(validParams.as_ylo, "2020");
    assert.equal(validParams.as_yhi, "2026");
    assert.equal(validParams.hl, "vi");
    assert.equal(validParams.start, "0");
    assert.equal(validParams.num, "10");
  });

  test("validateSearchParams rejects empty or whitespace-only query", () => {
    const res1 = validateSearchParams({ q: "" });
    assert.ok(res1.error);
    const res2 = validateSearchParams({ q: "   " });
    assert.ok(res2.error);
  });

  test("validateSearchParams rejects non-numeric year bounds", () => {
    const res = validateSearchParams({ q: "test", as_ylo: "abc" });
    assert.ok(res.error);
  });
});

describe("2. Sanitization & Key Leak Prevention", () => {
  test("sanitizeString strips api_key from query params and raw keys", () => {
    const testKey = "test_secret_serpapi_key_1234567890abcdef";
    const testUrl = `https://serpapi.com/search.json?engine=google_scholar&api_key=${testKey}&q=test`;
    const sanitized = sanitizeString(testUrl);

    assert.ok(!sanitized.includes(testKey));
    assert.ok(sanitized.includes("api_key=[REDACTED]"));
  });

  test("sanitizeObject deeply scrubs sensitive keys in nested structures", () => {
    const testKey = "test_secret_serpapi_key_1234567890abcdef";
    const rawData = {
      search_metadata: {
        id: "123",
        json_endpoint: `https://serpapi.com/searches/123.json?api_key=${testKey}`,
      },
      search_parameters: {
        api_key: testKey,
        engine: "google_scholar",
      },
      results: [
        {
          title: "Test Paper",
          serpapi_link: `https://serpapi.com/search.json?api_key=${testKey}&q=more`,
        },
      ],
    };

    const cleaned = sanitizeObject(rawData);
    assert.equal((cleaned as any).search_parameters.api_key, "[REDACTED]");
    assert.ok(!(cleaned as any).search_metadata.json_endpoint.includes(testKey));
  });
});

describe("3. Deduplication Logic: P1 Bug Fix", () => {
  test("cleanDoi handles various DOI formats", () => {
    assert.equal(cleanDoi("https://doi.org/10.1109/TSE.2023.1234567"), "10.1109/tse.2023.1234567");
    assert.equal(cleanDoi("doi: 10.1145/3360664.3362698"), "10.1145/3360664.3362698");
  });

  test("deduplicateRecords removes exact DOI duplicates but RETAINS same-title papers with different/missing DOIs as potentialDuplicate", () => {
    const sampleRecords: PaperRecord[] = [
      {
        id: "1",
        source: "Google Scholar",
        discoverySource: "Google Scholar",
        collectionMethod: "SerpApi",
        title: "Automated Test-Case Generation for REST APIs Using Model Inference",
        authors: "Author A",
        year: "2024",
        venue: "ICSE",
        doi: "10.1145/12345",
        snippet: "",
        abstract: "",
        url: "http://a",
        query: "q",
        retrieval_date: "2026-10-03",
        search_id: "s1",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: false,
        missing_abstract: true,
        screeningStage: "V1",
        matchedCriteria: ["IC-T"],
        suggestedDecision: "Unsure",
        screeningReason: "",
        finalDecision: "",
        userNotes: "",
      },
      {
        // Trùng DOI hoàn toàn với #1 -> Phải bị loại bỏ
        id: "2",
        source: "Google Scholar",
        discoverySource: "Google Scholar",
        collectionMethod: "SerpApi",
        title: "Different Title with Same DOI",
        authors: "Author B",
        year: "2024",
        venue: "ICSE",
        doi: "10.1145/12345",
        snippet: "",
        abstract: "",
        url: "http://b",
        query: "q",
        retrieval_date: "2026-10-03",
        search_id: "s1",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: false,
        missing_abstract: true,
        screeningStage: "V1",
        matchedCriteria: ["IC-T"],
        suggestedDecision: "Unsure",
        screeningReason: "",
        finalDecision: "",
        userNotes: "",
      },
      {
        // Trùng Tiêu đề với #1 nhưng KHÁC DOI (Preprint arXiv vs Journal) -> KHÔNG ĐƯỢC XÓA! Giữ lại và đánh dấu potentialDuplicate
        id: "3",
        source: "arXiv",
        discoverySource: "arXiv",
        collectionMethod: "SerpApi",
        title: "Automated Test-Case Generation for REST APIs Using Model Inference",
        authors: "Author A et al.",
        year: "2024",
        venue: "arXiv",
        doi: "10.48550/arxiv.2412.03420",
        snippet: "",
        abstract: "",
        url: "http://c",
        query: "q",
        retrieval_date: "2026-10-03",
        search_id: "s1",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: false,
        missing_abstract: true,
        screeningStage: "V1",
        matchedCriteria: ["IC-T"],
        suggestedDecision: "Unsure",
        screeningReason: "",
        finalDecision: "",
        userNotes: "",
      },
      {
        id: "4",
        source: "Google Scholar",
        discoverySource: "Google Scholar",
        collectionMethod: "SerpApi",
        title: "Completely Unique Paper on GraphQL Testing",
        authors: "Author D",
        year: "2025",
        venue: "ASE",
        doi: "10.1145/99999",
        snippet: "",
        abstract: "",
        url: "http://d",
        query: "q",
        retrieval_date: "2026-10-03",
        search_id: "s1",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: false,
        missing_abstract: true,
        screeningStage: "V1",
        matchedCriteria: ["IC-T"],
        suggestedDecision: "Unsure",
        screeningReason: "",
        finalDecision: "",
        userNotes: "",
      },
    ];

    const { uniqueRecords, dedupStats } = deduplicateRecords(sampleRecords);
    assert.equal(dedupStats.initialCount, 4);
    assert.equal(dedupStats.exactDupByDoi, 1); // Record 2 trùng DOI -> bị loại
    assert.equal(dedupStats.potentialDupByTitle, 1); // Record 3 trùng title nhưng khác DOI -> được giữ lại và đánh dấu đề xuất trùng
    assert.equal(dedupStats.totalRetained, 3); // Gồm Record 1, Record 3 và Record 4

    // Kiểm tra Record 3 được giữ lại với cờ potentialDuplicate
    const rec3 = uniqueRecords.find((r) => r.id === "3");
    assert.ok(rec3, "Record 3 phải được giữ lại trong danh sách");
    assert.equal(rec3.potentialDuplicate, true);
    assert.equal(rec3.duplicateOfId, "1");
    assert.ok(rec3.duplicateReason?.includes("Trùng tiêu đề"));
    assert.equal(rec3.source, "arXiv", "Phải giữ nguyên nguồn của bản ghi đề xuất trùng");
  });
});

describe("4. Strict Protocol Screening Rules (ie_criteria.md) & 5 Review Scenarios", () => {
  test("Tình huống 1: LLM/test gen cho REST API nhưng thiếu EP/BVA -> Gợi ý Unsure, không loại vì AI", () => {
    const fullAbstract =
      "In this paper, we present an automated test case generation approach for REST APIs using Large Language Models (LLMs). By extracting OpenAPI specifications, our system leverages generative AI to synthesize semantic HTTP request payloads. Experimental evaluation on 10 real-world microservices demonstrates superior API path coverage and fault detection.";
    const res = evaluateScreeningV1(
      "LLM-Based Automated Test Case Generation for REST APIs",
      "Snippet",
      fullAbstract,
      "2024",
      "IEEE International Conference on Software Testing (ICST)",
    );

    // Không loại chỉ vì AI (không có EC-O)
    assert.ok(!res.matchedCriteria.includes("EC-O"), "Không được loại trừ chỉ vì có AI/LLM");
    // Thiếu EP/BVA bắt buộc phải là Unsure
    assert.equal(res.suggestedDecision, "Unsure", "Thiếu EP/BVA bắt buộc phải gợi ý Unsure");
    assert.ok(res.unknownCriteria.includes("IC-I"), "IC-I phải nằm trong unknownCriteria");
    assert.ok(
      res.missingEvidence.some((e) => e.includes("EP") || e.includes("IC-I")),
      "Phải ghi nhận thiếu bằng chứng EP/BVA",
    );
    assert.ok(res.matchedCriteria.includes("IC-P"), "Đạt IC-P vì có phạm vi REST API mức HTTP request");
  });

  test("Tình huống 1 (bổ sung): REST API kết hợp LLM VÀ EP/BVA -> Đạt IC-I và gợi ý Include", () => {
    const fullAbstract =
      "In this paper, we present an automated test generation framework for REST APIs that combines Large Language Models (LLMs) with Equivalence Partitioning (EP) and Boundary-Value Analysis (BVA) for HTTP request parameters. Empirical evaluation demonstrates high mutant detection score.";
    const res = evaluateScreeningV1(
      "Combining LLMs with Equivalence Partitioning and Boundary-Value Analysis for REST API Testing",
      "Snippet",
      fullAbstract,
      "2024",
      "ACM International Conference on Automated Software Engineering (ASE)",
    );

    assert.equal(res.suggestedDecision, "Include", "REST API có EP/BVA đầy đủ phải được gợi ý Include");
    assert.ok(res.matchedCriteria.includes("IC-I"), "Phải đạt IC-I");
    assert.ok(res.matchedCriteria.includes("IC-P"), "Phải đạt IC-P");
    assert.ok(res.matchedCriteria.includes("IC-T"), "Phải đạt IC-T (venue ACM ASE)");
    assert.ok(res.matchedCriteria.includes("IC-L"), "Phải đạt IC-L (tiếng Anh)");
  });

  test("Tình huống 2: Thiếu abstract toàn văn -> Unsure + missingEvidence, KHÔNG gắn EC-A", () => {
    const res = evaluateScreeningV1(
      "Automated Test Case Generation for REST APIs Using Boundary Testing",
      "Short snippet mentioning REST API and boundary testing...",
      "", // Không có full abstract
      "2024",
      "IEEE TSE",
    );

    assert.equal(res.suggestedDecision, "Unsure", "Thiếu abstract toàn văn bắt buộc phải gợi ý Unsure");
    assert.ok(res.missingEvidence.includes("abstract"), "Phải ghi nhận thiếu abstract trong missingEvidence");
    assert.ok(
      !res.matchedCriteria.includes("EC-A"),
      "Tuyệt đối KHÔNG gắn EC-A khi chưa xác nhận không tải được full-text",
    );
  });

  test("Tình huống 3: Survey/Literature Review trong title -> KHÔNG loại theo EC-S nếu chưa xác minh số trang < 4", () => {
    const fullAbstract =
      "We present a systematic literature review on REST API testing techniques, analyzing 50 empirical papers and summarizing testing tools.";
    const res = evaluateScreeningV1(
      "A Systematic Literature Review on REST API Testing",
      "Snippet",
      fullAbstract,
      "2023",
      "Journal of Systems and Software",
    );

    // Không được loại theo EC-S chỉ dựa vào nhãn/title
    assert.ok(!res.matchedCriteria.includes("EC-S"), "Không được loại theo EC-S khi chưa xác minh số trang < 4");
  });

  test("Tình huống 3 (bổ sung): Xác minh số trang < 4 -> Bắt buộc Exclude theo EC-S", () => {
    const fullAbstract = "Short paper presenting preliminary thoughts on REST API testing.";
    const res = evaluateScreeningV1(
      "Preliminary Study on REST API Testing",
      "Snippet",
      fullAbstract,
      "2023",
      "IEEE Workshop",
      { pageCount: 2 }, // Đã xác minh 2 trang (< 4 trang)
    );

    assert.equal(res.suggestedDecision, "Exclude", "Xác minh < 4 trang phải loại theo EC-S");
    assert.ok(res.matchedCriteria.includes("EC-S"));
  });

  test("Tình huống 4: Unit testing nội bộ (JUnit/class/method level không qua REST API) -> Exclude theo EC-O", () => {
    const fullAbstract =
      "In this paper, we propose an automated unit test generation framework using evolutionary algorithms for Java methods and classes. Our approach generates JUnit test suites that achieve high branch coverage on standard Java benchmarks without any external web services.";
    const res = evaluateScreeningV1(
      "Automated Unit Test Generation for Java Classes with JUnit",
      "Snippet mentions unit tests and JUnit",
      fullAbstract,
      "2024",
    );

    assert.equal(
      res.suggestedDecision,
      "Exclude",
      "Unit testing nội bộ không thuộc phạm vi REST API phải bị loại theo EC-O",
    );
    assert.ok(res.matchedCriteria.includes("EC-O"));
  });

  test('Tình huống 5: V2 toàn văn rỗng hoặc chỉ có từ rời rạc "Table", "evaluation", "coverage" -> KHÔNG ĐƯỢC Include', () => {
    // 5a: Toàn văn rỗng
    const resEmpty = evaluateScreeningV2(
      "REST API Testing with Boundary Value Analysis",
      "Abstract",
      "", // Full-text rỗng
      "2024",
      "IEEE ICSE",
    );
    assert.equal(resEmpty.suggestedDecision, "Unsure", "Full-text rỗng không được Include");

    // 5b: Toàn văn chỉ có từ "Table", "evaluation", "coverage" nhưng không có số liệu định lượng
    const textWithoutQuantitative = `
      In this paper we present REST API testing using boundary-value analysis (BVA).
      Section 3 discusses our evaluation and methodology.
      Table indicates our experimental setup. We discuss coverage metrics conceptually.
      We summarize our findings without displaying any numeric values or percentage metrics.
    `;
    const resNoNumbers = evaluateScreeningV2(
      "REST API Testing with Boundary Value Analysis",
      "Abstract",
      textWithoutQuantitative,
      "2024",
      "IEEE Transactions on Software Engineering",
    );

    assert.equal(
      resNoNumbers.suggestedDecision,
      "Unsure",
      "Từ Table/evaluation/coverage đứng riêng không đủ cho IC-E, không được Include",
    );
    assert.ok(resNoNumbers.unknownCriteria.includes("IC-E"), "IC-E phải ở trạng thái unknown");

    // 5c: Toàn văn có số liệu định lượng cụ thể trong Table/Figure -> Gợi ý Include
    const textWithQuantitative = `
      In this paper we present REST API testing using boundary-value analysis (BVA) and equivalence partitioning (EP) on HTTP request parameters.
      In Table 1: Experimental results show 94.5% branch coverage and 48 mutants detected across 15 REST services.
      Figure 2 illustrates the distribution of 120 bugs found by our tool compared to random testing.
    `;
    const resValid = evaluateScreeningV2(
      "REST API Testing with Boundary-Value Analysis and Equivalence Partitioning",
      "Abstract",
      textWithQuantitative,
      "2024",
      "IEEE Transactions on Software Engineering",
      { pageCount: 8 },
    );

    assert.equal(
      resValid.suggestedDecision,
      "Include",
      "Đủ 6 tiêu chí IC với số liệu định lượng trong Table/Figure phải được Include ở V2",
    );
    assert.ok(resValid.matchedCriteria.includes("IC-E"), "Phải đạt IC-E khi có số liệu Table/Figure");
    assert.ok(resValid.matchedCriteria.includes("IC-I"), "Phải đạt IC-I");
    assert.ok(resValid.matchedCriteria.includes("IC-P"), "Phải đạt IC-P");
    assert.equal(resValid.unknownCriteria.length, 0, "Không còn tiêu chí nào unknown");
  });

  test("Screening V1: Loại bỏ nghiên cứu y sinh/phi phần mềm theo EC-O", () => {
    const res = evaluateScreeningV1("Clinical Trial and Blood Testing for Patients", "snippet", "", "2023");
    assert.equal(res.suggestedDecision, "Exclude");
    assert.ok(res.matchedCriteria.includes("EC-O"));
  });
});

describe("5. Search Log Protocol: P0 Fix - Candidate Papers Outside PRISMA", () => {
  test("P0: appendSearchLog ghi rõ Google Scholar là nguồn paper ứng viên bổ trợ và KHÔNG tính trực tiếp vào PRISMA", () => {
    const testLogFile = path.resolve(__dirname, "test_search_log_p0.md");
    fs.writeFileSync(testLogFile, "## Prior Manual Search Log\nExisting content...\n", "utf-8");

    const payload = {
      query: "automated test case generation REST API",
      searchId: "test_search_scholar_01",
      method: "SerpApi",
      params: { engine: "google_scholar", as_ylo: 2020, as_yhi: 2026, hl: "vi" },
      apiTotalResults: 18000,
      uiTotalResults: 18200,
      collectedCount: 10,
      candidateCount: 10,
      dedupStats: { initialCount: 10, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 10 },
      spotChecks: [{ title: "Sample REST API Paper A", year: "2024", venue: "IEEE TSE", doi: "", url: "http://a" }],
      retrievalDate: "2026-10-03",
    };

    const res = appendSearchLog(payload, testLogFile);
    assert.equal(res.success, true);

    const content = fs.readFileSync(testLogFile, "utf-8");
    // KHÔNG ĐƯỢC CHỨA: "Số paper duy nhất đưa vào PRISMA"
    assert.ok(
      !content.includes("Số paper duy nhất đưa vào PRISMA"),
      "Không được ghi nhận paper Google Scholar vào Identification của PRISMA chính",
    );
    // PHẢI CHỨA: "Số paper ứng viên bổ trợ" và ghi chú protocol
    assert.ok(content.includes("Số paper ứng viên bổ trợ (Candidate Papers)"));
    assert.ok(content.includes("KHÔNG được tính trực tiếp vào nhánh Identification của sơ đồ PRISMA chính thống"));

    fs.unlinkSync(testLogFile);
  });
});

describe("6. Security & Path Traversal Protection: P1 Fixes", () => {
  test("getSafeOutputPath prevents path traversal attacks", () => {
    const attack1 = getSafeOutputPath("../../../etc/passwd");
    assert.ok(attack1.error, "Phải chặn ký tự .. và /");

    const attack2 = getSafeOutputPath("..\\..\\Windows\\System32\\cmd.exe");
    assert.ok(attack2.error, "Phải chặn ký tự .. và \\");

    const attack3 = getSafeOutputPath("safe_export.csv");
    assert.equal(attack3.error, undefined);
    assert.ok(attack3.safePath?.endsWith("safe_export.csv"));
  });

  test("Export files: exportToCsv and exportScreeningCsv format correctly with UTF-8 BOM", () => {
    const testCsvFile = path.resolve(__dirname, "test_screening_records.csv");
    const records: PaperRecord[] = [
      {
        id: "s1_0_1",
        source: "Google Scholar",
        discoverySource: "Google Scholar",
        collectionMethod: "SerpApi",
        title: "Testing REST APIs with LLMs",
        authors: "Author X",
        year: "2024",
        venue: "ICSE",
        doi: "",
        snippet: "A snippet",
        abstract: "",
        url: "http://test",
        query: "q",
        retrieval_date: "2026-10-03",
        search_id: "s1",
        uncertain_authors: false,
        uncertain_year: false,
        uncertain_venue: false,
        uncertain_doi: true,
        missing_abstract: true,
        screeningStage: "V1",
        matchedCriteria: ["IC-T", "IC-I", "IC-Y"],
        suggestedDecision: "Unsure",
        screeningReason: "Thiếu abstract toàn văn",
        finalDecision: "Include",
        userNotes: "Đã tải PDF đọc đối soát",
      },
    ];

    const res = exportScreeningCsv(records, testCsvFile);
    assert.equal(res.success, true);

    const buffer = fs.readFileSync(testCsvFile);
    // Kiểm tra UTF-8 BOM
    assert.equal(buffer[0], 0xef);
    assert.equal(buffer[1], 0xbb);
    assert.equal(buffer[2], 0xbf);

    const text = buffer.toString("utf-8");
    assert.ok(text.includes("final_decision"));
    assert.ok(text.includes("user_notes"));
    assert.ok(text.includes("Đã tải PDF đọc đối soát"));

    fs.unlinkSync(testCsvFile);
  });

  test("Security Key Leak Verification: Scans all client files without hardcoded keys", () => {
    const activeKey = process.env.SERPAPI_KEY || config.serpApiKey;
    const hex64Regex = /\b[a-f0-9]{64}\b/i;

    const filesToAudit = [
      path.resolve(__dirname, "../../chrome_extension/popup.js"),
      path.resolve(__dirname, "../../chrome_extension/content-script.js"),
      path.resolve(__dirname, "../../chrome_extension/popup.html"),
      path.resolve(__dirname, "../../chrome_extension/manifest.json"),
    ];

    for (const f of filesToAudit) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, "utf-8");
        if (activeKey && activeKey.length > 5) {
          assert.ok(
            !content.includes(activeKey),
            `BẢO MẬT VI PHẠM: Tìm thấy SERPAPI_KEY của môi trường trong client file: ${f}`,
          );
        }
        assert.ok(
          !hex64Regex.test(content),
          `BẢO MẬT VI PHẠM: Tìm thấy chuỗi 64 ký tự hex (mẫu SerpApi key) trong client file: ${f}`,
        );
      }
    }
  });
});

describe("7. Mocked SerpApi Execution & Offset Integrity", () => {
  test("Pagination: handles start offset and maps records correctly", async () => {
    const mockData = {
      search_metadata: { id: "search_mock_1", status: "Success", from_cache: true },
      search_information: { total_results: 15400 },
      organic_results: [
        {
          position: 1,
          title: "Automated REST API Testing with Fuzzing",
          link: "http://scholar.example.com/p1",
          snippet: "Fuzzing REST endpoints...",
          publication_info: { summary: "A Author - IEEE Transactions, 2024 - ieeexplore.ieee.org" },
        },
      ],
    };

    const mockFetch = async () => mockData;
    const result = await fetchScholarFromSerpApi({ q: "REST API testing", start: 10 }, mockFetch);

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].title, "Automated REST API Testing with Fuzzing");
    assert.equal(result.records[0].year, "2024");
    assert.equal(result.records[0].abstract, "");
    assert.equal(result.summary.fromCache, true);
  });
});

describe("8. Regression Tests: 4 Ca Biên Đã Sửa (screening.ts)", () => {
  // Ca biên 1: GraphQL riêng lẻ không được đánh dấu đạt IC-P
  describe("Ca biên 1: GraphQL riêng lẻ không được đánh dấu đạt IC-P", () => {
    test("hasRestApiScope helper: từ chối GraphQL riêng lẻ nhưng chấp nhận REST API hoặc REST kết hợp GraphQL", () => {
      assert.equal(hasRestApiScope("Automated test generation for GraphQL APIs"), false);
      assert.equal(hasRestApiScope("GraphQL schema validation and query testing"), false);
      assert.equal(hasRestApiScope("Testing GraphQL endpoints with boundary value analysis"), false);

      assert.equal(hasRestApiScope("Automated test generation for REST APIs"), true);
      assert.equal(hasRestApiScope("Testing RESTful web services with OpenAPI"), true);
      assert.equal(hasRestApiScope("A comparative study on testing REST and GraphQL APIs"), true);
    });

    test("evaluateScreeningV1: Nghiên cứu GraphQL riêng lẻ không đạt IC-P (đưa vào unknownCriteria, gợi ý Unsure)", () => {
      const fullAbstract =
        "In this paper, we propose a test generation tool for GraphQL APIs using Equivalence Partitioning (EP) and Boundary-Value Analysis (BVA). We evaluate query execution on 5 open GraphQL schemas.";
      const res = evaluateScreeningV1(
        "Automated Test Generation for GraphQL APIs with EP and BVA",
        "Snippet about GraphQL testing",
        fullAbstract,
        "2024",
        "IEEE Transactions on Software Engineering",
      );

      assert.equal(res.suggestedDecision, "Unsure", "GraphQL riêng lẻ phải gợi ý Unsure");
      assert.ok(!res.matchedCriteria.includes("IC-P"), "GraphQL riêng lẻ KHÔNG ĐƯỢC đánh dấu đạt IC-P");
      assert.ok(res.unknownCriteria.includes("IC-P"), "IC-P phải ở trạng thái unknown");
      assert.ok(
        res.missingEvidence.some((e) => e.includes("GraphQL riêng lẻ")),
        "Phải có ghi chú GraphQL riêng lẻ trong missingEvidence",
      );
    });

    test("evaluateScreeningV2: Toàn văn chỉ có GraphQL không đạt IC-P -> Gợi ý Unsure", () => {
      const fullText = `
        We propose boundary value analysis for GraphQL APIs.
        Table 1 reports 80% coverage and 25 faults found across 5 schemas.
        Our tool tests GraphQL queries specifically.
      `;
      const res = evaluateScreeningV2(
        "Testing GraphQL APIs with Boundary-Value Analysis",
        "Abstract",
        fullText,
        "2024",
        "IEEE Transactions on Software Engineering",
        { pageCount: 8 },
      );

      assert.equal(res.suggestedDecision, "Unsure", "GraphQL riêng lẻ ở V2 phải giữ Unsure");
      assert.ok(!res.matchedCriteria.includes("IC-P"), "GraphQL riêng lẻ KHÔNG đạt IC-P");
      assert.ok(res.unknownCriteria.includes("IC-P"), "IC-P chưa được xác minh");
    });
  });

  // Ca biên 2: V2 thiếu pageCount hợp lệ phải Unsure; 3 trang Exclude, 4 trang qua kiểm tra EC-S
  describe("Ca biên 2: V2 pageCount validation (thiếu pageCount -> Unsure; 3 trang -> Exclude; 4 trang -> qua EC-S)", () => {
    const validFullText = `
      In this paper we present REST API testing using boundary-value analysis (BVA) and equivalence partitioning (EP) on HTTP request parameters.
      In Table 1: Experimental results show 94.5% branch coverage and 48 mutants detected across 15 REST services.
    `;

    test("V2 thiếu pageCount (undefined / <= 0 / NaN) -> Bắt buộc gợi ý Unsure", () => {
      // 1. options undefined
      const res1 = evaluateScreeningV2(
        "REST API Testing with BVA and EP",
        "Abstract",
        validFullText,
        "2024",
        "IEEE Transactions on Software Engineering",
      );
      assert.equal(res1.suggestedDecision, "Unsure", "Thiếu options/pageCount phải là Unsure");
      assert.ok(res1.unknownCriteria.includes("EC-S"), "EC-S phải ở trạng thái unknown khi thiếu pageCount");

      // 2. options rỗng
      const res2 = evaluateScreeningV2(
        "REST API Testing with BVA and EP",
        "Abstract",
        validFullText,
        "2024",
        "IEEE Transactions on Software Engineering",
        {},
      );
      assert.equal(res2.suggestedDecision, "Unsure", "options rỗng phải là Unsure");

      // 3. pageCount = 0 hoặc âm
      const res3 = evaluateScreeningV2(
        "REST API Testing with BVA and EP",
        "Abstract",
        validFullText,
        "2024",
        "IEEE Transactions on Software Engineering",
        { pageCount: 0 },
      );
      assert.equal(res3.suggestedDecision, "Unsure", "pageCount = 0 phải là Unsure");
    });

    test("V2 có 3 trang (< 4 trang) -> Bắt buộc Exclude theo EC-S", () => {
      const res = evaluateScreeningV2(
        "REST API Testing with BVA and EP (Short Paper)",
        "Abstract",
        validFullText,
        "2024",
        "IEEE Transactions on Software Engineering",
        { pageCount: 3 },
      );
      assert.equal(res.suggestedDecision, "Exclude", "Bài báo 3 trang phải bị loại theo EC-S");
      assert.ok(res.matchedCriteria.includes("EC-S"), "matchedCriteria phải có EC-S");
      assert.ok(res.screeningReason.includes("EC-S"));
    });

    test("V2 có 4 trang (>= 4 trang) -> Vượt qua kiểm tra EC-S và đạt Include nếu đủ 6 tiêu chí IC", () => {
      const res = evaluateScreeningV2(
        "REST API Testing with BVA and EP",
        "Abstract",
        validFullText,
        "2024",
        "IEEE Transactions on Software Engineering",
        { pageCount: 4 },
      );
      assert.equal(res.suggestedDecision, "Include", "Bài báo 4 trang đủ điều kiện độ dài, đạt Include");
      assert.ok(!res.matchedCriteria.includes("EC-S"), "Không được gắn EC-S");
      assert.equal(res.unknownCriteria.length, 0, "Không còn tiêu chí unknown");
    });
  });

  // Ca biên 3: hasQuantitativeTableOrFigure nhận "Table 1 reports 80% coverage." nhưng không coi riêng số thứ tự là kết quả
  describe("Ca biên 3: hasQuantitativeTableOrFigure nhận 'Table 1 reports 80% coverage.' và không nhầm số thứ tự", () => {
    test("Nhận đúng câu chỉ định: 'Table 1 reports 80% coverage.'", () => {
      assert.equal(hasQuantitativeTableOrFigure("Table 1 reports 80% coverage."), true);
      assert.equal(hasQuantitativeTableOrFigure("Table 1 reports 80% coverage on test suites."), true);
    });

    test("KHÔNG coi riêng số thứ tự Table 1 hoặc tên bảng/hình là kết quả định lượng", () => {
      assert.equal(hasQuantitativeTableOrFigure("Table 1"), false);
      assert.equal(hasQuantitativeTableOrFigure("Table 1 reports coverage."), false);
      assert.equal(hasQuantitativeTableOrFigure("In Table 1, we show the system architecture."), false);
      assert.equal(hasQuantitativeTableOrFigure("Table 1: Experimental setup and evaluation."), false);
      assert.equal(hasQuantitativeTableOrFigure("Figure 2 illustrates our model overview."), false);
      assert.equal(hasQuantitativeTableOrFigure("See Table 1 and Figure 2 for details."), false);
    });

    test("Nhận các biến thể số liệu định lượng hợp lệ khác kèm Table / Figure", () => {
      assert.equal(hasQuantitativeTableOrFigure("Figure 1 shows 94.5% branch coverage."), true);
      assert.equal(hasQuantitativeTableOrFigure("Table 2: 48 mutants killed across endpoints."), true);
      assert.equal(hasQuantitativeTableOrFigure("Figure 3 illustrates 120 bugs detected."), true);
      assert.equal(hasQuantitativeTableOrFigure("80% coverage is reported in Table 1."), true);
      assert.equal(hasQuantitativeTableOrFigure("48 mutants detected as shown in Table 1."), true);
    });
  });

  // Ca biên 4: IC-T không được xác minh chỉ từ tên Springer/IEEE/ACM; Dùng metadata loại xuất bản; thesis/dissertation không đạt IC-T
  describe("Ca biên 4: IC-T không xác minh chỉ từ tên Springer/IEEE/ACM; Dùng metadata & loại thesis/dissertation", () => {
    test("Tên nhà xuất bản đứng riêng (Springer, IEEE, ACM) KHÔNG đủ để xác minh IC-T", () => {
      assert.equal(isConferenceOrJournal("Springer"), false);
      assert.equal(isConferenceOrJournal("Springer, Cham"), false);
      assert.equal(isConferenceOrJournal("Springer Berlin Heidelberg"), false);
      assert.equal(isConferenceOrJournal("IEEE"), false);
      assert.equal(isConferenceOrJournal("IEEE Xplore"), false);
      assert.equal(isConferenceOrJournal("ACM"), false);
      assert.equal(isConferenceOrJournal("ACM Press"), false);

      // Khi venue chỉ là Springer mà không có metadata -> V1 giữ Unsure về IC-T
      const res = evaluateScreeningV1(
        "REST API Testing with Boundary Value Analysis and Equivalence Partitioning",
        "Snippet",
        "We propose test case generation for REST APIs with BVA and EP on HTTP request parameters.",
        "2024",
        "Springer",
      );
      assert.equal(res.suggestedDecision, "Unsure", "Venue chỉ là Springer không được Include sơ bộ");
      assert.ok(res.unknownCriteria.includes("IC-T"), "IC-T phải ở trạng thái unknown");
      assert.ok(
        res.missingEvidence.some((e) => e.includes("Springer/IEEE/ACM")),
        "Phải có ghi chú cảnh báo không xác minh chỉ từ tên publisher",
      );
    });

    test("Dùng metadata publicationType để xác minh IC-T hợp lệ", () => {
      assert.equal(isConferenceOrJournal("Springer", { publicationType: "journal" }), true);
      assert.equal(isConferenceOrJournal("IEEE", { publicationType: "conference" }), true);
      assert.equal(isConferenceOrJournal("ACM", { publicationType: "proceedings" }), true);

      const res = evaluateScreeningV1(
        "REST API Testing with Boundary Value Analysis and Equivalence Partitioning",
        "Snippet",
        "We propose test case generation for REST APIs with BVA and EP on HTTP request parameters.",
        "2024",
        "Springer",
        { publicationType: "journal" },
      );
      assert.ok(res.matchedCriteria.includes("IC-T"), "Đạt IC-T nhờ publicationType=journal");
    });

    test("Dùng sourceEvidence để xác minh IC-T hợp lệ", () => {
      assert.equal(
        isConferenceOrJournal("ACM", { sourceEvidence: "Proceedings of the 35th ACM Symposium on Software" }),
        true,
      );
      const res = evaluateScreeningV1(
        "REST API Testing with Boundary Value Analysis and Equivalence Partitioning",
        "Snippet",
        "We propose test case generation for REST APIs with BVA and EP on HTTP request parameters.",
        "2024",
        "ACM",
        { sourceEvidence: "Proceedings of the 35th ACM Symposium on Software" },
      );
      assert.ok(res.matchedCriteria.includes("IC-T"), "Đạt IC-T nhờ sourceEvidence");
    });

    test("thesis / dissertation KHÔNG ĐẠT IC-T và bị loại trừ theo EC-O", () => {
      assert.equal(isConferenceOrJournal("Ph.D. Dissertation, ACM"), false);
      assert.equal(isConferenceOrJournal("Master's Thesis, Springer"), false);
      assert.equal(isConferenceOrJournal("IEEE", { publicationType: "thesis" }), false);
      assert.equal(isConferenceOrJournal("ACM", { publicationType: "dissertation" }), false);

      // V1 loại trừ theo title thesis
      const resV1Title = evaluateScreeningV1(
        "Master's Thesis: Automated REST API Testing using Boundary-Value Analysis",
        "Snippet",
        "We present boundary testing on REST APIs.",
        "2024",
        "ACM",
      );
      assert.equal(resV1Title.suggestedDecision, "Exclude");
      assert.ok(resV1Title.matchedCriteria.includes("EC-O"));

      // V1 loại trừ theo venue dissertation
      const resV1Venue = evaluateScreeningV1(
        "Automated REST API Testing using Boundary-Value Analysis",
        "Snippet",
        "We present boundary testing on REST APIs.",
        "2024",
        "Doctoral Dissertation, University X",
      );
      assert.equal(resV1Venue.suggestedDecision, "Exclude");
      assert.ok(resV1Venue.matchedCriteria.includes("EC-O"));

      // V1 loại trừ theo publicationType = dissertation
      const resV1PubType = evaluateScreeningV1(
        "Automated REST API Testing using Boundary-Value Analysis",
        "Snippet",
        "We present boundary testing on REST APIs.",
        "2024",
        "Springer",
        { publicationType: "dissertation" },
      );
      assert.equal(resV1PubType.suggestedDecision, "Exclude");
      assert.ok(resV1PubType.matchedCriteria.includes("EC-O"));

      // V2 loại trừ thesis theo EC-O
      const resV2 = evaluateScreeningV2(
        "Automated REST API Testing using Boundary-Value Analysis",
        "Abstract",
        "Full text of dissertation on REST APIs with EP/BVA Table 1 reports 80% coverage.",
        "2024",
        "Springer",
        { publicationType: "thesis", pageCount: 120 },
      );
      assert.equal(resV2.suggestedDecision, "Exclude");
      assert.ok(resV2.matchedCriteria.includes("EC-O"));
    });
  });
});

