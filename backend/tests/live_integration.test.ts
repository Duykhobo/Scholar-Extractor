import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config';
import { fetchScholarFromSerpApi } from '../src/scholarService';
import { containsSensitiveKey } from '../src/sanitizer';

describe('Live Integration Test (Opt-in only - Controlled Quota)', () => {
  const isEnabled = process.env.RUN_LIVE_TEST === 'true';

  test('Live SerpApi Google Scholar API query (1 record limit)', { skip: !isEnabled }, async () => {
    if (!config.isKeyConfigured()) {
      console.log('[Live Test Skipped] SERPAPI_KEY not configured.');
      return;
    }

    console.log('[Live Test] Bắt đầu gọi API thật tới SerpApi Google Scholar...');
    const result = await fetchScholarFromSerpApi({
      q: 'automated test case generation machine learning',
      as_ylo: 2020,
      as_yhi: 2026,
      hl: 'vi',
      start: 0,
      num: 10
    });

    assert.ok(result.records.length > 0, 'Phải nhận được ít nhất 1 bài viết');
    assert.equal(result.records[0].source, 'Google Scholar');
    assert.equal(result.records[0].collectionMethod, 'SerpApi');
    assert.ok(result.summary.totalReportedResults >= 0, 'total_results phải là số không âm (nếu nguồn báo)');

    // Kiểm tra bảo mật tuyệt đối trên dữ liệu thực tế
    assert.ok(!containsSensitiveKey(result.records), 'Không được có key trong mảng records');
    assert.ok(!containsSensitiveKey(result.summary), 'Không được có key trong summary');
    assert.ok(!containsSensitiveKey(result.sanitizedEvidence), 'Không được có key trong sanitizedEvidence');

    console.log(`[Live Test Thành Công] Đã lấy ${result.records.length} bài. total_results: ${result.summary.totalReportedResults}`);
  });
});
