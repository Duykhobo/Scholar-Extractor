import { SourceAdapterRegistry } from "../adapters";
import { PaperRecord, SnowballSeed } from "../types";

export interface SnowballConfig {
  researchId: string;
  seeds: Array<{ id: string; doi?: string; title: string }>;
  directions: ("backward" | "forward")[];
  maxIterations: number;
  maxPapersPerSeed: number;
  useOpenAlex?: boolean;
  useSemanticScholar?: boolean;
}

export interface SnowballResult {
  newPapers: PaperRecord[];
  discoveredSeeds: SnowballSeed[];
  totalDiscovered: number;
  visitedSeedIds: string[];
  warnings: string[];
}

export class SnowballService {
  /**
   * Chạy Snowballing lùi và tiến có kiểm soát vòng lặp và hạn mức
   */
  static async runSnowballing(config: SnowballConfig): Promise<SnowballResult> {
    const newPapers: PaperRecord[] = [];
    const discoveredSeeds: SnowballSeed[] = [];
    const visitedSet = new Set<string>();
    const seenDois = new Set<string>();
    const warnings: string[] = [];

    if (!config.seeds || config.seeds.length === 0) {
      warnings.push("Không có seed paper nào được cung cấp. Cần tối thiểu 1 paper trên thẻ RQ hoặc bài Include.");
      return { newPapers, discoveredSeeds, totalDiscovered: 0, visitedSeedIds: [], warnings };
    }

    const openAlexAdapter = SourceAdapterRegistry.getAdapter("OpenAlex");
    const s2Adapter = SourceAdapterRegistry.getAdapter("Semantic Scholar");

    for (const seed of config.seeds) {
      const seedKey = seed.doi ? seed.doi.toLowerCase() : seed.id;
      if (visitedSet.has(seedKey)) continue;
      visitedSet.add(seedKey);

      for (const direction of config.directions) {
        let resultsForSeed: PaperRecord[] = [];

        // 1. Thử lấy qua OpenAlex nếu có DOI
        if (config.useOpenAlex !== false && openAlexAdapter && seed.doi) {
          try {
            if (direction === "backward") {
              const refs = await openAlexAdapter.fetchReferences(seed.doi);
              resultsForSeed.push(...refs);
            } else {
              const cites = await openAlexAdapter.fetchCitations(seed.doi);
              resultsForSeed.push(...cites);
            }
          } catch (err: any) {
            warnings.push(`[OpenAlex] Lỗi khi lấy ${direction} cho seed ${seed.doi}: ${err.message}`);
          }
        }

        // 2. Thử bổ sung qua Semantic Scholar nếu kết quả chưa đạt hạn mức
        if (
          config.useSemanticScholar !== false &&
          s2Adapter &&
          seed.doi &&
          resultsForSeed.length < config.maxPapersPerSeed
        ) {
          try {
            if (direction === "backward") {
              const s2Refs = await s2Adapter.fetchReferences(seed.doi);
              resultsForSeed.push(...s2Refs);
            } else {
              const s2Cites = await s2Adapter.fetchCitations(seed.doi);
              resultsForSeed.push(...s2Cites);
            }
          } catch (err: any) {
            warnings.push(`[Semantic Scholar] Lỗi khi lấy ${direction} cho seed ${seed.doi}: ${err.message}`);
          }
        }

        // 3. Khử trùng sơ bộ trong phiên snowballing & gán provenance
        const limited = resultsForSeed.slice(0, config.maxPapersPerSeed);
        for (const paper of limited) {
          const doiClean = paper.doi ? paper.doi.toLowerCase() : "";
          if (doiClean && seenDois.has(doiClean)) continue;
          if (doiClean) seenDois.add(doiClean);

          paper.pipelineStage = "B1";
          paper.screeningStage = "V1";
          paper.screeningReason = `Snowballing ${direction === "backward" ? "lùi (References)" : "tiến (Citations)"} từ seed: ${seed.title.slice(0, 60)}`;
          paper.provenanceList = [
            {
              source: paper.source || "Snowballing",
              sourceRecordId: paper.id,
              retrievedAt: new Date().toISOString(),
              method: direction === "backward" ? "snowball_backward" : "snowball_forward",
              parentPaperId: seed.id,
              url: paper.url,
            },
          ];

          discoveredSeeds.push({
            id: `sb_${Date.now()}_${discoveredSeeds.length}`,
            paperId: paper.id,
            doi: paper.doi,
            title: paper.title,
            direction,
            iteration: 1,
            source: paper.source,
            parentPaperId: seed.id,
            discoveredAt: new Date().toISOString(),
          });

          newPapers.push(paper);
        }
      }
    }

    return {
      newPapers,
      discoveredSeeds,
      totalDiscovered: newPapers.length,
      visitedSeedIds: Array.from(visitedSet),
      warnings,
    };
  }
}
