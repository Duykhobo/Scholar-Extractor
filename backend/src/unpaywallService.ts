export interface UnpaywallResult {
  doi: string;
  isOa: boolean;
  pdfUrl?: string;
  landingPageUrl?: string;
  version?: string;
  hostType?: string;
  license?: string;
}

export class UnpaywallService {
  private static userEmail: string = "swt302-research@fpt.edu.vn";

  static setEmail(email: string) {
    this.userEmail = email;
  }

  /**
   * Tra cứu toàn văn mở (Open Access) qua Unpaywall REST API miễn phí
   */
  static async resolveOpenAccess(doi: string): Promise<UnpaywallResult | null> {
    if (!doi) return null;
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "").trim();
    if (!cleanDoi) return null;

    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(cleanDoi)}?email=${encodeURIComponent(this.userEmail)}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ScholarExtractor/2.0" },
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const isOa = Boolean(data.is_oa);
      const bestOa = data.best_oa_location || {};

      return {
        doi: cleanDoi,
        isOa,
        pdfUrl: bestOa.url_for_pdf || undefined,
        landingPageUrl: bestOa.url || undefined,
        version: bestOa.version || undefined,
        hostType: bestOa.host_type || undefined,
        license: bestOa.license || undefined,
      };
    } catch {
      return null;
    }
  }
}
