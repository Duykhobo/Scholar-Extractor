from abc import ABC, abstractmethod
from typing import List, Dict, Any
import re
import datetime

MANDATORY_FIELDS = [
    "source",
    "title",
    "authors",
    "year",
    "venue",
    "doi",
    "abstract",
    "url",
    "query",
    "retrieval_date"
]

def clean_doi(raw_doi: str) -> str:
    """Xóa tiền tố https://doi.org/, http://doi.org/, doi: và chuyển về chữ thường."""
    if not raw_doi:
        return ""
    doi = str(raw_doi).strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.IGNORECASE)
    doi = re.sub(r"^doi:\s*", "", doi, flags=re.IGNORECASE)
    return doi.lower().strip()

def clean_title(title: str) -> str:
    """Chuẩn hóa tiêu đề: viết thường, xóa dấu câu, gộp khoảng trắng thừa."""
    if not title:
        return ""
    t = title.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()

class BaseAdapter(ABC):
    def __init__(self, source_name: str, timeout: int = 20):
        self.source_name = source_name
        self.timeout = timeout
        self.retrieval_date = datetime.date.today().strftime("%Y-%m-%d")

    @abstractmethod
    def transform_query(self, raw_query: str) -> str:
        """Chuyển đổi Search String theo cú pháp của từng nguồn."""
        pass

    @abstractmethod
    def fetch(self, query: str, max_records: int = 200, **kwargs) -> List[Dict[str, Any]]:
        """Truy vấn dữ liệu từ API có phân trang và retry khi gặp lỗi 429."""
        pass

    def create_record(
        self,
        title: str,
        authors: str,
        year: Any,
        venue: str,
        doi: str,
        abstract: str,
        url: str,
        query: str
    ) -> Dict[str, Any]:
        """Tạo bản ghi tuân thủ chặt chẽ Schema SWT302."""
        return {
            "source": self.source_name,
            "title": str(title).strip() if title else "",
            "authors": str(authors).strip() if authors else "",
            "year": int(year) if year and str(year).isdigit() else (year or ""),
            "venue": str(venue).strip() if venue else "",
            "doi": clean_doi(doi),
            "abstract": str(abstract).strip() if abstract else "",
            "url": str(url).strip() if url else "",
            "query": query,
            "retrieval_date": self.retrieval_date
        }
