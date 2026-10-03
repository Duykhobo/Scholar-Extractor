import time
import requests
from typing import List, Dict, Any
from .base import BaseAdapter

class OpenAlexAdapter(BaseAdapter):
    def __init__(self, email: str = "swt302-research@fpt.edu.vn", api_key: str = "", timeout: int = 20):
        super().__init__(source_name="OpenAlex", timeout=timeout)
        self.email = email
        self.api_key = api_key

    def transform_query(self, raw_query: str) -> str:
        # OpenAlex search nhận chuỗi tìm kiếm text tự do
        return raw_query.strip()

    def _reconstruct_abstract(self, inverted_index: Any) -> str:
        if not inverted_index or not isinstance(inverted_index, dict):
            return ""
        pos_map = {}
        for word, positions in inverted_index.items():
            if isinstance(positions, list):
                for pos in positions:
                    pos_map[pos] = str(word)
        return " ".join(pos_map[i] for i in sorted(pos_map.keys()))

    def fetch(self, query: str, max_records: int = 200, **kwargs) -> List[Dict[str, Any]]:
        url = "https://api.openalex.org/works"
        cursor = "*"
        records = []
        transformed_query = self.transform_query(query)
        headers = {
            "User-Agent": f"SWT302-Research/1.0 (mailto:{self.email})"
        }

        while cursor and len(records) < max_records:
            per_page = min(200, max_records - len(records))
            params = {
                "search": transformed_query,
                "per-page": per_page,
                "cursor": cursor
            }
            if self.api_key:
                params["api_key"] = self.api_key

            # Xử lý Retry 429 tối đa 5 lần
            retry_count = 0
            res = None
            while retry_count < 5:
                try:
                    res = requests.get(url, params=params, headers=headers, timeout=self.timeout)
                    if res.status_code == 429:
                        retry_count += 1
                        sleep_time = 5 * (2 ** (retry_count - 1))
                        print(f"[{self.source_name}] Gặp HTTP 429 (Rate limit). Thử lại lần {retry_count}/5 sau {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    
                    # Bắt buộc fail-fast nếu gặp lỗi HTTP khác để không làm lệch số liệu PRISMA
                    res.raise_for_status()
                    break
                except requests.RequestException as e:
                    if retry_count >= 5 or (res is not None and res.status_code != 429):
                        print(f"[{self.source_name}] Lỗi nghiêm trọng khi gọi API: {e}. Dừng chương trình theo quy chuẩn PRISMA!")
                        raise e
                    retry_count += 1
                    time.sleep(5)

            data = res.json()
            results = data.get("results", [])
            if not results:
                break

            for item in results:
                if not isinstance(item, dict):
                    continue

                raw_doi = item.get("doi") or ""
                
                # Trích xuất tác giả an toàn
                authors_list = []
                for a in (item.get("authorships") or []):
                    if isinstance(a, dict):
                        author_obj = a.get("author") or {}
                        if isinstance(author_obj, dict):
                            author_name = author_obj.get("display_name")
                            if author_name:
                                authors_list.append(str(author_name).strip())
                authors = "; ".join(authors_list)

                # Trích xuất venue an toàn (tránh NoneType khi source là None)
                venue = ""
                primary_loc = item.get("primary_location") or {}
                if isinstance(primary_loc, dict):
                    source_obj = primary_loc.get("source") or {}
                    if isinstance(source_obj, dict):
                        venue = source_obj.get("display_name") or ""

                abstract = self._reconstruct_abstract(item.get("abstract_inverted_index"))

                record = self.create_record(
                    title=item.get("title") or "",
                    authors=authors,
                    year=item.get("publication_year"),
                    venue=venue,
                    doi=raw_doi,
                    abstract=abstract,
                    url=raw_doi or item.get("id", ""),
                    query=query
                )
                records.append(record)

            cursor = data.get("meta", {}).get("next_cursor")
            time.sleep(0.1)  # Giãn cách nhẹ

        return records[:max_records]
