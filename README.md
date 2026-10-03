# Bộ công cụ thu thập Metadata phục vụ Systematic Literature Review (SLR) - SWT302

Dự án được xây dựng bám sát theo tài liệu chuẩn **Research-Based Learning (RBL)** môn **SWT302** (FPT University) và quy trình **PRISMA 2020**.

---

## 📁 Cấu trúc thư mục

```text
extension/
├── backend/                            # [MỚI] Backend Node.js + TypeScript cho SerpApi Google Scholar
│   ├── .env                            # Chứa SERPAPI_KEY (không commit Git / không đưa ra client)
│   ├── .env.example                    # Template mẫu cấu hình
│   ├── evidence/                       # Bằng chứng JSON lưu trữ sau khi đã lọc sạch dữ liệu nhạy cảm
│   ├── src/
│   │   ├── config.ts                   # Quản lý cấu hình & đọc biến môi trường
│   │   ├── types.ts                    # Schema 10 cột, trạng thái screening & audit flags
│   │   ├── sanitizer.ts                # Khử toàn bộ khóa bí mật / API key trong response, log & export
│   │   ├── screening.ts                # Quy tắc gợi ý IC/EC & kiểm định EP/BVA
│   │   ├── dedup.ts                    # Khử trùng lặp (Khóa chính DOI -> Khóa phụ Title chuẩn hóa)
│   │   ├── scholarService.ts           # Gọi SerpApi Google Scholar có kiểm tra tham số nghiêm ngặt
│   │   ├── searchLogger.ts             # Ghi nhật ký vào search-log.md (không ghi đè lượt tìm trước)
│   │   ├── exporter.ts                 # Xuất CSV chuẩn 10 cột UTF-8 BOM (\uFEFF)
│   │   └── server.ts                   # Express server cung cấp endpoint /api/scholar/*
│   ├── tests/
│   │   ├── scholar.test.ts             # Bộ test tự động (Mock API, 0 quota, kiểm tra rò rỉ key)
│   │   └── live_integration.test.ts   # Bài kiểm tra tích hợp có chủ đích với API thật
│   ├── package.json
│   └── tsconfig.json
│
├── chrome_extension/                   # Browser Extension (Manifest V3 + TypeScript)
│   ├── manifest.json                   # Cấu hình Manifest V3 + host_permissions
│   ├── popup.html                      # Giao diện tra cứu, phân trang, screening & đối chiếu
│   ├── popup.css                       # Giao diện hiện đại, trực quan
│   ├── popup.js                        # Bundle sinh từ TypeScript (esbuild)
│   ├── content-script.js               # Content script cho ACM DL / Web DOM
│   ├── src/
│   │   ├── popup.ts                    # Logic TypeScript: phân trang, kiểm tra cache, screening
│   │   ├── content-script.ts           # Logic bóc tách DOM
│   │   └── types.ts                    # Type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── slr_pipeline/                       # Script Python gọi API công khai (OpenAlex, arXiv, S2)
│   ├── adapters/                       # OpenAlex, arXiv, Semantic Scholar
│   ├── pipeline/                       # Dedup, Exporter, Validator
│   └── main.py                         # CLI chạy toàn bộ pipeline Python
│
├── 01_all_records.csv                  # Dữ liệu xuất ra chuẩn 10 cột Schema (UTF-8 BOM)
├── search-log.md                       # Nhật ký đối chiếu 3 phép kiểm chứng cho PRISMA
└── README.md
```

---

## 🔒 Quy chuẩn Bảo mật SerpApi

1. **Vị trí khóa**: `SERPAPI_KEY` chỉ được đọc từ file `.env` ở backend Node.js (`process.env.SERPAPI_KEY`).
2. **Không rò rỉ**: Tuyệt đối không đưa key vào client bundle của Chrome Extension, response JSON trả về, console log, file nhật ký `search-log.md` hoặc file xuất `01_all_records.csv`.
3. **Chống proxy tùy ý**: Backend chỉ cung cấp endpoint `POST /api/scholar/search` với tham số được kiểm tra chặt chẽ (`engine: google_scholar`, `q`, `as_ylo`, `as_yhi`, `hl`, `start`, `num`); không tạo endpoint proxy tự do tới URL do client gửi.

---

## 🚀 Hướng dẫn Chạy Hệ thống

### Bước 1: Khởi động Backend Node.js

1. Mở terminal tại thư mục `backend`:
   ```bash
   cd backend
   npm install
   ```

2. Kiểm tra file `.env` đã có key SerpApi hợp lệ:
   ```env
   SERPAPI_KEY=your_serpapi_key_here
   PORT=3001
   ```

3. Chạy backend:
   ```bash
   npm start
   # Server sẽ lắng nghe tại: http://localhost:3001
   ```

4. Chạy kiểm thử tự động (Mock API, không tốn quota):
   ```bash
   npm run test:unit
   ```

5. (Tùy chọn) Chạy kiểm tra tích hợp có chủ đích với API thật:
   ```bash
   npm run test:live
   ```

---

### Bước 2: Cài đặt Chrome Extension (Manifest V3)

1. Build mã nguồn TypeScript của tiện ích:
   ```bash
   cd chrome_extension
   npm install
   npm run build
   ```
2. Mở trình duyệt Chrome hoặc Microsoft Edge:
   - Truy cập `chrome://extensions/` hoặc `edge://extensions/`.
   - Bật **Developer mode** (Chế độ nhà phát triển).
   - Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục:
     `c:\Users\ThanhDuy\Documents\03_Tool_Configs\extension\chrome_extension`
3. Nhấp icon tiện ích trên thanh công cụ để mở giao diện:
   - **Chuỗi tìm kiếm**: Nhập nguyên văn từ khóa (ví dụ: `automated test case generation machine learning`).
   - **Tham số tìm kiếm**:
     - `engine`: `google_scholar`
     - `as_ylo`: `2020`
     - `as_yhi`: `2026`
     - `hl`: `vi` (khớp với lượt tìm thủ công hiện tại)
     - `start`: phân trang offset (`0`, `10`, `20`...)
   - **Quy tắc phân trang**:
     - Lượt đầu chỉ lấy 1 trang (`start=0`).
     - Hiển thị số lượng request API đã dùng và nguồn kết quả từ Cache hay Live API.
     - Nút **"⏩ Lấy trang tiếp (+10)"** hoặc **"⚡ Lấy tối đa trang đã đặt"**.
     - Nút **"⏹ Dừng / Hủy"** cho phép ngắt tiến trình bất cứ lúc nào mà vẫn bảo toàn 100% dữ liệu các trang trước.
     - Không retry vô hạn khi lỗi.
     - Lọc dữ liệu trên bảng hiển thị không kích hoạt gọi lại API.

---

## 📋 Nguyên tắc Xử lý Dữ liệu & Screening (PRISMA / SWT302)

1. **Tổng kết quả vs Bản ghi thu thập**:
   - `total_results` từ Google Scholar chỉ là con số ước lượng của công cụ tìm kiếm. **Không coi total_results là số paper đã thu thập.**
2. **Snippet vs Abstract**:
   - Google Scholar chỉ trả về đoạn trích dẫn ngắn (`snippet`). **Tuyệt đối không coi snippet là abstract.**
   - Cột `abstract` để trống hoặc đánh dấu cần trích xuất toàn văn.
3. **Metadata chưa chắc chắn**:
   - Năm, Tác giả, Venue, DOI bóc tách từ chuỗi tóm tắt được gắn nhãn cảnh báo `Cần xác minh` trên giao diện.
4. **Quy tắc Screening**:
   - Gợi ý sàng lọc tự động dựa trên từ khóa kiểm thử phần mềm, khung năm 2020 - 2026.
   - **Bắt buộc**: Thiếu abstract toàn văn hoặc chưa đủ bằng chứng rõ ràng về kỹ thuật Phân hoạch tương đương (EP) / Phân tích giá trị biên (BVA) thì gợi ý là **Unsure**.
   - Quyết định cuối cùng (`finalDecision`) do nhà nghiên cứu bấm xác nhận (`Include`, `Exclude`, `Unsure`) kèm ghi chú thẩm định cá nhân.
5. **Search Log**:
   - Lượt tìm kiếm bằng SerpApi được nối tiếp vào cuối file `search-log.md`, **không ghi đè** lên các lượt tìm thủ công hay pipeline trước đó.
   - Ghi nhận cả số lượng kết quả trên giao diện Scholar web (nếu nhập đối chiếu) và số lượng SerpApi báo cáo.
