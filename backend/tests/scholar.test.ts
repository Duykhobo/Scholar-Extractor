import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { config } from '../src/config';
import { validateSearchParams, parsePublicationInfo, fetchScholarFromSerpApi } from '../src/scholarService';
import { sanitizeObject, sanitizeString, containsSensitiveKey } from '../src/sanitizer';
import { deduplicateRecords, cleanDoi, normalizeTitle } from '../src/dedup';
import { evaluateScreeningV1, evaluateScreeningV2 } from '../src/screening';
import { appendSearchLog } from '../src/searchLogger';
import { exportToCsv, exportScreeningCsv } from '../src/exporter';
import { getSafeOutputPath } from '../src/server';
import { PaperRecord } from '../src/types';

describe('1. Parameter Validation & Security Gate', () => {
  test('validateSearchParams accepts valid parameters with defaults', () => {
    const { validParams, error } = validateSearchParams({
      q: 'automated test case generation REST API'
    });
    assert.equal(error, undefined);
    assert.equal(validParams.engine, 'google_scholar');
    assert.equal(validParams.q, 'automated test case generation REST API');
    assert.equal(validParams.as_ylo, '2020');
    assert.equal(validParams.as_yhi, '2026');
    assert.equal(validParams.hl, 'vi');
    assert.equal(validParams.start, '0');
    assert.equal(validParams.num, '10');
  });

  test('validateSearchParams rejects empty or whitespace-only query', () => {
    const res1 = validateSearchParams({ q: '' });
    assert.ok(res1.error);
    const res2 = validateSearchParams({ q: '   ' });
    assert.ok(res2.error);
  });

  test('validateSearchParams rejects non-numeric year bounds', () => {
    const res = validateSearchParams({ q: 'test', as_ylo: 'abc' });
    assert.ok(res.error);
  });
});

describe('2. Sanitization & Key Leak Prevention', () => {
  test('sanitizeString strips api_key from query params and raw keys', () => {
    const testKey = 'test_secret_serpapi_key_1234567890abcdef';
    const testUrl = `https://serpapi.com/search.json?engine=google_scholar&api_key=${testKey}&q=test`;
    const sanitized = sanitizeString(testUrl);

    assert.ok(!sanitized.includes(testKey));
    assert.ok(sanitized.includes('api_key=[REDACTED]'));
  });

  test('sanitizeObject deeply scrubs sensitive keys in nested structures', () => {
    const testKey = 'test_secret_serpapi_key_1234567890abcdef';
    const rawData = {
      search_metadata: {
        id: '123',
        json_endpoint: `https://serpapi.com/searches/123.json?api_key=${testKey}`
      },
      search_parameters: {
        api_key: testKey,
        engine: 'google_scholar'
      },
      results: [
        {
          title: 'Test Paper',
          serpapi_link: `https://serpapi.com/search.json?api_key=${testKey}&q=more`
        }
      ]
    };

    const cleaned = sanitizeObject(rawData);
    assert.equal((cleaned as any).search_parameters.api_key, '[REDACTED]');
    assert.ok(!(cleaned as any).search_metadata.json_endpoint.includes(testKey));
  });
});

describe('3. Deduplication Logic: P1 Bug Fix', () => {
  test('cleanDoi handles various DOI formats', () => {
    assert.equal(cleanDoi('https://doi.org/10.1109/TSE.2023.1234567'), '10.1109/tse.2023.1234567');
    assert.equal(cleanDoi('doi: 10.1145/3360664.3362698'), '10.1145/3360664.3362698');
  });

  test('deduplicateRecords removes exact DOI duplicates but RETAINS same-title papers with different/missing DOIs as potentialDuplicate', () => {
    const sampleRecords: PaperRecord[] = [
      {
        id: '1', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Automated Test-Case Generation for REST APIs Using Model Inference', authors: 'Author A', year: '2024', venue: 'ICSE',
        doi: '10.1145/12345', snippet: '', abstract: '', url: 'http://a', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        screeningStage: 'V1', matchedCriteria: ['IC-T'], suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        // Trùng DOI hoàn toàn với #1 -> Phải bị loại bỏ
        id: '2', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Different Title with Same DOI', authors: 'Author B', year: '2024', venue: 'ICSE',
        doi: '10.1145/12345', snippet: '', abstract: '', url: 'http://b', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        screeningStage: 'V1', matchedCriteria: ['IC-T'], suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        // Trùng Tiêu đề với #1 nhưng KHÁC DOI (Preprint arXiv vs Journal) -> KHÔNG ĐƯỢC XÓA! Giữ lại và đánh dấu potentialDuplicate
        id: '3', source: 'arXiv', discoverySource: 'arXiv', collectionMethod: 'SerpApi',
        title: 'Automated Test-Case Generation for REST APIs Using Model Inference', authors: 'Author A et al.', year: '2024', venue: 'arXiv',
        doi: '10.48550/arxiv.2412.03420', snippet: '', abstract: '', url: 'http://c', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        screeningStage: 'V1', matchedCriteria: ['IC-T'], suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        id: '4', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Completely Unique Paper on GraphQL Testing', authors: 'Author D', year: '2025', venue: 'ASE',
        doi: '10.1145/99999', snippet: '', abstract: '', url: 'http://d', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        screeningStage: 'V1', matchedCriteria: ['IC-T'], suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      }
    ];

    const { uniqueRecords, dedupStats } = deduplicateRecords(sampleRecords);
    assert.equal(dedupStats.initialCount, 4);
    assert.equal(dedupStats.exactDupByDoi, 1); // Record 2 trùng DOI -> bị loại
    assert.equal(dedupStats.potentialDupByTitle, 1); // Record 3 trùng title nhưng khác DOI -> được giữ lại và đánh dấu đề xuất trùng
    assert.equal(dedupStats.totalRetained, 3); // Gồm Record 1, Record 3 và Record 4

    // Kiểm tra Record 3 được giữ lại với cờ potentialDuplicate
    const rec3 = uniqueRecords.find(r => r.id === '3');
    assert.ok(rec3, 'Record 3 phải được giữ lại trong danh sách');
    assert.equal(rec3.potentialDuplicate, true);
    assert.equal(rec3.duplicateOfId, '1');
    assert.ok(rec3.duplicateReason?.includes('Trùng tiêu đề'));
    assert.equal(rec3.source, 'arXiv', 'Phải giữ nguyên nguồn của bản ghi đề xuất trùng');
  });
});

describe('4. Protocol Screening Rules & REST API Scope: P0 Fixes', () => {
  test('P0: Unit testing nội bộ (internal unit testing/JUnit) KHÔNG ĐƯỢC gợi ý Include, phải Exclude theo EC-O', () => {
    const fullAbstract = 'In this paper, we propose an automated unit test generation framework using evolutionary algorithms for Java methods and classes. Our approach generates JUnit test suites that achieve high branch coverage on standard Java benchmarks without any external web services.';
    const res = evaluateScreeningV1(
      'Automated Unit Test Generation for Java Classes with JUnit',
      'Snippet mentions unit tests and JUnit',
      fullAbstract,
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Exclude', 'Unit testing nội bộ không thuộc phạm vi REST API phải bị loại theo EC-O');
    assert.ok(res.matchedCriteria.includes('EC-O'));
    assert.ok(res.screeningReason.includes('EC-O'));
  });

  test('P0: Thiếu abstract toàn văn (Google Scholar chỉ có snippet) bắt buộc gợi ý Unsure theo EC-A', () => {
    const res = evaluateScreeningV1(
      'Automated Test Case Generation for REST APIs Using Evolutionary Algorithms',
      'Short snippet mentioning REST API and OpenAPI testing...',
      '', // Không có full abstract
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Unsure', 'Thiếu abstract toàn văn bắt buộc phải gợi ý Unsure');
    assert.ok(res.matchedCriteria.includes('EC-A'));
  });

  test('P0: Thiếu bằng chứng quan trọng về REST API -> Gợi ý Unsure', () => {
    const fullAbstract = 'We investigate automated software testing and fuzzing across multiple open-source repositories. We measure code coverage and evaluate bug detection efficiency across general desktop software.';
    const res = evaluateScreeningV1(
      'A General Automated Testing Framework',
      'Snippet',
      fullAbstract,
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Unsure', 'Thiếu bằng chứng về REST API/Web API phải gợi ý Unsure');
  });

  test('P0: Paper dùng AI / LLM cho REST API testing KHÔNG BỊ LOẠI chỉ vì có AI/LLM', () => {
    const fullAbstract = 'In this paper, we present an automated test case generation approach for REST APIs using Large Language Models (LLMs). By extracting OpenAPI specifications, our system leverages generative AI to synthesize semantic HTTP request payloads. Experimental evaluation on 10 real-world microservices demonstrates superior API path coverage and fault detection.';
    const res = evaluateScreeningV1(
      'LLM-Based Automated Test Case Generation for REST APIs',
      'Snippet',
      fullAbstract,
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Include', 'Nghiên cứu sinh test REST API bằng LLM phải được gợi ý Include');
    assert.ok(res.matchedCriteria.includes('IC-T'));
    assert.ok(res.matchedCriteria.includes('IC-I'));
    assert.ok(res.matchedCriteria.includes('IC-Y'));
    assert.ok(!res.matchedCriteria.includes('EC-O'));
  });

  test('Screening V1: Loại bỏ nghiên cứu y sinh/phi phần mềm theo EC-O', () => {
    const res = evaluateScreeningV1('Clinical Trial and Blood Testing for Patients', 'snippet', '', '2023');
    assert.equal(res.suggestedDecision, 'Exclude');
    assert.ok(res.matchedCriteria.includes('EC-O'));
  });

  test('Screening V1: Loại bỏ tài liệu khảo sát / Systematic Mapping theo EC-S', () => {
    const res = evaluateScreeningV1('A Systematic Literature Review on REST API Testing', 'snippet', '', '2023');
    assert.equal(res.suggestedDecision, 'Exclude');
    assert.ok(res.matchedCriteria.includes('EC-S'));
  });
});

describe('5. Search Log Protocol: P0 Fix - Candidate Papers Outside PRISMA', () => {
  test('P0: appendSearchLog ghi rõ Google Scholar là nguồn paper ứng viên bổ trợ và KHÔNG tính trực tiếp vào PRISMA', () => {
    const testLogFile = path.resolve(__dirname, 'test_search_log_p0.md');
    fs.writeFileSync(testLogFile, '## Prior Manual Search Log\nExisting content...\n', 'utf-8');

    const payload = {
      query: 'automated test case generation REST API',
      searchId: 'test_search_scholar_01',
      method: 'SerpApi',
      params: { engine: 'google_scholar', as_ylo: 2020, as_yhi: 2026, hl: 'vi' },
      apiTotalResults: 18000,
      uiTotalResults: 18200,
      collectedCount: 10,
      candidateCount: 10,
      dedupStats: { initialCount: 10, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 10 },
      spotChecks: [
        { title: 'Sample REST API Paper A', year: '2024', venue: 'IEEE TSE', doi: '', url: 'http://a' }
      ],
      retrievalDate: '2026-10-03'
    };

    const res = appendSearchLog(payload, testLogFile);
    assert.equal(res.success, true);

    const content = fs.readFileSync(testLogFile, 'utf-8');
    // KHÔNG ĐƯỢC CHỨA: "Số paper duy nhất đưa vào PRISMA"
    assert.ok(!content.includes('Số paper duy nhất đưa vào PRISMA'), 'Không được ghi nhận paper Google Scholar vào Identification của PRISMA chính');
    // PHẢI CHỨA: "Số paper ứng viên bổ trợ" và ghi chú protocol
    assert.ok(content.includes('Số paper ứng viên bổ trợ (Candidate Papers)'));
    assert.ok(content.includes('KHÔNG được tính trực tiếp vào nhánh Identification của sơ đồ PRISMA chính thống'));

    fs.unlinkSync(testLogFile);
  });
});

describe('6. Security & Path Traversal Protection: P1 Fixes', () => {
  test('getSafeOutputPath prevents path traversal attacks', () => {
    const attack1 = getSafeOutputPath('../../../etc/passwd');
    assert.ok(attack1.error, 'Phải chặn ký tự .. và /');

    const attack2 = getSafeOutputPath('..\\..\\Windows\\System32\\cmd.exe');
    assert.ok(attack2.error, 'Phải chặn ký tự .. và \\');

    const attack3 = getSafeOutputPath('safe_export.csv');
    assert.equal(attack3.error, undefined);
    assert.ok(attack3.safePath?.endsWith('safe_export.csv'));
  });

  test('Export files: exportToCsv and exportScreeningCsv format correctly with UTF-8 BOM', () => {
    const testCsvFile = path.resolve(__dirname, 'test_screening_records.csv');
    const records: PaperRecord[] = [
      {
        id: 's1_0_1', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Testing REST APIs with LLMs', authors: 'Author X', year: '2024', venue: 'ICSE',
        doi: '', snippet: 'A snippet', abstract: '', url: 'http://test', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: true, missing_abstract: true,
        screeningStage: 'V1', matchedCriteria: ['IC-T', 'IC-I', 'IC-Y'], suggestedDecision: 'Unsure',
        screeningReason: 'Thiếu abstract toàn văn', finalDecision: 'Include', userNotes: 'Đã tải PDF đọc đối soát'
      }
    ];

    const res = exportScreeningCsv(records, testCsvFile);
    assert.equal(res.success, true);

    const buffer = fs.readFileSync(testCsvFile);
    // Kiểm tra UTF-8 BOM
    assert.equal(buffer[0], 0xEF);
    assert.equal(buffer[1], 0xBB);
    assert.equal(buffer[2], 0xBF);

    const text = buffer.toString('utf-8');
    assert.ok(text.includes('final_decision'));
    assert.ok(text.includes('user_notes'));
    assert.ok(text.includes('Đã tải PDF đọc đối soát'));

    fs.unlinkSync(testCsvFile);
  });

  test('Security Key Leak Verification: Scans all client files without hardcoded keys', () => {
    const activeKey = process.env.SERPAPI_KEY || config.serpApiKey;
    const hex64Regex = /\b[a-f0-9]{64}\b/i;

    const filesToAudit = [
      path.resolve(__dirname, '../../chrome_extension/popup.js'),
      path.resolve(__dirname, '../../chrome_extension/content-script.js'),
      path.resolve(__dirname, '../../chrome_extension/popup.html'),
      path.resolve(__dirname, '../../chrome_extension/manifest.json')
    ];

    for (const f of filesToAudit) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        if (activeKey && activeKey.length > 5) {
          assert.ok(
            !content.includes(activeKey),
            `BẢO MẬT VI PHẠM: Tìm thấy SERPAPI_KEY của môi trường trong client file: ${f}`
          );
        }
        assert.ok(
          !hex64Regex.test(content),
          `BẢO MẬT VI PHẠM: Tìm thấy chuỗi 64 ký tự hex (mẫu SerpApi key) trong client file: ${f}`
        );
      }
    }
  });
});

describe('7. Mocked SerpApi Execution & Offset Integrity', () => {
  test('Pagination: handles start offset and maps records correctly', async () => {
    const mockData = {
      search_metadata: { id: 'search_mock_1', status: 'Success', from_cache: true },
      search_information: { total_results: 15400 },
      organic_results: [
        {
          position: 1,
          title: 'Automated REST API Testing with Fuzzing',
          link: 'http://scholar.example.com/p1',
          snippet: 'Fuzzing REST endpoints...',
          publication_info: { summary: 'A Author - IEEE Transactions, 2024 - ieeexplore.ieee.org' }
        }
      ]
    };

    const mockFetch = async () => mockData;
    const result = await fetchScholarFromSerpApi({ q: 'REST API testing', start: 10 }, mockFetch);

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].title, 'Automated REST API Testing with Fuzzing');
    assert.equal(result.records[0].year, '2024');
    assert.equal(result.records[0].abstract, '');
    assert.equal(result.summary.fromCache, true);
  });
});
