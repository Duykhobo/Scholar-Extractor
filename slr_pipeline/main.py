import argparse
import sys
import os
import io
import json

# Đảm bảo in tiếng Việt trên console Windows không bị lỗi font/mã hóa cp1252
if sys.platform == "win32":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from datetime import date
from adapters.openalex import OpenAlexAdapter
from adapters.arxiv import ArxivAdapter
from adapters.semanticscholar import SemanticScholarAdapter
from pipeline.dedup import deduplicate_records
from pipeline.exporter import export_to_csv
from pipeline.validator import generate_spot_check_records, format_search_log_entry

def load_profile_data(profile_arg: str):
    """Đọc cấu hình ResearchProfile từ file JSON hoặc preset name."""
    if not profile_arg:
        return None

    # Nếu là file JSON tồn tại
    if os.path.exists(profile_arg):
        with open(profile_arg, "r", encoding="utf-8") as f:
            return json.load(f)

    # Nếu là preset name thông dụng
    preset_arg_lower = profile_arg.lower()
    if preset_arg_lower in ["vi", "preset_visually_impaired_aac"]:
        return {
            "id": "preset_visually_impaired_aac",
            "name": "Giao tiếp tử tế & Sự tự tin của trẻ khiếm thị",
            "searchStrings": [
                {
                    "id": "vi_str_11_combined",
                    "name": "Chuỗi tổng hợp",
                    "query": '("children with visual impairments" OR "visually impaired children" OR "blind children") AND ("supportive communication" OR "teacher support" OR "peer support" OR "social support") AND ("self-confidence" OR "self-esteem" OR "self-efficacy")',
                    "isDefault": True
                }
            ]
        }
    elif preset_arg_lower in ["generic", "preset_generic"]:
        return {
            "id": "preset_generic",
            "name": "Generic Literature Review",
            "searchStrings": []
        }
    elif preset_arg_lower in ["swt302", "preset_swt302"]:
        return {
            "id": "preset_swt302",
            "name": "SWT302 REST API EP/BVA",
            "searchStrings": [
                {
                    "id": "swt302_str_a",
                    "name": "String A (Chính thức)",
                    "query": '("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")',
                    "isDefault": True
                }
            ]
        }

    return {"id": profile_arg, "name": profile_arg}

def run_slr_pipeline(
    query: str,
    max_per_source: int = 100,
    openalex_email: str = "swt302-research@fpt.edu.vn",
    s2_api_key: str = "",
    output_csv: str = "01_all_records.csv",
    log_file: str = "search-log.md",
    profile_data: dict = None,
    research_id: str = "",
    session_id: str = ""
):
    profile_name = profile_data.get("name", "Nghiên cứu khoa học") if profile_data else "Nghiên cứu SWT302"
    effective_research_id = research_id or (profile_data.get("id") if profile_data else "legacy_swt302")
    today_str = date.today().strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"      SCHOLAR EXTRACTOR - METADATA EXTRACTION PIPELINE")
    print(f"      Hồ sơ nghiên cứu: {profile_name} (ID: {effective_research_id})")
    print("=" * 60)
    print(f"Query: {query}")
    print(f"Max records per source: {max_per_source}")
    if session_id:
        print(f"Session ID: {session_id}")
    print("-" * 60)

    # 1. Khởi tạo các Adapters
    adapters = [
        OpenAlexAdapter(email=openalex_email),
        ArxivAdapter(),
        SemanticScholarAdapter(api_key=s2_api_key)
    ]

    all_fetched_records = []
    sources_stats = {}

    # 2. Thu thập dữ liệu từ từng nguồn (Adapter Pattern)
    for adapter in adapters:
        print(f"\n[+] Đang thu thập từ: {adapter.source_name}...")
        try:
            records = adapter.fetch(query, max_records=max_per_source)
            sources_stats[adapter.source_name] = len(records)
            # Gắn provenance nghiên cứu cho từng bản ghi
            for r in records:
                r["research_id"] = effective_research_id
                if session_id:
                    r["session_id"] = session_id
            all_fetched_records.extend(records)
            print(f"    -> Đã lấy thành công {len(records)} bản ghi từ {adapter.source_name}.")
        except Exception as e:
            print(f"[!] Lỗi nghiêm trọng tại adapter {adapter.source_name}: {e}")
            print("Dừng chương trình ngay theo quy tắc PRISMA để không làm sai lệch số liệu.")
            sys.exit(1)

    print("\n" + "-" * 60)
    print(f"Tổng số bản ghi thu thập ban đầu: {len(all_fetched_records)}")

    # 3. Khử trùng lặp (Dedup)
    print("\n[+] Đang thực hiện Khử trùng lặp (Dedup) theo DOI và Title chuẩn hóa...")
    unique_records, dedup_stats = deduplicate_records(all_fetched_records)
    print(f"    - Trùng DOI loại bỏ: {dedup_stats['dup_by_doi']}")
    print(f"    - Trùng Title loại bỏ: {dedup_stats['dup_by_title']}")
    print(f"    - Tổng bản ghi duy nhất còn lại: {dedup_stats['total_unique']}")

    # 4. Xuất file CSV định dạng chuẩn UTF-8 with BOM
    print(f"\n[+] Xuất kết quả ra file: {output_csv}...")
    export_to_csv(unique_records, output_csv)
    print(f"    -> File đã sẵn sàng mở trực tiếp trên Excel (UTF-8 BOM).")

    # 5. Phép kiểm chứng và sinh nhật ký search-log.md
    print(f"\n[+] Tạo báo cáo đối soát 3 phép kiểm chứng vào {log_file}...")
    spot_checks = generate_spot_check_records(unique_records, sample_size=5)
    log_content = format_search_log_entry(
        query=query,
        sources_stats=sources_stats,
        dedup_stats=dedup_stats,
        spot_checks=spot_checks,
        retrieval_date=today_str
    )

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"\n<!-- Nghiên cứu: {effective_research_id} | Phiên: {session_id or 'auto'} -->\n")
        f.write(log_content + "\n")

    print("=" * 60)
    print("HOÀN TẤT PIPELINE THÀNH CÔNG!")
    print(f"1. Dữ liệu: {os.path.abspath(output_csv)}")
    print(f"2. Báo cáo: {os.path.abspath(log_file)}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Scholar Extractor - Thu thập Metadata đa nghiên cứu khoa học")
    parser.add_argument("--query", "-q", type=str, default="",
                        help="Chuỗi tìm kiếm (Search String)")
    parser.add_argument("--profile", "-p", type=str, default="",
                        help="Đường dẫn file JSON ResearchProfile hoặc tên preset (swt302, generic, vi)")
    parser.add_argument("--research-id", type=str, default="",
                        help="Mã định danh nghiên cứu (researchId)")
    parser.add_argument("--session-id", type=str, default="",
                        help="Mã định danh phiên làm việc (sessionId)")
    parser.add_argument("--max", "-m", type=int, default=50,
                        help="Số lượng bản ghi tối đa lấy từ mỗi nguồn (default: 50)")
    parser.add_argument("--email", type=str, default="swt302-research@fpt.edu.vn",
                        help="Email để đăng ký polite pool OpenAlex")
    parser.add_argument("--s2-key", type=str, default="",
                        help="API Key Semantic Scholar (nếu có)")
    parser.add_argument("--output", "-o", type=str, default="",
                        help="Tên file CSV xuất ra")
    parser.add_argument("--log", "-l", type=str, default="search-log.md",
                        help="Tên file nhật ký đối chiếu search-log.md")

    args = parser.parse_args()

    profile_data = load_profile_data(args.profile) if args.profile else None

    # Xác định query: ưu tiên query truyền vào, nếu không thì lấy query mặc định từ profile
    effective_query = args.query
    if not effective_query and profile_data:
        search_strings = profile_data.get("searchStrings", [])
        default_str = next((s for s in search_strings if s.get("isDefault")), None)
        if default_str and default_str.get("query"):
            effective_query = default_str["query"]
        elif search_strings and search_strings[0].get("query"):
            effective_query = search_strings[0]["query"]

    if not effective_query:
        effective_query = "automated test case generation machine learning"

    # Tên file xuất ra: nếu không chỉ định, gắn researchId để không đè dữ liệu nghiên cứu khác
    effective_research_id = args.research_id or (profile_data.get("id") if profile_data else "swt302")
    output_csv = args.output
    if not output_csv:
        output_csv = "01_all_records.csv" if effective_research_id in ["swt302", "preset_swt302"] else f"01_all_records_{effective_research_id}.csv"

    run_slr_pipeline(
        query=effective_query,
        max_per_source=args.max,
        openalex_email=args.email,
        s2_api_key=args.s2_key,
        output_csv=output_csv,
        log_file=args.log,
        profile_data=profile_data,
        research_id=effective_research_id,
        session_id=args.session_id
    )

if __name__ == "__main__":
    main()

