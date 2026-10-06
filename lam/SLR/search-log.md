# Search log — Lâm · nguồn phụ trách: ACM Digital Library
*Nhóm 1 — SaoCungDuoc · RQ FA26-EXT-12 · Cập nhật: 04/10/2026*

## 1. Nhật ký chạy query (ghi MỌI phiên bản chuỗi + số kết quả)

| Lần | Chuỗi tìm (nguyên văn) | CSDL | Trường tìm | Bộ lọc | Ngày chạy | Số kết quả | Ghi chú |
|---|---|---|---|---|---|---|---|
| **V1** | `("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")` | ACM DL | AllField (mặc định) | Không đặt lọc | 04/10/2026 | **6** | < 20 kết quả → theo quy tắc: bỏ khối O để nới (bản V2) |
| **V2** | `("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing")` | ACM DL | AllField (mặc định) | Không đặt lọc | 04/10/2026 | **10** | Vẫn < 20 → tiếp tục nới bằng từ đồng nghĩa (String B/C) |
| **V3** | `("REST API" OR "RESTful API" OR "REST API testing" OR RESTest OR RESTestBench) AND ("equivalence partitioning" OR "equivalence class partitioning" OR "boundary value analysis" OR "boundary value testing" OR "boundary testing") AND ("fault detection" OR "faults found" OR "bug detection" OR "bugs found" OR defects OR failures OR "mutation testing" OR "mutation score" OR "mutant detection")` | ACM DL | AllField (mặc định) | Không đặt lọc | 04/10/2026 | **52** | ✅ Chuỗi chạy chính — bộ record chính của nguồn ACM |

*Ghi chú kiểm chứng: (1) Ngày chạy tạm ghi 04/10/2026 — sửa nếu thực tế khác. (2) Trường tìm/bộ lọc ghi theo mặc định khi chạy — sửa nếu có đặt cụ thể.*

## 2. Xử lý đặc biệt trong quá trình tìm

1. **ACM trả về nhiều record dạng "tập kỷ yếu" (proceedings)** — không phải bài báo đơn. Cách xử lý:
   - Các tập kỷ yếu **vẫn ghi nhận trong 01_all_records.csv** và **loại ở vòng lọc V1 với mã EC-N** (kèm ghi chú rõ).
   - Đồng thời **mở mục lục** các tập liên quan (trong ACM DL) để **tách các bài bên trong**: đã quét **20 tập** → **1.846 tiêu đề** → lọc theo từ khóa chủ đề → **120 bài khớp** → chọn **16 bài sát chủ đề nhất** đưa vào sàng lọc như record thường (xem `phu-luc_muc-luc-ky-yeu.md`).
2. **03 DOI bổ sung ngoài bản export**: `10.1145/3491038`, `10.1145/3540250.3549144`, `10.1145/3540250.3559080` — rất sát RQ, giữ lại với nhãn "V3 (bổ sung)".
3. **Tổng hợp số**: V1 6 + V2 10 + V3 52 + bổ sung 3 + mục lục 16 = **87 record thô** → sau loại trùng (EC-D): **73 record** (khớp `01_all_records.csv`).
4. Tra cứu bổ trợ (DOI.org / Crossref / OpenAlex) chỉ dùng để lấy metadata phục vụ ghi nhận & sàng lọc — **không tạo record mới** ngoài danh sách trên.

## 3. Thay đổi so với protocol

| Ngày | Thay đổi | Lý do |
|---|---|---|
| 04/10/2026 | Dời ngày dừng search: 04/10 → **23:59 05/10/2026** | Cần thêm thời gian hoàn tất chạy & tổng hợp (sửa lý do cho đúng thực tế) |
| 04/10/2026 | Bổ sung bước "mở mục lục kỷ yếu" vào quy trình nguồn ACM | ACM trả về record volume-level; bài liên quan nằm bên trong — tách ra để không bỏ sót record |
