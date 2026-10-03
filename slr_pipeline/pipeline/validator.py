import random
from typing import List, Dict, Any

def generate_spot_check_records(records: List[Dict[str, Any]], sample_size: int = 5) -> List[Dict[str, Any]]:
    """
    Phép kiểm chứng 2: Chọn ngẫu nhiên sample_size bản ghi bất kỳ trong file CSV
    để so sánh đối chiếu trực tiếp tiêu đề, năm, DOI với bài viết gốc trên web.
    """
    if len(records) <= sample_size:
        return records.copy()
    return random.sample(records, sample_size)

def format_search_log_entry(
    query: str,
    sources_stats: Dict[str, int],
    dedup_stats: Dict[str, int],
    spot_checks: List[Dict[str, Any]],
    retrieval_date: str
) -> str:
    """Tạo mẫu báo cáo đối soát theo chuẩn search-log.md phục vụ sơ đồ PRISMA."""
    log = []
    log.append(f"## Nhật ký Tìm kiếm & Đối chiếu (Search Log) - Ngày: {retrieval_date}\n")
    log.append(f"**Chuỗi truy vấn gốc (Search String):** `{query}`\n")
    
    log.append("### 1. Phép kiểm chứng 1: Khớp tổng số lượng (Total Count)")
    log.append("| Nguồn dữ liệu | Số bản ghi thu thập được | Trạng thái đối chiếu web |")
    log.append("| :--- | :--- | :--- |")
    for src, cnt in sources_stats.items():
        log.append(f"| {src} | {cnt} | [ ] Đã so sánh với UI web (Khớp: Có/Không) |")
    
    log.append(f"\n- **Tổng số bản ghi ban đầu:** {dedup_stats.get('total_input', 0)}")
    log.append(f"- **Trùng lặp theo DOI:** {dedup_stats.get('dup_by_doi', 0)}")
    log.append(f"- **Trùng lặp theo Title:** {dedup_stats.get('dup_by_title', 0)}")
    log.append(f"- **Số bản ghi duy nhất đưa vào PRISMA (Identification):** {dedup_stats.get('total_unique', 0)}\n")

    log.append("### 2. Phép kiểm chứng 2: Đối chiếu thực địa (Ground-Truth Spot-check 5 mẫu)")
    log.append("Chọn ngẫu nhiên 5 bản ghi trong `01_all_records.csv` để kiểm tra chéo:")
    for idx, sample in enumerate(spot_checks, 1):
        log.append(f"{idx}. **Tiêu đề:** {sample.get('title')}")
        log.append(f"   - **Nguồn:** {sample.get('source')} | **Năm:** {sample.get('year')} | **DOI:** `{sample.get('doi') or 'N/A'}`")
        log.append(f"   - **URL gốc:** {sample.get('url')}")
        log.append(f"   - **Kết quả đối chiếu:** [ ] Khớp 100% với bài viết gốc\n")

    log.append("### 3. Phép kiểm chứng 3: Tính tái lập (Reproducibility)")
    log.append("- [ ] Chạy lại cùng một truy vấn với cùng tham số: Kết quả số lượng thu được đồng nhất.")
    log.append("\n---\n")
    return "\n".join(log)
