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
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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

    const arrayBuffer = await response.arrayBuffer();
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
