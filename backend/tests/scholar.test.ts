import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { config } from '../src/config';
import { validateSearchParams, parsePublicationInfo, fetchScholarFromSerpApi } from '../src/scholarService';
import { sanitizeObject, sanitizeString, containsSensitiveKey } from '../src/sanitizer';
import { deduplicateRecords, cleanDoi, normalizeTitle } from '../src/dedup';
import { evaluateScreening } from '../src/screening';
import { appendSearchLog } from '../src/searchLogger';
import { exportToCsv } from '../src/exporter';
import { PaperRecord } from '../src/types';

describe('1. Parameter Validation & Security Gate', () => {
  test('validateSearchParams accepts valid parameters with defaults', () => {
    const { validParams, error } = validateSearchParams({
      q: 'automated test case generation'
    });
    assert.equal(error, undefined);
    assert.equal(validParams.engine, 'google_scholar');
    assert.equal(validParams.q, 'automated test case generation');
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
    const fakeKey = config.serpApiKey || 'dummy_secret_key_12345';
    const testUrl = `https://serpapi.com/search.json?engine=google_scholar&api_key=${fakeKey}&q=test`;
    const sanitized = sanitizeString(testUrl);

    assert.ok(!sanitized.includes(fakeKey));
    assert.ok(sanitized.includes('api_key=[REDACTED]'));
  });

  test('sanitizeObject deeply scrubs sensitive keys in nested structures', () => {
    const fakeKey = config.serpApiKey || 'dummy_secret_key_12345';
    const rawData = {
      search_metadata: {
        id: '123',
        json_endpoint: `https://serpapi.com/searches/123.json?api_key=${fakeKey}`
      },
      search_parameters: {
        api_key: fakeKey,
        engine: 'google_scholar'
      },
      results: [
        {
          title: 'Test Paper',
          serpapi_link: `https://serpapi.com/search.json?api_key=${fakeKey}&q=more`
        }
      ]
    };

    const cleaned = sanitizeObject(rawData);
    assert.ok(!containsSensitiveKey(cleaned));
    assert.equal((cleaned as any).search_parameters.api_key, '[REDACTED]');
    assert.ok(!(cleaned as any).search_metadata.json_endpoint.includes(fakeKey));
  });
});

describe('3. Deduplication Logic', () => {
  test('cleanDoi handles various DOI formats', () => {
    assert.equal(cleanDoi('https://doi.org/10.1109/TSE.2023.1234567'), '10.1109/tse.2023.1234567');
    assert.equal(cleanDoi('doi: 10.1145/3360664.3362698'), '10.1145/3360664.3362698');
  });

  test('deduplicateRecords deduplicates primarily by DOI and secondarily by Title', () => {
    const sampleRecords: PaperRecord[] = [
      {
        id: '1', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Automated Test Case Generation via LLMs', authors: 'Author A', year: '2024', venue: 'ICSE',
        doi: '10.1145/12345', snippet: '', abstract: '', url: 'http://a', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        id: '2', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Different Title with Same DOI', authors: 'Author B', year: '2024', venue: 'ICSE',
        doi: '10.1145/12345', snippet: '', abstract: '', url: 'http://b', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        id: '3', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Automated Test Case Generation via LLMs', authors: 'Author C', year: '2024', venue: 'ICSE',
        doi: '', snippet: '', abstract: '', url: 'http://c', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: true, missing_abstract: true,
        suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      },
      {
        id: '4', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Completely Unique Paper', authors: 'Author D', year: '2025', venue: 'ASE',
        doi: '10.1145/99999', snippet: '', abstract: '', url: 'http://d', query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      }
    ];

    const { uniqueRecords, dedupStats } = deduplicateRecords(sampleRecords);
    assert.equal(dedupStats.initialCount, 4);
    assert.equal(dedupStats.dupByDoi, 1); // Record 2 dup DOI
    assert.equal(dedupStats.dupByTitle, 1); // Record 3 dup Title of record 1
    assert.equal(dedupStats.totalUnique, 2); // Only Record 1 and Record 4 remain
    assert.equal(uniqueRecords.length, 2);
  });
});

describe('4. Screening Rules & EP/BVA Constraints', () => {
  test('evaluateScreening returns Exclude for medical/non-software papers (EC1)', () => {
    const res = evaluateScreening('Clinical Trial of Patient Blood Testing', 'snippet', '', '2023');
    assert.equal(res.suggestedDecision, 'Exclude');
    assert.ok(res.screeningReason.includes('EC1'));
  });

  test('evaluateScreening returns Exclude for year outside 2020-2026 (EC2)', () => {
    const res = evaluateScreening('Automated software testing', 'snippet', '', '2015');
    assert.equal(res.suggestedDecision, 'Exclude');
    assert.ok(res.screeningReason.includes('EC2'));
  });

  test('evaluateScreening strictly returns Unsure when abstract is missing or only snippet is present', () => {
    const res = evaluateScreening(
      'Automated Test Case Generation using Equivalence Partitioning and Boundary Value Analysis',
      'This paper presents equivalence partitioning and boundary value testing...',
      '', // No full abstract
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Unsure');
    assert.ok(res.screeningReason.includes('abstract'));
  });

  test('evaluateScreening returns Unsure when full abstract exists but lacks EP/BVA evidence', () => {
    const fullAbstract = 'This paper presents automated testing for mobile software. We evaluate test generation on multiple open-source repositories and measure statement coverage across several benchmarks.';
    const res = evaluateScreening(
      'Automated test generation',
      'snippet',
      fullAbstract,
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Unsure');
    assert.ok(res.screeningReason.includes('EP/BVA'));
  });

  test('evaluateScreening returns Include when full abstract exists AND has testing + EP/BVA evidence', () => {
    const fullAbstract = 'In this paper, we propose an automated test case generation framework based on Equivalence Partitioning (EP) and Boundary Value Analysis (BVA) for software unit testing. Our method synthesizes boundary test suites that achieve higher fault detection rates than conventional random testing.';
    const res = evaluateScreening(
      'Automated Test Case Generation with Boundary Value Analysis',
      'snippet',
      fullAbstract,
      '2024'
    );
    assert.equal(res.suggestedDecision, 'Include');
  });
});

describe('5. Mocked SerpApi Execution & Edge Cases (Zero Quota Used)', () => {
  test('Pagination: handles start offset and maps records correctly', async () => {
    const mockData = {
      search_metadata: { id: 'search_mock_1', status: 'Success', from_cache: true },
      search_information: { total_results: 15400 },
      organic_results: [
        {
          position: 1,
          title: 'Paper Page 1',
          link: 'http://scholar.example.com/p1',
          snippet: 'Snippet for paper 1',
          publication_info: { summary: 'A Author - IEEE Transactions, 2024 - ieeexplore.ieee.org' }
        }
      ]
    };

    const mockFetch = async () => mockData;
    const result = await fetchScholarFromSerpApi({ q: 'machine learning testing', start: 10 }, mockFetch);

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].title, 'Paper Page 1');
    assert.equal(result.records[0].year, '2024');
    assert.equal(result.records[0].abstract, ''); // Abstract is strictly not populated by snippet
    assert.equal(result.records[0].snippet, 'Snippet for paper 1');
    assert.equal(result.summary.fromCache, true);
    assert.equal(result.summary.totalReportedResults, 15400);
  });

  test('Empty Results: handles zero organic_results gracefully without errors', async () => {
    const mockEmpty = {
      search_metadata: { id: 'search_mock_empty', status: 'Success' },
      search_information: { total_results: 0 },
      organic_results: []
    };

    const mockFetch = async () => mockEmpty;
    const result = await fetchScholarFromSerpApi({ q: 'unmatched query xyz123' }, mockFetch);

    assert.equal(result.records.length, 0);
    assert.equal(result.summary.totalReportedResults, 0);
    assert.equal(result.summary.recordsCollectedThisPage, 0);
  });

  test('Missing Fields: handles papers with missing authors, year, and venue without crashing', async () => {
    const mockIncomplete = {
      search_metadata: { id: 'search_mock_incomplete', status: 'Success' },
      organic_results: [
        {
          position: 1,
          title: 'Paper With Bare Bones'
          // no link, no publication_info, no snippet
        }
      ]
    };

    const mockFetch = async () => mockIncomplete;
    const result = await fetchScholarFromSerpApi({ q: 'incomplete item' }, mockFetch);

    assert.equal(result.records.length, 1);
    const rec = result.records[0];
    assert.equal(rec.title, 'Paper With Bare Bones');
    assert.equal(rec.uncertain_authors, true);
    assert.equal(rec.uncertain_year, true);
    assert.equal(rec.uncertain_venue, true);
    assert.equal(rec.uncertain_doi, true);
    assert.equal(rec.missing_abstract, true);
  });

  test('Rate Limit & Error: throws clean error without leaking key', async () => {
    const mockError = async () => {
      throw new Error('HTTP 429: Too Many Requests - API rate limit exceeded');
    };

    await assert.rejects(
      async () => {
        await fetchScholarFromSerpApi({ q: 'error test' }, mockError);
      },
      (err: Error) => {
        assert.ok(err.message.includes('HTTP 429'));
        assert.ok(!containsSensitiveKey(err.message));
        return true;
      }
    );
  });
});

describe('6. Search Log & CSV Export Integrity', () => {
  test('appendSearchLog appends new SerpApi record without modifying prior logs', () => {
    const testLogFile = path.resolve(__dirname, 'test_search_log.md');
    fs.writeFileSync(testLogFile, '## Prior Manual Search Log\nExisting content...\n', 'utf-8');

    const payload = {
      query: 'automated test case generation machine learning',
      searchId: 'test_search_id_123',
      method: 'SerpApi',
      params: { engine: 'google_scholar', as_ylo: 2020, as_yhi: 2026, hl: 'vi' },
      apiTotalResults: 18000,
      uiTotalResults: 18200,
      collectedCount: 10,
      uniqueCount: 10,
      dedupStats: { initialCount: 10, dupByDoi: 0, dupByTitle: 0, totalUnique: 10 },
      spotChecks: [
        { title: 'Sample Paper A', year: '2024', venue: 'IEEE TSE', doi: '', url: 'http://a' }
      ],
      retrievalDate: '2026-10-03'
    };

    const res = appendSearchLog(payload, testLogFile);
    assert.equal(res.success, true);

    const content = fs.readFileSync(testLogFile, 'utf-8');
    assert.ok(content.includes('## Prior Manual Search Log')); // Old log preserved
    assert.ok(content.includes('SerpApi Google Scholar')); // New log appended
    assert.ok(content.includes('18200')); // UI count recorded
    assert.ok(content.includes('18000')); // API count recorded
    assert.ok(!containsSensitiveKey(content)); // Key never leaked

    fs.unlinkSync(testLogFile);
  });

  test('exportToCsv produces valid UTF-8 BOM with 10 standard columns', () => {
    const testCsvFile = path.resolve(__dirname, 'test_records.csv');
    const records: PaperRecord[] = [
      {
        id: '1', source: 'Google Scholar', discoverySource: 'Google Scholar', collectionMethod: 'SerpApi',
        title: 'Test Paper, with "quotes" and commas', authors: 'Nguyễn Văn A; Lê Thị B', year: '2024',
        venue: 'Tạp chí Kiểm thử', doi: '10.1145/test', snippet: 'A snippet', abstract: '', url: 'http://test',
        query: 'q', retrieval_date: '2026-10-03', search_id: 's1',
        uncertain_authors: false, uncertain_year: false, uncertain_venue: false, uncertain_doi: false, missing_abstract: true,
        suggestedDecision: 'Unsure', screeningReason: '', finalDecision: '', userNotes: ''
      }
    ];

    const res = exportToCsv(records, testCsvFile);
    assert.equal(res.success, true);

    const buffer = fs.readFileSync(testCsvFile);
    // Check UTF-8 BOM: EF BB BF
    assert.equal(buffer[0], 0xEF);
    assert.equal(buffer[1], 0xBB);
    assert.equal(buffer[2], 0xBF);

    const text = buffer.toString('utf-8');
    assert.ok(text.startsWith('\uFEFFsource,title,authors,year,venue,doi,abstract,url,query,retrieval_date'));
    assert.ok(text.includes('Nguyễn Văn A; Lê Thị B'));
    assert.ok(text.includes('Test Paper, with ""quotes"" and commas'));
    assert.ok(!containsSensitiveKey(text));

    fs.unlinkSync(testCsvFile);
  });
});

describe('7. Ultimate Security Audit: Zero Key Leakage', () => {
  test('SERPAPI_KEY is not leaked in extension bundle or any distribution files', () => {
    if (!config.serpApiKey || config.serpApiKey.length < 5) return;

    const filesToAudit = [
      path.resolve(__dirname, '../../chrome_extension/popup.js'),
      path.resolve(__dirname, '../../chrome_extension/content-script.js'),
      path.resolve(__dirname, '../../chrome_extension/popup.html'),
      path.resolve(__dirname, '../../chrome_extension/manifest.json')
    ];

    for (const f of filesToAudit) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        assert.ok(
          !content.includes(config.serpApiKey),
          `BẢO MẬT VI PHẠM: SERPAPI_KEY được tìm thấy trong file client bundle: ${f}`
        );
      }
    }
  });
});
