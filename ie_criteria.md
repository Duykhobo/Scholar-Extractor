# Bộ tiêu chí Inclusion / Exclusion (IC/EC) & Hướng dẫn áp dụng

Nhóm: 1 (SaoCungDuoc) · RQ: FA26-EXT-12 (REST API Testing EP/BVA)

---

## 1. Tiêu chí Sàng lọc Cố định (Fixed IC/EC)

- **IC-L**: Paper viết bằng tiếng Anh (phải có bằng chứng ngôn ngữ riêng, không tự đánh dấu đạt khi chưa xác minh).
- **IC-T**: Đăng trên conference hoặc journal khoa học (không phải blog, thesis, dissertation; phải có bằng chứng venue hoặc metadata xuất bản).
- **IC-E**: Có ít nhất 1 con số kết quả thực nghiệm trong Table hoặc Figure (không coi việc chỉ nhắc tên metric trong abstract/text là bằng chứng).
- **EC-D**: Trùng lặp với paper đã có trong hệ thống (Duplicate).
- **EC-A**: Không thể tải được toàn văn bài báo (CHỈ gắn sau khi đã xác nhận không thể truy cập full-text; KHÔNG gắn khi chỉ thiếu abstract).
- **EC-S**: Dưới 4 trang (abstract ngắn, poster) — CHỈ áp dụng khi xác minh số trang full-text < 4; không đoán từ snippet hay nhãn tiêu đề.
- **EC-N**: Không có thực nghiệm (vision paper, tutorial, position paper).

---

## 2. Tiêu chí theo Research Question FA26-EXT-12 (REST API Testing EP/BVA)

- **IC-Y**: Xuất bản từ năm 2020 trở đi (khung 2020 – 2026). Ghi thêm ngày chốt tìm kiếm theo protocol; mọi lần nới khoảng năm phải được ghi log.
- **IC-P**: REST API: kiểm thử ở mức request cho dịch vụ HTTP (yêu cầu NL và/hoặc schema API: OpenAPI, Swagger, RAML). GraphQL riêng lẻ không đạt IC-P.
- **IC-I**: Kỹ thuật thiết kế test black-box: Phân hoạch tương đương (Equivalence Partitioning - EP) và/hoặc Phân tích giá trị biên (Boundary-Value Analysis - BVA) cho tham số request.
- **EC-O (Out of Scope)**: Loại bỏ các chủ đề ngoại vi:
  1. Kiểm thử giao diện người dùng UI / E2E web testing (Selenium, Cypress, Playwright, DOM UI);
  2. Kiểm thử đơn vị nội bộ (unit test class/method level, JUnit, package-level, developer-written unit tests);
  3. Thuần báo cáo lỗi / bản địa hóa lỗi (fault localization, bug triage) không có kỹ thuật sinh ca kiểm thử;
  4. Lĩnh vực phi phần mềm (y sinh, lâm sàng, vật liệu...) hoặc xuất bản ngoài khung năm quy định.

---

## 3. Ba Điểm Làm Rõ Quan Trọng

| Điểm | Vấn đề | Quy tắc thống nhất |
|---|---|---|
| **IC-P** | “Yêu cầu NL + schema API” dễ hiểu là bắt buộc có cả hai | Chấp nhận **NL và/hoặc schema API** (ví dụ bài sinh test từ OpenAPI/Swagger mà không bắt buộc có thêm tài liệu ngôn ngữ tự nhiên). GraphQL riêng lẻ không đạt IC-P. |
| **IC-I** | Có thể nhầm mọi kỹ thuật TSL, fuzzing hoặc LLM đều đạt | Chỉ đạt khi có bằng chứng dùng **EP và/hoặc BVA cho tham số request**. Tên công cụ hoặc từ khóa riêng lẻ chưa đủ. Category Partition/TSL chỉ được tính khi nội dung mô tả cho thấy áp dụng EP/BVA cho tham số request; không tự động coi là EP/BVA. |
| **IC-Y** | “Từ 2020 trở đi” chưa ghi thời điểm kết thúc thu thập | Ghi thêm ngày chốt tìm kiếm theo protocol (2020 – 2026); mọi lần nới khoảng năm phải được ghi log đối soát. |

---

## 4. Hướng Dẫn Áp Dụng Tiêu Chí (Đồng Bộ Cả Nhóm)

### Vòng 1 — Title/Abstract
- Đánh giá từ title, abstract và metadata đã xác minh.
- Thiếu bằng chứng để kết luận thì ghi `Unsure` và nêu thông tin cần kiểm tra trong `missingEvidence`.
- Không suy diễn thiếu abstract thành `EC-A`.
- Không suy diễn abstract không nhắc thực nghiệm thành `EC-N`.

### Vòng 2 — Full-text
- **IC-I**: cần bằng chứng phương pháp dùng EP và/hoặc BVA cho tham số REST API request.
- **Category partition/TSL** chỉ được tính khi nội dung mô tả cho thấy đáp ứng IC-I; không tự động coi là EP/BVA.
- **IC-E**: ghi rõ số trang, Table/Figure và con số kết quả. Chỉ nhắc tên metric trong abstract chưa đủ.
- **IC-T**: kiểm tra loại xuất bản thực tế. Bản trên arXiv có thể là bản của bài conference/journal; cần xác minh venue.
- **EC-S**: xác minh số trang từ bản full-text, không đoán từ snippet.
- **EC-A**: chỉ áp dụng sau khi đã thử truy cập full-text và ghi lại nguồn đã thử cùng ngày kiểm tra.

### Quyết định và Bằng chứng
- **Include**: đáp ứng toàn bộ IC và không vướng EC sau hai vòng.
- **Exclude**: ghi mã tiêu chí không đạt hoặc EC áp dụng, kèm lý do và bằng chứng.
- **Unsure**: chưa đủ thông tin; không tự chuyển thành Include.
- AI/extension chỉ gợi ý; người review xác nhận quyết định cuối (`finalDecision`).
- Dùng LLM không phải lý do loại; vẫn phải đáp ứng IC-I (EP/BVA cho REST parameters).

### Trùng lặp
- Ưu tiên đối chiếu DOI; sau đó title, authors, year và full-text.
- Title gần giống chỉ tạo cờ `potentialDuplicate`.
- Khi xác nhận trùng, giữ một record chính và liên kết các bản còn lại; giữ lịch sử nguồn thu thập.
