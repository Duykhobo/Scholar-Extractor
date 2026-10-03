import time
import requests
import xml.etree.ElementTree as ET
import re
from typing import List, Dict, Any
from .base import BaseAdapter

class ArxivAdapter(BaseAdapter):
    def __init__(self, timeout: int = 20):
        super().__init__(source_name="arXiv", timeout=timeout)

    def transform_query(self, raw_query: str) -> str:
        """
        arXiv: Thêm tiền tố all: và bỏ ngoặc đơn theo tài liệu SWT302.
        - Xóa dấu ngoặc đơn.
        - Nếu có toán tử boolean AND/OR/NOT: giữ nguyên toán tử và gán all: cho từng vế.
        - Nếu là chuỗi từ khóa tự do: kết hợp các từ khóa trọng tâm bằng all:<từ> AND ...
        """
        cleaned = raw_query.replace("(", "").replace(")", "").strip()
        if re.search(r"\b(AND|OR|NOT)\b", cleaned, flags=re.IGNORECASE):
            parts = re.split(r"\s+(AND|OR|NOT)\s+", cleaned, flags=re.IGNORECASE)
            transformed = []
            for p in parts:
                p_upper = p.upper().strip()
                if p_upper in ("AND", "OR", "NOT"):
                    transformed.append(p_upper)
                else:
                    p_clean = p.strip()
                    if p_clean:
                        transformed.append(f"all:{p_clean}")
            return " ".join(transformed)
        else:
            words = [w.strip('"\' ') for w in cleaned.split() if w.strip('"\' ')]
            if not words:
                return "all:software"
            # Ghép các từ khóa chính bằng AND
            return " AND ".join(f"all:{w}" for w in words[:4])

    def fetch(self, query: str, max_records: int = 200, **kwargs) -> List[Dict[str, Any]]:
        url = "http://export.arxiv.org/api/query"
        records = []
        transformed_query = self.transform_query(query)
        batch_size = 50
        start = 0

        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom"
        }

        while len(records) < max_records:
            current_batch = min(batch_size, max_records - len(records))
            params = {
                "search_query": transformed_query,
                "start": start,
                "max_results": current_batch,
                "sortBy": "relevance",
                "sortOrder": "descending"
            }

            retry_count = 0
            res = None
            while retry_count < 5:
                try:
                    res = requests.get(url, params=params, timeout=self.timeout)
                    if res.status_code == 429:
                        retry_count += 1
                        sleep_time = 5 * (2 ** (retry_count - 1))
                        print(f"[{self.source_name}] Gặp HTTP 429. Thử lại sau {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    res.raise_for_status()
                    break
                except requests.RequestException as e:
                    if retry_count >= 5 or (res is not None and res.status_code != 429):
                        print(f"[{self.source_name}] Lỗi nghiêm trọng khi gọi API: {e}. Dừng chương trình theo quy chuẩn PRISMA!")
                        raise e
                    retry_count += 1
                    time.sleep(5)

            root = ET.fromstring(res.text)
            entries = root.findall("atom:entry", ns)
            if not entries:
                break

            for entry in entries:
                title = entry.findtext("atom:title", namespaces=ns) or ""
                title = re.sub(r"\s+", " ", title).strip()

                abstract = entry.findtext("atom:summary", namespaces=ns) or ""
                abstract = re.sub(r"\s+", " ", abstract).strip()

                published = entry.findtext("atom:published", namespaces=ns) or ""
                year = published[:4] if len(published) >= 4 else ""

                authors_list = [
                    a.findtext("atom:name", namespaces=ns) or ""
                    for a in entry.findall("atom:author", namespaces=ns)
                ]
                authors = "; ".join(filter(None, authors_list))

                arxiv_url = entry.findtext("atom:id", namespaces=ns) or ""
                doi_el = entry.find("arxiv:doi", ns)
                doi = doi_el.text if doi_el is not None and doi_el.text else ""
                venue_el = entry.find("arxiv:journal_ref", ns)
                venue = venue_el.text if venue_el is not None and venue_el.text else "arXiv"

                record = self.create_record(
                    title=title,
                    authors=authors,
                    year=year,
                    venue=venue,
                    doi=doi,
                    abstract=abstract,
                    url=arxiv_url,
                    query=query
                )
                records.append(record)

            start += len(entries)
            if len(entries) < current_batch:
                break
            time.sleep(3.0)  # Tuân thủ rate limit của arXiv (khuyến nghị 3 giây)

        return records[:max_records]
