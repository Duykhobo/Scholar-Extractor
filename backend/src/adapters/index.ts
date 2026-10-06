import { AcmDlAdapter } from "./acmdl";
import { BaseSourceAdapter } from "./base";
import { GoogleScholarAdapter } from "./googlescholar";
import { IeeeXploreAdapter } from "./ieeexplore";
import { OpenAlexAdapter } from "./openalex";
import { SemanticScholarAdapter } from "./semanticscholar";

export class SourceAdapterRegistry {
  private static adapters: Map<string, BaseSourceAdapter> = new Map();

  static initialize(): void {
    if (this.adapters.size > 0) return;

    const openAlex = new OpenAlexAdapter();
    const semanticScholar = new SemanticScholarAdapter();
    const googleScholar = new GoogleScholarAdapter();
    const acmDl = new AcmDlAdapter();
    const ieeeXplore = new IeeeXploreAdapter();

    this.adapters.set("OpenAlex", openAlex);
    this.adapters.set("Semantic Scholar", semanticScholar);
    this.adapters.set("Google Scholar", googleScholar);
    this.adapters.set("ACM Digital Library", acmDl);
    this.adapters.set("IEEE Xplore", ieeeXplore);
  }

  static getAdapter(sourceName: string): BaseSourceAdapter | undefined {
    this.initialize();
    return this.adapters.get(sourceName);
  }

  static getAllAdapters(): BaseSourceAdapter[] {
    this.initialize();
    return Array.from(this.adapters.values());
  }

  static getAllCapabilities() {
    this.initialize();
    return this.getAllAdapters().map((a) => a.getCapabilities());
  }
}

export * from "./acmdl";
export * from "./base";
export * from "./fileimport";
export * from "./googlescholar";
export * from "./ieeexplore";
export * from "./openalex";
export * from "./semanticscholar";
