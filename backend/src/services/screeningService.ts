import { ProjectStore } from "../db/projectStore";
import { FullTextAttempt, ScreeningDecision } from "../types";

export class ScreeningService {
  /**
   * Đánh giá sàng lọc V1 (Tiêu đề & Tóm tắt)
   * Yêu cầu:
   * - Trạng thái: PENDING | INCLUDE | EXCLUDE | UNSURE
   * - Khi EXCLUDE: Bắt buộc có primaryReason (mã tiêu chí loại trừ, ví dụ EC-N, IC-P...)
   * - Cả INCLUDE và UNSURE đều được chuyển tiếp sang bước tìm toàn văn (Full-Text Retrieval)
   * - Không được tự tiện loại bài chỉ vì thiếu abstract
   */
  static recordDecisionV1(
    projectId: string,
    recordId: string,
    decision: "PENDING" | "INCLUDE" | "EXCLUDE" | "UNSURE",
    primaryReason?: string,
    secondaryReasons?: string[],
    notes?: string,
    decidedBy?: string,
  ): ScreeningDecision {
    if (decision === "EXCLUDE" && (!primaryReason || !primaryReason.trim())) {
      throw new Error("Khi LOẠI BỎ (EXCLUDE) ở vòng V1, bắt buộc phải có lý do loại trừ chính (Primary Exclusion Reason).");
    }

    const project = ProjectStore.getProject(projectId);
    if (!project) throw new Error("Không tìm thấy dự án.");

    const protocolVersion = project.activeProtocolVersion || "v1.0";

    const dec: ScreeningDecision = {
      recordId,
      projectId,
      protocolVersion,
      stage: "v1",
      decision,
      primaryReason: primaryReason?.trim(),
      secondaryReasons,
      notes: notes?.trim(),
      decidedBy: decidedBy || "Reviewer",
      decidedAt: new Date().toISOString(),
      isOutdated: false,
    };

    return ProjectStore.saveDecision(projectId, dec);
  }

  /**
   * Đánh giá sàng lọc V2 (Đọc & Thẩm định Toàn văn)
   * Yêu cầu:
   * - Tách biệt rõ ràng giữa trạng thái truy cập toàn văn (FOUND / UNAVAILABLE) và quyết định V2
   * - "Không truy cập được" (EC-A) chỉ gắn khi thực sự không thể tìm thấy bản mở/tác giả hợp lệ
   * - "Dưới 4 trang" (EC-S) chỉ áp dụng khi số trang < 4
   */
  static recordDecisionV2(
    projectId: string,
    recordId: string,
    decision: "PENDING" | "INCLUDE" | "EXCLUDE" | "UNSURE",
    fullTextStatus: "NOT_ATTEMPTED" | "FOUND" | "UNAVAILABLE",
    pageCount?: number,
    primaryReason?: string,
    secondaryReasons?: string[],
    notes?: string,
    decidedBy?: string,
  ): { decision: ScreeningDecision; fulltext: FullTextAttempt } {
    if (decision === "EXCLUDE" && (!primaryReason || !primaryReason.trim())) {
      throw new Error("Khi LOẠI BỎ (EXCLUDE) ở vòng V2, bắt buộc phải có lý do loại trừ chính.");
    }

    const project = ProjectStore.getProject(projectId);
    if (!project) throw new Error("Không tìm thấy dự án.");

    const protocolVersion = project.activeProtocolVersion || "v1.0";

    // 1. Lưu hoặc cập nhật trạng thái truy cập toàn văn
    const ftAttempt: FullTextAttempt = {
      id: `ft_${recordId}`,
      recordId,
      projectId,
      status: fullTextStatus,
      pageCount,
      notes: notes || (fullTextStatus === "UNAVAILABLE" ? "Không tìm được bản mở hoặc bản tác giả" : undefined),
      attemptedAt: new Date().toISOString(),
      attemptedBy: decidedBy || "Reviewer",
    };
    ProjectStore.saveFullTextAttempt(projectId, ftAttempt);

    // 2. Lưu quyết định V2
    const dec: ScreeningDecision = {
      recordId,
      projectId,
      protocolVersion,
      stage: "v2",
      decision,
      primaryReason: primaryReason?.trim(),
      secondaryReasons,
      notes: notes?.trim(),
      decidedBy: decidedBy || "Reviewer",
      decidedAt: new Date().toISOString(),
      isOutdated: false,
    };
    const savedDec = ProjectStore.saveDecision(projectId, dec);

    return { decision: savedDec, fulltext: ftAttempt };
  }

  /**
   * Lấy danh sách các bài đủ điều kiện chuyển sang vòng V2
   * Bao gồm cả bài đạt INCLUDE sơ bộ và bài UNSURE (đúng theo logic mẫu PRISMA)
   */
  static getEligibleRecordsForV2(projectId: string): string[] {
    const allDecisions = ProjectStore.getDecisions(projectId);
    const v1Decisions = allDecisions.filter((d) => d.stage === "v1");

    const passedIds = new Set<string>();
    for (const d of v1Decisions) {
      if (d.decision === "INCLUDE" || d.decision === "UNSURE") {
        passedIds.add(d.recordId);
      }
    }
    return Array.from(passedIds);
  }

  /**
   * Lấy danh sách các bài báo có quyết định bị lỗi thời (cần review lại) sau khi đổi protocol
   */
  static getOutdatedDecisions(projectId: string): ScreeningDecision[] {
    const allDecisions = ProjectStore.getDecisions(projectId);
    return allDecisions.filter((d) => d.isOutdated === true);
  }

  /**
   * Đánh dấu toàn bộ quyết định cũ cần đối soát lại khi cập nhật protocol
   */
  static markDecisionsOutdated(projectId: string): number {
    const allDecisions = ProjectStore.getDecisions(projectId);
    let count = 0;
    for (const d of allDecisions) {
      if (!d.isOutdated) {
        d.isOutdated = true;
        ProjectStore.saveDecision(projectId, d);
        count++;
      }
    }
    return count;
  }
}
