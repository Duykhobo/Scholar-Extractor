import { ResearchProfile, evaluateProfileScreening } from "../profiles";
import { CanonicalPaper, V2ScreeningDecision } from "../types";

export interface ScreeningV2Result {
  records: CanonicalPaper[];
  passToFullTextRecords: CanonicalPaper[];
  excludeRecords: CanonicalPaper[];
  unsureRecords: CanonicalPaper[];
  stats: {
    totalScreened: number;
    passedToFullText: number;
    excluded: number;
    unsure: number;
    excludedByReason: Record<string, number>;
  };
}

export class PipelineV2Screening {
  /**
   * Sàng lọc Tiêu đề & Tóm tắt (V2) trên danh sách Canonical Records từ V1
   */
  static processV2(
    canonicalRecords: CanonicalPaper[],
    profile: ResearchProfile,
    options: {
      preserveManualDecisions?: boolean;
    } = { preserveManualDecisions: true },
  ): ScreeningV2Result {
    const updatedRecords: CanonicalPaper[] = [];
    const passedList: CanonicalPaper[] = [];
    const excludedList: CanonicalPaper[] = [];
    const unsureList: CanonicalPaper[] = [];
    const excludedByReason: Record<string, number> = {};

    for (const record of canonicalRecords) {
      // 1. Kiểm tra nếu là tập kỷ yếu (Container) -> Loại trực tiếp theo EC-N
      if (record.isContainer) {
        const v2Decision: V2ScreeningDecision = "Exclude";
        const reason = "EC-N — tập kỷ yếu (container), không phải bài báo thực nghiệm";
        excludedByReason["EC-N"] = (excludedByReason["EC-N"] || 0) + 1;

        const updated: CanonicalPaper = {
          ...record,
          pipelineStage: "V2",
          screeningStage: "V2",
          v2Decision,
          suggestedDecision: "Exclude",
          screeningReason: reason,
          finalDecision: options.preserveManualDecisions && record.finalDecision ? record.finalDecision : "",
        };
        updatedRecords.push(updated);
        excludedList.push(updated);
        continue;
      }

      // 2. Chạy bộ quy tắc Profile Screening
      const evalResult = evaluateProfileScreening(profile, record, { stage: "title_abstract" });

      let v2Decision: V2ScreeningDecision;
      if (evalResult.suggestedDecision === "Exclude") {
        v2Decision = "Exclude";
      } else {
        // Kiểm tra xem các tiêu chí unknown có phải chỉ là các tiêu chí thuộc vòng full_text hay không
        const fullTextCriteriaSet = new Set(
          profile.criteria.filter((c) => c.stage === "full_text").map((c) => c.id),
        );
        const nonFullTextUnknowns = (evalResult.unknownCriteria || []).filter(
          (id) => !fullTextCriteriaSet.has(id),
        );

        if (nonFullTextUnknowns.length === 0 && evalResult.matchedCriteria.length > 0) {
          // Tất cả tiêu chí metadata & title_abstract đã đạt -> Cho qua vòng toàn văn
          v2Decision = "PassToFullText";
        } else {
          v2Decision = "Unsure";
        }
      }

      // 3. Bảo lưu quyết định thủ công nếu người dùng đã chốt trước đó
      let finalDecision = record.finalDecision;
      if (!options.preserveManualDecisions) {
        finalDecision = "";
      }

      // Thống kê lý do loại trừ chính
      if (v2Decision === "Exclude") {
        const matchEc = evalResult.screeningReason.match(/\b(EC-[A-Z0-9]+)\b/);
        const primaryReason = matchEc ? matchEc[1] : "EC-Other";
        excludedByReason[primaryReason] = (excludedByReason[primaryReason] || 0) + 1;
      }

      const updated: CanonicalPaper = {
        ...record,
        pipelineStage: "V2",
        screeningStage: "V2",
        v2Decision,
        suggestedDecision: evalResult.suggestedDecision,
        screeningReason: evalResult.screeningReason,
        matchedCriteria: evalResult.matchedCriteria,
        unknownCriteria: evalResult.unknownCriteria,
        missingEvidence: evalResult.missingEvidence,
        finalDecision,
      };

      updatedRecords.push(updated);
      if (v2Decision === "PassToFullText") passedList.push(updated);
      else if (v2Decision === "Exclude") excludedList.push(updated);
      else unsureList.push(updated);
    }

    return {
      records: updatedRecords,
      passToFullTextRecords: passedList,
      excludeRecords: excludedList,
      unsureRecords: unsureList,
      stats: {
        totalScreened: updatedRecords.length,
        passedToFullText: passedList.length,
        excluded: excludedList.length,
        unsure: unsureList.length,
        excludedByReason,
      },
    };
  }
}
