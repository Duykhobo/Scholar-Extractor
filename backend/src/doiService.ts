/**
 * Dịch vụ tra cứu metadata DOI tự động qua Crossref API
 * Hoàn toàn miễn phí, công khai, phản hồi nhanh (không cần API key)
 */
export interface CrossrefMetadata {
  doi: string;
  title?: string;
  venue?: string;
  publicationType?: "journal" | "conference" | "thesis" | "unknown";
  year?: string;
  abstract?: string;
}

export async function fetchCrossrefMetadata(doi: string): Promise<CrossrefMetadata | null> {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "").trim();
  if (!cleanDoi || !/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(cleanDoi)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Scholar-Extractor-Bot/2.0 (mailto:scholar-extractor@research.local)",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const data: any = await resp.json();
    const item = data?.message;
    if (!item) return null;

    let publicationType: "journal" | "conference" | "thesis" | "unknown" = "unknown";
    if (item.type === "journal-article" || item.type === "journal") {
      publicationType = "journal";
    } else if (item.type === "proceedings-article" || item.type === "proceedings") {
      publicationType = "conference";
    } else if (item.type === "dissertation") {
      publicationType = "thesis";
    }

    const venue = (item["container-title"] && item["container-title"][0]) || item.publisher || "";
    const year =
      item.published?.["date-parts"]?.[0]?.[0] ||
      item.created?.["date-parts"]?.[0]?.[0] ||
      item["published-print"]?.["date-parts"]?.[0]?.[0] ||
      "";
    let abstract: string | undefined;
    if (item.abstract && typeof item.abstract === "string") {
      abstract = item.abstract
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    return {
      doi: cleanDoi,
      title: item.title?.[0],
      venue: venue || undefined,
      publicationType,
      year: year ? String(year) : undefined,
      abstract: abstract && abstract.length > 30 ? abstract : undefined,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Trích xuất mã DOI từ văn bản hoặc chuỗi URL
 */
export function extractDoiFromString(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
  return match ? match[1] : undefined;
}
