"use strict";
(() => {
  // src/content-script.ts
  function cleanDoi(rawDoi) {
    if (!rawDoi) return "";
    let doi = String(rawDoi).trim();
    doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    doi = doi.replace(/^doi:\s*/i, "");
    return doi.toLowerCase().trim();
  }
  function extractCurrentPageData() {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}" i], meta[property="${name}" i]`);
      return el ? (el.getAttribute("content") || "").trim() : "";
    };
    const getAllMetas = (name) => {
      const els = document.querySelectorAll(`meta[name="${name}" i], meta[property="${name}" i]`);
      return Array.from(els).map((el) => (el.getAttribute("content") || "").trim()).filter(Boolean);
    };
    let title = getMeta("citation_title");
    const citationAuthors = getAllMetas("citation_author");
    let authors = citationAuthors.join("; ");
    let doi = getMeta("citation_doi");
    let venue = getMeta("citation_journal_title") || getMeta("citation_conference_title") || getMeta("citation_publisher");
    let rawDate = getMeta("citation_publication_date") || getMeta("citation_date") || getMeta("citation_year");
    let abstract = getMeta("citation_abstract");
    let pdfUrl = getMeta("citation_pdf_url");
    let method = "HighWire citation_* Meta";
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script) => {
      try {
        const parsed = JSON.parse(script.textContent || "{}");
        const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
        for (const item of items) {
          const itemType = String(item["@type"] || "").toLowerCase();
          if (itemType.includes("article") || itemType.includes("scholarlyarticle") || itemType.includes("techreport") || itemType.includes("report") || itemType.includes("publication")) {
            if (!title) title = item.headline || item.name || "";
            if (!authors && item.author) {
              const authorList = Array.isArray(item.author) ? item.author : [item.author];
              authors = authorList.map((a) => typeof a === "string" ? a : a.name || "").filter(Boolean).join("; ");
            }
            if (!doi && (item.identifier || item.sameAs)) {
              const idVal = String(item.identifier || item.sameAs);
              const doiM = idVal.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
              if (doiM) doi = doiM[0];
            }
            if (!venue && item.isPartOf) {
              venue = typeof item.isPartOf === "string" ? item.isPartOf : item.isPartOf.name || "";
            }
            if (!venue && item.publisher) {
              venue = typeof item.publisher === "string" ? item.publisher : item.publisher.name || "";
            }
            if (!rawDate && item.datePublished) {
              rawDate = String(item.datePublished);
            }
            if (!abstract && (item.description || item.abstract)) {
              abstract = item.abstract || item.description || "";
            }
            method = "JSON-LD + citation_*";
          }
        }
      } catch {
      }
    });
    if (!title) {
      title = getMeta("DC.title") || getMeta("dc.title") || getMeta("og:title");
    }
    if (!authors) {
      const dcAuthors = getAllMetas("DC.creator").concat(getAllMetas("dc.creator"));
      if (dcAuthors.length > 0) authors = dcAuthors.join("; ");
    }
    if (!doi) {
      const dcId = getMeta("DC.identifier") || getMeta("dc.identifier");
      const doiM = dcId.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
      if (doiM) doi = doiM[0];
    }
    if (!venue) {
      venue = getMeta("DC.source") || getMeta("dc.source") || getMeta("og:site_name");
    }
    if (!rawDate) {
      rawDate = getMeta("DC.date") || getMeta("dc.date") || getMeta("article:published_time");
    }
    if (!abstract) {
      abstract = getMeta("DC.description") || getMeta("dc.description") || getMeta("description") || getMeta("og:description");
    }
    const host = window.location.hostname.toLowerCase();
    if (host.includes("dl.acm.org")) {
      if (!title) {
        const el = document.querySelector(".citation__title, .issue-item__title a, h1.citation__title");
        if (el) title = el.innerText.trim();
      }
      if (!abstract) {
        const el = document.querySelector(".abstractSection, .abstract-text");
        if (el) abstract = el.innerText.trim();
      }
      if (!venue) venue = "ACM Digital Library";
    }
    if (host.includes("ieee.org")) {
      if (!title) {
        const el = document.querySelector(".document-title, h1.document-title");
        if (el) title = el.innerText.trim();
      }
      if (!abstract) {
        const el = document.querySelector(".abstract-text");
        if (el) abstract = el.innerText.trim();
      }
    }
    if (host.includes("springer.com")) {
      if (!title) {
        const el = document.querySelector(".c-article-title, h1.c-article-title");
        if (el) title = el.innerText.trim();
      }
      if (!abstract) {
        const el = document.querySelector("#Abs1-content, .c-article-section__content");
        if (el) abstract = el.innerText.trim();
      }
    }
    if (host.includes("arxiv.org")) {
      if (!title) {
        const el = document.querySelector("h1.title, h1.ltx_title, .ltx_title_document");
        if (el) title = el.innerText.replace(/^Title:\s*/i, "").trim();
      }
      if (!abstract) {
        const ltxAbs = document.querySelector(".ltx_abstract, section.ltx_abstract, div.ltx_abstract, div.abstract");
        if (ltxAbs) {
          const pEls = ltxAbs.querySelectorAll(".ltx_p, p");
          if (pEls.length > 0) {
            abstract = Array.from(pEls).map((p) => p.innerText.trim()).filter(Boolean).join("\n\n");
          } else {
            const clone = ltxAbs.cloneNode(true);
            clone.querySelectorAll(".ltx_title, .ltx_title_abstract, h1, h2, h3, h4, h5, h6").forEach((h) => h.remove());
            abstract = clone.innerText.trim();
          }
        }
        if (!abstract) {
          const el = document.querySelector("blockquote.abstract");
          if (el) abstract = el.innerText.replace(/^Abstract:\s*/i, "").trim();
        }
      }
    }
    if (!title) {
      title = document.title.replace(/\s*\|\s*.*$/, "").replace(/\s*-\s*.*$/, "").trim();
    }
    let year = "";
    if (rawDate) {
      const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) year = yearMatch[1];
    }
    const currentUrl = window.location.href;
    const arxivMatch = currentUrl.match(/arxiv\.org\/(?:abs|html|pdf)\/([a-z\-]+(?:\.[a-z\-]+)?\/\d{7}|\d{4}\.\d{4,5}(?:v\d+)?)/i) || currentUrl.match(/arxiv:([a-z\-]+(?:\.[a-z\-]+)?\/\d{7}|\d{4}\.\d{4,5}(?:v\d+)?)/i);
    if (arxivMatch) {
      const arxivId = arxivMatch[1].replace(/\.pdf$/i, "");
      pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
    } else if (!pdfUrl) {
      const linkEl = document.querySelector('link[rel="alternate"][type="application/pdf"], link[type="application/pdf"]');
      if (linkEl && linkEl.href) {
        pdfUrl = linkEl.href;
      } else {
        const aPdf = document.querySelector(
          'a.mobile-submission-download[href*="/pdf/"], a.download-pdf, a.pdf-link, header a[href*=".pdf"], nav a[href*=".pdf"], .article-tools a[href*=".pdf"], a[data-testid="pdf-link"], a.pdf-btn'
        );
        if (aPdf && aPdf.href) pdfUrl = aPdf.href;
      }
    }
    if (window.location.pathname.toLowerCase().endsWith(".pdf") || document.contentType === "application/pdf") {
      pdfUrl = window.location.href;
      method = "Active Tab PDF URL";
    }
    const structuredTables = [];
    const tableElements = document.querySelectorAll("figure.ltx_table, figure:has(table), table");
    tableElements.forEach((el, idx) => {
      if (el.tagName.toLowerCase() === "table" && el.closest("figure.ltx_table, figure:has(table)")) {
        return;
      }
      const anchorId = el.getAttribute("id") || el.querySelector("[id]")?.getAttribute("id") || `table-${idx + 1}`;
      const captionEl = el.querySelector("figcaption, caption, .ltx_caption");
      const caption = captionEl ? captionEl.innerText.replace(/\s+/g, " ").trim() : "";
      const headers = [];
      el.querySelectorAll("th, .ltx_th").forEach((th) => {
        const t = th.innerText.replace(/\s+/g, " ").trim();
        if (t) headers.push(t);
      });
      const cells = [];
      el.querySelectorAll("td, .ltx_td").forEach((td) => {
        const t = td.innerText.replace(/\s+/g, " ").trim();
        if (t) cells.push(t);
      });
      const closestSection = el.closest('section[id], div[id^="S"]');
      const sectionAnchor = closestSection ? closestSection.getAttribute("id") : "";
      const sectionHeading = closestSection ? (closestSection.querySelector("h1, h2, h3, h4, h5, h6, .ltx_title")?.textContent || "").trim() : "";
      const sectionIdentifier = sectionHeading || sectionAnchor || "";
      const tableSummary = `[Table / Figure #${anchorId}${sectionAnchor ? ` in #${sectionAnchor}` : ""}: ${caption} | Headers: ${headers.join(" | ")} | Cells: ${cells.join(", ")}]`;
      structuredTables.push({
        id: anchorId,
        caption,
        section: sectionIdentifier || void 0,
        anchor: `#${anchorId}`,
        headers,
        cells,
        rawText: tableSummary
      });
    });
    if (!authors) {
      const authorEls = document.querySelectorAll(".ltx_authors .ltx_personname, .ltx_creator.ltx_role_author .ltx_personname, .authors .author");
      if (authorEls.length > 0) {
        authors = Array.from(authorEls).map((a) => a.innerText.trim()).filter(Boolean).join("; ");
      }
    }
    if (!year) {
      const dateEl = document.querySelector(".ltx_date, .ltx_dates, .header-meta .date");
      if (dateEl) {
        const ym = dateEl.innerText.match(/\b(19\d\d|20\d\d)\b/);
        if (ym) year = ym[1];
      }
      if (!year && arxivMatch) {
        const y2 = arxivMatch[1].slice(0, 2);
        if (/^\d\d$/.test(y2)) {
          year = `20${y2}`;
        }
      }
    }
    let rawText = "";
    const articleEl = document.querySelector("article, main, #main-content, .article-content, #content");
    if (articleEl) {
      rawText = articleEl.innerText || "";
    } else {
      rawText = document.body ? document.body.innerText || "" : "";
    }
    if (structuredTables.length > 0) {
      const tablesText = "\n\n=== STRUCTURED HTML TABLES ===\n" + structuredTables.map((t) => t.rawText).join("\n\n");
      rawText += tablesText;
    }
    if (rawText.length > 2e5) {
      rawText = rawText.slice(0, 2e5);
    }
    return {
      sourceUrl: window.location.href,
      method,
      title: (title || "").trim(),
      authors: (authors || "").trim(),
      year: year || "",
      venue: (venue || "").trim(),
      doi: cleanDoi(doi),
      abstract: (abstract || "").trim(),
      // Tuyệt đối không lấy snippet làm abstract
      pdfUrl: (pdfUrl || "").trim(),
      rawText,
      tables: structuredTables
    };
  }
  if (typeof window !== "undefined") {
    window.extractCurrentPageData = extractCurrentPageData;
  }
  (() => {
    try {
      return extractCurrentPageData();
    } catch (e) {
      return null;
    }
  })();
})();
