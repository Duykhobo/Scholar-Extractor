import {
  CanonicalRecord,
  KeywordEvaluationResult,
  KeywordFilterConfig,
  KeywordStatus,
} from "../types";

export class KeywordFilterL3 {
  /**
   * Tạo biểu thức chính quy Regex an toàn khớp chính xác từ/cụm từ theo ranh giới từ (\b)
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static createTermRegex(term: string): RegExp {
    const cleaned = term.trim();
    // Tách các từ trong cụm từ và nối bằng khoảng trắng linh hoạt \s+
    const words = cleaned.split(/\s+/).map((w) => this.escapeRegex(w));
    const pattern = `\\b${words.join("\\s+")}\\b`;
    return new RegExp(pattern, "i");
  }

  /**
   * Trích xuất đoạn văn bản ngữ cảnh xung quanh từ khóa tìm thấy
   */
  private static extractSnippet(text: string, term: string, windowChars: number = 80): string {
    const regex = this.createTermRegex(term);
    const match = regex.exec(text);
    if (!match) return "";

    const start = Math.max(0, match.index - windowChars);
    const end = Math.min(text.length, match.index + match[0].length + windowChars);
    let snippet = text.slice(start, end).replace(/\s+/g, " ");
    if (start > 0) snippet = `...${snippet}`;
    if (end < text.length) snippet = `${snippet}...`;
    return snippet;
  }

  /**
   * Đánh giá một bản ghi dựa theo bộ lọc từ khóa L3
   */
  static evaluateRecord(
    record: CanonicalRecord,
    config: KeywordFilterConfig
  ): KeywordEvaluationResult {
    const scope = config.scope || "title_abstract";
    const titleText = (record.title || "").trim();
    const abstractText = (record.abstract || "").trim();

    // 1. Kiểm tra thiếu dữ liệu (INSUFFICIENT_DATA)
    if (!titleText) {
      return {
        recordId: record.id,
        status: "INSUFFICIENT_DATA",
        hasExclusionHit: false,
        matchedTerms: [],
        matchedFields: [],
        snippets: ["Thiếu tiêu đề để kiểm tra từ khóa."],
        exclusionMatches: [],
      };
    }

    if (scope === "title_abstract" && !abstractText) {
      // Phạm vi yêu cầu title + abstract nhưng bài báo không có abstract
      // Vẫn kiểm tra trên title, nhưng nếu không match thì gắn nhãn INSUFFICIENT_DATA vì thiếu abstract
      return this.evaluateWithPartialData(record, config, titleText);
    }

    const fullText = scope === "title" ? titleText : `${titleText} \n\n ${abstractText}`;

    // 2. Kiểm tra từ khóa loại trừ (Exclusion terms)
    const exclusionMatches: string[] = [];
    for (const exTerm of config.exclusionTerms || []) {
      if (!exTerm.trim()) continue;
      const regex = this.createTermRegex(exTerm);
      if (regex.test(fullText)) {
        exclusionMatches.push(exTerm.trim());
      }
    }
    const hasExclusionHit = exclusionMatches.length > 0;

    // 3. Kiểm tra các nhóm bắt buộc (AND giữa các nhóm, OR trong từng nhóm)
    const matchedTerms: string[] = [];
    const matchedFieldsSet = new Set<string>();
    const snippets: string[] = [];

    let allGroupsSatisfied = true;

    for (const group of config.groups || []) {
      if (!group.terms || group.terms.length === 0) continue;

      let groupMatched = false;
      for (const term of group.terms) {
        if (!term.trim()) continue;
        const regex = this.createTermRegex(term);

        const inTitle = regex.test(titleText);
        const inAbstract = scope === "title_abstract" && regex.test(abstractText);

        if (inTitle || inAbstract) {
          groupMatched = true;
          matchedTerms.push(term.trim());
          if (inTitle) matchedFieldsSet.add("title");
          if (inAbstract) matchedFieldsSet.add("abstract");

          const snip = this.extractSnippet(fullText, term);
          if (snip) snippets.push(`[${term}] ${snip}`);
          break; // Đã đạt ít nhất 1 từ trong nhóm (OR)
        }
      }

      if (!groupMatched) {
        allGroupsSatisfied = false;
      }
    }

    const status: KeywordStatus = allGroupsSatisfied && config.groups.length > 0 ? "MATCH" : "NO_MATCH";

    return {
      recordId: record.id,
      status,
      hasExclusionHit,
      matchedTerms,
      matchedFields: Array.from(matchedFieldsSet),
      snippets,
      exclusionMatches,
    };
  }

  /**
   * Xử lý trường hợp bài thiếu abstract khi phạm vi cấu hình là title + abstract
   */
  private static evaluateWithPartialData(
    record: CanonicalRecord,
    config: KeywordFilterConfig,
    titleText: string
  ): KeywordEvaluationResult {
    // Thử kiểm tra trên title
    let allGroupsInTitle = true;
    const matchedTerms: string[] = [];
    const snippets: string[] = [];

    for (const group of config.groups || []) {
      let groupMatched = false;
      for (const term of group.terms) {
        const regex = this.createTermRegex(term);
        if (regex.test(titleText)) {
          groupMatched = true;
          matchedTerms.push(term.trim());
          snippets.push(`[title] ${this.extractSnippet(titleText, term)}`);
          break;
        }
      }
      if (!groupMatched) allGroupsInTitle = false;
    }

    if (allGroupsInTitle && config.groups.length > 0) {
      // Đủ từ khóa ngay trên tiêu đề -> MATCH
      return {
        recordId: record.id,
        status: "MATCH",
        hasExclusionHit: false,
        matchedTerms,
        matchedFields: ["title"],
        snippets,
        exclusionMatches: [],
      };
    }

    // Không đủ từ trên tiêu đề nhưng vì thiếu abstract nên không thể kết luận NO_MATCH -> INSUFFICIENT_DATA
    return {
      recordId: record.id,
      status: "INSUFFICIENT_DATA",
      hasExclusionHit: false,
      matchedTerms,
      matchedFields: matchedTerms.length > 0 ? ["title"] : [],
      snippets: ["Thiếu abstract để đối soát trọn vẹn các nhóm từ khóa bắt buộc."],
      exclusionMatches: [],
    };
  }

  /**
   * Đánh giá hàng loạt danh sách CanonicalRecords
   */
  static evaluateBatch(
    records: CanonicalRecord[],
    config: KeywordFilterConfig
  ): {
    results: Record<string, KeywordEvaluationResult>;
    counts: { match: number; noMatch: number; insufficient: number; exclusionHit: number };
  } {
    const results: Record<string, KeywordEvaluationResult> = {};
    const counts = { match: 0, noMatch: 0, insufficient: 0, exclusionHit: 0 };

    for (const r of records) {
      const evalRes = this.evaluateRecord(r, config);
      results[r.id] = evalRes;

      if (evalRes.status === "MATCH") counts.match++;
      else if (evalRes.status === "NO_MATCH") counts.noMatch++;
      else counts.insufficient++;

      if (evalRes.hasExclusionHit) counts.exclusionHit++;

      // Gắn kết quả vào canonical record
      if (!r.latestFilterResult) {
        r.latestFilterResult = {
          filterRunId: "",
          metadataStatus: "PASS",
          metadataReasons: [],
          keywordStatus: evalRes.status,
          hasExclusionHit: evalRes.hasExclusionHit,
          matchedTerms: evalRes.matchedTerms,
          matchedFields: evalRes.matchedFields,
        };
      } else {
        r.latestFilterResult.keywordStatus = evalRes.status;
        r.latestFilterResult.hasExclusionHit = evalRes.hasExclusionHit;
        r.latestFilterResult.matchedTerms = evalRes.matchedTerms;
        r.latestFilterResult.matchedFields = evalRes.matchedFields;
      }
    }

    return { results, counts };
  }
}
