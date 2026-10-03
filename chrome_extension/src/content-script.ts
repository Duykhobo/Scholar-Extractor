// Content script Manifest V3 - Thu thap metadata tu trang ACM DL hoac DOM chung
export function cleanDoi(rawDoi?: string): string {
  if (!rawDoi) return '';
  let doi = String(rawDoi).trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  return doi.toLowerCase().trim();
}

export function extractAcmDl() {
  const items: any[] = [];
  const elements = document.querySelectorAll('.issue-item__content, .search__item');
  elements.forEach(el => {
    const titleEl = el.querySelector('.issue-item__title a, .hlFld-Title a') as HTMLAnchorElement;
    const doiEl = el.querySelector('.issue-item__doi, a.issue-item__doi') as HTMLElement;
    const authorEls = el.querySelectorAll('.author-name, .rlist--inline li a');
    const abstractEl = el.querySelector('.issue-item__abstract, .abstract-text') as HTMLElement;
    const yearEl = el.querySelector('.dot-separator, .epub-section') as HTMLElement;

    const title = titleEl ? titleEl.innerText.trim() : '';
    const url = titleEl ? titleEl.href : window.location.href;
    const rawDoi = doiEl ? doiEl.innerText.trim() : '';
    const authors = Array.from(authorEls).map(a => (a as HTMLElement).innerText.trim()).filter(Boolean).join('; ');
    const abstract = abstractEl ? abstractEl.innerText.trim() : '';

    let year = '';
    if (yearEl) {
      const match = yearEl.innerText.match(/\b(19\d\d|20\d\d)\b/);
      if (match) year = match[1];
    }

    if (title) {
      items.push({
        source: 'ACM DL',
        discoverySource: 'ACM DL',
        collectionMethod: 'DOM Scraping',
        title,
        authors,
        year,
        venue: 'ACM Digital Library',
        doi: cleanDoi(rawDoi),
        abstract,
        url
      });
    }
  });
  return items;
}

export function extractGenericMeta() {
  const getMeta = (name: string) => {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el ? el.getAttribute('content') : '';
  };

  const title = getMeta('citation_title') || document.title;
  const doi = getMeta('citation_doi') || '';
  const year = getMeta('citation_publication_date')?.slice(0, 4) || '';
  const venue = getMeta('citation_journal_title') || getMeta('og:site_name') || '';
  const abstract = getMeta('citation_abstract') || getMeta('description') || '';
  const authors = Array.from(document.querySelectorAll('meta[name="citation_author"]'))
    .map(m => m.getAttribute('content'))
    .filter(Boolean)
    .join('; ');

  return [{
    source: 'Web DOM',
    discoverySource: 'Web DOM',
    collectionMethod: 'DOM Scraping',
    title: (title || '').trim(),
    authors,
    year,
    venue,
    doi: cleanDoi(doi || ''),
    abstract: (abstract || '').trim(),
    url: window.location.href
  }];
}

(() => {
  const host = window.location.hostname.toLowerCase();
  let results: any[] = [];
  if (host.includes('dl.acm.org')) {
    results = extractAcmDl();
  } else {
    results = extractGenericMeta();
  }

  return {
    results,
    url: window.location.href,
    count: results.length
  };
})();
