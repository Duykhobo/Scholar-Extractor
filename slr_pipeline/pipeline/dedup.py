from typing import List, Dict, Any, Tuple
from adapters.base import clean_title

def deduplicate_records(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Khử trùng lặp (Dedup) theo chuẩn SWT302:
    - Ưu tiên 1: Khóa chính là 'doi' (nếu có).
    - Ưu tiên 2: Khóa phụ là 'title' đã được chuẩn hóa (viết thường, xóa dấu câu, gộp khoảng trắng).
    """
    seen_dois = set()
    seen_titles = set()
    unique_records = []
    
    dup_by_doi = 0
    dup_by_title = 0

    for rec in records:
        doi = rec.get("doi", "").strip().lower()
        title_norm = clean_title(rec.get("title", ""))

        # 1. Kiểm tra DOI trước
        if doi:
            if doi in seen_dois:
                dup_by_doi += 1
                continue
            seen_dois.add(doi)
            if title_norm:
                seen_titles.add(title_norm)
            unique_records.append(rec)
            continue

        # 2. Nếu không có DOI, kiểm tra title
        if title_norm:
            if title_norm in seen_titles:
                dup_by_title += 1
                continue
            seen_titles.add(title_norm)
            unique_records.append(rec)
            continue

        # Nếu không có cả 2 (hiếm gặp), vẫn giữ lại để không mất dữ liệu
        unique_records.append(rec)

    stats = {
        "total_input": len(records),
        "total_unique": len(unique_records),
        "dup_by_doi": dup_by_doi,
        "dup_by_title": dup_by_title,
        "total_duplicates": len(records) - len(unique_records)
    }
    return unique_records, stats
