# PRISMA (cá nhân) — Lâm · ACM Digital Library
*Nhóm 1 — SaoCungDuoc · RQ FA26-EXT-12 · 04/10/2026 · Số khớp 100% với 01/02/03 (đếm lại được từ CSV)*

## Nhận diện (Identification)
| Nguồn | Số record |
|---|---|
| V1 — String A | 6 |
| V2 — bỏ khối O | 10 |
| V3 — mở rộng synonyms | 52 |
| Bổ sung ngoài export | 3 |
| Mở mục lục các tập kỷ yếu nhận được | 16 |
| **Tổng record thô** | **87** |
| Trùng lặp loại bỏ (EC-D) | 14 |
| **Record sau loại trùng** | **73** → khớp `01_all_records.csv` (73 dòng) |

## Sàng lọc (Screening)
| Bước | Số |
|---|---|
| Sàng lọc V1 (tiêu đề/tóm tắt) — loại tổng | **56** |
|  — tập kỷ yếu (EC-N) | 42 |
|  — bài ngoài phạm vi (IC-P / IC-I / EC-O / EC-N) | 14 |
| Qua V1 (đọc toàn văn) | **17** = 14 INCLUDE + 3 UNSURE |
| Sàng lọc V2 (toàn văn — bản mở/tác giả) | ✅ loại 4: **3 bài EC-S (<4 trang: #3, #12, #14)** + **#4 WSSE (EC-A — không có bản mở)**; 3 bài UNSURE đã đọc và chốt GIỮ |
| Included (chốt) | 13 bài — ≥ 6 ✓ → khớp `03_final_included.csv` |`

## Snowballing
| Vòng | Seed | Số record | Hộp PRISMA |
|---|---|---|---|
| (cá nhân) | — | 0 | [Snowballing 0] |

*Ghi chú: snowballing nhóm do K.Duy phụ trách (seed = paper dẫn chứng trên thẻ RQ + paper INCLUDE) — số sẽ bổ sung vào PRISMA nhóm, không cộng vào file cá nhân này.*

## Đối chiếu số (mở CSV đếm lại)
- 01_all_records.csv: 73 dòng (42 tập kỷ yếu + 31 bài báo)
- 02_after_screening_v1.csv: 73 dòng — EXCLUDE 56 / INCLUDE 14 / UNSURE 3
- 03_final_included.csv: 17 dòng (14 GIỮ đề xuất + 3 chờ chốt)
