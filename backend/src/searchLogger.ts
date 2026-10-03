import fs from 'fs';
import path from 'path';
import { SearchLogPayload } from './types';
import { sanitizeString } from './sanitizer';

export function appendSearchLog(
  payload: SearchLogPayload,
  logFilePath?: string
): { success: boolean; path: string; error?: string } {
  const targetPath = logFilePath || path.resolve(__dirname, '../../../search-log.md');

  try {
    const today = payload.retrievalDate || new Date().toISOString().split('T')[0];
    const uiTotalStr = payload.uiTotalResults !== undefined ? String(payload.uiTotalResults) : 'Chưa nhập (đối chiếu thủ công)';
    const apiTotalStr = String(payload.apiTotalResults || 0);

    let diffNote = '';
    if (payload.uiTotalResults !== undefined && payload.uiTotalResults !== payload.apiTotalResults) {
      diffNote = `\n> **Lưu ý đối chiếu khác biệt:** Giao diện Web Scholar hiển thị xấp xỉ **${uiTotalStr}** kết quả, trong khi SerpApi báo **${apiTotalStr}** kết quả. Chênh lệch này do thuật ngữ nội bộ, lọc spam hoặc localization khác biệt giữa web session và API endpoint. Cả hai số đều được ghi nhận nguyên vẹn theo chuẩn PRISMA. Tuyệt đối không coi total_results là số bản ghi đã thu thập.`;
    } else {
      diffNote = `\n> **Ghi chú chuẩn PRISMA:** Tổng kết quả ước lượng từ nguồn: **${apiTotalStr}**. Số record thực tế thu thập: **${payload.collectedCount}**. Tuyệt đối không coi total_results là số paper đã thu thập.`;
    }

    const spotCheckSection = (payload.spotChecks || []).map((sc, idx) => {
      return `${idx + 1}. **Tiêu đề:** ${sc.title}
   - **Nguồn:** Google Scholar (SerpApi) | **Năm:** ${sc.year || 'N/A (Chưa xác minh)'} | **DOI:** \`${sc.doi || 'N/A (Cần bổ sung)'}\`
   - **Venue:** ${sc.venue || 'N/A'}
   - **URL gốc:** ${sc.url || 'N/A'}
   - **Kết quả đối chiếu:** [ ] Khớp 100% với bài viết gốc trên Google Scholar`;
    }).join('\n\n');

    const logEntry = `
---

## Nhật ký Tìm kiếm & Đối chiếu (Search Log) - Ngày: ${today} (SerpApi Google Scholar)

**Chuỗi truy vấn gốc (Search String):** \`${payload.query}\`
**Phương thức thu thập:** \`${payload.method || 'SerpApi'}\` (Engine: google_scholar)
**Bộ lọc tham số thực thi:** ${Object.entries(payload.params || {}).map(([k, v]) => `\`${k}=${v}\``).join(', ')}
**Mã tìm kiếm (Search ID):** \`${payload.searchId}\`
**Thời điểm thực thi:** \`${new Date().toISOString()}\`

### 1. Phép kiểm chứng 1: Khớp tổng số lượng (Total Count)
| Chỉ số đối soát | Số lượng | Trạng thái / Ghi chú đối chiếu |
| :--- | :--- | :--- |
| Số kết quả trên giao diện Scholar (UI web) | ${uiTotalStr} | Đối chiếu trực tiếp trên trình duyệt |
| Tổng kết quả SerpApi báo (total_results) | ${apiTotalStr} | Số ước lượng từ header search_information |
| Số bản ghi thực tế thu thập được | ${payload.collectedCount} | Số record đã bóc tách từ các trang |
| Trùng lặp theo DOI loại bỏ | ${payload.dedupStats?.dupByDoi ?? 0} | Khóa chính DOI |
| Trùng lặp theo Title loại bỏ | ${payload.dedupStats?.dupByTitle ?? 0} | Khóa phụ Title chuẩn hóa |
| **Số paper duy nhất đưa vào PRISMA** | **${payload.uniqueCount}** | **Identification phase** |
${diffNote}

### 2. Phép kiểm chứng 2: Đối chiếu thực địa (Ground-Truth Spot-check ${payload.spotChecks?.length || 0} mẫu)
${spotCheckSection || 'Không có bản ghi mẫu để kiểm tra chéo.'}

### 3. Phép kiểm chứng 3: Tính tái lập (Reproducibility)
- [ ] Chạy lại cùng một truy vấn với cùng tham số SerpApi (\`as_ylo=2020\`, \`as_yhi=2026\`, \`hl=vi\`): Kết quả số lượng thu được đồng nhất.

### 4. Ghi chú về Tóm tắt (Abstract) và Kỹ thuật EP/BVA
- Google Scholar API qua SerpApi chỉ cung cấp đoạn trích dẫn ngắn (\`snippet\`), **không cung cấp toàn văn hay abstract đầy đủ**.
- Toàn bộ bài viết chưa có abstract hoặc chưa chứng minh rõ ứng dụng Phân hoạch tương đương (EP) / Phân tích giá trị biên (BVA) được phân loại gợi ý là **Unsure** để nhà nghiên cứu đọc toàn văn trước khi xác nhận \`finalDecision\`.
`;

    // Sanitize log entry truoc khi ghi de tuyet doi khong co key bi lo
    const sanitizedEntry = sanitizeString(logEntry);

    fs.appendFileSync(targetPath, sanitizedEntry, 'utf-8');
    return { success: true, path: targetPath };
  } catch (err: any) {
    return { success: false, path: targetPath, error: err.message };
  }
}
