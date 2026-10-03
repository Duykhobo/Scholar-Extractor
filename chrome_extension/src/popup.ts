import { PaperRecord, DedupStats, SearchExecutionSummary, ScreeningDecision } from './types';

// Cau hinh mac dinh backend Node.js
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

class ScholarExtensionApp {
  private backendUrl: string = DEFAULT_BACKEND_URL;
  private allRecords: PaperRecord[] = [];
  private uniqueRecords: PaperRecord[] = [];
  private dedupStats: DedupStats = { initialCount: 0, dupByDoi: 0, dupByTitle: 0, totalUnique: 0 };
  private searchSummary: SearchExecutionSummary | null = null;
  private lastSanitizedEvidence: any = null;

  private currentStart: number = 0;
  private isFetching: boolean = false;
  private isCancelled: boolean = false;
  private apiRequestsUsed: number = 0;

  // DOM Elements
  private queryInput!: HTMLInputElement;
  private asYloInput!: HTMLInputElement;
  private asYhiInput!: HTMLInputElement;
  private hlInput!: HTMLInputElement;
  private maxPagesInput!: HTMLInputElement;
  private uiTotalInput!: HTMLInputElement;

  private searchFirstBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private autoFetchBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private exportCsvBtn!: HTMLButtonElement;
  private exportJsonBtn!: HTMLButtonElement;
  private saveLogBtn!: HTMLButtonElement;

  private statusDiv!: HTMLElement;
  private backendStatusBadge!: HTMLElement;
  private statsBox!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private filterInput!: HTMLInputElement;
  private filterDecisionSelect!: HTMLSelectElement;

  init() {
    this.bindDOMElements();
    this.attachEventListeners();
    this.checkBackendHealth();
  }

  private bindDOMElements() {
    this.queryInput = document.getElementById('queryInput') as HTMLInputElement;
    this.asYloInput = document.getElementById('asYloInput') as HTMLInputElement;
    this.asYhiInput = document.getElementById('asYhiInput') as HTMLInputElement;
    this.hlInput = document.getElementById('hlInput') as HTMLInputElement;
    this.maxPagesInput = document.getElementById('maxPagesInput') as HTMLInputElement;
    this.uiTotalInput = document.getElementById('uiTotalInput') as HTMLInputElement;

    this.searchFirstBtn = document.getElementById('searchFirstBtn') as HTMLButtonElement;
    this.nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
    this.autoFetchBtn = document.getElementById('autoFetchBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.exportCsvBtn = document.getElementById('exportCsvBtn') as HTMLButtonElement;
    this.exportJsonBtn = document.getElementById('exportJsonBtn') as HTMLButtonElement;
    this.saveLogBtn = document.getElementById('saveLogBtn') as HTMLButtonElement;

    this.statusDiv = document.getElementById('status') as HTMLElement;
    this.backendStatusBadge = document.getElementById('backendStatusBadge') as HTMLElement;
    this.statsBox = document.getElementById('statsBox') as HTMLElement;
    this.resultsContainer = document.getElementById('resultsContainer') as HTMLElement;
    this.filterInput = document.getElementById('filterInput') as HTMLInputElement;
    this.filterDecisionSelect = document.getElementById('filterDecisionSelect') as HTMLSelectElement;
  }

  private attachEventListeners() {
    this.searchFirstBtn.addEventListener('click', () => this.handleSearchFirstPage());
    this.nextBtn.addEventListener('click', () => this.handleFetchNextPage());
    this.autoFetchBtn.addEventListener('click', () => this.handleAutoFetchPages());
    this.stopBtn.addEventListener('click', () => this.handleStopFetch());

    this.exportCsvBtn.addEventListener('click', () => this.handleExportCsv());
    this.exportJsonBtn.addEventListener('click', () => this.handleExportJson());
    this.saveLogBtn.addEventListener('click', () => this.handleSaveLog());

    // Loc cuc bo bang - Khong goi lai API
    this.filterInput.addEventListener('input', () => this.renderRecordsList());
    this.filterDecisionSelect.addEventListener('change', () => this.renderRecordsList());
  }

  private setStatus(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    this.statusDiv.innerText = msg;
    const colors = {
      info: '#2563eb',
      success: '#16a34a',
      error: '#dc2626',
      warning: '#d97706'
    };
    this.statusDiv.style.color = colors[type];
  }

  private async checkBackendHealth() {
    try {
      const res = await fetch(`${this.backendUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        this.apiRequestsUsed = data.totalApiRequestsUsed || 0;
        this.backendStatusBadge.innerHTML = `● Backend Online (Cổng 3001) | Key: ${data.isKeyConfigured ? '✓ Đã sẵn sàng' : '⚠ Chưa thấy trong .env'}`;
        this.backendStatusBadge.className = data.isKeyConfigured ? 'badge badge-green' : 'badge badge-yellow';
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch {
      this.backendStatusBadge.innerHTML = `✕ Không kết nối được Backend Node.js tại ${this.backendUrl}. Hãy mở terminal và chạy: <code>cd backend && npm start</code>`;
      this.backendStatusBadge.className = 'badge badge-red';
    }
  }

  // 1. Tim kiem trang dau tien (start = 0)
  private async handleSearchFirstPage() {
    const q = this.queryInput.value.trim();
    if (!q) {
      this.setStatus('Vui lòng nhập chuỗi tìm kiếm nguyên văn.', 'warning');
      return;
    }

    this.currentStart = 0;
    this.allRecords = [];
    this.uniqueRecords = [];
    this.isCancelled = false;

    await this.fetchSinglePage(0, true);
  }

  // 2. Lay trang tiep theo
  private async handleFetchNextPage() {
    if (this.isFetching) return;
    this.currentStart += 10;
    await this.fetchSinglePage(this.currentStart, false);
  }

  // 3. Tu dong lay toi da N trang
  private async handleAutoFetchPages() {
    const q = this.queryInput.value.trim();
    if (!q) {
      this.setStatus('Vui lòng nhập chuỗi tìm kiếm nguyên văn.', 'warning');
      return;
    }

    const maxPages = Math.max(1, parseInt(this.maxPagesInput.value, 10) || 1);
    this.isCancelled = false;
    this.stopBtn.style.display = 'inline-block';
    this.autoFetchBtn.disabled = true;

    // Neu chua co ban ghi nao, bat dau tu trang 0
    if (this.allRecords.length === 0) {
      this.currentStart = 0;
    } else {
      this.currentStart += 10;
    }

    const initialStart = this.currentStart;
    const targetEndStart = initialStart + (maxPages * 10);

    while (this.currentStart < targetEndStart && !this.isCancelled) {
      const pageIndex = Math.floor(this.currentStart / 10) + 1;
      this.setStatus(`Đang tải trang ${pageIndex}... (offset start=${this.currentStart})`, 'info');

      const success = await this.fetchSinglePage(this.currentStart, false);
      if (!success || this.isCancelled) {
        break;
      }

      this.currentStart += 10;
      // Nghỉ nhẹ 500ms giữa các request để bảo đảm ổn định
      await new Promise(r => setTimeout(r, 500));
    }

    this.stopBtn.style.display = 'none';
    this.autoFetchBtn.disabled = false;
    if (this.isCancelled) {
      this.setStatus(`Đã dừng quá trình lấy dữ liệu theo lệnh người dùng. Đã bảo toàn các trang trước!`, 'warning');
    }
  }

  private handleStopFetch() {
    this.isCancelled = true;
    this.setStatus('Đang dừng yêu cầu...', 'warning');
  }

  // Goi backend de lay 1 trang
  private async fetchSinglePage(startOffset: number, isReset: boolean): Promise<boolean> {
    const q = this.queryInput.value.trim();
    const as_ylo = this.asYloInput.value.trim() || '2020';
    const as_yhi = this.asYhiInput.value.trim() || '2026';
    const hl = this.hlInput.value.trim() || 'vi';

    this.isFetching = true;
    this.setButtonsState(true);
    this.setStatus(`Đang gọi SerpApi Google Scholar (start=${startOffset})...`, 'info');

    try {
      const response = await fetch(`${this.backendUrl}/api/scholar/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q,
          as_ylo,
          as_yhi,
          hl,
          start: startOffset,
          num: 10
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Lỗi không xác định từ backend.');
      }

      const newRecords: PaperRecord[] = data.records || [];
      this.searchSummary = data.summary;
      this.lastSanitizedEvidence = data.evidence;
      this.apiRequestsUsed = data.summary?.apiRequestsUsed || (this.apiRequestsUsed + 1);

      if (isReset) {
        this.allRecords = newRecords;
      } else {
        this.allRecords = [...this.allRecords, ...newRecords];
      }

      // Khử trùng lặp qua backend
      await this.runDeduplication();

      this.updateStatsDisplay();
      this.renderRecordsList();

      if (newRecords.length === 0) {
        this.setStatus(`Trang này không có thêm bài viết nào. Đã hết kết quả.`, 'warning');
        return false;
      }

      const cacheText = data.summary?.fromCache ? '(Từ cache SerpApi)' : '(Live API)';
      this.setStatus(`✓ Đã nhận ${newRecords.length} bài viết mới. Tổng tích lũy: ${this.allRecords.length} (Duy nhất: ${this.uniqueRecords.length}) ${cacheText}`, 'success');
      return true;
    } catch (err: any) {
      this.setStatus(`Lỗi khi lấy dữ liệu: ${err.message}. Các bản ghi đã lấy trước đó vẫn được giữ nguyên an toàn!`, 'error');
      return false;
    } finally {
      this.isFetching = false;
      this.setButtonsState(false);
    }
  }

  private async runDeduplication() {
    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: this.allRecords })
      });
      if (res.ok) {
        const data = await res.json();
        this.uniqueRecords = data.uniqueRecords || this.allRecords;
        this.dedupStats = data.dedupStats;
      } else {
        this.uniqueRecords = [...this.allRecords];
      }
    } catch {
      this.uniqueRecords = [...this.allRecords];
    }
  }

  private setButtonsState(busy: boolean) {
    this.searchFirstBtn.disabled = busy;
    this.nextBtn.disabled = busy;
    if (!busy) {
      this.nextBtn.style.display = this.allRecords.length > 0 ? 'inline-block' : 'none';
      this.autoFetchBtn.style.display = this.allRecords.length > 0 ? 'inline-block' : 'none';
      this.exportCsvBtn.style.display = this.allRecords.length > 0 ? 'inline-block' : 'none';
      this.exportJsonBtn.style.display = this.allRecords.length > 0 ? 'inline-block' : 'none';
      this.saveLogBtn.style.display = this.allRecords.length > 0 ? 'inline-block' : 'none';
    }
  }

  private updateStatsDisplay() {
    this.statsBox.style.display = 'block';

    const s = this.searchSummary;
    const cacheLabel = s?.fromCache ? '<span class="badge badge-yellow">Từ cache SerpApi</span>' : '<span class="badge badge-green">Live API</span>';
    const totalReported = s?.totalReportedResults?.toLocaleString() || '0';

    this.statsBox.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Số Request API đã dùng</div>
          <div class="stat-value">${this.apiRequestsUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tổng kết quả nguồn báo (Scholar)</div>
          <div class="stat-value">${totalReported} <small class="text-muted">(Ước lượng)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Số record thu thập thực tế</div>
          <div class="stat-value text-blue">${this.allRecords.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Số paper sau bỏ trùng</div>
          <div class="stat-value text-green">${this.uniqueRecords.length}</div>
        </div>
      </div>
      <div class="stat-sub">
        <span><b>Mã tìm kiếm:</b> <code>${s?.searchId || 'N/A'}</code></span>
        <span><b>Trạng thái:</b> ${cacheLabel}</span>
        <span><b>Trùng lặp:</b> DOI: ${this.dedupStats.dupByDoi} | Title: ${this.dedupStats.dupByTitle}</span>
      </div>
      <div class="notice-callout">
        <b>Quy tắc SLR/PRISMA:</b> Không coi <code>total_results</code> là số paper đã thu thập. Không coi <code>snippet</code> là abstract.
      </div>
    `;
  }

  private renderRecordsList() {
    const keyword = this.filterInput.value.toLowerCase().trim();
    const decisionFilter = this.filterDecisionSelect.value;

    const filtered = this.uniqueRecords.filter(r => {
      // Loc theo quyet dinh
      const effectiveDecision = r.finalDecision || r.suggestedDecision;
      if (decisionFilter !== 'all' && effectiveDecision !== decisionFilter) {
        return false;
      }
      // Loc theo tu khoa
      if (keyword) {
        const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      this.resultsContainer.innerHTML = '<div class="empty-state">Không có bài viết nào khớp với bộ lọc hiện tại.</div>';
      return;
    }

    this.resultsContainer.innerHTML = filtered.map((r, idx) => {
      const decisionBadge = this.getDecisionBadge(r.suggestedDecision);
      const isInclude = (r.finalDecision || r.suggestedDecision) === 'Include';
      const isExclude = (r.finalDecision || r.suggestedDecision) === 'Exclude';
      const isUnsure = (r.finalDecision || r.suggestedDecision) === 'Unsure';

      return `
        <div class="paper-card" id="paper_${r.id}">
          <div class="paper-header">
            <span class="paper-index">#${idx + 1}</span>
            <a href="${r.url || '#'}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
          </div>

          <div class="paper-meta">
            <span>👤 <b>Tác giả:</b> ${this.escapeHtml(r.authors || 'N/A')} ${r.uncertain_authors ? '<span class="tag-warn">Cần xác minh</span>' : ''}</span>
            <span>📅 <b>Năm:</b> ${r.year || 'N/A'} ${r.uncertain_year ? '<span class="tag-warn">Chưa chắc chắn</span>' : ''}</span>
            <span>🏛️ <b>Venue:</b> ${this.escapeHtml(r.venue || 'N/A')} ${r.uncertain_venue ? '<span class="tag-warn">Cần xác minh</span>' : ''}</span>
            <span>🔗 <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Trống (Scholar không có sẵn)</span>'}</span>
          </div>

          <div class="paper-snippet">
            <b>Đoạn trích (Snippet) [Không phải Abstract]:</b><br>
            <i>"${this.escapeHtml(r.snippet || 'Không có đoạn trích.')}"</i>
          </div>

          <div class="screening-panel">
            <div class="screening-header">
              <span><b>Gợi ý AI:</b> ${decisionBadge}</span>
              <span class="reason-text">${this.escapeHtml(r.screeningReason)}</span>
            </div>

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">Xác nhận của bạn (finalDecision):</span>
              <button class="btn-dec ${isInclude ? 'active-inc' : ''}" data-decision="Include">✓ Include</button>
              <button class="btn-dec ${isExclude ? 'active-exc' : ''}" data-decision="Exclude">✗ Exclude</button>
              <button class="btn-dec ${isUnsure ? 'active-uns' : ''}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi chú thẩm định của bạn..." value="${this.escapeHtml(r.userNotes || '')}">
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Gan su kien cho cac nut decision va note
    this.resultsContainer.querySelectorAll('.btn-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const parent = target.closest('.decision-buttons') as HTMLElement;
        const paperId = parent.getAttribute('data-id');
        const decision = target.getAttribute('data-decision') as ScreeningDecision;
        this.updatePaperDecision(paperId!, decision);
      });
    });

    this.resultsContainer.querySelectorAll('.notes-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const paperId = target.getAttribute('data-id');
        this.updatePaperNotes(paperId!, target.value);
      });
    });
  }

  private updatePaperDecision(paperId: string, decision: ScreeningDecision) {
    const record = this.allRecords.find(r => r.id === paperId);
    if (record) {
      record.finalDecision = decision;
    }
    const uniqueRecord = this.uniqueRecords.find(r => r.id === paperId);
    if (uniqueRecord) {
      uniqueRecord.finalDecision = decision;
    }
    this.renderRecordsList();
  }

  private updatePaperNotes(paperId: string, notes: string) {
    const record = this.allRecords.find(r => r.id === paperId);
    if (record) record.userNotes = notes;
    const uniqueRecord = this.uniqueRecords.find(r => r.id === paperId);
    if (uniqueRecord) uniqueRecord.userNotes = notes;
  }

  private getDecisionBadge(decision: ScreeningDecision): string {
    if (decision === 'Include') return '<span class="badge badge-green">Include</span>';
    if (decision === 'Exclude') return '<span class="badge badge-red">Exclude</span>';
    return '<span class="badge badge-yellow">Unsure</span>';
  }

  // Xuat CSV
  private handleExportCsv() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus('Chưa có bản ghi nào để xuất.', 'warning');
      return;
    }

    const headers = [
      'source',
      'title',
      'authors',
      'year',
      'venue',
      'doi',
      'abstract',
      'url',
      'query',
      'retrieval_date'
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\r\n';

    this.uniqueRecords.forEach(row => {
      const line = [
        escapeCsv(row.source || row.discoverySource || 'Google Scholar'),
        escapeCsv(row.title || ''),
        escapeCsv(row.authors || ''),
        escapeCsv(row.year || ''),
        escapeCsv(row.venue || ''),
        escapeCsv(row.doi || ''),
        escapeCsv(row.abstract || ''), // Khong coi snippet la abstract
        escapeCsv(row.url || ''),
        escapeCsv(row.query || ''),
        escapeCsv(row.retrieval_date || '')
      ].join(',');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '01_all_records.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.setStatus(`✓ Đã tải xuống file 01_all_records.csv (${this.uniqueRecords.length} bản ghi chuẩn UTF-8 BOM).`, 'success');
  }

  // Xuat JSON bang chung (da scrub sach moi credential)
  private handleExportJson() {
    if (!this.lastSanitizedEvidence) {
      this.setStatus('Không có dữ liệu bằng chứng JSON.', 'warning');
      return;
    }

    const blob = new Blob([JSON.stringify(this.lastSanitizedEvidence, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence_${this.searchSummary?.searchId || 'scholar'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.setStatus('✓ Đã tải file JSON Bằng chứng (Đã loại bỏ dữ liệu nhạy cảm).', 'success');
  }

  // Ghi search log vao search-log.md
  private async handleSaveLog() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus('Chưa có bản ghi nào để ghi nhật ký.', 'warning');
      return;
    }

    const uiVal = this.uiTotalInput.value.trim();
    const uiTotal = uiVal ? parseInt(uiVal, 10) : undefined;

    // Chon ngau nhien toi da 5 ban ghi lam spot-check
    const shuffled = [...this.uniqueRecords].sort(() => 0.5 - Math.random());
    const spotChecks = shuffled.slice(0, 5).map(r => ({
      title: r.title,
      year: r.year,
      venue: r.venue,
      doi: r.doi,
      url: r.url
    }));

    const payload = {
      query: this.queryInput.value.trim(),
      searchId: this.searchSummary?.searchId || `scholar_${Date.now()}`,
      method: 'SerpApi',
      params: {
        engine: 'google_scholar',
        as_ylo: this.asYloInput.value.trim() || '2020',
        as_yhi: this.asYhiInput.value.trim() || '2026',
        hl: this.hlInput.value.trim() || 'vi',
        totalRequests: this.apiRequestsUsed
      },
      apiTotalResults: this.searchSummary?.totalReportedResults || 0,
      uiTotalResults: uiTotal,
      collectedCount: this.allRecords.length,
      uniqueCount: this.uniqueRecords.length,
      dedupStats: this.dedupStats,
      spotChecks,
      retrievalDate: new Date().toISOString().split('T')[0]
    };

    this.setStatus('Đang gửi nhật ký tới backend để lưu vào search-log.md...', 'info');

    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.setStatus('✓ Đã ghi nhật ký vào search-log.md thành công (không ghi đè lượt tìm trước)!', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      this.setStatus(`Lỗi ghi nhật ký: ${err.message}`, 'error');
    }
  }

  private escapeHtml(text?: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ScholarExtensionApp();
  app.init();
});
