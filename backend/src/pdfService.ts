import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

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
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(buffer)) {
      data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    } else if (buffer instanceof Uint8Array) {
      data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    } else {
      data = new Uint8Array(buffer);
    }

    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      verbosity: 0, // 0 = ERRORS only: loại bỏ rác log TrueType font hinting warnings
    });

    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const pages: { pageNum: number; text: string }[] = [];
    let totalTextLength = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        pageNum: i,
        text: pageText,
      });
      totalTextLength += pageText.length;
    }

    const rawText = pages.map((p) => `--- Trang ${p.pageNum} ---\n${p.text}`).join("\n\n");
    const isImagePdf = totalTextLength < 60; // Dưới 60 ký tự cho toàn bộ tài liệu là PDF scan/hình ảnh

    return {
      success: true,
      pageCount,
      pages,
      rawText,
      isImagePdf,
      error: isImagePdf
        ? 'Tệp PDF chỉ chứa hình ảnh / bản scan (không trích xuất được văn bản số). Không suy diễn thiếu văn bản thành "không có thực nghiệm" (EC-N).'
        : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      pages: [],
      rawText: "",
      isImagePdf: false,
      error: `Không thể đọc tệp PDF: ${err.message || "Lỗi định dạng PDF không hợp lệ"}`,
    };
  }
}

import dns from "dns";
import net from "net";

/**
 * Kiểm tra xem địa chỉ IP có thuộc mạng nội bộ, loopback, hoặc cloud metadata không (SSRF Protection)
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata: AWS, Azure, GCP 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 (Loopback)
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // fc00::/7 (Unique local)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // fe80::/10 (Link-local)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb"))
      return true;
    return false;
  }
  return false;
}

/**
 * Xác thực URL chống tấn công SSRF (Server-Side Request Forgery)
 */
export async function validateUrlForSsrf(urlString: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: `Giao thức không được phép (${parsed.protocol}). Chỉ chấp nhận http hoặc https.` };
    }

    const hostname = parsed.hostname;
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return { safe: false, error: `Host "${hostname}" không được phép (SSRF protection).` };
    }

    // Nếu hostname là IP trực tiếp
    if (net.isIP(hostname)) {
      if (isPrivateIp(hostname)) {
        return {
          safe: false,
          error: `Địa chỉ IP "${hostname}" thuộc dải mạng nội bộ hoặc link-local (SSRF protection).`,
        };
      }
      return { safe: true };
    }

    // Phân giải DNS kiểm tra dải IP
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIp(addr.address)) {
          return {
            safe: false,
            error: `Tên miền "${hostname}" phân giải về IP nội bộ (${addr.address}) (SSRF protection).`,
          };
        }
      }
    } catch (dnsErr: any) {
      return { safe: false, error: `Không thể phân giải tên miền: ${dnsErr.message}` };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, error: `URL không hợp lệ: ${err.message}` };
  }
}

/**
 * Tải và trích xuất PDF từ URL với bảo vệ SSRF & kiểm tra an toàn từng bước chuyển hướng (Redirects)
 */
export async function parsePdfFromUrl(initialUrl: string): Promise<PdfParseResult> {
  try {
    let currentUrl = initialUrl;
    let response: any = null;
    const maxRedirects = 5;

    for (let i = 0; i < maxRedirects; i++) {
      // 1. Kiểm tra SSRF trước mỗi request
      const ssrfCheck = await validateUrlForSsrf(currentUrl);
      if (!ssrfCheck.safe) {
        return {
          success: false,
          pageCount: 0,
          pages: [],
          rawText: "",
          isImagePdf: false,
          error: `Yêu cầu bị từ chối do chính sách bảo mật SSRF: ${ssrfCheck.error}`,
        };
      }

      response = await fetch(currentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Scholar-Extractor/2.0",
        },
        redirect: "manual", // Thủ công xử lý redirect để kiểm tra an toàn URL đích
      });

      // Kiểm tra HTTP redirect (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            success: false,
            pageCount: 0,
            pages: [],
            rawText: "",
            isImagePdf: false,
            error: `Chuyển hướng HTTP ${response.status} thiếu header Location.`,
          };
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      break;
    }

    if (!response || !response.ok) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: "",
        isImagePdf: false,
        error: `Không thể tải tệp PDF từ URL (HTTP ${response?.status || "Unknown"}: ${response?.statusText || ""})`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.toLowerCase().includes("text/html")) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: "",
        isImagePdf: false,
        error: `URL trả về trang HTML thay vì tệp PDF hợp lệ (${contentType})`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Header = new Uint8Array(arrayBuffer.slice(0, 10));
    const headerStr = String.fromCharCode(...uint8Header);
    if (!headerStr.startsWith("%PDF-")) {
      return {
        success: false,
        pageCount: 0,
        pages: [],
        rawText: "",
        isImagePdf: false,
        error: "Tệp tải về không có định dạng PDF hợp lệ (thiếu header %PDF-).",
      };
    }

    return await parsePdfBuffer(arrayBuffer);
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      pages: [],
      rawText: "",
      isImagePdf: false,
      error: `Lỗi kết nối khi tải PDF: ${err.message || "Không thể truy cập URL"}`,
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
    const absMatch = text.match(
      /\bAbstract\b[\s\.:\-_]*([\s\S]{60,3000}?)(?=(?:\b(?:Keywords|Index Terms|Categories|Key\s*words|Resumo|Contents|Table of Contents)\b|(?:\n|\s)\d+\s+[A-Z]|(?:\n|\s)[1-9]\.|$))/i,
    );
    if (absMatch) {
      const candidate = absMatch[1].replace(/\s+/g, " ").trim();
      if (candidate.length >= 50) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * Trích xuất tên Hội nghị / Tạp chí (Venue) từ Header, Running Head hoặc các trang đầu của PDF
 * Hỗ trợ nhận diện các bài đăng trên arXiv nhưng có huy hiệu/header hội nghị thật (như SBES, ICSE, ISSTA...)
 */
export function extractVenueFromPdfPages(
  pages: { pageNum: number; text: string }[],
): { venue: string; pubType: "conference" | "journal" } | undefined {
  if (!pages || pages.length === 0) return undefined;

  for (const page of pages.slice(0, 5)) {
    const text = page.text;

    // 1. Nhận diện tên hội nghị viết tắt kèm năm: SBES ’25, ICSE 2024, ISSTA '25, ASE, FSE...
    const confAcronymMatch = text.match(
      /\b(SBES|ICSE|ISSTA|ASE|FSE|MSR|ICSME|SANER|ICST|ISSRE|QRS|SAC|AST|ESEC\/FSE|SIGSOFT)\s*['’]?\s*(?:20)?(2[0-6])\b/i,
    );
    if (confAcronymMatch) {
      return {
        venue: confAcronymMatch[0].replace(/\s+/g, " ").trim(),
        pubType: "conference",
      };
    }

    // 2. Nhận diện "Proceedings of the ..."
    const procMatch = text.match(
      /\bProceedings of the\s+([A-Za-z0-9\s,\-'\.]{6,80}?)(?=(?:\s*\(|\s*\d{4}|\s*,\s*20|\n|\.|$))/i,
    );
    if (procMatch) {
      return {
        venue: `Proceedings of the ${procMatch[1].replace(/\s+/g, " ").trim()}`,
        pubType: "conference",
      };
    }

    // 3. Nhận diện "International Conference / Symposium on ..."
    const confMatch = text.match(
      /\b(?:IEEE\/ACM\s+|ACM\/IEEE\s+|IEEE\s+|ACM\s+)?(?:International\s+)?(?:Conference|Symposium|Workshop)\s+on\s+([A-Za-z0-9\s,\-'\.]{6,80}?)(?=(?:\s*\(|\s*\d{4}|\s*,\s*20|\n|\.|$))/i,
    );
    if (confMatch) {
      return {
        venue: confMatch[0].replace(/\s+/g, " ").trim(),
        pubType: "conference",
      };
    }

    // 4. Nhận diện "IEEE Transactions on ..." / "ACM Transactions on ..." / "Journal of ..."
    const transMatch = text.match(
      /\b(?:IEEE|ACM)\s+Transactions\s+on\s+([A-Za-z0-9\s,\-'\.]{6,80}?)(?=(?:\s*\(|\s*\d{4}|\s*,\s*20|\n|\.|$))/i,
    );
    if (transMatch) {
      return {
        venue: transMatch[0].replace(/\s+/g, " ").trim(),
        pubType: "journal",
      };
    }

    const journalMatch = text.match(
      /\b(?:International\s+)?Journal\s+of\s+([A-Za-z0-9\s,\-'\.]{6,80}?)(?=(?:\s*\(|\s*\d{4}|\s*,\s*20|\n|\.|$))/i,
    );
    if (journalMatch) {
      return {
        venue: journalMatch[0].replace(/\s+/g, " ").trim(),
        pubType: "journal",
      };
    }
  }

  return undefined;
}
