# Scholar Extractor - Công cụ Thu thập & Sàng lọc Tài liệu Đa Nghiên cứu Khoa học

**Scholar Extractor** là công cụ chuyên nghiệp phục vụ tổng quan tài liệu khoa học (**Systematic Literature Review - SLR**, **Scoping Review**, **Literature Review**) tuân thủ quy trình chuẩn **PRISMA 2020**. 

Ban đầu được thiết kế cho đề tài kiểm thử REST API môn SWT302, hệ thống đã được nâng cấp toàn diện thành nền tảng **đa nghiên cứu (multi-research profiles)**, cho phép quản lý độc lập nhiều đề tài, định nghĩa bộ tiêu chí và chuỗi tìm kiếm tùy biến, thu thập metadata, phân tích bằng chứng toàn văn và xuất báo cáo trích dẫn chuẩn **APA 7th Edition**.

---

## 🌟 Tính năng nổi bật

1. **Hồ sơ nghiên cứu độc lập (Research Profiles)**:
   - Quản lý nhiều đề tài độc lập trên cùng một giao diện. Chuyển đổi nghiên cứu không làm trộn lẫn bài báo, ghi chú hay quyết định sàng lọc.
   - Hỗ trợ tạo mới, chỉnh sửa qua biểu mẫu tiêu chí trực quan, nhân bản, xuất và nhập hồ sơ dưới dạng file JSON.
   - Phiên bản hóa hồ sơ (`profileVersion`): Khi thay đổi tiêu chí, hệ thống giữ nguyên quyết định thủ công (`finalDecision`) của người nghiên cứu nhưng gắn cờ cảnh báo cần đánh giá lại các gợi ý tự động.
2. **Ba hồ sơ mẫu (Presets) tích hợp sẵn**:
   - **SWT302 REST API EP/BVA**: Giữ nguyên toàn bộ chính sách và logic đặc thù cho bài toán kiểm thử REST API bằng Phân hoạch tương đương (EP) và Phân tích giá trị biên (BVA).
   - **Generic Literature Review**: Hồ sơ tổng quan chung, không ép buộc ngành hẹp, không giới hạn năm, không đòi hỏi bảng thực nghiệm định lượng hay độ dài trang tối thiểu.
   - **Giao tiếp hỗ trợ và sự tự tin của trẻ khiếm thị**: Hồ sơ minh họa cho nghiên cứu xã hội/giáo dục đặc biệt với các nhóm từ khóa về AAC, trẻ khiếm thị và sự tự tin; không áp đặt giới hạn năm 2020–2026 hay số trang nếu người dùng chưa cấu hình.
3. **Screening Engine theo cấu hình an toàn**:
   - Đánh giá từng tiêu chí độc lập thông qua các evaluator chuyên biệt: `year_range`, `publication_type`, `language`, `page_count`, `full_text_availability`, `keyword_group`, `duplicate`, `manual_assessment`, `swt302_ep_bva`.
   - **Tuyệt đối không sử dụng `eval()` hoặc thực thi mã JavaScript tùy ý**.
   - Tách biệt rõ ràng giữa gợi ý của hệ thống (`suggestedDecision`) và quyết định thẩm định của con người (`finalDecision`). Hệ thống không bao giờ tự động ghi đè quyết định của người dùng.
   - Không suy diễn sai lệch: Thiếu abstract không có nghĩa là không tải được full-text; trùng từ khóa chỉ là tín hiệu liên quan, không tự chứng minh quan hệ nhân quả.
4. **Cách ly phiên làm việc & Chống lệch truy vấn (Query Desync)**:
   - Mỗi phiên (`ResearchSession`) được định danh duy nhất bởi `researchId`, `profileVersion`, `sessionId`, `query` và tham số tìm kiếm.
   - Tách biệt chuỗi đang gõ trong ô tìm kiếm và chuỗi của kết quả đang hiển thị. Cảnh báo rõ ràng nếu có sự khác biệt.
   - Thao tác "Lấy trang 1" với truy vấn mới sẽ tự động thiết lập lại phân trang (`start=0`) và tạo phiên làm việc mới.
   - Bảo vệ phản hồi muộn (Late response protection): Kết quả của truy vấn cũ trả về sau khi người dùng đã chuyển truy vấn sẽ bị hủy bỏ an toàn, không ghi đè vào phiên mới.
5. **Trích xuất bằng chứng từ Tab & Tải trực tiếp file PDF**:
   - Trích xuất tự động metadata và bằng chứng từ tab trình duyệt đang mở (HTML hoặc PDF trực tiếp).
   - Hỗ trợ tải trực tiếp tệp PDF từ máy tính để phân tích nội dung, đếm số trang thực tế và bóc tách bảng biểu.
   - Cảnh báo xung đột tiêu đề trước khi cập nhật dữ liệu vào bài báo.
6. **Bảo mật & Xuất dữ liệu đa định dạng**:
   - Chặn tấn công **SSRF** khi tải PDF (chặn dải IP nội bộ `127.0.0.1`, `10.x`, `172.16-31.x`, `192.168.x`, AWS/GCP metadata `169.254.169.254` và theo dõi an toàn tối đa 5 bước chuyển hướng).
   - Chống **CSV Formula Injection**: Tự động vô hiệu hóa các ký tự nguy hiểm (`=`, `+`, `-`, `@`, `\t`, `\r`) ở đầu ô dữ liệu.
   - Xuất dữ liệu:
     - `01_all_records.csv`: Metadata 10 cột chuẩn PRISMA (UTF-8 BOM).
     - `02_screening_decisions.csv`: Bảng quyết định và lý do sàng lọc cơ bản.
     - `02_screening_decisions_full.csv`: Bảng dữ liệu sàng lọc mở rộng với đầy đủ kết quả từng tiêu chí, provenance và phiên bản hồ sơ.
     - `03_references_apa7.txt`: Danh mục trích dẫn chuẩn **APA 7th Edition**, phân tách nghiêm ngặt giữa bài báo đủ metadata và danh sách bài thiếu thông tin cần bổ sung thủ công (không tự bịa đặt trường còn thiếu).
     - Backup Session JSON: Lưu trữ đầy đủ trạng thái phiên, hồ sơ nghiên cứu và lịch sử bằng chứng.

---

## 📁 Cấu trúc thư mục

```text
extension/
├── backend/                            # Backend Node.js + TypeScript
│   ├── src/
│   │   ├── profiles/                   # [MỚI] Module Quản lý Hồ sơ & Screening Engine
│   │   │   ├── types.ts                # Định nghĩa schema ResearchProfile, Criterion, Evaluator
│   │   │   ├── presets.ts              # 3 Presets chuẩn (SWT302, Generic, Trẻ khiếm thị)
│   │   │   ├── validator.ts            # Runtime validation & làm sạch tham số (chống eval)
│   │   │   ├── engine.ts               # Screening Engine đánh giá từng tiêu chí độc lập
│   │   │   └── index.ts
│   │   ├── pdfService.ts               # Xử lý PDF an toàn (Chống SSRF, đếm trang, bóc tách text)
│   │   ├── exporter.ts                 # Xuất CSV chuẩn, Full CSV & APA 7th References
│   │   ├── scholarService.ts           # Tích hợp Google Scholar qua SerpApi
│   │   ├── evidenceAnalyzer.ts         # Phân tích bằng chứng từ Tab và tệp PDF
│   │   ├── dedup.ts                    # Khử trùng lặp (DOI chính xác vs Title tương đồng)
│   │   ├── searchLogger.ts             # Ghi nhật ký vào search-log.md
│   │   ├── config.ts & types.ts
│   │   └── server.ts                   # Express server API RESTful
│   ├── tests/
│   │   ├── profiles.test.ts            # Bộ kiểm thử cho Profiles, Engine, SSRF, CSV & APA 7
│   │   ├── scholar.test.ts             # Bộ kiểm thử đơn vị cho Scholar, Dedup & Screening
│   │   └── live_integration.test.ts   # Kiểm tra tích hợp API thật
│   ├── package.json
│   └── tsconfig.json
│
├── chrome_extension/                   # Tiện ích mở rộng Chrome (Manifest V3 + TypeScript)
│   ├── manifest.json                   # Cấu hình tiện ích Manifest V3
│   ├── popup.html                      # Giao diện quản lý nghiên cứu, tìm kiếm & sàng lọc
│   ├── popup.css                       # Giao diện styling hiện đại
│   ├── popup.js & content-script.js    # Mã bundle sinh bởi esbuild
│   ├── src/
│   │   ├── popup.ts                    # Controller giao diện, quản lý hồ sơ, session & modal
│   │   ├── presets.ts                  # Bản sao offline của các hồ sơ mẫu
│   │   ├── content-script.ts           # Trích xuất dữ liệu DOM từ trang web
│   │   └── types.ts                    # Khai báo kiểu TypeScript phía Extension
│   ├── package.json
│   └── tsconfig.json
│
├── slr_pipeline/                       # Pipeline dòng lệnh Python cho các nguồn mở
│   ├── adapters/                       # OpenAlex, arXiv, Semantic Scholar
│   ├── pipeline/                       # Dedup, Exporter, Validator
│   └── main.py                         # CLI hỗ trợ tham số --profile, --research-id, --session-id
│
├── 01_all_records.csv                  # Dữ liệu xuất metadata PRISMA (UTF-8 BOM)
├── 02_screening_decisions_full.csv     # Dữ liệu xuất sàng lọc mở rộng
├── 03_references_apa7.txt              # Danh mục trích dẫn chuẩn APA 7
├── search-log.md                       # Nhật ký đối chiếu kết quả tìm kiếm
└── README.md
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Khởi động Backend Node.js

1. Mở terminal và chuyển đến thư mục `backend`:
   ```bash
   cd backend
   npm install
   ```
2. Cấu hình biến môi trường trong file `.env`:
   ```env
   PORT=3001
   SERPAPI_KEY=your_serpapi_key_here
   ```
3. Chạy backend server:
   ```bash
   npm start
   # Server sẽ hoạt động tại http://localhost:3001
   ```
4. Chạy bộ kiểm thử tự động (Mock API, hoàn toàn không tốn quota):
   ```bash
   npm run test:unit
   ```

### 2. Cài đặt Chrome Extension (Manifest V3)

1. Biên dịch TypeScript cho extension bằng esbuild:
   ```bash
   cd chrome_extension
   npm install
   npm run build
   ```
2. Mở trình duyệt Chrome hoặc Microsoft Edge:
   - Truy cập `chrome://extensions/` (hoặc `edge://extensions/`).
   - Bật **Developer mode** (Chế độ dành cho nhà phát triển).
   - Chọn **Load unpacked** (Tải tiện ích đã giải nén) và trỏ đến thư mục:
     `c:\Users\ThanhDuy\Documents\03_Tool_Configs\extension\chrome_extension`
3. Mở tiện ích bằng cách nhấp vào biểu tượng **Scholar Extractor** trên thanh công cụ trình duyệt.

---

## 📖 Hướng dẫn Sử dụng Hệ thống

### 1. Tạo và Quản lý Hồ sơ Nghiên cứu (Research Profiles)

- **Chọn nghiên cứu**: Tại thanh tiêu đề trên cùng, sử dụng hộp chọn **"🎯 Nghiên cứu"** để chuyển đổi giữa các đề tài khác nhau. Dữ liệu thu thập và kết quả sàng lọc của từng nghiên cứu được cách ly hoàn toàn.
- **Nạp nhanh Preset mẫu**:
  - Bấm **"⚙️ Quản lý Hồ sơ"** để mở modal quản lý.
  - Chọn một trong các preset: `REST API EP/BVA (SWT302)`, `Generic Review (Tự do)` hoặc `Trẻ khiếm thị & AAC`.
- **Tạo hồ sơ mới hoặc Chỉnh sửa**:
  - Trong modal quản lý, bấm **"+ Tạo mới"** hoặc nút **"Sửa"** tại một hồ sơ hiện có.
  - Điền tên nghiên cứu, câu hỏi nghiên cứu (RQ), loại tổng quan và mục tiêu số bài Include (`targetIncludedCount`).
  - Cấu hình các tiêu chí phổ biến:
    - *Khoảng năm xuất bản*: Đặt năm bắt đầu và kết thúc (hoặc bỏ chọn để không giới hạn).
    - *Số trang tối thiểu*: Thiết lập độ dài bài báo tối thiểu (ví dụ: 4 trang) để tự động loại bỏ poster, tóm tắt hội thảo.
    - *Từ khóa bắt buộc*: Nhập danh sách từ khóa cốt lõi (phân tách bởi dấu phẩy).
  - Bấm **"Lưu Hồ sơ"**. Khi tiêu chí thay đổi, phiên bản hồ sơ sẽ tự động tăng (`profileVersion + 1`).
- **Xuất / Nhập Hồ sơ JSON**:
  - Bấm **"📤 Xuất JSON"** để tải file cấu hình hồ sơ về máy tính.
  - Bấm **"📥 Nhập JSON"** để nạp một hồ sơ nghiên cứu từ đồng nghiệp hoặc dự án khác.

### 2. Thu thập Metadata & Tránh Lệch Truy vấn

1. Chọn một chuỗi tìm kiếm từ danh sách **"Gợi ý chuỗi"** của hồ sơ hoặc nhập chuỗi nguyên văn vào ô tìm kiếm.
2. Nếu bạn chỉnh sửa chuỗi tìm kiếm trong khi bảng đang hiển thị kết quả của phiên trước, hệ thống sẽ hiển thị cảnh báo màu vàng:
   > ⚠️ **LƯU Ý ĐỒNG BỘ:** Chuỗi tìm kiếm trong ô nhập liệu khác với kết quả phiên đang hiển thị. Nhấn **"🔍 Lấy trang 1"** để bắt đầu phiên mới cho truy vấn này.
3. Bấm **"🔍 Lấy trang 1 (start=0)"** để bắt đầu thu thập:
   - Offset được đặt lại `start=0`.
   - Một mã phiên (`sessionId`) mới được khởi tạo.
   - Bảng kết quả được làm mới cho truy vấn mới.
4. Bấm **"⏩ Lấy trang tiếp (+10)"** hoặc **"⚡ Lấy tối đa trang đã đặt"** để thu thập thêm các trang sau. Có thể bấm **"⏹ Dừng / Hủy"** bất cứ lúc nào mà không làm mất dữ liệu đã thu thập.

### 3. Thẩm định Tiêu chí & Ghi nhận Quyết định

- Mỗi bài báo hiển thị các huy hiệu đánh giá từng tiêu chí:
  - Màu xanh lá (`✓`): Tiêu chí đạt (`met`).
  - Màu đỏ (`✗`): Tiêu chí không đạt (`not_met`).
  - Màu vàng (`?`): Chưa đủ thông tin hoặc chưa xác minh (`unknown`).
- **Quy tắc gợi ý tự động**:
  - Tiêu chí Inclusion bắt buộc không đạt $\rightarrow$ Gợi ý **Exclude**.
  - Tiêu chí Exclusion đạt $\rightarrow$ Gợi ý **Exclude**.
  - Còn tiêu chí bắt buộc chưa rõ $\rightarrow$ Gợi ý **Unsure**.
  - Chỉ gợi ý **Include** khi toàn bộ tiêu chí bắt buộc đều đạt và không vi phạm bất kỳ tiêu chí loại trừ nào.
- **Quyết định thẩm định của người dùng (`finalDecision`)**:
  - Người nghiên cứu chủ động bấm một trong ba nút: **`✓ Include`**, **`✗ Exclude`**, **`? Unsure`**.
  - Nhập ghi chú phương pháp vào ô văn bản phía dưới.
  - Hệ thống **tuyệt đối không tự động ghi đè** `finalDecision` của bạn khi chạy lại phân tích.
  - Tiến độ **"Tiến độ Bài đưa vào Tổng quan (Target Included Papers)"** chỉ tính các bài báo có `finalDecision === 'Include'`.

### 4. Tự động Truy cập Link & Sàng lọc (Auto-Screening)

Nhằm giảm tải việc mở từng tab thủ công cho hàng trăm bài báo, Scholar Extractor hỗ trợ 2 chế độ tự động hóa:

1. **⚡ Quét tự động từng bài (`⚡ Quét link`)**:
   - Trên mỗi thẻ bài báo, bấm nút **`⚡ Quét link`** (ngay cạnh nút `📑 Tab`).
   - Hệ thống sẽ tự động quét URL ngầm, trích xuất HighWire meta tags (`citation_abstract`, `citation_doi`, `citation_title`...), bóc tách bằng chứng theo tiêu chí của hồ sơ hiện tại và cập nhật quyết định gợi ý ngay lập tức mà không cần người dùng tự chuyển tab.
2. **⚡ Tự động quét & Sàng lọc hàng loạt (`Batch Auto-Screen`)**:
   - Bấm nút **`⚡ Tự động quét & Sàng lọc`** trên thanh công cụ kết quả.
   - Chọn phạm vi:
     - *Chỉ các bài chưa có Abstract / chưa xác minh* (Khuyên dùng).
     - *10 bài tiếp theo* hoặc *20 bài tiếp theo* (để nhanh chóng đạt mục tiêu số bài Include).
     - *Toàn bộ danh sách bài báo*.
   - Tùy chọn: `[✓] Tự động xác nhận (finalDecision = Include)` nếu bài báo vượt qua toàn bộ tiêu chí nhận vào và không vi phạm tiêu chí loại trừ.
   - Bấm **"🚀 Bắt đầu quét tự động"**: Hệ thống sẽ chạy tuần tự ngầm, hiển thị thanh tiến độ trực quan, và có thể bấm **`⏹️ Dừng quét`** bất kỳ lúc nào.
3. **Thủ công từ Tab đang mở hoặc Tải PDF**:
   - Mở tab bài báo trên trình duyệt và bấm **"📑 Tab"** trên bài báo đó.
   - Hoặc bấm **"📁 Tải file PDF"** để nạp tệp PDF tải về từ máy.
4. Bấm **"✓ Xác nhận Cập nhật"** khi xem trước để ghi nhận nguồn gốc xuất xứ (`provenance`).

### 5. Xuất Dữ liệu & Trích dẫn APA 7

Tại thanh công cụ cuối trang kết quả:
- **`📥 01_all_records.csv (PRISMA)`**: Xuất file CSV 10 cột truyền thống theo chuẩn PRISMA.
- **`📊 02_screening_decisions.csv`**: Xuất quyết định và ghi chú thẩm định cơ bản.
- **`📑 Xuất Sàng lọc Đầy đủ (CSV)`**: Xuất file `02_screening_decisions_full.csv` chứa đầy đủ mã nghiên cứu (`researchId`), phiên bản hồ sơ (`profileVersion`), mã phiên (`sessionId`), tình trạng toàn văn, kết quả từng tiêu chí và ghi chú thẩm định.
- **`📖 Xuất References APA 7th`**: Xuất file `03_references_apa7.txt` chứa danh mục tài liệu tham khảo theo đúng định dạng APA 7th Edition:
  - *Phần 1*: Các bài báo có đầy đủ 4 trường cốt lõi (tác giả có cấu trúc, năm, tiêu đề in nghiêng venue, kèm DOI chuẩn).
  - *Phần 2*: Danh sách cảnh báo các bài báo thiếu thông tin cần bổ sung thủ công (tuyệt đối không bịa đặt các trường còn thiếu).
- **`📦 Tải Session JSON`**: Tải bản sao lưu toàn bộ phiên làm việc để khôi phục hoặc chia sẻ.

---

## 🐍 Tích hợp Python Pipeline (`slr_pipeline`)

Pipeline dòng lệnh bằng Python được nâng cấp để sử dụng cùng schema hồ sơ nghiên cứu và cơ chế cách ly phiên:

```bash
cd slr_pipeline

# 1. Chạy với hồ sơ mặc định SWT302
python main.py --query "REST API testing automated" --limit 30

# 2. Chạy với hồ sơ mẫu Generic Literature Review
python main.py --profile generic_literature_review --query "deep learning healthcare diagnosis" --limit 50

# 3. Chạy với tệp hồ sơ JSON tùy biến và gán mã phiên
python main.py --profile path/to/my_profile.json --research-id "study_aac_2026" --session-id "sess_cli_01" --limit 40
```

Kết quả xuất ra sẽ lưu vào thư mục `outputs/` với tên tệp gắn kèm mã nghiên cứu (ví dụ: `01_all_records_study_aac_2026.csv`), bảo đảm không ghi đè dữ liệu của các nghiên cứu khác.

---

## 🛡️ Cam kết Kỹ thuật & Bảo mật

- **Không rò rỉ khóa API**: `SERPAPI_KEY` chỉ tồn tại trong bộ nhớ backend, không xuất hiện ở client bundle, response xuất ra hay git history.
- **Chống mã độc**: Mọi dữ liệu người dùng nhập hoặc trích xuất từ web bên ngoài đều được làm sạch trước khi render HTML và chống tấn công formula injection khi xuất file CSV.
- **Bảo vệ mạng nội bộ**: Mô-đun tải PDF tích hợp bộ lọc IP riêng tư nhiều lớp, ngăn chặn việc khai thác máy chủ để quét cổng hoặc truy cập tài nguyên nội bộ qua URL do người dùng cung cấp.
