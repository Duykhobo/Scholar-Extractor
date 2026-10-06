# Scholar Extractor - Nền tảng Thu thập & Sàng lọc Tài liệu Nghiên cứu Chuẩn PRISMA 2020

[![Build & Test Status](https://img.shields.io/badge/tests-87%2F87%20passing-brightgreen.svg)]()
[![PRISMA Compliance](https://img.shields.io/badge/PRISMA-2020%20Compliant-blue.svg)]()
[![Database](https://img.shields.io/badge/Database-SQL%20Server%20%7C%20Local%20Fallback-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)]()
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-success.svg)]()

**Scholar Extractor** là giải pháp phần mềm chuyên nghiệp phục vụ nghiên cứu tổng quan tài liệu khoa học (**Systematic Literature Review - SLR**, **Scoping Review**, **Literature Review**) tuân thủ nghiêm ngặt theo tuyên bố và sơ đồ quy trình **PRISMA 2020 (Preferred Reporting Items for Systematic Reviews and Meta-Analyses)**.

Hệ thống kết hợp giữa **Chrome Extension (Manifest V3)** và **Backend Node.js/TypeScript** (kết nối Microsoft SQL Server hoặc chạy Local Fallback độc lập), hỗ trợ pipeline đa giai đoạn từ tìm kiếm, loại trùng, sàng lọc tiêu đề/tóm tắt, truy xuất toàn văn cho đến xuất dữ liệu chuẩn **APA 7th Edition**.

---

## 🌟 Tính Năng Nổi Bật

### 1. Pipeline Đa Giai Đoạn Chuẩn PRISMA 2020 (5 Vòng Khép Kín)
- **Giai đoạn B1 (Identification)**: Thu thập đa nguồn (Google Scholar, OpenAlex, Semantic Scholar, arXiv...) với cơ chế phân trang tự động cursor-based, bảo toàn truy vấn nguyên văn.
- **Giai đoạn V1 (Deduplication & Pre-screening)**: Khử trùng lặp đa tầng kết hợp chuẩn hóa DOI chính xác và thuật toán so khớp mờ tiêu đề (Fuzzy Title Match > 88%), bảo lưu các bài ứng viên nghi vấn (`potentialDuplicate`) mà không xóa mất dữ liệu gốc.
- **Giai đoạn V2 (Title & Abstract Screening)**: Đánh giá tiêu chí Thu nhận (IC) và Loại trừ (EC), tự động lưu lịch sử phân vân (`unsureTitleAbstract`) mà không ghi đè khi chuyển vòng.
- **Giai đoạn V3 (Full-text Retrieval & Eligibility)**: Tích hợp Unpaywall, Open Access API và trích xuất tab ngầm; kiểm tra tính hợp lệ toàn văn; loại trừ hoàn toàn việc đếm đúp bài báo và không suy diễn paywall sai lệch.
- **Giai đoạn FINAL (Included Studies)**: Tổng kết danh mục bài báo đưa vào tổng quan định lượng/định tính, cân bằng hoàn hảo phương trình bảo toàn số lượng PRISMA 2020.

### 2. Quản Lý Tiến Trình Nền (Background Jobs & Worker Queue)
- Khởi chạy các công việc nặng (quét hàng trăm bài, tải toàn văn, chạy pipeline) dưới dạng **Background Job**.
- Hỗ trợ đầy đủ bộ điều khiển: **Tạm dừng (Pause)**, **Tiếp tục (Resume)**, **Hủy (Cancel)** và cập nhật tiến độ phần trăm thời gian thực.
- **Cơ chế Snapshot Persistence**: Tự động lưu checkpoint trạng thái ra tệp JSON (`data/snapshots/`) và Microsoft SQL Server, đảm bảo an toàn tuyệt đối, khôi phục phiên làm việc nguyên vẹn kể cả khi tắt hoặc khởi động lại server.

### 3. Cơ Sở Dữ Liệu Kép (Microsoft SQL Server + Local Fallback)
- **Chế độ SQL Server**: Lưu trữ tập trung 12 bảng quan hệ (`ResearchProfiles`, `Papers`, `BackgroundJobs`, `ResearchSessions`, `PaperEvidence`...) trên Microsoft SQL Server/Express.
- **Chế độ Local Fallback**: Tự động kích hoạt khi chưa có cấu hình database trong `.env`, lưu trữ trên bộ nhớ RAM, LocalStorage và các tệp snapshot cục bộ mà không gây treo ứng dụng.

### 4. Quản Lý PICO & Hồ Sơ Nghiên Cứu Độc Lập (Research Profiles)
- Hỗ trợ quản lý độc lập nhiều đề tài trên cùng giao diện với định dạng PICO (Population, Intervention, Comparison, Outcome).
- Phiên bản hóa tiêu chí (`profileVersion`, `protocolVersion`): Thay đổi tiêu chí sẽ tự động cảnh báo thẩm định lại mà không ghi đè quyết định của con người (`finalDecision`).
- Tích hợp sẵn 3 Presets mẫu:
  - **SWT302 REST API EP/BVA**: Đề tài kiểm thử phần mềm bằng Black-box testing (EP/BVA).
  - **Generic Literature Review**: Hồ sơ tổng quan chung, không giới hạn ngành nghề hay năm xuất bản.
  - **Giao tiếp hỗ trợ & Sự tự tin của trẻ khiếm thị**: Hồ sơ khoa học xã hội/giáo dục đặc biệt với bộ từ khóa AAC.

### 5. Sinh Sơ Đồ PRISMA 2020 & Nhật Ký Kiểm Chứng Tự Động
- Endpoint `/api/prisma/flow` sinh tự động sơ đồ Mermaid Flowchart và bảng số liệu phân rã chi tiết.
- Phân biệt minh bạch giữa **nguồn cơ sở dữ liệu chính thống** (Primary Databases) và **nguồn tìm kiếm bổ trợ** (Supplementary / Candidate Papers như Google Scholar) theo đúng hướng dẫn PRISMA 2020.
- Tự động ghi nhật ký kiểm chứng vào `search-log.md` đối chiếu số lượng báo cáo web với số bài thu thập thực tế.

### 6. Xuất Dữ Liệu Đa Định Dạng Chuẩn Học Thuật
- `01_all_records.csv`: Metadata 10 cột PRISMA (UTF-8 BOM, an toàn chống tấn công CSV Injection).
- `02_screening_decisions_full.csv`: Bảng tổng hợp quyết định từng vòng, lý do loại trừ và bằng chứng trích xuất.
- `03_references_apa7.txt`: Danh mục trích dẫn chuẩn **APA 7th Edition**, phân tách rõ ràng giữa bài đủ dữ liệu và bài cần rà soát thủ công.

---

## 📁 Cấu Trúc Dự Án

```text
extension/
├── backend/                            # Backend Node.js + TypeScript
│   ├── src/
│   │   ├── db/                         # Module kết nối SQL Server & Migrations
│   │   │   ├── connection.ts           # Quản lý connection pool & tự động fallback
│   │   │   ├── repository.ts           # Thao tác dữ liệu 12 bảng SQL
│   │   │   └── migrations/             # Schema DDL (001_init.sql, 002_pipeline_upgrade.sql)
│   │   ├── pipeline/                   # Core Pipeline đa giai đoạn PRISMA
│   │   │   ├── dedupV1.ts              # Giai đoạn V1: Khử trùng lặp nâng cao (Fuzzy > 88%)
│   │   │   ├── screeningV2.ts          # Giai đoạn V2: Sàng lọc tiêu đề & tóm tắt
│   │   │   └── retrievalV3.ts          # Giai đoạn V3: Truy xuất toàn văn & kiểm tra tư cách
│   │   ├── prisma/                     # Sơ đồ & Dịch vụ tính toán cân bằng PRISMA 2020
│   │   │   └── prismaService.ts        # Sinh sơ đồ Mermaid & giải phương trình bảo toàn
│   │   ├── jobs/                       # Trình quản lý tiến trình nền (JobManager)
│   │   │   └── jobManager.ts           # Queue worker, checkpointing & snapshot persistence
│   │   ├── profiles/                   # Quản lý hồ sơ nghiên cứu, PICO & tiêu chí IC/EC
│   │   ├── searchLogger.ts             # Ghi nhật ký thực thi tìm kiếm (search-log.md)
│   │   ├── exporter.ts                 # Xuất CSV, Full Screening & Trích dẫn APA 7
│   │   ├── evidenceAnalyzer.ts         # Phân tích bằng chứng từ web & PDF
│   │   └── server.ts                   # RESTful API Express Server (Port 3001)
│   ├── tests/                          # 87/87 Unit & Regression Tests tự động
│   └── package.json
│
├── chrome_extension/                   # Tiện ích mở rộng Chrome (Manifest V3)
│   ├── manifest.json                   # Cấu hình Chrome Extension MV3
│   ├── popup.html                      # Giao diện điều khiển chính của nhà nghiên cứu
│   ├── popup.css                       # Thiết kế giao diện hiện đại
│   ├── popup.js                        # Bundle JavaScript chính
│   └── src/
│       ├── popup.ts                    # Controller giao diện & đồng bộ API
│       ├── presets.ts                  # Danh mục hồ sơ nghiên cứu tích hợp sẵn
│       └── types.ts                    # Khai báo kiểu TypeScript
│
├── 01_all_records.csv                  # Dữ liệu xuất metadata bài báo (UTF-8 BOM)
├── 02_screening_decisions_full.csv     # Kết quả sàng lọc chi tiết
├── 03_references_apa7.txt              # Danh mục trích dẫn chuẩn APA 7
├── search-log.md                       # Nhật ký đối chiếu tìm kiếm
├── HUONG_DAN_SU_DUNG.md                # Sổ tay hướng dẫn chi tiết quy trình từng bước
└── README.md
```

---

## 🚀 Cài Đặt & Khởi Chạy Nhanh

### 1. Khởi động Backend Server

1. Chuyển vào thư mục `backend` và cài đặt thư viện:
   ```powershell
   cd backend
   npm install
   ```

2. Cấu hình file `.env` (trong thư mục `backend`):
   ```env
   PORT=3001
   SERPAPI_KEY=your_serpapi_key_here
   OPENALEX_API_KEY=your_openalex_key_here

   # Tùy chọn: Kết nối Microsoft SQL Server (hoặc để trống để chạy Local Fallback)
   DB_SERVER=localhost
   DB_PORT=1433
   DB_NAME=ScholarExtractorDB
   DB_USER=scholar_app
   DB_PASSWORD=ScholarPassword123@
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

3. Biên dịch và khởi động server:
   ```powershell
   npm run build
   npm start
   # Server hoạt động tại: http://localhost:3001
   ```

4. Chạy bộ kiểm thử tự động xác nhận hệ thống:
   ```powershell
   npm test
   # Kết quả: 87/87 tests passed
   ```

### 2. Cài đặt Chrome Extension

1. Biên dịch tiện ích:
   ```powershell
   cd ../chrome_extension
   npm install
   npm run build
   ```

2. Cài vào trình duyệt:
   - Mở Google Chrome hoặc Microsoft Edge, truy cập `chrome://extensions/`.
   - Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển).
   - Bấm nút **Load unpacked** (Tải tiện ích đã giải nén).
   - Chọn thư mục: `chrome_extension`.
   - Ghim biểu tượng **Scholar Extractor** lên thanh công cụ trình duyệt.

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết

Xem tài liệu đầy đủ kèm hình ảnh minh họa và thứ tự từng thao tác tại:  
👉 **[HUONG_DAN_SU_DUNG.md](file:///c:/Users/ThanhDuy/Documents/03_Tool_Configs/extension/HUONG_DAN_SU_DUNG.md)**

---

## 🛡️ Cam Kết Kỹ Thuật & Bảo Mật

- **An toàn khóa riêng tư**: `SERPAPI_KEY` chỉ tồn tại trong backend Node.js, tuyệt đối không xuất hiện ở client bundle, request URL hay git repository.
- **Phòng chống SSRF**: Bộ lọc IP phân lớp ngăn chặn triệt để tấn công Server-Side Request Forgery khi phân tích link PDF từ Internet.
- **Chống CSV Formula Injection**: Tự động vô hiệu hóa các ký tự điều khiển (`=`, `+`, `-`, `@`) ở đầu dữ liệu khi xuất tệp bảng tính.
- **Độ tin cậy dữ liệu**: Đảm bảo toàn vẹn dữ liệu qua cơ chế snapshot checkpointing ngay cả khi trình duyệt đóng hoặc server dừng đột ngột.

---

## 📜 Giấy Phép
Dự án được phân phối dưới giấy phép mã nguồn mở nội bộ phục vụ học tập và nghiên cứu khoa học. Mọi đóng góp xin liên hệ tác giả qua repository GitHub.
