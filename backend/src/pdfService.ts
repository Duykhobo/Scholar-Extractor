import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfParseResult {
  success: boolean;
  pageCount: number;
  pages: { pageNum: number; text: string }[];
  rawText: string;
  isImagePdf: boolean;
  error?: string;
}

/**
 * Trích xuất nội dung văn bản theo từng trang từ PDF buffer
 */
export async function parsePdfBuffer(buffer: Buffer | ArrayBuffer | Uint8Array): Promise<PdfParseResult> {
  try {
    let data: Uint8Array;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
      data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    } else if (buffer instanceof Uint8Array) {
      data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    } else {
      data = new Uint8Array(buffer);
    }

    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true
    });


    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const pages: { pageNum: number; text: string }[] = [];
    let totalTextLength = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pages.push({
        pageNum: i,
        text: pageText
      });
      totalTextLength += pageText.length;
    }

    const rawText = pages.map(p => `--- Trang ${p.pageNum} ---\n${p.text}`).join('\n\n');
    const isImagePdf = totalTextLength < 60; // Dưới 60 ký tự cho toàn bộ tài liệu là PDF scan/hình ảnh

    return {
      success: true,
      pageCount,
      pages,
      rawText,
      isImagePdf,
      error: isImagePdf
        ? 'Tệp PDF chỉ chứa hình ảnh / bản scan (không trích xuất được văn bản số). Không suy diễn thiếu văn bản thành "không có thực nghiệm" (EC-N).'
        : undefined
    };
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      pages: [],
      rawText: '',
      isImagePdf: false,
      error: `Không thể đọc tệp PDF: ${err.message || 'Lỗi định dạng PDF không hợp lệ'}`
    };
  }
}

/**
 * Tải và trích xuất PDF từ URL
 */
export async function parsePdfFromUrl(url: string): Promise<PdfParseResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Scholar-Extractor/2.0'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: '',
        isImagePdf: false,
        error: `Không thể tải tệp PDF từ URL (HTTP ${response.status}: ${response.statusText})`
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('text/html')) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: '',
        isImagePdf: false,
        error: `URL trả về trang HTML thay vì tệp PDF hợp lệ (${contentType})`
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Header = new Uint8Array(arrayBuffer.slice(0, 10));
    const headerStr = String.fromCharCode(...uint8Header);
    if (!headerStr.startsWith('%PDF-')) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: '',
        isImagePdf: false,
        error: 'Tệp tải về không có định dạng PDF hợp lệ (thiếu header %PDF-).'
      };
    }

    return await parsePdfBuffer(arrayBuffer);
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      pages: [],
      rawText: '',
      isImagePdf: false,
      error: `Lỗi kết nối khi tải PDF: ${err.message || 'Không thể truy cập URL'}`
    };
  }
}

/**
 * Trích xuất Abstract từ các trang đầu của PDF nếu có
 */
export function extractAbstractFromPdfPages(pages: { pageNum: number; text: string }[]): string | undefined {
  if (!pages || pages.length === 0) return undefined;
  for (const page of pages.slice(0, 10)) {
    const text = page.text;
    // Bắt đầu bằng Abstract (hoặc Abstract:)
    const absMatch = text.match(/\bAbstract\b[\s\.:\-_]*([\s\S]{60,3000}?)(?=(?:\b(?:Keywords|Index Terms|Categories|Key\s*words|Resumo|Contents|Table of Contents)\b|(?:\n|\s)\d+\s+[A-Z]|(?:\n|\s)[1-9]\.|$))/i);
    if (absMatch) {
      const candidate = absMatch[1].replace(/\s+/g, ' ').trim();
      if (candidate.length >= 50) {
        return candidate;
      }
    }
  }
  return undefined;
}

