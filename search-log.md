# Search log — K.Duy · nguồn phụ trách: Google Scholar + Semantic Scholar (Seed & bổ sung)

## Bảng log chính
| # | Query nguyên văn | CSDL | Trường tìm | Bộ lọc | Ngày | Số kết quả | Số sau bỏ trùng | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| 1 | `("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")` | Google Scholar (SerpApi) | All fields / Title-Abstract | `engine=google_scholar, as_ylo=2020, as_yhi=2026, hl=vi, num=10` | 2026-10-06 | 25 | 25 | Nguồn ứng viên bổ trợ & seed snowballing — không tính vào PRISMA chính |

## Tổng hợp
- Tổng trước dedup: **25** · Sau dedup: **25** (= số dòng 01_all_records.csv — Số paper ứng viên bổ trợ (Candidate Papers), KHÔNG được tính trực tiếp vào nhánh Identification của sơ đồ PRISMA chính thống)

## Snowballing
| Seed (DOI) | Vòng | Hướng (lùi/tiến) | Số đã lướt | Số thêm vào 01 | Số include cuối |
|---|---|---|---|---|---|
| *Chưa thực hiện (Đang thẩm định toàn văn để xác định paper Include chính thức)* | - | - | 0 | 0 | 0 |

## Thay đổi so với protocol
- 2026-10-06: Áp dụng chuỗi tìm kiếm String A chính thức theo protocol SWT302 (`REST API testing` + `equivalence partitioning / boundary-value analysis` + `fault / mutant detection`), giới hạn khung năm 2020 - 2026. Phân định rõ Google Scholar là nguồn tài liệu bổ trợ/snowballing, không cộng dồn vào Identification chính của PRISMA.

## Kiểm chứng (chỉ khi tự viết tool lấy metadata)
- (1) số bản ghi khớp số trang web báo? -> **Khớp**: Giao diện Google Scholar và SerpApi trả về 25 kết quả, thu thập đủ 25 bản ghi thực tế.
- (2) 5 bản ghi đối chiếu tiêu đề/năm/DOI? -> **Khớp 100%**:
   1. *Req2test* (M França, 2026, dl.acm.org) -> Khớp tiêu đề, năm 2026, venue ACM.
   2. *Combining TSL and LLM to Automate REST API Testing* (T Barradas, 2025, SBES '25 / arXiv:2509.05540) -> Khớp tiêu đề, năm 2025, hội nghị SBES 2025.
   3. *THE ROLE OF TEST AUTOMATION FRAMEWORKS IN ENHANCING SOFTWARE RELIABILITY* (SN Jyoti, 2024, DOI: 10.63125/bvv8r252) -> Khớp tiêu đề, năm 2024, DOI hợp lệ.
   4. *SmartSE* (DZ Alotaibi, 2026, DOI: 10.4018/IJERTCS.409971) -> Khớp tiêu đề, DOI và tạp chí IJERTCS.
   5. *Development and verification of an orchestration architecture of AI agents* (M Moskalenko, 2026, DOI: 10.15587/2706-5448.2026.360928) -> Khớp tiêu đề, DOI, tạp chí TARP.
- (3) chạy lại cùng query ra cùng số? -> **Có**, chạy lại cùng tham số trên SerpApi cho kết quả đồng nhất 25 bản ghi.

> **Lưu ý riêng K.Duy:** seed snowballing chỉ lấy từ paper ĐÃ INCLUDE (gồm 4 paper dẫn chứng trên thẻ nếu chúng qua được screening của nhóm).
