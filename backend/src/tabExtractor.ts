import { cleanDoi } from './dedup';
import { TabExtractedData } from './types';

/**
 * Trích xuất metadata bài báo từ nội dung HTML của trang web (hoặc từ DOM parser)
 */
export function extractMetadataFromHtml(html: string, pageUrl: string = ''): TabExtractedData {
  if (!html || html.trim().length === 0) {
    return {
      sourceUrl: pageUrl,
      method: 'Empty HTML',
      title: '',
      authors: '',
      year: '',
      venue: '',
      doi: '',
      abstract: '',
      pdfUrl: ''
    };
  }

  // 1. Trích xuất qua HighWire Press (citation_*) meta tags (ƯU TIÊN 1)
  const getMeta = (metaName: string): string => {
    const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${metaName}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = regex.exec(html);
    if (match) return match[1].trim();

    // Thử thứ tự ngược lại (content trước name/property)
    const revRegex = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${metaName}["']`, 'i');
    const revMatch = revRegex.exec(html);
    return revMatch ? revMatch[1].trim() : '';
  };

  const getAllMetas = (metaName: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${metaName}["'][^>]*content=["']([^"']*)["']`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      if (match[1].trim()) results.push(match[1].trim());
    }
    const revRegex = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${metaName}["']`, 'gi');
    while ((match = revRegex.exec(html)) !== null) {
      const val = match[1].trim();
      if (val && !results.includes(val)) results.push(val);
    }
    return results;
  };

  let title = getMeta('citation_title');
  const citationAuthors = getAllMetas('citation_author');
  let authors = citationAuthors.join('; ');
  let doi = getMeta('citation_doi');
  let venue = getMeta('citation_journal_title') || getMeta('citation_conference_title') || getMeta('citation_publisher');
  let rawDate = getMeta('citation_publication_date') || getMeta('citation_date') || getMeta('citation_year');
  let abstract = getMeta('citation_abstract');
  let pdfUrl = getMeta('citation_pdf_url');

  let methodUsed = 'HighWire citation_* Meta';

  // 2. Trích xuất qua Schema.org JSON-LD (ƯU TIÊN 2 nếu thiếu trường)
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1].trim());
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);

      for (const item of items) {
        const itemType = String(item['@type'] || '').toLowerCase();
        if (
          itemType.includes('article') ||
          itemType.includes('scholarlyarticle') ||
          itemType.includes('techreport') ||
          itemType.includes('report') ||
          itemType.includes('publication')
        ) {
          if (!title) title = item.headline || item.name || '';
          if (!authors && item.author) {
            const authorList = Array.isArray(item.author) ? item.author : [item.author];
            authors = authorList
              .map((a: any) => (typeof a === 'string' ? a : (a.name || '')))
              .filter(Boolean)
              .join('; ');
          }
          if (!doi && (item.identifier || item.sameAs)) {
            const idVal = String(item.identifier || item.sameAs);
            const doiM = idVal.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
            if (doiM) doi = doiM[0];
          }
          if (!venue && item.isPartOf) {
            venue = typeof item.isPartOf === 'string' ? item.isPartOf : (item.isPartOf.name || '');
          }
          if (!venue && item.publisher) {
            venue = typeof item.publisher === 'string' ? item.publisher : (item.publisher.name || '');
          }
          if (!rawDate && item.datePublished) {
            rawDate = String(item.datePublished);
          }
          if (!abstract && (item.description || item.abstract)) {
            abstract = item.abstract || item.description || '';
          }
          methodUsed = 'JSON-LD + citation_*';
        }
      }
    } catch {
      // Bỏ qua lỗi parse JSON-LD hỏng
    }
  }

  // 3. Dự phòng Dublin Core & OpenGraph
  if (!title) {
    title = getMeta('DC.title') || getMeta('dc.title') || getMeta('og:title');
    if (!title) {
      const docTitleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (docTitleM) title = docTitleM[1].trim();
    }
  }

  if (!authors) {
    const dcAuthors = getAllMetas('DC.creator').concat(getAllMetas('dc.creator'));
    if (dcAuthors.length > 0) authors = dcAuthors.join('; ');
  }

  if (!doi) {
    const dcId = getMeta('DC.identifier') || getMeta('dc.identifier');
    const doiM = dcId.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    if (doiM) doi = doiM[0];
  }

  if (!venue) {
    venue = getMeta('DC.source') || getMeta('dc.source') || getMeta('og:site_name');
  }

  if (!rawDate) {
    rawDate = getMeta('DC.date') || getMeta('dc.date') || getMeta('article:published_time');
  }

  if (!abstract) {
    abstract = getMeta('DC.description') || getMeta('dc.description') || getMeta('description') || getMeta('og:description');
  }

  if (!pdfUrl) {
    const pdfLinkM = html.match(/<link\s+[^>]*rel=["']alternate["'][^>]*type=["']application\/pdf["'][^>]*href=["']([^"']*)["']/i);
    if (pdfLinkM) pdfUrl = pdfLinkM[1].trim();
  }

  // Chuẩn hóa năm 4 chữ số
  let year = '';
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) year = yearMatch[1];
  }

  // Chuẩn hóa link PDF nếu là relative
  if (pdfUrl && pageUrl && !pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
    try {
      pdfUrl = new URL(pdfUrl, pageUrl).toString();
    } catch {
      // Giữ nguyên nếu không parse được
    }
  }

  // Xóa các tiền tố HTML entities thông dụng trong title/abstract
  const cleanText = (str?: string) =>
    (str || '')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

  return {
    sourceUrl: pageUrl,
    method: methodUsed,
    title: cleanText(title),
    authors: cleanText(authors),
    year,
    venue: cleanText(venue),
    doi: cleanDoi(doi),
    abstract: cleanText(abstract), // Tuyệt đối không lấy snippet làm abstract
    pdfUrl: pdfUrl ? pdfUrl.trim() : ''
  };
}
