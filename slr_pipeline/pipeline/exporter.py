import csv
from typing import List, Dict, Any
from adapters.base import MANDATORY_FIELDS

def export_to_csv(records: List[Dict[str, Any]], output_path: str = "01_all_records.csv") -> str:
    """
    Xuất danh sách bài báo ra file CSV theo chuẩn Schema của SWT302:
    - Định dạng: UTF-8 with BOM (utf-8-sig) để mở trên Excel không bị lỗi font Tiếng Việt / ký tự đặc biệt.
    - Cột bắt buộc: source, title, authors, year, venue, doi, abstract, url, query, retrieval_date.
    """
    with open(output_path, mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MANDATORY_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            writer.writerow(r)
    return output_path
