import { DataQualityFlags, NormalizedRecord } from "../types";

export class DataQualityL0 {
  /**
   * Chuẩn hóa DOI theo chuẩn quốc tế: bỏ protocol URL, chuyển chữ thường, trim
   */
  static normalizeDoi(doi?: string): string {
    if (!doi) return "";
    return doi
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .replace(/^doi:\s*/i, "");
  }

  /**
   * Chuẩn hóa năm xuất bản (4 chữ số)
   */
  static normalizeYear(rawYear?: string, rawDate?: string): string {
    if (rawYear) {
      const match = rawYear.match(/\b(19\d\d|20\d\d)\b/);
      if (match) return match[1];
    }
    if (rawDate) {
      const match = rawDate.match(/\b(19\d\d|20\d\d)\b/);
      if (match) return match[1];
    }
    return "";
  }

  /**
   * Chuẩn hóa danh sách tác giả thành chuỗi phân tách bởi dấu chấm phẩy
   */
  static normalizeAuthors(rawAuthors?: string): string {
    if (!rawAuthors) return "";
    return rawAuthors
      .split(/;\s*|,\s*(?=[A-Z][a-z]+)/)
      .map((a) => a.trim())
      .filter(Boolean)
      .join("; ");
  }

  /**
   * Đánh giá và gắn cờ chất lượng dữ liệu L0
   */
  static assessQuality(rec: NormalizedRecord): DataQualityFlags {
    const hasTitle = Boolean(rec.title && rec.title.trim().length > 0 && rec.title.toLowerCase() !== "untitled");
    const hasAbstract = Boolean(rec.abstract && rec.abstract.trim().length > 0);
    const hasYear = Boolean(rec.year && /^\d{4}$/.test(rec.year.trim()));
    const hasDoi = Boolean(rec.doi && rec.doi.trim().length > 0);
    const hasFulltext = Boolean(rec.openAccessPdfUrl && rec.openAccessPdfUrl.trim().length > 0);

    // Không tiêu đề và không có định danh hữu ích (DOI hoặc URL)
    const hasIdentifier = Boolean(hasDoi || (rec.landingPageUrl && rec.landingPageUrl.trim().length > 0));
    const needsReview = !hasTitle && !hasIdentifier;

    return {
      missing_title: !hasTitle,
      missing_abstract: !hasAbstract,
      missing_year: !hasYear,
      missing_doi: !hasDoi,
      missing_fulltext: !hasFulltext,
      needs_data_review: needsReview,
    };
  }

  /**
   * Áp dụng chuẩn hóa toàn bộ trường và gắn cờ chất lượng cho bản ghi
   */
  static processRecord(rec: NormalizedRecord): NormalizedRecord & { qualityFlags: DataQualityFlags } {
    const normalizedDoi = this.normalizeDoi(rec.doi);
    const normalizedYear = this.normalizeYear(rec.year, rec.publicationDate);
    const normalizedAuthors = this.normalizeAuthors(rec.authors);

    const updated: NormalizedRecord = {
      ...rec,
      doi: normalizedDoi,
      year: normalizedYear || rec.year,
      authors: normalizedAuthors || rec.authors,
      title: (rec.title || "").trim(),
      abstract: (rec.abstract || "").trim(),
      landingPageUrl: (rec.landingPageUrl || "").trim(),
      openAccessPdfUrl: (rec.openAccessPdfUrl || "").trim(),
    };

    const qualityFlags = this.assessQuality(updated);

    return {
      ...updated,
      qualityFlags,
    };
  }
}
