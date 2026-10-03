import time
import requests
import re
from typing import List, Dict, Any
from .base import BaseAdapter

class SemanticScholarAdapter(BaseAdapter):
    def __init__(self, api_key: str = "", timeout: int = 20):
        super().__init__(source_name="Semantic Scholar", timeout=timeout)
        self.api_key = api_key

    def transform_query(self, raw_query: str) -> str:
        """
        Semantic Scholar: Tách cụm từ khóa ngắn (2–4 từ) hoặc làm sạch toán tử logic.
        """
        cleaned = re.sub(r"[\(\)]", " ", raw_query)
        cleaned = re.sub(r"\b(AND|OR|NOT)\b", " ", cleaned, flags=re.IGNORECASE)
        words = [w.strip('"\' ') for w in cleaned.split() if w.strip('"\' ')]
        # Lấy tối đa cụm từ khóa trọng tâm
        return " ".join(words[:6])

    def fetch(self, query: str, max_records: int = 200, **kwargs) -> List[Dict[str, Any]]:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        records = []
        transformed_query = self.transform_query(query)
        headers = {}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        offset = 0
        limit = 100

        while len(records) < max_records and offset < 1000:
            current_limit = min(limit, max_records - len(records))
            params = {
                "query": transformed_query,
                "offset": offset,
                "limit": current_limit,
                "fields": "title,authors,year,venue,externalIds,abstract,url"
            }

            retry_count = 0
            res = None
            while retry_count < 5:
                try:
                    res = requests.get(url, params=params, headers=headers, timeout=self.timeout)
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

            data = res.json()
            results = data.get("data", [])
            if not results:
                break

            for item in results:
                ext_ids = item.get("externalIds") or {}
                doi = ext_ids.get("DOI") or ""
                authors = "; ".join(
                    a.get("name", "") for a in item.get("authors", []) if a.get("name")
                )

                record = self.create_record(
                    title=item.get("title") or "",
                    authors=authors,
                    year=item.get("year"),
                    venue=item.get("venue") or "",
                    doi=doi,
                    abstract=item.get("abstract") or "",
                    url=item.get("url") or (f"https://doi.org/{doi}" if doi else ""),
                    query=query
                )
                records.append(record)

            offset += len(results)
            if len(results) < current_limit:
                break
            time.sleep(1.0)

        return records[:max_records]
