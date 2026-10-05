import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escapeCsvField, exportApa7References, formatApa7Author, formatApa7Citation } from "../src/exporter";
import { isPrivateIp, validateUrlForSsrf } from "../src/pdfService";
import { evaluateCriterion, evaluateProfileScreening } from "../src/profiles/engine";
import { BUILTIN_PRESETS, PRESET_GENERIC, PRESET_SWT302, PRESET_VISUALLY_IMPAIRED_AAC } from "../src/profiles/presets";
import { validateResearchProfile } from "../src/profiles/validator";
import { PaperRecord, TabExtractedData } from "../src/types";
import { analyzeTabAgainstRecord } from "../src/evidenceAnalyzer";

describe("10. Research Profiles & Runtime Schema Validation", () => {
  test("Builtin presets (SWT302, Generic, Visually Impaired) are valid according to schema", () => {
    for (const preset of BUILTIN_PRESETS) {
      const res = validateResearchProfile(preset);
      assert.equal(res.valid, true, `Preset ${preset.id} must be valid: ${res.errors.join(", ")}`);
      assert.ok(res.sanitizedProfile);
      assert.equal(res.sanitizedProfile.id, preset.id);
    }
  });

  test("validateResearchProfile rejects invalid IDs or missing mandatory fields", () => {
    const invalid1 = validateResearchProfile({ name: "No ID profile" });
    assert.equal(invalid1.valid, false);
    assert.ok(invalid1.errors.some((e) => e.includes("id")));

    const invalid2 = validateResearchProfile({ id: "bad id with spaces!", name: "Test" });
    assert.equal(invalid2.valid, false);
  });

  test("validateResearchProfile rejects unsupported evaluator or invalid criteria kinds", () => {
    const badProfile = {
      id: "custom_test",
      name: "Custom Test",
      description: "Testing",
      researchQuestions: ["Q1"],
      reviewType: "systematic_review",
      searchStrings: [{ id: "s1", name: "Q", query: "test" }],
      criteria: [
        {
          id: "BAD-1",
          label: "Bad",
          description: "Bad evaluator",
          kind: "inclusion",
          required: true,
          stage: "metadata",
          evaluator: "execute_arbitrary_code", // Not supported / dangerous
        },
      ],
      sourcePolicies: {},
    };

    const res = validateResearchProfile(badProfile);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("không được hỗ trợ")));
  });

  test("validateResearchProfile prevents negative page counts or invalid year ranges", () => {
    const res = validateResearchProfile({
      ...PRESET_GENERIC,
      id: "bad_pages",
      minPageCount: -5,
      yearRange: { start: 2026, end: 2020 }, // start > end
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("minPageCount")));
    assert.ok(res.errors.some((e) => e.includes("Năm bắt đầu")));
  });
});

describe("11. Configurable Screening Engine Evaluators", () => {
  test("Generic Profile: Does NOT enforce REST API or EP/BVA", () => {
    const sampleRecord: PaperRecord = {
      id: "gen_1",
      source: "Google Scholar",
      discoverySource: "Google Scholar",
      collectionMethod: "SerpApi",
      title: "A Study on Machine Learning in Healthcare Diagnostics",
      authors: "Smith, J.",
      year: "2023",
      venue: "Journal of Medical AI",
      doi: "10.1000/12345",
      snippet: "This paper surveys machine learning algorithms...",
      abstract: "This paper surveys machine learning algorithms...",
      url: "https://example.com/ml-health",
      query: "machine learning healthcare",
      retrieval_date: "2026-10-05",
      search_id: "s_1",
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
    };

    const evalRes = evaluateProfileScreening(PRESET_GENERIC, sampleRecord, { stage: "title_abstract" });
    // In Generic profile, it checks GEN-IC-PUB (valid journal), GEN-IC-LANG, GEN-EC-DUP...
    // Notice: NO mention of REST API or EP/BVA failure!
    assert.ok(!evalRes.screeningReason.includes("REST API"), "Generic profile must not enforce REST API");
    assert.ok(!evalRes.screeningReason.includes("EP/BVA"), "Generic profile must not enforce EP/BVA");
    assert.ok(evalRes.matchedCriteria.includes("GEN-IC-PUB"));
  });

  test("Page Count Evaluator: minPages = 16 (Tests 15, 16 and unknown)", () => {
    const criterionInclusion = {
      id: "TEST-IC-PAGE",
      label: "Độ dài tối thiểu 16 trang",
      description: "Bài báo phải có từ 16 trang trở lên",
      kind: "inclusion" as const,
      required: true,
      stage: "full_text" as const,
      evaluator: "page_count" as const,
      parameters: { minPages: 16 },
    };

    // Case A: 15 pages -> not_met
    const res15 = evaluateCriterion(criterionInclusion, {}, { stage: "full_text", pageCount: 15 });
    assert.equal(res15.status, "not_met");
    assert.ok(res15.reason.includes("15 trang"));

    // Case B: 16 pages -> met
    const res16 = evaluateCriterion(criterionInclusion, {}, { stage: "full_text", pageCount: 16 });
    assert.equal(res16.status, "met");
    assert.ok(res16.reason.includes("16 trang"));

    // Case C: unknown / undefined pageCount -> unknown
    const resUnknown = evaluateCriterion(criterionInclusion, {}, { stage: "full_text" });
    assert.equal(resUnknown.status, "unknown");
  });

  test("Year Range Evaluator: start and end boundaries and disabled mode", () => {
    const crit = {
      id: "TEST-YEAR",
      label: "Năm 2021-2024",
      description: "Năm",
      kind: "inclusion" as const,
      required: true,
      stage: "metadata" as const,
      evaluator: "year_range" as const,
      parameters: { startYear: 2021, endYear: 2024 },
    };

    assert.equal(evaluateCriterion(crit, { year: "2020" }, { stage: "metadata" }).status, "not_met");
    assert.equal(evaluateCriterion(crit, { year: "2021" }, { stage: "metadata" }).status, "met");
    assert.equal(evaluateCriterion(crit, { year: "2024" }, { stage: "metadata" }).status, "met");
    assert.equal(evaluateCriterion(crit, { year: "2025" }, { stage: "metadata" }).status, "not_met");
    assert.equal(evaluateCriterion(crit, { year: "" }, { stage: "metadata" }).status, "unknown");
  });

  test("Preset 3 (Giao tiếp tử tế & Sự tự tin của trẻ khiếm thị): Evaluates IC-01..IC-05, distinguishes concepts, and maps X, M, Y, H1-H4", () => {
    const viRecord: PaperRecord = {
      id: "vi_1",
      source: "Google Scholar",
      discoverySource: "Google Scholar",
      collectionMethod: "SerpApi",
      title:
        "The Role of Kind and Supportive Communication in Promoting Self-confidence and Social Interaction among Visually Impaired Children in School",
      authors: "Silva, M. & Johnson, P.",
      year: "2018", // Year 2018 is accepted within 2010-2026 range
      venue: "Journal of Special Education Technology",
      doi: "10.1000/vi123",
      snippet:
        "This study investigates teacher supportive communication and perceived social support for blind children in classroom settings...",
      abstract:
        "We evaluate how empathetic communication from teachers and peers enhances perceived social support and self-confidence among visually impaired students. Related aspects like self-esteem were also observed.",
      url: "https://example.com/vi-support",
      query: '"children with visual impairments" "self-confidence"',
      retrieval_date: "2026-10-05",
      search_id: "s_vi",
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
    };

    const res = evaluateProfileScreening(PRESET_VISUALLY_IMPAIRED_AAC, viRecord, { stage: "title_abstract" });
    assert.ok(res.matchedCriteria.includes("IC-01"), "Must match IC-01 (Communication & Self-confidence)");
    assert.ok(res.matchedCriteria.includes("IC-02"), "Must match IC-02 (Children with visual impairment in school)");
    assert.ok(res.matchedCriteria.includes("IC-03"), "Must match IC-03 (Journal venue)");

    // Model Contribution verification
    assert.ok(res.modelContributions?.includes("X"), "Must detect X (supportive communication)");
    assert.ok(res.modelContributions?.includes("M"), "Must detect M (perceived social support)");
    assert.ok(res.modelContributions?.includes("Y"), "Must detect Y (self-confidence)");
    assert.ok(res.modelContributions?.includes("H1"), "Must map H1 (X -> M)");
    assert.ok(res.modelContributions?.includes("H2"), "Must map H2 (M -> Y)");
    assert.ok(res.modelContributions?.includes("H3"), "Must map H3 (X -> Y)");

    // Concept distinction: self-confidence is primary Y, self-esteem is secondary
    assert.ok(res.conceptLabels?.includes("self-confidence (Primary Y)"), "Must distinguish primary Y");
    assert.ok(res.conceptLabels?.includes("self-esteem (Secondary)"), "Must distinguish secondary construct");
    assert.equal(res.literatureGroup, "direct", "Must classify as direct empirical literature");
  });

  test("Decision Rules: Inclusion not_met -> Exclude; Exclusion met -> Exclude; Missing required -> Unsure", () => {
    // 1. Exclusion met -> Exclude
    const dupRecord: PaperRecord = {
      ...(PRESET_SWT302 as any),
      id: "dup_rec",
      title: "Duplicate Test",
      potentialDuplicate: true,
      duplicateReason: "Exact DOI match",
    };
    const evalDup = evaluateProfileScreening(PRESET_SWT302, dupRecord, { stage: "metadata" });
    assert.equal(evalDup.suggestedDecision, "Exclude");
    assert.ok(evalDup.screeningReason.includes("EC-D"));

    // 2. Inclusion not_met -> Exclude (e.g. year 2015 for SWT302 which requires 2020-2026)
    const oldRecord: PaperRecord = {
      ...(PRESET_SWT302 as any),
      id: "old_rec",
      title: "Old Paper",
      year: "2015",
      potentialDuplicate: false,
    };
    const evalOld = evaluateProfileScreening(PRESET_SWT302, oldRecord, { stage: "metadata" });
    assert.equal(evalOld.suggestedDecision, "Exclude");
    assert.ok(evalOld.screeningReason.includes("IC-Y"));

    // 3. Re-evaluation preserves finalDecision and flags outdated decision if profileVersion incremented
    oldRecord.finalDecision = "Include"; // Human decision
    (oldRecord as any).profileVersion = 1;
    const higherProfile = { ...PRESET_SWT302, profileVersion: 2 };
    const evalOutdated = evaluateProfileScreening(higherProfile, oldRecord, { stage: "metadata" });
    assert.equal(evalOutdated.isDecisionOutdated, true, "Must flag that decision was made under older profile version");
    assert.equal(oldRecord.finalDecision, "Include", "System must NEVER overwrite human finalDecision");
  });

  test("No Fallacy: Missing abstract does NOT mean full-text unavailable (EC-A)", () => {
    const critEcA = {
      id: "EC-A",
      label: "Không thể truy cập toàn văn",
      description: "EC-A",
      kind: "exclusion" as const,
      required: true,
      stage: "full_text" as const,
      evaluator: "full_text_availability" as const,
      parameters: { requireFullText: true },
    };

    // Missing abstract only
    const res = evaluateCriterion(critEcA, { abstract: "" }, { stage: "full_text" });
    assert.equal(res.status, "unknown", "Must be unknown, NOT met for EC-A");
    assert.ok(res.reason.includes("Không suy diễn"));
  });
});

describe("12. Security: SSRF, CSV Injection & Citation Completeness", () => {
  test("SSRF Protection: Rejects private IPs, localhost, and cloud metadata", async () => {
    assert.equal(isPrivateIp("127.0.0.1"), true);
    assert.equal(isPrivateIp("10.0.1.5"), true);
    assert.equal(isPrivateIp("172.20.0.1"), true);
    assert.equal(isPrivateIp("192.168.1.100"), true);
    assert.equal(isPrivateIp("169.254.169.254"), true); // AWS/GCP metadata IP
    assert.equal(isPrivateIp("8.8.8.8"), false); // Public IP

    const localCheck = await validateUrlForSsrf("http://localhost:3001/api/health");
    assert.equal(localCheck.safe, false);

    const privateIpCheck = await validateUrlForSsrf("http://192.168.1.1/secret.pdf");
    assert.equal(privateIpCheck.safe, false);

    const metaCheck = await validateUrlForSsrf("http://169.254.169.254/latest/meta-data");
    assert.equal(metaCheck.safe, false);

    const ftpCheck = await validateUrlForSsrf("ftp://example.com/file.pdf");
    assert.equal(ftpCheck.safe, false);
  });

  test("CSV Formula Injection Prevention: Prefixes =, +, -, @, tab with single quote", () => {
    assert.equal(escapeCsvField("=SUM(A1:A10)"), '"\'=SUM(A1:A10)"');
    assert.equal(escapeCsvField("+12345"), '"\'+12345"');
    assert.equal(escapeCsvField("-cmd|..."), '"\'-cmd|..."');
    assert.equal(escapeCsvField("@evil"), '"\'@evil"');
    assert.equal(escapeCsvField("\tindented"), '"\'\tindented"');
    assert.equal(escapeCsvField("Normal Text"), '"Normal Text"');
  });

  test("APA 7 Formatter: Authors formatting, journal/conference citation, and incomplete partitioning", () => {
    // 1. Author formatting
    assert.equal(formatApa7Author("John Doe"), "Doe, J.");
    assert.equal(formatApa7Author("John Doe; Alice Smith"), "Doe, J. & Smith, A.");
    assert.equal(formatApa7Author("Doe, John; Smith, Alice; Wayne, Bruce"), "Doe, J., Smith, A., & Wayne, B.");

    // 2. Full paper formatting
    const completePaper: PaperRecord = {
      id: "p_complete",
      source: "OpenAlex",
      discoverySource: "OpenAlex",
      collectionMethod: "API",
      title: "Automated REST API Testing with Adaptive Fuzzing",
      authors: "Alice Walker; Bob Davis",
      year: "2023",
      venue: "IEEE Transactions on Software Engineering",
      doi: "10.1109/TSE.2023.1234567",
      snippet: "",
      abstract: "Complete abstract...",
      url: "https://ieeexplore.ieee.org/document/1234567",
      query: "REST API testing",
      retrieval_date: "2026-10-05",
      search_id: "s1",
      uncertain_authors: false,
      uncertain_year: false,
      uncertain_venue: false,
      uncertain_doi: false,
      missing_abstract: false,
      screeningStage: "V2",
      matchedCriteria: [],
      suggestedDecision: "Include",
      screeningReason: "",
      finalDecision: "Include",
      userNotes: "",
      user_verified: true,
    };

    const citeRes = formatApa7Citation(completePaper);
    assert.equal(citeRes.isComplete, true);
    assert.ok(
      citeRes.citation.includes(
        "Walker, A. & Davis, B. (2023). Automated REST API Testing with Adaptive Fuzzing. *IEEE Transactions on Software Engineering*. https://doi.org/10.1109/TSE.2023.1234567",
      ),
    );

    // 3. Incomplete paper partitioning
    const incompletePaper: PaperRecord = {
      ...completePaper,
      id: "p_incomplete",
      authors: "", // missing authors
      venue: "", // missing venue
    };

    const exportRes = exportApa7References([completePaper, incompletePaper]);
    assert.equal(exportRes.completeCount, 1);
    assert.equal(exportRes.incompleteCount, 1);
    assert.ok(exportRes.textContent.includes("DANH MỤC TÀI LIỆU THAM KHẢO (APA 7th EDITION REFERENCES)"));
    assert.ok(exportRes.textContent.includes("CÁC BÀI BÁO ĐÃ XÁC MINH & ĐẦY ĐỦ THÔNG TIN APA 7"));
    assert.ok(exportRes.textContent.includes("DANH SÁCH BÀI BÁO CHƯA ĐỦ THÔNG TIN ĐỂ ĐỊNH DẠNG HOÀN CHỈNH APA 7"));
  });
});

describe("13. Multi-Session Isolation, Tab Conflict & Profile Round-Trip", () => {
  test("Session & Profile Isolation: Switching research studies isolates records and decisions", () => {
    // Session A for Study 1
    const study1Id = "study_ai";
    const study2Id = "study_biology";

    const sessionStore: Record<string, { records: PaperRecord[]; activeSessionId: string }> = {
      [study1Id]: {
        activeSessionId: "sess_ai_01",
        records: [
          {
            id: "rec_ai_1",
            source: "Google Scholar",
            discoverySource: "Google Scholar",
            collectionMethod: "SerpApi",
            title: "Deep Learning in Code Generation",
            authors: "Goodfellow, I.",
            year: "2022",
            venue: "ICLR",
            doi: "10.1000/ai1",
            snippet: "DL for code...",
            abstract: "DL for code...",
            url: "https://example.com/ai",
            query: "deep learning code",
            retrieval_date: "2026-10-05",
            search_id: "s_ai",
            researchId: study1Id,
            sessionId: "sess_ai_01",
            uncertain_authors: false,
            uncertain_year: false,
            uncertain_venue: false,
            uncertain_doi: false,
            missing_abstract: false,
            screeningStage: "V1",
            matchedCriteria: [],
            suggestedDecision: "Include",
            screeningReason: "",
            finalDecision: "Include",
            userNotes: "Important AI benchmark paper",
          },
        ],
      },
      [study2Id]: {
        activeSessionId: "sess_bio_01",
        records: [],
      },
    };

    // Verify study 2 has 0 records and none of Study 1's records or decisions
    assert.equal(sessionStore[study2Id].records.length, 0);
    assert.equal(sessionStore[study1Id].records.length, 1);
    assert.equal(sessionStore[study1Id].records[0].researchId, study1Id);
    assert.equal(sessionStore[study1Id].records[0].finalDecision, "Include");
    assert.equal(sessionStore[study1Id].records[0].userNotes, "Important AI benchmark paper");
  });

  test("Query change resets pagination to start=0 and initializes new sessionId", () => {
    let currentSessionId = "session_initial";
    let currentStart = 30; // on page 4
    let currentQuery = "initial query";

    // User types new query and clicks "Search first page"
    const newQuery = "new distinct query";
    if (newQuery !== currentQuery) {
      currentSessionId = `sess_${Date.now()}_new`;
      currentStart = 0;
      currentQuery = newQuery;
    }

    assert.equal(currentStart, 0, "Start must be reset to 0");
    assert.notEqual(currentSessionId, "session_initial", "New sessionId must be created");
    assert.equal(currentQuery, "new distinct query");
  });

  test("Late response protection: Discard response if sessionId does not match currentSessionId", () => {
    const currentActiveSession = "sess_user_active_now";
    const lateResponseSession = "sess_old_cancelled_or_previous";

    let recordsApplied = 0;
    const handleIncomingResponse = (responseSessionId: string, records: any[]) => {
      if (responseSessionId !== currentActiveSession) {
        // Discard
        return false;
      }
      recordsApplied += records.length;
      return true;
    };

    // Late response returns
    const acceptedLate = handleIncomingResponse(lateResponseSession, [{ id: "late_1" }]);
    assert.equal(acceptedLate, false);
    assert.equal(recordsApplied, 0, "Late records must NOT be applied to current session");

    // Current response returns
    const acceptedCurrent = handleIncomingResponse(currentActiveSession, [{ id: "current_1" }]);
    assert.equal(acceptedCurrent, true);
    assert.equal(recordsApplied, 1, "Current session records applied correctly");
  });

  test("Export / Import Profile JSON Round-trip preserves schema, version and criteria", () => {
    const original = PRESET_VISUALLY_IMPAIRED_AAC;
    const jsonSerialized = JSON.stringify(original, null, 2);

    const parsed = JSON.parse(jsonSerialized);
    const validation = validateResearchProfile(parsed);

    assert.equal(validation.valid, true);
    assert.equal(validation.sanitizedProfile?.id, original.id);
    assert.equal(validation.sanitizedProfile?.reviewType, original.reviewType);
    assert.equal(validation.sanitizedProfile?.criteria.length, original.criteria.length);
    assert.equal(validation.sanitizedProfile?.profileVersion, original.profileVersion);
  });

  test("Tab metadata conflict protection: Detects title mismatch and requires confirmation", () => {
    const existingTitle = "Automated Testing of RESTful APIs via Model-based Generation";
    const tabTitle = "Completely Different Paper on Database Performance";

    // Levenshtein / Word overlap similarity check
    const words1 = new Set(existingTitle.toLowerCase().split(/\s+/));
    const words2 = new Set(tabTitle.toLowerCase().split(/\s+/));
    let overlap = 0;
    words1.forEach((w) => {
      if (words2.has(w)) overlap++;
    });
    const sim = overlap / Math.max(words1.size, words2.size);

    assert.ok(sim < 0.3, "Titles are clearly mismatched");
    // System must flag mismatch rather than silently overwriting metadata
    const isTitleMatch = sim >= 0.6;
    assert.equal(isTitleMatch, false, "Must flag title mismatch for user preview & confirmation");
  });

  test("Isolation: analyzeTabAgainstRecord for Visually Impaired profile NEVER applies REST API or EP/BVA criteria", () => {
    const viRecord: PaperRecord = {
      id: "vi_paper_1",
      title: "Exploring communication supports for children with visual impairment and blindness: A case study",
      authors: "K Abrahams, D De Vos, A Bam",
      year: 2025,
      venue: "African Journal of Disability",
      snippet: "interactions through bodily-tactile expressions... built their confidence in school...",
      abstract:
        "This study investigates augmentative and alternative communication (AAC) supports and tactile interactions to enhance self-confidence among visually impaired children in classroom environments.",
      discoverySource: "Google Scholar",
      collectionMethod: "SerpApi",
      source: "Google Scholar",
      url: "https://example.com/vi-aac",
      doi: "10.1080/example",
    };

    const tabData: TabExtractedData = {
      title: viRecord.title,
      authors: viRecord.authors,
      year: 2025,
      venue: viRecord.venue,
      abstract: viRecord.abstract,
      rawText:
        "We evaluate how augmentative and alternative communication tools help children with blindness improve their social interaction and self-confidence in education settings. Experimental results with N = 15 students show significant improvements.",
      pageCount: 8,
      method: "PDF.js",
    };

    const analysis = analyzeTabAgainstRecord(viRecord, tabData, PRESET_VISUALLY_IMPAIRED_AAC);

    // BẮT BUỘC: Không được có bất kỳ từ khóa kiểm thử phần mềm nào (REST API, EP, BVA, HTTP request)
    const allReasons = JSON.stringify(analysis.suggestedScreeningUpdate || {});
    assert.equal(allReasons.includes("REST API"), false, "Must NOT contain REST API in screening update");
    assert.equal(allReasons.includes("EP/BVA"), false, "Must NOT contain EP/BVA in screening update");
    assert.equal(allReasons.includes("IC-P"), false, "Must NOT contain IC-P in screening update");
    assert.equal(allReasons.includes("IC-I"), false, "Must NOT contain IC-I in screening update");

    // Phải khớp các tiêu chí của AAC/VI: IC-01, IC-02, IC-04
    const matched = analysis.suggestedScreeningUpdate?.matchedCriteria || [];
    assert.ok(matched.includes("IC-01"), "Must match IC-01 (Communication / Confidence keywords)");
    assert.ok(matched.includes("IC-02"), "Must match IC-02 (Children with visual impairment / school context)");
    assert.ok(matched.includes("IC-04"), "Must match IC-04 (Full text available)");
  });
});
