import { AcmDlAdapter } from "./acmdl";
import { ArxivAdapter } from "./arxiv";
import { BaseSourceAdapter } from "./base";
import { CrossrefAdapter } from "./crossref";
import { GoogleScholarAdapter } from "./googlescholar";
import { IeeeXploreAdapter } from "./ieeexplore";
import { OpenAlexAdapter } from "./openalex";
import { PubmedAdapter } from "./pubmed";
import { SemanticScholarAdapter } from "./semanticscholar";

export class SourceAdapterRegistry {
  private static adapters: Map<string, BaseSourceAdapter> = new Map();

  static initialize(): void {
    if (this.adapters.size > 0) return;

    const openAlex = new OpenAlexAdapter();
    const crossref = new CrossrefAdapter();
    const semanticScholar = new SemanticScholarAdapter();
    const arxiv = new ArxivAdapter();
    const pubmed = new PubmedAdapter();
    const googleScholar = new GoogleScholarAdapter();
    const acmDl = new AcmDlAdapter();
    const ieeeXplore = new IeeeXploreAdapter();

    this.adapters.set("OpenAlex", openAlex);
    this.adapters.set("Crossref", crossref);
    this.adapters.set("Semantic Scholar", semanticScholar);
    this.adapters.set("arXiv", arxiv);
    this.adapters.set("PubMed", pubmed);
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
export * from "./arxiv";
export * from "./base";
export * from "./crossref";
export * from "./fileimport";
export * from "./googlescholar";
export * from "./ieeexplore";
export * from "./openalex";
export * from "./pubmed";
export * from "./semanticscholar";
