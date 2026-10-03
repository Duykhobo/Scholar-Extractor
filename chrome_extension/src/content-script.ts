// Content script Manifest V3 - Thu thập metadata từ trang bài báo khoa học hoặc DOM chung

export function cleanDoi(rawDoi?: string): string {
  if (!rawDoi) return '';
  let doi = String(rawDoi).trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  return doi.toLowerCase().trim();
}

/**
 * Trích xuất toàn diện metadata và văn bản bài báo từ trang đang mở:
 * Thứ tự ưu tiên:
 * 1. HighWire Press (citation_*) meta tags
 * 2. Schema.org JSON-LD (application/ld+json)
 * 3. Dublin Core / OpenGraph
 * 4. Fallback DOM selectors theo từng publisher (ACM DL, IEEE, Springer, arXiv, ScienceDirect...)
 */
export function extractCurrentPageData() {
  const getMeta = (name: string): string => {
    const el = document.querySelector(`meta[name="${name}" i], meta[property="${name}" i]`);
    return el ? (el.getAttribute('content') || '').trim() : '';
  };

  const getAllMetas = (name: string): string[] => {
    const els = document.querySelectorAll(`meta[name="${name}" i], meta[property="${name}" i]`);
    return Array.from(els)
      .map(el => (el.getAttribute('content') || '').trim())
      .filter(Boolean);
  };

  // 1. HighWire Press citation_* (ƯU TIÊN 1)
  let title = getMeta('citation_title');
  const citationAuthors = getAllMetas('citation_author');
  let authors = citationAuthors.join('; ');
  let doi = getMeta('citation_doi');
  let venue = getMeta('citation_journal_title') || getMeta('citation_conference_title') || getMeta('citation_publisher');
  let rawDate = getMeta('citation_publication_date') || getMeta('citation_date') || getMeta('citation_year');
  let abstract = getMeta('citation_abstract');
  let pdfUrl = getMeta('citation_pdf_url');

  let method = 'HighWire citation_* Meta';

  // 2. Schema.org JSON-LD (ƯU TIÊN 2 nếu thiếu trường)
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const parsed = JSON.parse(script.textContent || '{}');
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
          method = 'JSON-LD + citation_*';
        }
      }
    } catch {
      // Bỏ qua lỗi cú pháp JSON-LD trên trang
    }
  });

  // 3. Dublin Core / OpenGraph (ƯU TIÊN 3)
  if (!title) {
    title = getMeta('DC.title') || getMeta('dc.title') || getMeta('og:title');
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

  // 4. Fallback DOM Selectors theo các nhà xuất bản phổ biến
  const host = window.location.hostname.toLowerCase();

  // ACM DL
  if (host.includes('dl.acm.org')) {
    if (!title) {
      const el = document.querySelector('.citation__title, .issue-item__title a, h1.citation__title');
      if (el) title = (el as HTMLElement).innerText.trim();
    }
    if (!abstract) {
      const el = document.querySelector('.abstractSection, .abstract-text');
      if (el) abstract = (el as HTMLElement).innerText.trim();
    }
    if (!venue) venue = 'ACM Digital Library';
  }

  // IEEE Xplore
  if (host.includes('ieee.org')) {
    if (!title) {
      const el = document.querySelector('.document-title, h1.document-title');
      if (el) title = (el as HTMLElement).innerText.trim();
    }
    if (!abstract) {
      const el = document.querySelector('.abstract-text');
      if (el) abstract = (el as HTMLElement).innerText.trim();
    }
  }

  // Springer
  if (host.includes('springer.com')) {
    if (!title) {
      const el = document.querySelector('.c-article-title, h1.c-article-title');
      if (el) title = (el as HTMLElement).innerText.trim();
    }
    if (!abstract) {
      const el = document.querySelector('#Abs1-content, .c-article-section__content');
      if (el) abstract = (el as HTMLElement).innerText.trim();
    }
  }

  // arXiv
  if (host.includes('arxiv.org')) {
    if (!title) {
      const el = document.querySelector('h1.title');
      if (el) title = (el as HTMLElement).innerText.replace(/^Title:\s*/i, '').trim();
    }
    if (!abstract) {
      const el = document.querySelector('blockquote.abstract');
      if (el) abstract = (el as HTMLElement).innerText.replace(/^Abstract:\s*/i, '').trim();
    }
    if (!venue) venue = 'arXiv';
  }

  // Tiêu đề trang HTML cuối cùng
  if (!title) {
    title = document.title.replace(/\s*\|\s*.*$/, '').replace(/\s*-\s*.*$/, '').trim();
  }

  // Chuẩn hóa năm 4 chữ số
  let year = '';
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) year = yearMatch[1];
  }

  // 5. Tìm liên kết PDF
  if (!pdfUrl) {
    const linkEl = document.querySelector('link[rel="alternate"][type="application/pdf"], link[type="application/pdf"]') as HTMLLinkElement;
    if (linkEl && linkEl.href) {
      pdfUrl = linkEl.href;
    } else {
      const aPdf = document.querySelector('a[href*=".pdf"], a.pdf-btn, a[data-testid="pdf-link"]') as HTMLAnchorElement;
      if (aPdf && aPdf.href) pdfUrl = aPdf.href;
    }
  }

  // Nếu tab hiện tại chính là một URL PDF
  if (window.location.pathname.toLowerCase().endsWith('.pdf') || document.contentType === 'application/pdf') {
    pdfUrl = window.location.href;
    method = 'Active Tab PDF URL';
  }

  // Lấy nội dung text chính của trang (để phân tích bằng chứng IC-I/IC-E nếu là bài báo HTML đầy đủ)
  let rawText = '';
  const articleEl = document.querySelector('article, main, #main-content, .article-content, #content');
  if (articleEl) {
    rawText = (articleEl as HTMLElement).innerText || '';
  } else {
    rawText = document.body ? document.body.innerText || '' : '';
  }

  // Giới hạn độ dài rawText để gửi an toàn
  if (rawText.length > 200000) {
    rawText = rawText.slice(0, 200000);
  }

  return {
    sourceUrl: window.location.href,
    method,
    title: (title || '').trim(),
    authors: (authors || '').trim(),
    year: year || '',
    venue: (venue || '').trim(),
    doi: cleanDoi(doi),
    abstract: (abstract || '').trim(), // Tuyệt đối không lấy snippet làm abstract
    pdfUrl: (pdfUrl || '').trim(),
    rawText
  };
}

// Gan vao window va chay truc tiep
if (typeof window !== 'undefined') {
  (window as any).extractCurrentPageData = extractCurrentPageData;
}

(() => {
  try {
    return extractCurrentPageData();
  } catch (e) {
    return null;
  }
})();

