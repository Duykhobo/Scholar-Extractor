import argparse
import sys
import os
import io

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

def run_slr_pipeline(
    query: str,
    max_per_source: int = 100,
    openalex_email: str = "swt302-research@fpt.edu.vn",
    s2_api_key: str = "",
    output_csv: str = "01_all_records.csv",
    log_file: str = "search-log.md"
):
    print("=" * 60)
    print("      SWT302 SLR METADATA EXTRACTION PIPELINE")
    print("=" * 60)
    print(f"Query: {query}")
    print(f"Max records per source: {max_per_source}")
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
    today_str = date.today().strftime("%Y-%m-%d")
    log_content = format_search_log_entry(
        query=query,
        sources_stats=sources_stats,
        dedup_stats=dedup_stats,
        spot_checks=spot_checks,
        retrieval_date=today_str
    )

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(log_content + "\n")

    print("=" * 60)
    print("HOÀN TẤT PIPELINE THÀNH CÔNG!")
    print(f"1. Dữ liệu: {os.path.abspath(output_csv)}")
    print(f"2. Báo cáo: {os.path.abspath(log_file)}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Công cụ lấy Metadata phục vụ SLR - Môn SWT302")
    parser.add_argument("--query", "-q", type=str, default="automated test case generation machine learning",
                        help="Chuỗi tìm kiếm (Search String)")
    parser.add_argument("--max", "-m", type=int, default=50,
                        help="Số lượng bản ghi tối đa lấy từ mỗi nguồn (default: 50)")
    parser.add_argument("--email", type=str, default="swt302-research@fpt.edu.vn",
                        help="Email để đăng ký polite pool OpenAlex")
    parser.add_argument("--s2-key", type=str, default="",
                        help="API Key Semantic Scholar (nếu có)")
    parser.add_argument("--output", "-o", type=str, default="01_all_records.csv",
                        help="Tên file CSV xuất ra")
    parser.add_argument("--log", "-l", type=str, default="search-log.md",
                        help="Tên file nhật ký đối chiếu search-log.md")

    args = parser.parse_args()
    run_slr_pipeline(
        query=args.query,
        max_per_source=args.max,
        openalex_email=args.email,
        s2_api_key=args.s2_key,
        output_csv=args.output,
        log_file=args.log
    )

if __name__ == "__main__":
    main()
