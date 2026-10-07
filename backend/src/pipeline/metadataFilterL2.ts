import {
  CanonicalRecord,
  MetadataConditionStatus,
  MetadataEvaluationResult,
  MetadataFilterConfig,
} from "../types";

export class MetadataFilterL2 {
  /**
   * Đánh giá một bản ghi dựa theo bộ lọc metadata khách quan L2
   */
  static evaluateRecord(
    record: CanonicalRecord,
    config: MetadataFilterConfig
  ): MetadataEvaluationResult {
    const reasons: string[] = [];
    const details: MetadataEvaluationResult["details"] = {};
    const conditionsEvaluated: MetadataConditionStatus[] = [];

    // 1. Kiểm tra Năm xuất bản
    if (config.yearRange && config.yearRange.enabled) {
      const { start, end } = config.yearRange;
      if (!record.year || !/^\d{4}$/.test(record.year.trim())) {
        details.yearStatus = "UNKNOWN";
        conditionsEvaluated.push("UNKNOWN");
        reasons.push("Năm xuất bản: Thiếu thông tin năm hoặc định dạng không rõ ràng (UNKNOWN).");
      } else {
        const y = parseInt(record.year.trim(), 10);
        let passYear = true;
        if (start !== undefined && y < start) passYear = false;
        if (end !== undefined && y > end) passYear = false;

        if (passYear) {
          details.yearStatus = "PASS";
          conditionsEvaluated.push("PASS");
        } else {
          details.yearStatus = "FAIL";
          conditionsEvaluated.push("FAIL");
          reasons.push(
            `Năm xuất bản: Năm ${y} nằm ngoài khoảng cấu hình [${start ?? "-∞"}, ${end ?? "+∞"}] (FAIL).`
          );
        }
      }
    }

    // 2. Kiểm tra Ngôn ngữ
    if (config.language && config.language.enabled) {
      const allowed = config.language.allowedLanguages.map((l) => l.toLowerCase().trim());
      const recLang = (record.language || "").toLowerCase().trim();

      if (!recLang) {
        details.languageStatus = "UNKNOWN";
        conditionsEvaluated.push("UNKNOWN");
        reasons.push("Ngôn ngữ: Nguồn không cung cấp trường language (UNKNOWN).");
      } else {
        const isMatch = allowed.some((al) => recLang === al || recLang.startsWith(al));
        if (isMatch) {
          details.languageStatus = "PASS";
          conditionsEvaluated.push("PASS");
        } else {
          details.languageStatus = "FAIL";
          conditionsEvaluated.push("FAIL");
          reasons.push(`Ngôn ngữ: Bài báo viết bằng '${recLang}', không thuộc danh sách cho phép (FAIL).`);
        }
      }
    }

    // 3. Kiểm tra Loại tài liệu (Document Type)
    if (config.documentType && config.documentType.enabled) {
      const allowedTypes = config.documentType.allowedTypes.map((t) => t.toLowerCase().trim());
      const rawType = (record.documentType || (record as any).publicationType || "").toLowerCase().trim();

      if (!rawType) {
        details.typeStatus = "UNKNOWN";
        conditionsEvaluated.push("UNKNOWN");
        reasons.push("Loại tài liệu: Không có metadata loại ấn phẩm (UNKNOWN).");
      } else {
        const isMatch = allowedTypes.some((at) => rawType.includes(at) || at.includes(rawType));
        if (isMatch) {
          details.typeStatus = "PASS";
          conditionsEvaluated.push("PASS");
        } else {
          details.typeStatus = "FAIL";
          conditionsEvaluated.push("FAIL");
          reasons.push(`Loại tài liệu: Loại '${rawType}' không nằm trong cấu hình (FAIL).`);
        }
      }
    }

    // Quy tắc tổng hợp:
    // Có ít nhất 1 FAIL -> FAIL (Outside configured criteria)
    // Không có FAIL nhưng có UNKNOWN -> UNKNOWN (Needs checking)
    // Tất cả PASS -> PASS (Passes metadata filters)
    let overallStatus: "PASS" | "FAIL" | "UNKNOWN" = "PASS";

    if (conditionsEvaluated.includes("FAIL")) {
      overallStatus = "FAIL";
    } else if (conditionsEvaluated.includes("UNKNOWN")) {
      overallStatus = "UNKNOWN";
    } else if (conditionsEvaluated.length === 0) {
      // Không có điều kiện nào được bật
      overallStatus = "PASS";
    }

    if (overallStatus === "PASS" && reasons.length === 0) {
      reasons.push("Đáp ứng đầy đủ các điều kiện metadata đã cấu hình.");
    }

    return {
      recordId: record.id,
      overallStatus,
      reasons,
      details,
    };
  }

  /**
   * Đánh giá hàng loạt danh sách CanonicalRecords
   */
  static evaluateBatch(
    records: CanonicalRecord[],
    config: MetadataFilterConfig
  ): {
    results: Record<string, MetadataEvaluationResult>;
    counts: { pass: number; fail: number; unknown: number };
  } {
    const results: Record<string, MetadataEvaluationResult> = {};
    const counts = { pass: 0, fail: 0, unknown: 0 };

    for (const r of records) {
      const evalRes = this.evaluateRecord(r, config);
      results[r.id] = evalRes;

      if (evalRes.overallStatus === "PASS") counts.pass++;
      else if (evalRes.overallStatus === "FAIL") counts.fail++;
      else counts.unknown++;

      // Gắn kết quả vào canonical record
      if (!r.latestFilterResult) {
        r.latestFilterResult = {
          filterRunId: "",
          metadataStatus: evalRes.overallStatus,
          metadataReasons: evalRes.reasons,
        };
      } else {
        r.latestFilterResult.metadataStatus = evalRes.overallStatus;
        r.latestFilterResult.metadataReasons = evalRes.reasons;
      }
    }

    return { results, counts };
  }
}
