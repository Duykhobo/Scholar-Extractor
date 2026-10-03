import fs from 'fs';
import path from 'path';
import { SearchLogPayload } from './types';
import { sanitizeString } from './sanitizer';

import { config } from './config';

export function appendSearchLog(
  payload: SearchLogPayload,
  logFilePath?: string
): { success: boolean; path: string; error?: string } {
  const targetPath = logFilePath || path.join(config.workspaceDir, 'search-log.md');

  try {
    const today = payload.retrievalDate || new Date().toISOString().split('T')[0];
    const uiTotalStr = payload.uiTotalResults !== undefined ? String(payload.uiTotalResults) : 'Chưa nhập (đối chiếu thủ công)';
    const apiTotalStr = String(payload.apiTotalResults || 0);
    const candidatePapers = payload.candidateCount ?? payload.uniqueCount;

    let diffNote = '';
    if (payload.uiTotalResults !== undefined && payload.uiTotalResults !== payload.apiTotalResults) {
      diffNote = `\n> **Lưu ý đối chiếu khác biệt:** Giao diện Web Scholar hiển thị xấp xỉ **${uiTotalStr}** kết quả, trong khi SerpApi báo **${apiTotalStr}** kết quả. Chênh lệch này do thuật ngữ nội bộ, lọc spam hoặc localization khác biệt giữa web session và API endpoint. Cả hai số đều được ghi nhận nguyên vẹn theo chuẩn PRISMA. Tuyệt đối không coi total_results là số bản ghi đã thu thập.`;
    } else {
      diffNote = `\n> **Ghi chú chuẩn PRISMA:** Tổng kết quả ước lượng từ nguồn: **${apiTotalStr}**. Số record thực tế thu thập: **${payload.collectedCount}**. Tuyệt đối không coi total_results là số paper đã thu thập.`;
    }

    const spotCheckSection = (payload.spotChecks || []).map((sc, idx) => {
      return `${idx + 1}. **Tiêu đề:** ${sc.title}
   - **Nguồn:** Google Scholar (SerpApi - Ứng viên bổ trợ) | **Năm:** ${sc.year || 'N/A (Chưa xác minh)'} | **DOI:** \`${sc.doi || 'N/A (Cần bổ sung)'}\`
   - **Venue:** ${sc.venue || 'N/A'}
   - **URL gốc:** ${sc.url || 'N/A'}
   - **Kết quả đối chiếu:** [ ] Khớp 100% với bài viết gốc trên Google Scholar`;
    }).join('\n\n');

    const filterEntries = Object.entries(payload.params || {}).map(([k, v]) => `${k}=${v}`).join(', ');

    const logEntry = `
---

# Search log — T.Duy · nguồn phụ trách: Semantic Scholar + Google Scholar (seed & bổ sung)
*Ngày thực hiện: ${today} | Phương thức: ${payload.method || 'SerpApi'} (Engine: google_scholar) | Search ID: \`${payload.searchId}\`*

## Bảng log chính (theo search-log-template.md của nhóm SaoCungDuoc)
| # | Query nguyên văn | CSDL | Trường tìm | Bộ lọc | Ngày | Số kết quả | Số sau bỏ trùng | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| 1 | \`${payload.query}\` | Google Scholar (SerpApi) | Title / Abstract / All fields | \`${filterEntries}\` | ${today} | ${apiTotalStr} (UI: ${uiTotalStr}) | ${candidatePapers} | Nguồn seed & bổ trợ — KHÔNG đếm vào PRISMA |

## Tổng hợp
- Tổng trước dedup: **${payload.collectedCount}** · Sau dedup: **${candidatePapers}** *(Lưu ý: Google Scholar & Semantic Scholar chỉ dùng tìm seed + snowballing — KHÔNG đếm số vào PRISMA)*.

> **LƯU Ý PROTOCOL RBL (SaoCungDuoc · RQ FA26-EXT-12):** Nguồn Google Scholar đóng vai trò tìm kiếm tài liệu bổ trợ / snowballing (Supplementary Candidate Search). Theo protocol của nhóm, số lượng này **KHÔNG được tính trực tiếp vào nhánh Identification của sơ đồ PRISMA chính thống** (vốn chỉ dành cho 3 CSDL đếm chính: IEEE Xplore, ACM DL, OpenAlex).

### 1. Phép kiểm chứng 1: Khớp tổng số lượng (Total Count)
| Chỉ số đối soát | Số lượng | Trạng thái / Ghi chú đối chiếu |
| :--- | :--- | :--- |
| Số kết quả trên giao diện Scholar (UI web) | ${uiTotalStr} | Đối chiếu trực tiếp trên trình duyệt |
| Tổng kết quả SerpApi báo (total_results) | ${apiTotalStr} | Số ước lượng từ header search_information |
| Số bản ghi thực tế thu thập được | ${payload.collectedCount} | Số record đã bóc tách từ các trang |
| Trùng lặp chính xác theo DOI loại bỏ | ${payload.dedupStats?.exactDupByDoi ?? 0} | Khóa chính DOI |
| Đề xuất trùng lặp theo Title giữ lại xem xét | ${payload.dedupStats?.potentialDupByTitle ?? 0} | Giữ lại để người dùng đối chiếu |
| **Số paper ứng viên bổ trợ (Candidate Papers)** | **${candidatePapers}** | **Nguồn bổ trợ ngoài sơ đồ PRISMA chính** |
${diffNote}

### 2. Phép kiểm chứng 2: Đối chiếu thực địa (Ground-Truth Spot-check ${payload.spotChecks?.length || 0} mẫu)
- Đối chiếu tiêu đề, năm và DOI giữa bản ghi thu thập và bài báo gốc:
${spotCheckSection || 'Không có bản ghi mẫu để kiểm tra chéo.'}

### 3. Phép kiểm chứng 3: Tính tái lập (Reproducibility)
- [ ] Chạy lại cùng một truy vấn với cùng tham số SerpApi (\`as_ylo=2020\`, \`as_yhi=2026\`, \`hl=vi\`): Kết quả số lượng thu được đồng nhất.

### 4. Ghi chú về Tiêu chí Sàng lọc IC/EC cho REST API Testing
- **Phạm vi nghiên cứu (Scope):** Sinh ca kiểm thử tự động cho REST APIs (Automated Test Case Generation for REST APIs).
- **Loại trừ theo EC-O:** Các nghiên cứu chỉ tập trung vào kiểm thử đơn vị nội bộ (internal unit testing, method/class level unit testing, JUnit) không liên quan đến REST API đều bị loại theo \`EC-O\` (Out of Scope).
- **Hợp lệ (AI / LLM):** Các nghiên cứu ứng dụng AI / LLM / Machine Learning sinh ca kiểm thử cho REST API hoàn toàn hợp lệ, không bị loại trừ.
- **Tình trạng Tóm tắt:** Google Scholar API qua SerpApi chỉ cung cấp đoạn trích dẫn ngắn (\`snippet\`), **không cung cấp toàn văn hay abstract đầy đủ**. Toàn bộ bài báo thiếu abstract hoặc thiếu bằng chứng quan trọng được phân loại gợi ý là **Unsure** [EC-A] để thẩm định qua toàn văn trước khi xác nhận \`finalDecision\`.
`;

    // Sanitize log entry truoc khi ghi de tuyet doi khong co key bi lo
    const sanitizedEntry = sanitizeString(logEntry);

    fs.appendFileSync(targetPath, sanitizedEntry, 'utf-8');
    return { success: true, path: targetPath };
  } catch (err: any) {
    return { success: false, path: targetPath, error: err.message };
  }
}
