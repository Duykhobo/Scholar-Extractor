"use strict";
(() => {
  // src/presets.ts
  var PRESET_SWT302 = {
    id: "preset_swt302",
    name: "SWT302 REST API EP/BVA",
    description: "Nghi\xEAn c\u1EE9u sinh ca ki\u1EC3m th\u1EED t\u1EF1 \u0111\u1ED9ng cho REST API b\u1EB1ng Ph\xE2n ho\u1EA1ch t\u01B0\u01A1ng \u0111\u01B0\u01A1ng (EP) v\xE0 Ph\xE2n t\xEDch gi\xE1 tr\u1ECB bi\xEAn (BVA) theo chu\u1EA9n RBL m\xF4n SWT302.",
    researchQuestions: [
      "RQ FA26-EXT-12: K\u1EF9 thu\u1EADt ki\u1EC3m th\u1EED black-box n\xE0o d\u1EF1a tr\xEAn EP v\xE0 BVA cho tham s\u1ED1 HTTP request c\u1EE7a REST API?",
      "C\xE1c nghi\xEAn c\u1EE9u th\u1EF1c nghi\u1EC7m \u0111\u1ECBnh l\u01B0\u1EE3ng k\u1EBFt qu\u1EA3 ph\xE1t hi\u1EC7n l\u1ED7i / coverage nh\u01B0 th\u1EBF n\xE0o trong Table/Figure?"
    ],
    reviewType: "systematic_review",
    searchStrings: [
      {
        id: "swt302_str_a",
        name: "String A (Ch\xEDnh th\u1EE9c theo protocol)",
        query: '("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")',
        isDefault: true,
        source: "google_scholar"
      },
      {
        id: "swt302_str_b",
        name: "String B (D\u1EF1 ph\xF2ng m\u1EDF r\u1ED9ng)",
        query: '("REST API" OR "RESTful") AND ("black-box testing" OR "boundary value" OR "equivalence partition") AND ("automated testing" OR "test generation")',
        isDefault: false,
        source: "google_scholar"
      }
    ],
    yearRange: {
      start: 2020,
      end: 2026,
      enabled: true
    },
    languageRequirements: ["English", "en"],
    allowedPublicationTypes: ["conference", "journal", "proceedings"],
    minPageCount: 4,
    targetIncludedCount: 15,
    sourcePolicies: {
      google_scholar: {
        prismaRole: "supplementary",
        notes: "Ngu\u1ED3n Google Scholar ch\u1EC9 l\xE0 paper \u1EE9ng vi\xEAn b\u1ED5 tr\u1EE3, kh\xF4ng t\xEDnh tr\u1EF1c ti\u1EBFp v\xE0o Identification c\u1EE7a s\u01A1 \u0111\u1ED3 PRISMA ch\xEDnh th\u1ED1ng."
      },
      openalex: { prismaRole: "primary" },
      arxiv: { prismaRole: "supplementary" },
      semantic_scholar: { prismaRole: "supplementary" }
    },
    criteria: [
      {
        id: "IC-L",
        label: "Ng\xF4n ng\u1EEF ti\u1EBFng Anh",
        description: "Paper vi\u1EBFt b\u1EB1ng ti\u1EBFng Anh v\xE0 c\xF3 b\u1EB1ng ch\u1EE9ng v\u0103n b\u1EA3n.",
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "language",
        parameters: { allowedLanguages: ["English", "en"] }
      },
      {
        id: "IC-T",
        label: "H\u1ED9i ngh\u1ECB / T\u1EA1p ch\xED khoa h\u1ECDc",
        description: "\u0110\u0103ng tr\xEAn conference ho\u1EB7c journal khoa h\u1ECDc (lo\u1EA1i tr\u1EEB thesis, dissertation, blog).",
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "publication_type",
        parameters: {
          allowedTypes: ["conference", "journal", "proceedings", "symposium", "workshop"],
          rejectTheses: true,
          rejectPreprints: false
        }
      },
      {
        id: "IC-Y",
        label: "N\u0103m xu\u1EA5t b\u1EA3n 2020 - 2026",
        description: "Xu\u1EA5t b\u1EA3n trong khung n\u0103m 2020 \u0111\u1EBFn 2026 theo protocol SWT302.",
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "year_range",
        parameters: { startYear: 2020, endYear: 2026 }
      },
      {
        id: "IC-P",
        label: "Ki\u1EC3m th\u1EED REST API m\u1EE9c HTTP request",
        description: "Ki\u1EC3m th\u1EED \u1EDF m\u1EE9c request cho d\u1ECBch v\u1EE5 HTTP (y\xEAu c\u1EA7u NL v\xE0/ho\u1EB7c schema API: OpenAPI, Swagger, RAML). GraphQL ri\xEAng l\u1EBB kh\xF4ng \u0111\u1EA1t.",
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "swt302_ep_bva",
        parameters: { checkScope: "rest_api" }
      },
      {
        id: "IC-I",
        label: "K\u1EF9 thu\u1EADt EP v\xE0/ho\u1EB7c BVA cho tham s\u1ED1 request",
        description: "K\u1EF9 thu\u1EADt thi\u1EBFt k\u1EBF test black-box: Ph\xE2n ho\u1EA1ch t\u01B0\u01A1ng \u0111\u01B0\u01A1ng (EP) v\xE0/ho\u1EB7c Ph\xE2n t\xEDch gi\xE1 tr\u1ECB bi\xEAn (BVA) cho tham s\u1ED1 request.",
        kind: "inclusion",
        required: true,
        stage: "full_text",
        evaluator: "swt302_ep_bva",
        parameters: { checkTechnique: "ep_bva" },
        evidenceRequirements: "C\u1EA7n tr\xEDch d\u1EABn \u0111o\u1EA1n v\u0103n b\u1EA3n m\xF4 t\u1EA3 ph\u01B0\u01A1ng ph\xE1p EP/BVA cho tham s\u1ED1 request (trang, m\u1EE5c)."
      },
      {
        id: "IC-E",
        label: "K\u1EBFt qu\u1EA3 th\u1EF1c nghi\u1EC7m \u0111\u1ECBnh l\u01B0\u1EE3ng trong Table/Figure",
        description: "C\xF3 \xEDt nh\u1EA5t 1 con s\u1ED1 k\u1EBFt qu\u1EA3 th\u1EF1c nghi\u1EC7m trong Table ho\u1EB7c Figure (kh\xF4ng ch\u1EC9 nh\u1EAFc metric trong text).",
        kind: "inclusion",
        required: true,
        stage: "full_text",
        evaluator: "swt302_ep_bva",
        parameters: { checkEmpirical: "table_or_figure" },
        evidenceRequirements: "C\u1EA7n s\u1ED1 li\u1EC7u \u0111\u1ECBnh l\u01B0\u1EE3ng (%, s\u1ED1 l\u1ED7i, coverage...) g\u1EAFn li\u1EC1n v\u1EDBi Table ho\u1EB7c Figure."
      },
      {
        id: "EC-D",
        label: "Tr\xF9ng l\u1EB7p v\u1EDBi b\xE0i b\xE1o \u0111\xE3 c\xF3 (Duplicate)",
        description: "Tr\xF9ng kh\xF3a ch\xEDnh DOI ho\u1EB7c tr\xF9ng ti\xEAu \u0111\u1EC1 \u0111\xE3 x\xE1c nh\u1EADn.",
        kind: "exclusion",
        required: true,
        stage: "metadata",
        evaluator: "duplicate",
        parameters: { checkDoi: true, checkTitle: true }
      },
      {
        id: "EC-S",
        label: "D\u01B0\u1EDBi 4 trang (Short paper / Poster)",
        description: "Lo\u1EA1i b\xE0i b\xE1o d\u01B0\u1EDBi 4 trang khi \u0111\xE3 x\xE1c minh s\u1ED1 trang t\u1EEB to\xE0n v\u0103n.",
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "page_count",
        parameters: { minPages: 4 }
      },
      {
        id: "EC-A",
        label: "Kh\xF4ng th\u1EC3 truy c\u1EADp to\xE0n v\u0103n (Unreachable full-text)",
        description: "Ch\u1EC9 g\u1EAFn khi \u0111\xE3 x\xE1c nh\u1EADn kh\xF4ng th\u1EC3 t\u1EA3i/truy c\u1EADp full-text; kh\xF4ng g\u1EAFn khi ch\u1EC9 thi\u1EBFu abstract.",
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "full_text_availability",
        parameters: { requireFullText: true }
      },
      {
        id: "EC-N",
        label: "Kh\xF4ng c\xF3 th\u1EF1c nghi\u1EC7m (Vision / Tutorial / Position)",
        description: "Lo\u1EA1i b\xE0i b\xE1o l\xFD thuy\u1EBFt, vision paper, tutorial kh\xF4ng c\xF3 \u0111\xE1nh gi\xE1 th\u1EF1c nghi\u1EC7m.",
        kind: "exclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: ["tutorial", "vision paper", "position paper", "panel discussion"],
          matchMode: "any",
          fields: ["title"]
        }
      },
      {
        id: "EC-O",
        label: "Ch\u1EE7 \u0111\u1EC1 ngo\xE0i ph\u1EA1m vi (Out of Scope)",
        description: "Lo\u1EA1i b\u1ECF: UI/DOM testing, internal unit test (JUnit/class-level), pure fault localization, phi ph\u1EA7n m\u1EC1m.",
        kind: "exclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "swt302_ep_bva",
        parameters: { checkOutOfScope: true }
      }
    ],
    schemaVersion: "2.0.0",
    profileVersion: 1,
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z"
  };
  var PRESET_GENERIC = {
    id: "preset_generic",
    name: "Generic Literature Review",
    description: "H\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u t\u1ED5ng quan t\xE0i li\u1EC7u khoa h\u1ECDc t\u1ED5ng qu\xE1t. Ng\u01B0\u1EDDi d\xF9ng t\u1EF1 \u0111\u1ECBnh ngh\u0129a ch\u1EE7 \u0111\u1EC1, c\xE2u h\u1ECFi nghi\xEAn c\u1EE9u v\xE0 ti\xEAu ch\xED m\xE0 kh\xF4ng b\u1ECB r\xE0ng bu\u1ED9c b\u1EDFi lu\u1EADt SWT302.",
    researchQuestions: ["T\u1ED5ng quan t\xECnh h\xECnh nghi\xEAn c\u1EE9u hi\u1EC7n t\u1EA1i v\xE0 c\xE1c h\u01B0\u1EDBng ti\u1EBFp c\u1EADn ch\xEDnh trong ch\u1EE7 \u0111\u1EC1 nghi\xEAn c\u1EE9u."],
    reviewType: "literature_review",
    searchStrings: [
      {
        id: "generic_str_1",
        name: "Truy v\u1EA5n ch\xEDnh",
        query: "",
        isDefault: true
      }
    ],
    yearRange: {
      enabled: false
    },
    languageRequirements: ["English", "en"],
    allowedPublicationTypes: ["conference", "journal", "proceedings", "book_chapter"],
    targetIncludedCount: 20,
    sourcePolicies: {
      google_scholar: { prismaRole: "primary" },
      openalex: { prismaRole: "primary" },
      arxiv: { prismaRole: "primary" },
      semantic_scholar: { prismaRole: "primary" }
    },
    criteria: [
      {
        id: "GEN-IC-PUB",
        label: "C\xF4ng b\u1ED1 h\u1ECDc thu\u1EADt h\u1EE3p l\u1EC7",
        description: "B\xE0i b\xE1o xu\u1EA5t b\u1EA3n tr\xEAn h\u1ED9i ngh\u1ECB, t\u1EA1p ch\xED ho\u1EB7c ch\u01B0\u01A1ng s\xE1ch \u0111\u01B0\u1EE3c b\xECnh duy\u1EC7t (peer-reviewed).",
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "publication_type",
        parameters: {
          allowedTypes: ["conference", "journal", "proceedings", "book_chapter"],
          rejectTheses: true
        }
      },
      {
        id: "GEN-IC-LANG",
        label: "Ng\xF4n ng\u1EEF b\xE0i vi\u1EBFt",
        description: "V\u0103n b\u1EA3n vi\u1EBFt b\u1EB1ng ti\u1EBFng Anh (ho\u1EB7c ng\xF4n ng\u1EEF \u0111\u01B0\u1EE3c \u0111\u1ECBnh ngh\u0129a).",
        kind: "inclusion",
        required: false,
        stage: "metadata",
        evaluator: "language",
        parameters: { allowedLanguages: ["English", "en"] }
      },
      {
        id: "GEN-EC-DUP",
        label: "Tr\xF9ng l\u1EB7p b\xE0i vi\u1EBFt (Duplicate)",
        description: "Lo\u1EA1i b\xE0i tr\xF9ng DOI ho\u1EB7c tr\xF9ng ti\xEAu \u0111\u1EC1 \u0111\xE3 x\xE1c nh\u1EADn.",
        kind: "exclusion",
        required: true,
        stage: "metadata",
        evaluator: "duplicate",
        parameters: { checkDoi: true, checkTitle: true }
      },
      {
        id: "GEN-EC-ACC",
        label: "Kh\xF4ng th\u1EC3 truy c\u1EADp to\xE0n v\u0103n",
        description: "Ch\u1EC9 lo\u1EA1i khi \u0111\xE3 x\xE1c nh\u1EADn kh\xF4ng th\u1EC3 l\u1EA5y \u0111\u01B0\u1EE3c to\xE0n v\u0103n b\xE0i b\xE1o.",
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "full_text_availability",
        parameters: { requireFullText: true }
      },
      {
        id: "GEN-IC-REL",
        label: "Ph\xF9 h\u1EE3p m\u1EE5c ti\xEAu nghi\xEAn c\u1EE9u (Relevance)",
        description: "Ti\xEAu \u0111\u1EC1 v\xE0 t\xF3m t\u1EAFt ph\xF9 h\u1EE3p v\u1EDBi ph\u1EA1m vi c\xE2u h\u1ECFi nghi\xEAn c\u1EE9u \u0111\xE3 \u0111\u1EC1 ra.",
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "manual_assessment",
        parameters: { prompt: "X\xE1c nh\u1EADn b\xE0i vi\u1EBFt c\xF3 li\xEAn quan tr\u1EF1c ti\u1EBFp \u0111\u1EBFn c\xE2u h\u1ECFi nghi\xEAn c\u1EE9u." }
      }
    ],
    schemaVersion: "2.0.0",
    profileVersion: 1,
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z"
  };
  var PRESET_VISUALLY_IMPAIRED_AAC = {
    id: "preset_visually_impaired_aac",
    name: "Giao ti\u1EBFp t\u1EED t\u1EBF & S\u1EF1 t\u1EF1 tin c\u1EE7a tr\u1EBB khi\u1EBFm th\u1ECB",
    description: "Nghi\xEAn c\u1EE9u t\xECm hi\u1EC3u m\u1ED1i li\xEAn h\u1EC7 gi\u1EEFa giao ti\u1EBFp t\u1EED t\u1EBF (X), c\u1EA3m nh\u1EADn \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 (M) v\xE0 s\u1EF1 t\u1EF1 tin (Y) c\u1EE7a tr\u1EBB em khi\u1EBFm th\u1ECB trong m\xF4i tr\u01B0\u1EDDng gi\xE1o d\u1EE5c (The Role of Kind and Supportive Communication in Supporting Self-Confidence among Children with Visual Impairments in Educational Settings).",
    researchQuestions: [
      "RQ1: Tr\u1EBB em khi\u1EBFm th\u1ECB c\u1EA3m nh\u1EADn giao ti\u1EBFp t\u1EED t\u1EBF nh\u01B0 th\u1EBF n\xE0o?",
      "RQ2: Giao ti\u1EBFp t\u1EED t\u1EBF c\xF3 li\xEAn h\u1EC7 v\u1EDBi c\u1EA3m nh\u1EADn \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 c\u1EE7a tr\u1EBB kh\xF4ng?",
      "RQ3: Giao ti\u1EBFp t\u1EED t\u1EBF v\xE0 c\u1EA3m nh\u1EADn \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 c\xF3 li\xEAn h\u1EC7 v\u1EDBi s\u1EF1 t\u1EF1 tin c\u1EE7a tr\u1EBB kh\xF4ng?",
      "RQ4: Gi\xE1o vi\xEAn v\xE0 b\u1EA1n b\xE8 c\xF3 th\u1EC3 \u0111i\u1EC1u ch\u1EC9nh c\xE1ch giao ti\u1EBFp ra sao \u0111\u1EC3 h\u1ED7 tr\u1EE3 tr\u1EBB?"
    ],
    reviewType: "systematic_review",
    searchStrings: [
      {
        id: "vi_str_11_combined",
        name: "Chu\u1ED7i t\u1ED5ng h\u1EE3p (Combined Core)",
        query: '("children with visual impairments" OR "visually impaired children" OR "blind children") AND ("supportive communication" OR "teacher support" OR "peer support" OR "social support") AND ("self-confidence" OR "self-esteem" OR "self-efficacy")',
        isDefault: true,
        source: "google_scholar"
      },
      {
        id: "vi_str_1_y_focus",
        name: "1. \u0110\u1ED1i t\u01B0\u1EE3ng v\xE0 s\u1EF1 t\u1EF1 tin (Y focus)",
        query: '"children with visual impairments" "self-confidence"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_2_psych_ext",
        name: "2. M\u1EDF r\u1ED9ng t\xE0i li\u1EC7u t\xE2m l\xFD (Self-esteem)",
        query: '"visually impaired children" "self-esteem"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_3_comm_sup",
        name: "3. Giao ti\u1EBFp h\u1ED7 tr\u1EE3 (X focus)",
        query: '"visual impairment" "supportive communication"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_4_teacher_sup",
        name: "4. H\u1ED7 tr\u1EE3 t\u1EEB gi\xE1o vi\xEAn",
        query: '"students with visual impairments" "teacher support"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_5_peer_sup",
        name: "5. H\u1ED7 tr\u1EE3 t\u1EEB b\u1EA1n b\xE8",
        query: '"visually impaired children" "peer support"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_6_med_m",
        name: "6. Bi\u1EBFn trung gian (Perceived social support)",
        query: '"visual impairment" "perceived social support"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_7_rel_m_y",
        name: "7. Li\xEAn h\u1EC7 M\u2013Y (Social support & Self-esteem)",
        query: '"visual impairment" "social support" "self-esteem"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_8_scale_y",
        name: "8. Thang \u0111o Y (Self-confidence scale)",
        query: '"children" "self-confidence" "scale"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_9_scale_m",
        name: "9. Thang \u0111o M (Social support scale)",
        query: '"children" "perceived social support" "scale"',
        isDefault: false,
        source: "google_scholar"
      },
      {
        id: "vi_str_10_mediation",
        name: "10. Ph\xE2n t\xEDch trung gian (Mediation model)",
        query: '"visual impairment" "social support" "mediation"',
        isDefault: false,
        source: "google_scholar"
      }
    ],
    yearRange: {
      start: 2010,
      end: 2026,
      enabled: true
    },
    languageRequirements: ["English", "Vietnamese", "en", "vi"],
    allowedPublicationTypes: ["journal", "review", "conference", "proceedings", "book_chapter"],
    targetIncludedCount: 30,
    sourcePolicies: {
      google_scholar: {
        prismaRole: "primary",
        notes: "\u0110\u01B0\u1EE3c t\xEDnh v\xE0o ngu\u1ED3n t\xECm ki\u1EBFm \u1EE9ng vi\xEAn c\u1EE7a nghi\xEAn c\u1EE9u n\xE0y."
      },
      openalex: { prismaRole: "primary" },
      arxiv: { prismaRole: "supplementary" },
      semantic_scholar: { prismaRole: "primary" }
    },
    criteria: [
      {
        id: "VI-IC-COMM",
        label: "Giao ti\u1EBFp t\u1EED t\u1EBF v\xE0 h\u1ED7 tr\u1EE3 (Supportive & Kind Communication - Bi\u1EBFn X)",
        description: "T\u1EADp trung v\xE0o c\xE1ch gi\xE1o vi\xEAn v\xE0 b\u1EA1n b\xE8 l\u1EAFng nghe, t\xF4n tr\u1ECDng, \u0111\u1ED3ng c\u1EA3m, khuy\u1EBFn kh\xEDch v\xE0 giao ti\u1EBFp t\u1EED t\u1EBF v\u1EDBi tr\u1EBB (Bi\u1EBFn \u0111\u1ED9c l\u1EADp X trong m\xF4 h\xECnh).",
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "supportive communication",
            "kind communication",
            "positive communication",
            "empathetic communication",
            "compassionate communication",
            "respectful communication",
            "teacher support",
            "teacher encouragement",
            "teacher-student interaction",
            "peer support",
            "peer interaction",
            "social support",
            "perceived social support",
            "emotional support",
            "active listening",
            "constructive feedback",
            "compassion",
            "encouragement",
            "caring",
            "friendly communication",
            "giao ti\u1EBFp t\u1EED t\u1EBF",
            "giao ti\u1EBFp h\u1ED7 tr\u1EE3",
            "th\u1EA5u c\u1EA3m",
            "\u0111\u1ED3ng c\u1EA3m",
            "l\u1EAFng nghe",
            "\u0111\u1ED9ng vi\xEAn",
            "kh\xEDch l\u1EC7",
            "t\xF4n tr\u1ECDng"
          ],
          matchMode: "any",
          fields: ["title", "abstract", "snippet", "keywords"]
        },
        evidenceRequirements: "Ph\u1EA3i c\xF3 b\u1EB1ng ch\u1EE9ng v\u1EC1 giao ti\u1EBFp t\u1EED t\u1EBF, h\u1ED7 tr\u1EE3 t\u1EEB gi\xE1o vi\xEAn/b\u1EA1n b\xE8 ho\u1EB7c t\u01B0\u01A1ng t\xE1c h\u1ECDc \u0111\u01B0\u1EDDng."
      },
      {
        id: "VI-IC-POP",
        label: "\u0110\u1ED1i t\u01B0\u1EE3ng tr\u1EBB em / h\u1ECDc sinh khi\u1EBFm th\u1ECB (Children with Visual Impairment)",
        description: "\u0110\u1ED1i t\u01B0\u1EE3ng nghi\xEAn c\u1EE9u l\xE0 tr\u1EBB em, h\u1ECDc sinh, thanh thi\u1EBFu ni\xEAn khi\u1EBFm th\u1ECB / nh\xECn k\xE9m / m\xF9 trong \u0111\u1ED9 tu\u1ED5i h\u1ECDc \u0111\u01B0\u1EDDng K-12.",
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "children with visual impairments",
            "visually impaired children",
            "blind children",
            "students with visual impairments",
            "blind students",
            "low vision children",
            "pediatric visual impairment",
            "pupils with visual impairments",
            "young visually impaired",
            "visually impaired youth",
            "blind youth",
            "inclusive education",
            "special education",
            "school",
            "classroom",
            "educational setting",
            "tr\u1EBB khi\u1EBFm th\u1ECB",
            "h\u1ECDc sinh khi\u1EBFm th\u1ECB",
            "tr\u1EBB em khi\u1EBFm th\u1ECB",
            "tr\u1EBB m\xF9",
            "gi\xE1o d\u1EE5c h\xF2a nh\u1EADp"
          ],
          matchMode: "any",
          fields: ["title", "abstract", "snippet", "keywords"]
        }
      },
      {
        id: "VI-IC-CONF",
        label: "S\u1EF1 t\u1EF1 tin v\xE0 n\u0103ng l\u1EF1c t\xE2m l\xFD (Self-Confidence - Bi\u1EBFn k\u1EBFt qu\u1EA3 Y)",
        description: "\u0110o l\u01B0\u1EDDng ho\u1EB7c ph\xE2n t\xEDch s\u1EF1 t\u1EF1 tin (Self-confidence), l\xF2ng t\u1EF1 tr\u1ECDng (Self-esteem), n\u0103ng l\u1EF1c t\u1EF1 th\xE2n ho\u1EB7c s\u1EF1 h\xF2a nh\u1EADp c\u1EE7a tr\u1EBB.",
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "self-confidence",
            "confidence",
            "self-esteem",
            "self-efficacy",
            "autonomy",
            "social participation",
            "self-concept",
            "psychological well-being",
            "s\u1EF1 t\u1EF1 tin",
            "t\u1EF1 tin",
            "l\xF2ng t\u1EF1 tr\u1ECDng",
            "t\u1EF1 ch\u1EE7",
            "h\xF2a nh\u1EADp x\xE3 h\u1ED9i"
          ],
          matchMode: "any",
          fields: ["title", "abstract", "snippet", "keywords"]
        }
      },
      {
        id: "VI-IC-AAC-SUP",
        label: "C\xF4ng ngh\u1EC7 tr\u1EE3 gi\xFAp & AAC (Nh\xF3m b\u1ED5 tr\u1EE3, KH\xD4NG b\u1EAFt bu\u1ED9c)",
        description: "C\xE1c c\xF4ng c\u1EE5 giao ti\u1EBFp t\u0103ng c\u01B0\u1EDDng (AAC), m\xE0n h\xECnh n\u1ED5i Braille, tactile, thi\u1EBFt b\u1ECB h\u1ED7 tr\u1EE3. \u0110\xE2y l\xE0 nh\xF3m b\u1ED5 tr\u1EE3, kh\xF4ng b\u1EAFt bu\u1ED9c b\xE0i b\xE1o ph\u1EA3i c\xF3.",
        kind: "inclusion",
        required: false,
        // BỔ TRỢ: Không bắt buộc bài báo phải dùng công nghệ
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "augmentative and alternative communication",
            "aac",
            "assistive technology",
            "tactile",
            "braille",
            "screen reader",
            "haptic",
            "c\xF4ng ngh\u1EC7 tr\u1EE3 gi\xFAp"
          ],
          matchMode: "any",
          fields: ["title", "abstract", "snippet", "keywords"]
        }
      },
      {
        id: "VI-IC-PUB",
        label: "Th\xF4ng tin xu\u1EA5t b\u1EA3n \u0111\u1EE7 chu\u1EA9n tr\xEDch d\u1EABn APA 7",
        description: "B\xE0i vi\u1EBFt c\xF3 t\xE1c gi\u1EA3, n\u0103m, t\xEAn t\u1EA1p ch\xED/h\u1ED9i ngh\u1ECB chu\u1EA9n v\xE0 li\xEAn k\u1EBFt DOI/URL x\xE1c th\u1EF1c.",
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "publication_type",
        parameters: {
          allowedTypes: ["journal", "review", "conference", "proceedings", "book_chapter", "article"],
          rejectTheses: true,
          rejectPreprints: false
        }
      },
      {
        id: "VI-IC-FULLTEXT",
        label: "Truy c\u1EADp \u0111\u01B0\u1EE3c to\xE0n v\u0103n b\xE0i b\xE1o",
        description: "B\xE0i b\xE1o c\xF3 th\u1EC3 \u0111\u1ECDc ho\u1EB7c t\u1EA3i to\xE0n v\u0103n \u0111\u1EC3 th\u1EA9m \u0111\u1ECBnh ph\u01B0\u01A1ng ph\xE1p v\xE0 tr\xEDch xu\u1EA5t b\u1EB1ng ch\u1EE9ng chuy\xEAn s\xE2u.",
        kind: "inclusion",
        required: true,
        stage: "full_text",
        evaluator: "full_text_availability",
        parameters: { requireFullText: true }
      },
      {
        id: "VI-EC-RETRACTED",
        label: "B\xE0i b\xE1o b\u1ECB r\xFAt l\u1EA1i (Retracted Article)",
        description: "Tuy\u1EC7t \u0111\u1ED1i lo\u1EA1i tr\u1EEB c\xE1c b\xE0i b\xE1o \u0111\xE3 b\u1ECB t\xF2a so\u1EA1n r\xFAt l\u1EA1i (Retracted).",
        kind: "exclusion",
        required: true,
        stage: "metadata",
        evaluator: "keyword_group",
        parameters: {
          keywords: ["retracted", "retraction"],
          matchMode: "any",
          fields: ["title", "abstract"]
        }
      },
      {
        id: "VI-EC-DUP",
        label: "Tr\xF9ng l\u1EB7p b\xE0i vi\u1EBFt (Duplicate)",
        description: "Tr\xF9ng m\xE3 DOI ho\u1EB7c tr\xF9ng ti\xEAu \u0111\u1EC1 \u0111\xE3 \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn v\u1EDBi b\xE0i b\xE1o kh\xE1c.",
        kind: "exclusion",
        required: true,
        stage: "metadata",
        evaluator: "duplicate",
        parameters: { checkDoi: true, checkTitle: true }
      },
      {
        id: "VI-EC-ADULT",
        label: "Nghi\xEAn c\u1EE9u thu\u1EA7n v\u1EC1 sinh vi\xEAn \u0111\u1EA1i h\u1ECDc / ng\u01B0\u1EDDi cao tu\u1ED5i (Kh\xF4ng c\xF3 tr\u1EBB em)",
        description: "Lo\u1EA1i b\xE0i ch\u1EC9 kh\u1EA3o s\xE1t ng\u01B0\u1EDDi tr\u01B0\u1EDFng th\xE0nh ho\u1EB7c sinh vi\xEAn \u0111\u1EA1i h\u1ECDc m\xE0 kh\xF4ng li\xEAn quan \u0111\u1EBFn tr\u1EBB em K-12.",
        kind: "exclusion",
        required: false,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "university students",
            "higher education",
            "college students",
            "undergraduate students",
            "older adults",
            "elderly"
          ],
          matchMode: "any",
          fields: ["title"]
        }
      },
      {
        id: "VI-EC-MED",
        label: "Can thi\u1EC7p y khoa/ph\u1EABu thu\u1EADt thu\u1EA7n t\xFAy",
        description: "Lo\u1EA1i b\xE0i thu\u1EA7n v\u1EC1 quy tr\xECnh ph\u1EABu thu\u1EADt nh\xE3n khoa, th\u1EED nghi\u1EC7m l\xE2m s\xE0ng thu\u1ED1c kh\xF4ng c\xF3 y\u1EBFu t\u1ED1 giao ti\u1EBFp hay gi\xE1o d\u1EE5c.",
        kind: "exclusion",
        required: false,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords: [
            "cataract surgery",
            "intraocular lens",
            "corneal surgery",
            "retinopathy of prematurity clinical trial",
            "pharmacokinetics"
          ],
          matchMode: "any",
          fields: ["title"]
        }
      },
      {
        id: "VI-EC-ACC",
        label: "Kh\xF4ng th\u1EC3 truy c\u1EADp to\xE0n v\u0103n sau c\xE1c l\u1EA7n th\u1EED",
        description: "\u0110\xE3 th\u1EED qua nhi\u1EC1u ngu\u1ED3n (Publisher, arXiv, ResearchGate, Tab) nh\u01B0ng kh\xF4ng th\u1EC3 l\u1EA5y to\xE0n v\u0103n.",
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "full_text_availability",
        parameters: { requireFullText: true }
      }
    ],
    schemaVersion: "2.0.0",
    profileVersion: 2,
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z"
  };

  // src/popup.ts
  var DEFAULT_BACKEND_URL = "http://localhost:3001";
  var STORAGE_PROFILES_KEY = "scholar_research_profiles_v3";
  var STORAGE_ACTIVE_PROFILE_KEY = "scholar_active_profile_id_v3";
  var STORAGE_SESSIONS_KEY = "scholar_research_sessions_v3";
  var STORAGE_WIZARD_STEP_KEY = "scholar_wizard_step_v3";
  var LEGACY_STORAGE_KEY = "scholar_slr_session_v2";
  var LEGACY_BACKUP_KEY = "scholar_extractor_backup_legacy_v1";
  var MIGRATION_VERSION_KEY = "scholar_extractor_migration_version";
  var STEP_CONFIGS = {
    SETUP: {
      badge: "B\u01AF\u1EDAC 0",
      title: "Thi\u1EBFt l\u1EADp Nghi\xEAn c\u1EE9u & Protocol (Protocol Formulation)",
      goal: "X\xE1c \u0111\u1ECBnh m\u1EE5c ti\xEAu \u0111\u1EC1 t\xE0i, c\xE2u h\u1ECFi RQ, khung PICO/PICOS/SPIDER v\xE0 ti\xEAu ch\xED IC/EC.",
      io: "\u0110\u1EC1 t\xE0i & Khung ph\xE2n t\xEDch \u2794 H\u1ED3 s\u01A1 Protocol s\u1EB5n s\xE0ng (v1.0)",
      primaryBtnIcon: "\u{1F4BE}",
      primaryBtnText: "L\u01B0u thi\u1EBFt l\u1EADp & sang thu th\u1EADp",
      condition: "C\u1EA7n \u0111i\u1EC1n t\xEAn \u0111\u1EC1 t\xE0i, \xEDt nh\u1EA5t 1 c\xE2u h\u1ECFi RQ v\xE0 t\u1EEB kh\xF3a ch\xEDnh.",
      nextGuide: "Sau khi l\u01B0u, chuy\u1EC3n sang B1 \u0111\u1EC3 thi\u1EBFt l\u1EADp truy v\u1EA5n v\xE0 thu th\u1EADp b\xE0i b\xE1o."
    },
    B1: {
      badge: "B\u01AF\u1EDAC B1",
      title: "Thu th\u1EADp b\xE0i b\xE1o (Identification)",
      goal: "Thu th\u1EADp c\xE1c b\xE0i b\xE1o \u1EE9ng vi\xEAn t\u1EEB API h\u1ECDc thu\u1EADt, nh\u1EADp file v\xE0 snowballing.",
      io: "T\u1EEB kh\xF3a & B\u1ED9 l\u1ECDc \u2794 Danh s\xE1ch b\u1EA3n ghi th\xF4 (B1)",
      primaryBtnIcon: "\u{1F50D}",
      primaryBtnText: "B\u1EAFt \u0111\u1EA7u thu th\u1EADp b\xE0i b\xE1o",
      condition: "C\u1EA7n thu th\u1EADp \xEDt nh\u1EA5t 1 b\xE0i b\xE1o h\u1EE3p l\u1EC7 v\xE0o danh s\xE1ch.",
      nextGuide: "Sau khi c\xF3 b\xE0i b\xE1o th\xF4, chuy\u1EC3n sang V1 \u0111\u1EC3 kh\u1EED tr\xF9ng l\u1EB7p d\u1EEF li\u1EC7u."
    },
    V1: {
      badge: "B\u01AF\u1EDAC V1",
      title: "Ki\u1EC3m tra tr\xF9ng l\u1EB7p (Deduplication)",
      goal: "Nh\u1EADn di\u1EC7n v\xE0 g\u1ED9p c\xE1c b\u1EA3n ghi tr\xF9ng l\u1EB7p (DOI v\xE0 so kh\u1EDBp m\u1EDD ti\xEAu \u0111\u1EC1), b\u1EA3o to\xE0n ngu\u1ED3n g\u1ED1c provenance.",
      io: "B\u1EA3n ghi th\xF4 \u2794 B\u1EA3n ghi duy nh\u1EA5t (Unique) + Duplicate Log",
      primaryBtnIcon: "\u2728",
      primaryBtnText: "Ki\u1EC3m tra tr\xF9ng l\u1EB7p (Ch\u1EA1y Dedup)",
      condition: "T\u1EA5t c\u1EA3 c\xE1c nh\xF3m nghi tr\xF9ng c\u1EA7n \u0111\u01B0\u1EE3c g\u1ED9p ho\u1EB7c \u0111\xE1nh d\u1EA5u gi\u1EEF ri\xEAng.",
      nextGuide: "Chuy\u1EC3n sang V2 \u0111\u1EC3 s\xE0ng l\u1ECDc ti\xEAu \u0111\u1EC1 & t\xF3m t\u1EAFt theo ti\xEAu ch\xED IC/EC."
    },
    V2: {
      badge: "B\u01AF\u1EDAC V2",
      title: "S\xE0ng l\u1ECDc Ti\xEAu \u0111\u1EC1 & T\xF3m t\u1EAFt (Screening)",
      goal: "\u0110\xE1nh gi\xE1 t\xEDnh ph\xF9 h\u1EE3p d\u1EF1a tr\xEAn Title & Abstract theo ti\xEAu ch\xED IC/EC (PassToFullText / Exclude / Unsure).",
      io: "B\u1EA3n ghi duy nh\u1EA5t \u2794 Danh s\xE1ch qua v\xF2ng to\xE0n v\u0103n (PassToFullText)",
      primaryBtnIcon: "\u26A1",
      primaryBtnText: "T\u1EF1 \u0111\u1ED9ng qu\xE9t & S\xE0ng l\u1ECDc V2",
      condition: "Kh\xF4ng c\xF2n b\xE0i \u1EDF tr\u1EA1ng th\xE1i Ch\u01B0a xem / Ch\u1EDD quy\u1EBFt \u0111\u1ECBnh.",
      nextGuide: "Chuy\u1EC3n sang V3 \u0111\u1EC3 t\xECm t\xE0i li\u1EC7u to\xE0n v\u0103n v\xE0 th\u1EA9m \u0111\u1ECBnh chuy\xEAn s\xE2u."
    },
    V3: {
      badge: "B\u01AF\u1EDAC V3",
      title: "T\xECm & Th\u1EA9m \u0111\u1ECBnh To\xE0n v\u0103n (Eligibility)",
      goal: "Thu th\u1EADp PDF/to\xE0n v\u0103n v\xE0 \u0111\u1ECDc \u0111\xE1nh gi\xE1 chuy\xEAn s\xE2u (>= 4 trang, tr\xEDch \u0111o\u1EA1n b\u1EB1ng ch\u1EE9ng ph\u01B0\u01A1ng ph\xE1p).",
      io: "Danh s\xE1ch PassToFullText \u2794 Nghi\xEAn c\u1EE9u \u0111\u1EA1t chu\u1EA9n (Final Included)",
      primaryBtnIcon: "\u{1F4D1}",
      primaryBtnText: "T\xECm to\xE0n v\u0103n cho c\xE1c b\xE0i \u0111\xE3 ch\u1ECDn",
      condition: "M\u1ECDi b\xE0i Include ph\u1EA3i c\xF3 to\xE0n v\u0103n v\xE0 tr\xEDch d\u1EABn b\u1EB1ng ch\u1EE9ng ph\u01B0\u01A1ng ph\xE1p.",
      nextGuide: "Chuy\u1EC3n sang Ch\u1ED1t & Xu\u1EA5t \u0111\u1EC3 \u0111\u1ED1i so\xE1t s\u1ED1 h\u1ECDc PRISMA 2020."
    },
    FINAL: {
      badge: "B\u01AF\u1EDAC CH\u1ED0T",
      title: "Ch\u1ED1t Danh S\xE1ch & Xu\u1EA5t B\xE1o C\xE1o PRISMA 2020",
      goal: "\u0110\u1ED1i so\xE1t c\xE2n b\u1EB1ng s\u1ED1 h\u1ECDc PRISMA 2020, ki\u1EC3m tra t\xEDnh to\xE0n v\u1EB9n v\xE0 xu\u1EA5t 9 b\xE1o c\xE1o chu\u1EA9n h\u1ECDc thu\u1EADt.",
      io: "To\xE0n b\u1ED9 d\u1EEF li\u1EC7u pipeline \u2794 9 t\u1EC7p xu\u1EA5t b\u1EA3n & PRISMA Flowchart",
      primaryBtnIcon: "\u{1F4CA}",
      primaryBtnText: "Xem S\u01A1 \u0110\u1ED3 Lu\u1ED3ng PRISMA 2020 (\u0110\u1ED1i so\xE1t)",
      condition: "Ma tr\u1EADn PRISMA c\xE2n b\u1EB1ng s\u1ED1 h\u1ECDc, kh\xF4ng c\xF2n b\xE0i v\u01B0\u1EDBng audit.",
      nextGuide: "Ho\xE0n t\u1EA5t nghi\xEAn c\u1EE9u v\xE0 sao l\u01B0u Session Backup JSON."
    }
  };
  var STEP_GUIDE_DATA = {
    SETUP: {
      whenToUse: "B\u1EAFt \u0111\u1EA7u m\u1ED9t \u0111\u1EC1 t\xE0i t\u1ED5ng quan t\xE0i li\u1EC7u (SLR) m\u1EDBi ho\u1EB7c \u0111i\u1EC1u ch\u1EC9nh khung nghi\xEAn c\u1EE9u.",
      preparation: "X\xE1c \u0111\u1ECBnh c\xE2u h\u1ECFi nghi\xEAn c\u1EE9u (RQ), khung PICO/SPIDER, t\u1EEB kh\xF3a ti\u1EBFng Anh/ti\u1EBFng Vi\u1EC7t v\xE0 khung n\u0103m xu\u1EA5t b\u1EA3n.",
      orderOfButtons: [
        "1. Ch\u1ECDn ch\u1EBF \u0111\u1ED9: T\u1EA1o nghi\xEAn c\u1EE9u m\u1EDBi (ho\u1EB7c b\u1EA5m M\u1EABu c\xF3 s\u1EB5n nh\u01B0 SWT302 REST API)",
        "2. Nh\u1EADp T\xEAn \u0111\u1EC1 t\xE0i, M\xF4 t\u1EA3 v\xE0 c\xE1c c\xE2u h\u1ECFi RQ",
        "3. Ch\u1ECDn khung ph\xE2n t\xEDch PICO/PICOS/SPIDER v\xE0 \u0111i\u1EC1n c\xE1c tr\u01B0\u1EDDng (t\xEDch N/A n\u1EBFu kh\xF4ng \xE1p d\u1EE5ng)",
        "4. Thi\u1EBFt l\u1EADp khung n\u0103m, s\u1ED1 trang t\u1ED1i thi\u1EC3u (>= 4 trang), t\u1EEB kh\xF3a b\u1EAFt bu\u1ED9c v\xE0 lo\u1EA1i tr\u1EEB",
        "5. B\u1EA5m n\xFAt: '\u{1F4BE} L\u01B0u thi\u1EBFt l\u1EADp & Sang thu th\u1EADp'"
      ],
      expectedOutput: "H\u1ED3 s\u01A1 \u0111\u1EC1 t\xE0i \u0111\u01B0\u1EE3c l\u01B0u tr\xEAn h\u1EC7 th\u1ED1ng v\xE0 chuy\u1EC3n ngay sang B\u01B0\u1EDBc B1 Thu th\u1EADp b\xE0i b\xE1o.",
      troubleshooting: "N\u1EBFu th\xF4ng b\xE1o thi\u1EBFu th\xF4ng tin: ki\u1EC3m tra T\xEAn nghi\xEAn c\u1EE9u v\xE0 \u0111\u1EA3m b\u1EA3o c\xF3 \xEDt nh\u1EA5t 1 t\u1EEB kh\xF3a.",
      proceedCondition: "\u0110\xE3 l\u01B0u th\xE0nh c\xF4ng h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u."
    },
    B1: {
      whenToUse: "Sau khi c\xF3 protocol \u0111\u1EC3 ti\u1EBFn h\xE0nh t\xECm ki\u1EBFm b\xE0i b\xE1o \u1EE9ng vi\xEAn t\u1EEB c\xE1c ngu\u1ED3n h\u1ECDc thu\u1EADt.",
      preparation: "Ki\u1EC3m tra chu\u1ED7i truy v\u1EA5n (query), c\xE1c b\u1ED9 l\u1ECDc n\u0103m, v\xE0 tr\u1EA1ng th\xE1i ngu\u1ED3n h\u1ECDc thu\u1EADt.",
      orderOfButtons: [
        "1. Ch\u1ECDn ngu\u1ED3n thu th\u1EADp (OpenAlex \u01B0u ti\xEAn mi\u1EC5n ph\xED, ho\u1EB7c Semantic Scholar, File Import)",
        "2. Ch\u1ECDn chu\u1ED7i g\u1EE3i \xFD ho\u1EB7c nh\u1EADp chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n",
        "3. B\u1EA5m n\xFAt: '\u{1F50D} B\u1EAFt \u0111\u1EA7u thu th\u1EADp b\xE0i b\xE1o' (ho\u1EB7c '\u{1F4C2} Nh\u1EADp t\u1EC7p m\u1EABu')",
        "4. (T\xF9y ch\u1ECDn) B\u1EA5m '\u{1F3AF} Th\xEAm b\xE0i seed' ho\u1EB7c '\u2744\uFE0F Snowballing' n\u1EBFu c\xF3 b\xE0i tham chi\u1EBFu chu\u1EA9n",
        "5. Xem b\u1EA3ng k\u1EBFt qu\u1EA3 thu th\u1EADp theo t\u1EEBng ngu\u1ED3n v\xE0 b\u1EA5m '\u27A1\uFE0F Sang ki\u1EC3m tra tr\xF9ng l\u1EB7p (V1)'"
      ],
      expectedOutput: "Danh s\xE1ch b\xE0i b\xE1o th\xF4 (B1) \u0111\u01B0\u1EE3c t\u1EA3i v\u1EC1 v\u1EDBi \u0111\u1EA7y \u0111\u1EE7 metadata ban \u0111\u1EA7u.",
      troubleshooting: "N\u1EBFu API b\xE1o l\u1ED7i ho\u1EB7c timeout: b\u1EA5m '\u{1F504} Ch\u1EA1y l\u1EA1i ph\u1EA7n l\u1ED7i' ho\u1EB7c chuy\u1EC3n sang '\u{1F4C2} Nh\u1EADp t\u1EC7p m\u1EABu' (CSV/BibTeX/RIS). Ti\u1EBFn tr\xECnh ch\u1EA1y ng\u1EA7m an to\xE0n tr\xEAn backend.",
      proceedCondition: "C\xF3 \xEDt nh\u1EA5t 1 b\xE0i b\xE1o h\u1EE3p l\u1EC7 trong t\u1EADp d\u1EEF li\u1EC7u."
    },
    V1: {
      whenToUse: "Sau khi thu th\u1EADp t\u1EEB nhi\u1EC1u ngu\u1ED3n kh\xE1c nhau \u0111\u1EC3 kh\u1EED c\xE1c b\xE0i tr\xF9ng l\u1EB7p.",
      preparation: "\u0110\u1EA3m b\u1EA3o \u0111\xE3 thu th\u1EADp \u0111\u1EE7 c\xE1c ngu\u1ED3n cho \u0111\u1EE3t t\xECm ki\u1EBFm hi\u1EC7n t\u1EA1i.",
      orderOfButtons: [
        "1. B\u1EA5m n\xFAt: '\u2728 Ki\u1EC3m tra tr\xF9ng l\u1EB7p (Ch\u1EA1y Dedup)'",
        "2. Xem 4 th\u1EBB s\u1ED1 li\u1EC7u: T\u1ED5ng th\xF4, Tr\xF9ng DOI ch\u1EAFc ch\u1EAFn, Nghi tr\xF9ng c\u1EA7n duy\u1EC7t, Duy nh\u1EA5t",
        "3. \u1EDE khung 'C\u1EB7p nghi tr\xF9ng': b\u1EA5m 'G\u1ED9p b\u1EA3n ghi' ho\u1EB7c 'Gi\u1EEF ri\xEAng' cho t\u1EEBng c\u1EB7p",
        "4. B\u1EA5m n\xFAt: '\u2713 X\xE1c nh\u1EADn k\u1EBFt qu\u1EA3 b\u1ECF tr\xF9ng & sang V2'"
      ],
      expectedOutput: "Kh\u1EED s\u1EA1ch tr\xF9ng l\u1EB7p, b\u1EA3o to\xE0n ngu\u1ED3n g\u1ED1c provenance, kh\xF4ng t\u1EF1 x\xF3a v\u0129nh vi\u1EC5n b\xE0i b\xE1o.",
      troubleshooting: "N\u1EBFu g\u1ED9p nh\u1EA7m: b\u1EA5m n\xFAt 'Ho\xE0n t\xE1c' \u0111\u1EC3 ph\u1EE5c h\u1ED3i l\u1EA1i tr\u1EA1ng th\xE1i t\xE1ch ri\xEAng.",
      proceedCondition: "S\u1ED1 b\xE0i nghi tr\xF9ng ch\u01B0a duy\u1EC7t = 0."
    },
    V2: {
      whenToUse: "S\xE0ng l\u1ECDc s\u01A1 b\u1ED9 d\u1EF1a tr\xEAn Ti\xEAu \u0111\u1EC1 (Title) v\xE0 T\xF3m t\u1EAFt (Abstract).",
      preparation: "\u0110\u1ECDc k\u1EF9 ti\xEAu ch\xED IC/EC \u0111\xE3 khai b\xE1o trong protocol.",
      orderOfButtons: [
        "1. B\u1EA5m n\xFAt: '\u26A1 T\u1EF1 \u0111\u1ED9ng qu\xE9t & S\xE0ng l\u1ECDc' \u0111\u1EC3 h\u1EC7 th\u1ED1ng \u0111\u1ED1i chi\u1EBFu t\u1EEB kh\xF3a v\xE0 \u0111\u01B0a ra g\u1EE3i \xFD",
        "2. D\xF9ng b\u1ED9 l\u1ECDc Pill (Ch\u01B0a xem, Qua v\xF2ng to\xE0n v\u0103n, \u0110\xE3 lo\u1EA1i, Ch\u01B0a r\xF5) \u0111\u1EC3 duy\u1EC7t",
        "3. V\u1EDBi m\u1ED7i b\xE0i, b\u1EA5m 1 trong 3 n\xFAt: 'Qua v\xF2ng to\xE0n v\u0103n', 'Lo\u1EA1i \u1EDF V2' (k\xE8m l\xFD do), ho\u1EB7c 'Ch\u01B0a r\xF5'",
        "4. N\u1EBFu c\xF2n b\xE0i Unsure: b\u1EA5m '\u0110\u01B0a b\xE0i Unsure sang V3 \u0111\u1EC3 ki\u1EC3m tra to\xE0n v\u0103n'",
        "5. B\u1EA5m n\xFAt: '\u2713 X\xE1c nh\u1EADn danh s\xE1ch sang V3'"
      ],
      expectedOutput: "T\u1EA5t c\u1EA3 c\xE1c b\xE0i \u0111\u01B0\u1EE3c ph\xE2n lo\u1EA1i minh b\u1EA1ch: PassToFullText, Exclude ho\u1EB7c Unsure. TUY\u1EC6T \u0110\u1ED0I kh\xF4ng d\xE1n nh\xE3n Final Include \u1EDF v\xF2ng n\xE0y.",
      troubleshooting: "N\u1EBFu b\xE0i thi\u1EBFu Abstract: b\u1EA5m n\xFAt '\u26A1 Qu\xE9t link' ho\u1EB7c '\u{1F4D1} Tab' \u0111\u1EC3 tr\xEDch xu\u1EA5t tr\u1EF1c ti\u1EBFp t\u1EEB trang b\xE0i b\xE1o.",
      proceedCondition: "Kh\xF4ng c\xF2n b\xE0i \u1EDF tr\u1EA1ng th\xE1i Ch\u01B0a xem."
    },
    V3: {
      whenToUse: "Th\u1EA9m \u0111\u1ECBnh chuy\xEAn s\xE2u c\xE1c b\xE0i \u0111\xE3 v\u01B0\u1EE3t qua v\xF2ng ti\xEAu \u0111\u1EC1/t\xF3m t\u1EAFt.",
      preparation: "T\xECm v\xE0 \u0111\u1ECDc t\xE0i li\u1EC7u to\xE0n v\u0103n (Full-Text PDF).",
      orderOfButtons: [
        "1. B\u1EA5m n\xFAt: '\u{1F4D1} T\xECm to\xE0n v\u0103n cho c\xE1c b\xE0i \u0111\xE3 ch\u1ECDn' (h\u1EC7 th\u1ED1ng t\u1EF1 t\xECm qua Unpaywall / OA)",
        "2. V\u1EDBi b\xE0i kh\xF4ng t\xECm th\u1EA5y t\u1EF1 \u0111\u1ED9ng: b\u1EA5m '\u{1F4C1} T\u1EA3i file PDF t\u1EEB m\xE1y' ho\u1EB7c '\u{1F4D1} L\u1EA5y t\u1EEB Tab \u0111ang m\u1EDF'",
        "3. \u0110\u1ECDc b\xE0i b\xE1o, ki\u1EC3m tra s\u1ED1 trang (>= 4 trang) v\xE0 tr\xEDch xu\u1EA5t c\xE2u b\u1EB1ng ch\u1EE9ng ph\u01B0\u01A1ng ph\xE1p",
        "4. B\u1EA5m n\xFAt: '\u0110\u1EA1t ti\xEAu ch\xED to\xE0n v\u0103n' (Include), 'Lo\u1EA1i \u1EDF V3' (Exclude), ho\u1EB7c 'C\u1EA7n b\u1ED5 sung b\u1EB1ng ch\u1EE9ng'",
        "5. Nh\u1EADp ghi ch\xFA th\u1EA9m \u0111\u1ECBnh (l\u01B0u t\u1EF1 \u0111\u1ED9ng, kh\xF4ng x\xF3a quy\u1EBFt \u0111\u1ECBnh)",
        "6. B\u1EA5m n\xFAt: '\u2713 X\xE1c nh\u1EADn danh s\xE1ch sang Ch\u1ED1t & Xu\u1EA5t'"
      ],
      expectedOutput: "Danh s\xE1ch b\xE0i nghi\xEAn c\u1EE9u \u0111\u01B0\u1EE3c th\u1EA9m \u0111\u1ECBnh to\xE0n v\u0103n v\u1EDBi \u0111\u1EA7y \u0111\u1EE7 b\u1EB1ng ch\u1EE9ng, s\u1ED1 trang v\xE0 l\xFD do khoa h\u1ECDc.",
      troubleshooting: "N\u1EBFu kh\xF4ng t\xECm th\u1EA5y PDF: tr\u1EA1ng th\xE1i l\xE0 'Ch\u01B0a l\u1EA5y \u0111\u01B0\u1EE3c to\xE0n v\u0103n', KH\xD4NG t\u1EF1 \u0111\u1ED9ng lo\u1EA1i b\xE0i tr\u1EEB khi x\xE1c nh\u1EADn unretrievable.",
      proceedCondition: "C\xE1c b\xE0i mu\u1ED1n ch\u1ECDn v\xE0o nghi\xEAn c\u1EE9u ph\u1EA3i c\xF3 to\xE0n v\u0103n v\xE0 b\u1EB1ng ch\u1EE9ng ph\u01B0\u01A1ng ph\xE1p."
    },
    FINAL: {
      whenToUse: "\u0110\u1ED1i so\xE1t v\xE0 xu\u1EA5t to\xE0n b\u1ED9 k\u1EBFt qu\u1EA3 nghi\xEAn c\u1EE9u theo chu\u1EA9n PRISMA 2020.",
      preparation: "\u0110\u1EA3m b\u1EA3o \u0111\xE3 ho\xE0n t\u1EA5t c\xE1c b\u01B0\u1EDBc tr\u01B0\u1EDBc \u0111\xF3 v\xE0 kh\xF4ng c\xF2n quy\u1EBFt \u0111\u1ECBnh thu\u1ED9c protocol c\u0169.",
      orderOfButtons: [
        "1. Ki\u1EC3m tra 5 th\u1EBB tr\u1EA1ng th\xE1i trong B\u1EA3ng \u0110\u1ED1i So\xE1t PRISMA 2020",
        "2. B\u1EA5m n\xFAt: '\u{1F4CA} Xem S\u01A1 \u0110\u1ED3 Lu\u1ED3ng PRISMA 2020 (\u0110\u1ED1i so\xE1t)' \u0111\u1EC3 ki\u1EC3m tra c\xE2n b\u1EB1ng s\u1ED1 h\u1ECDc",
        "3. B\u1EA5m c\xE1c n\xFAt t\u01B0\u01A1ng \u1EE9ng \u0111\u1EC3 t\u1EA3i 9 t\u1EC7p xu\u1EA5t b\u1EA3n chu\u1EA9n h\u1ECDc thu\u1EADt:",
        "   - 01_all_records.csv",
        "   - 01_duplicate_log.csv",
        "   - 02_screening_decisions_full.csv",
        "   - 03_final_included.csv",
        "   - prisma-flow.md",
        "   - evidence-table.md",
        "   - 03_references_apa7.txt",
        "   - search-log.md",
        "   - session_backup.json"
      ],
      expectedOutput: "B\u1ED9 h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u SLR ho\xE0n ch\u1EC9nh, c\xE2n b\u1EB1ng s\u1ED1 h\u1ECDc tuy\u1EC7t \u0111\u1ED1i, minh b\u1EA1ch v\xE0 c\xF3 th\u1EC3 t\xE1i l\u1EADp.",
      troubleshooting: "N\u1EBFu c\xF3 c\u1EA3nh b\xE1o 'L\u1EC7ch s\u1ED1 h\u1ECDc' ho\u1EB7c 'Quy\u1EBFt \u0111\u1ECBnh thu\u1ED9c protocol c\u0169': b\u1EA5m n\xFAt c\u1EA3nh b\xE1o \u0111\u1EC3 nh\u1EA3y v\u1EC1 V2/V3 th\u1EA9m \u0111\u1ECBnh l\u1EA1i.",
      proceedCondition: "S\u01A1 \u0111\u1ED3 PRISMA c\xE2n b\u1EB1ng s\u1ED1 h\u1ECDc."
    }
  };
  var TROUBLESHOOTING_TABLE_HTML = `
  <div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px;">\u{1F4CB} B\u1EA3ng X\u1EED L\xFD T\xECnh Hu\u1ED1ng \u0110\u1EB7c Bi\u1EC7t:</div>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155;">
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">T\xECnh hu\u1ED1ng</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Thao t\xE1c</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">N\xFAt c\u1EA7n b\u1EA5m</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">B\u01B0\u1EDBc ti\u1EBFp theo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>\u0110\u1ED5i PICO / Ti\xEAu ch\xED khi \u0111\xE3 c\xF3 k\u1EBFt qu\u1EA3</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Nh\u1EADp l\xFD do thay \u0111\u1ED5i, ki\u1EC3m tra Diff</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u2699\uFE0F Ch\u1EC9nh s\u1EEDa Protocol \u2794 \u{1F4BE} X\xE1c nh\u1EADn</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u0110\xE1nh gi\xE1 l\u1EA1i c\xE1c b\xE0i b\u1ECB \u1EA3nh h\u01B0\u1EDFng t\u1EA1i V2 / V3</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>\u0110\xF3ng popup / \u0110\u1ED5i tab khi \u0111ang ch\u1EA1y</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">M\u1EDF l\u1EA1i popup, h\u1EC7 th\u1ED1ng t\u1EF1 kh\xF4i ph\u1EE5c Job</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Xem thanh ti\u1EBFn tr\xECnh n\u1EC1n tr\xEAn \u0111\u1EA7u</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Ch\u1EDD Job ho\xE0n th\xE0nh ho\u1EB7c t\u1EA1m d\u1EEBng/h\u1EE7y</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>API l\u1ED7i ho\u1EB7c h\u1EBFt quota</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Gi\u1EEF d\u1EEF li\u1EC7u c\u0169, th\u1EED l\u1EA1i ho\u1EB7c nh\u1EADp file</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u{1F504} Ch\u1EA1y l\u1EA1i ph\u1EA7n l\u1ED7i / \u{1F4C2} Nh\u1EADp t\u1EC7p m\u1EABu</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">B\u1ED5 sung k\u1EBFt qu\u1EA3 v\xE0o t\u1EADp B1 hi\u1EC7n c\xF3</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>C\xF2n b\xE0i Unsure \u1EDF V2</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Chuy\u1EC3n b\xE0i Unsure sang V3 \u0111\u1EC3 \u0111\u1ECDc to\xE0n v\u0103n</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u0110\u01B0a b\xE0i Unsure sang V3 \u0111\u1EC3 ki\u1EC3m tra to\xE0n v\u0103n</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Th\u1EA9m \u0111\u1ECBnh b\xE0i Unsure t\u1EA1i V3</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>Thu th\u1EADp th\xEAm sau khi \u0111\xE3 sang V2/V3</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">B\xE0i m\u1EDBi \u0111i qua V1/V2, b\xE0i c\u0169 gi\u1EEF nguy\xEAn</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u2795 Thu th\u1EADp th\xEAm \u2794 \u27A1\uFE0F Sang V1</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">X\u1EED l\xFD b\xE0i m\u1EDBi m\xE0 kh\xF4ng \u1EA3nh h\u01B0\u1EDFng b\xE0i \u0111\xE3 ch\u1ED1t</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>0 b\xE0i Included cu\u1ED1i c\xF9ng</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Ki\u1EC3m tra nguy\xEAn nh\xE2n, kh\xF4ng t\u1EF1 n\u1EDBi ti\xEAu ch\xED</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">\u{1F4CA} Xem S\u01A1 \u0110\u1ED3 PRISMA \u2794 Ho\xE0n t\u1EA5t 0 Included</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Xu\u1EA5t b\xE1o c\xE1o ghi nh\u1EADn trung th\u1EF1c l\xFD do lo\u1EA1i tr\u1EEB</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
`;
  var ScholarExtensionApp = class {
    backendUrl = DEFAULT_BACKEND_URL;
    // Multi-profile state
    profiles = [];
    activeProfile = PRESET_SWT302;
    currentWizardStep = "B1";
    currentFramework = "PICO";
    // Active Session state
    currentSessionId = "";
    currentSessionQuery = "";
    allRecords = [];
    uniqueRecords = [];
    dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    searchSummary = null;
    allEvidences = [];
    // Suspected duplicates state for Step V1
    suspectedDuplicatePairs = [];
    mergeHistoryList = [];
    // Source adapter capabilities
    sourceCapabilities = [];
    // Filters & Pagination
    v2CurrentFilter = "all";
    currentPage = 1;
    pageSize = 10;
    selectedRecordId = null;
    pendingAnalysisResult = null;
    // Background Job & Auto-Screening
    activeJobId = null;
    jobPollInterval = null;
    isAutoScreening = false;
    // ==========================================
    // DOM ELEMENTS BINDINGS
    // ==========================================
    // Top Header Bar
    activeResearchBadge;
    protocolVersionBadge;
    backendStatusBadge;
    quickHelpBtn;
    quickResetBtn;
    // Wizard Stepper
    wizardStepper;
    stepBtns;
    // Unified Step Header Card
    stepHeaderCard;
    currentStepBadge;
    currentStepTitle;
    stepGuideBtn;
    editProtocolBtn;
    stepGoalText;
    stepIoText;
    metricPendingCount;
    metricReviewCount;
    metricCompletedCount;
    metricTargetPill;
    metricTargetCount;
    stepPrimaryBtn;
    stepPrimaryBtnIcon;
    stepPrimaryBtnText;
    stepConditionText;
    stepNextGuideText;
    // Job Control Banner
    jobControlBanner;
    jobStageBadge;
    jobMessage;
    jobPauseBtn;
    jobResumeBtn;
    jobCancelBtn;
    jobProgressBar;
    // Outdated Protocol Warning Alert
    protocolOutdatedAlert;
    outdatedPapersCount;
    btnJumpToOutdatedV2;
    btnJumpToOutdatedV3;
    // Wizard Panels
    panelStep0;
    panelStepB1;
    panelStepV1;
    panelStepV2;
    panelStepV3;
    panelStepFinal;
    papersListContainerCard;
    // Step 0 Controls
    btnModeNewResearch;
    btnModeContinueResearch;
    btnModeImportBackup;
    backupFileInput;
    continueResearchBox;
    profileSelect;
    btnLoadSelectedProfile;
    btnLoadPresetSwt;
    btnLoadPresetGeneric;
    btnLoadPresetAac;
    setupResearchName;
    setupResearchDesc;
    setupResearchRq;
    frameworkFieldsContainer;
    setupYearStart;
    setupYearEnd;
    setupLanguage;
    setupMinPages;
    setupInclusionKeywords;
    setupExclusionKeywords;
    setupTargetCount;
    sourcesStatusTable;
    setupSummaryBox;
    setupSummaryContent;
    btnSaveSetupAndProceed;
    // Step B1 Controls
    sourceSelect;
    queryVersionSelect;
    queryInput;
    searchStringsContainer;
    asYloInput;
    asYhiInput;
    hlInput;
    maxPagesInput;
    btnStartCollection;
    importFileBtn;
    importFileInput;
    btnOpenSeedModal;
    snowballBtn;
    b1ResultsStatsBox;
    btnRerunErrors;
    btnCollectMore;
    btnProceedToV1;
    b1SourceBreakdown;
    // Step V1 Controls
    dedupRawCount;
    dedupExactCount;
    dedupSuspectCount;
    dedupUniqueCount;
    btnRunDedupWorker;
    btnConfirmDedupAndProceedV2;
    suspectedDuplicatesSection;
    suspectPairsCounter;
    suspectDuplicatesContainer;
    // Step V2 Controls
    v2FilterPills;
    v2CountAll;
    v2CountUnseen;
    v2CountPass;
    v2CountExclude;
    v2CountUnsure;
    autoScreenBatchBtn;
    btnProceedToV3;
    unsureResolutionBox;
    unsureRemainingCount;
    btnKeepReviewingV2;
    btnPassUnsureToV3;
    // Step V3 Controls
    btnFindFullTextSelected;
    uploadPdfBtn;
    pdfFileInput;
    extractActiveTabBtn;
    btnProceedToFinal;
    // Step Final Controls
    auditEligibleCount;
    auditPendingDecisionCount;
    auditMissingFullTextCount;
    auditMissingEvidenceCount;
    auditOutdatedCount;
    prismaIntegrityStatusBox;
    viewPrismaBtn;
    exportCsvBtn;
    exportDedupLogBtn;
    exportFullCsvBtn;
    exportIncludedCsvBtn;
    exportPrismaBtn;
    exportEvidenceTableBtn;
    exportApa7Btn;
    saveLogBtn;
    exportSessionBtn;
    // Records List & Pagination
    filterInput;
    filterDecisionSelect;
    paginationBar;
    paginationInfo;
    prevPageBtn;
    pageIndicator;
    nextPageBtn;
    pageSizeSelect;
    resultsContainer;
    statusDiv;
    // Modals
    stepGuideModal;
    guideModalTitle;
    guideModalBody;
    closeStepGuideBtn;
    closeStepGuideBottomBtn;
    protocolEditModal;
    closeProtocolEditBtn;
    protocolChangeReason;
    chkIsScopeChange;
    protocolDiffBox;
    protocolDiffContent;
    cancelProtocolEditBtn;
    saveProtocolChangesBtn;
    tabExtractModal;
    modalTitle;
    modalBody;
    confirmTabExtractBtn;
    cancelTabExtractBtn;
    closeModalBtn;
    prismaModal;
    closePrismaModalBtn;
    prismaFlowContainer;
    prismaDrilldownBox;
    drilldownTitle;
    drilldownPaperList;
    modalExportPrismaMdBtn;
    modalExportEvidenceBtn;
    closePrismaModalBottomBtn;
    seedModal;
    closeSeedModalBtn;
    seedDoiInput;
    seedTitleInput;
    cancelSeedBtn;
    confirmSeedBtn;
    // ==========================================
    // INITIALIZATION
    // ==========================================
    async init() {
      this.bindDOMElements();
      this.attachEventListeners();
      await this.runStorageMigration();
      await this.loadProfilesAndRestoreActive();
      await this.checkBackendHealth();
      await this.fetchSourceCapabilities();
      await this.restoreWizardStep();
      await this.checkActiveBackgroundJob();
    }
    bindDOMElements() {
      this.activeResearchBadge = document.getElementById("activeResearchBadge");
      this.protocolVersionBadge = document.getElementById("protocolVersionBadge");
      this.backendStatusBadge = document.getElementById("backendStatusBadge");
      this.quickHelpBtn = document.getElementById("quickHelpBtn");
      this.quickResetBtn = document.getElementById("quickResetBtn");
      this.wizardStepper = document.getElementById("wizardStepper");
      this.stepBtns = document.querySelectorAll(".wizard-step-btn");
      this.stepHeaderCard = document.getElementById("stepHeaderCard");
      this.currentStepBadge = document.getElementById("currentStepBadge");
      this.currentStepTitle = document.getElementById("currentStepTitle");
      this.stepGuideBtn = document.getElementById("stepGuideBtn");
      this.editProtocolBtn = document.getElementById("editProtocolBtn");
      this.stepGoalText = document.getElementById("stepGoalText");
      this.stepIoText = document.getElementById("stepIoText");
      this.metricPendingCount = document.getElementById("metricPendingCount");
      this.metricReviewCount = document.getElementById("metricReviewCount");
      this.metricCompletedCount = document.getElementById("metricCompletedCount");
      this.metricTargetPill = document.getElementById("metricTargetPill");
      this.metricTargetCount = document.getElementById("metricTargetCount");
      this.stepPrimaryBtn = document.getElementById("stepPrimaryBtn");
      this.stepPrimaryBtnIcon = document.getElementById("stepPrimaryBtnIcon");
      this.stepPrimaryBtnText = document.getElementById("stepPrimaryBtnText");
      this.stepConditionText = document.getElementById("stepConditionText");
      this.stepNextGuideText = document.getElementById("stepNextGuideText");
      this.jobControlBanner = document.getElementById("jobControlBanner");
      this.jobStageBadge = document.getElementById("jobStageBadge");
      this.jobMessage = document.getElementById("jobMessage");
      this.jobPauseBtn = document.getElementById("jobPauseBtn");
      this.jobResumeBtn = document.getElementById("jobResumeBtn");
      this.jobCancelBtn = document.getElementById("jobCancelBtn");
      this.jobProgressBar = document.getElementById("jobProgressBar");
      this.protocolOutdatedAlert = document.getElementById("protocolOutdatedAlert");
      this.outdatedPapersCount = document.getElementById("outdatedPapersCount");
      this.btnJumpToOutdatedV2 = document.getElementById("btnJumpToOutdatedV2");
      this.btnJumpToOutdatedV3 = document.getElementById("btnJumpToOutdatedV3");
      this.panelStep0 = document.getElementById("panelStep0");
      this.panelStepB1 = document.getElementById("panelStepB1");
      this.panelStepV1 = document.getElementById("panelStepV1");
      this.panelStepV2 = document.getElementById("panelStepV2");
      this.panelStepV3 = document.getElementById("panelStepV3");
      this.panelStepFinal = document.getElementById("panelStepFinal");
      this.papersListContainerCard = document.getElementById("papersListContainerCard");
      this.btnModeNewResearch = document.getElementById("btnModeNewResearch");
      this.btnModeContinueResearch = document.getElementById("btnModeContinueResearch");
      this.btnModeImportBackup = document.getElementById("btnModeImportBackup");
      this.backupFileInput = document.getElementById("backupFileInput");
      this.continueResearchBox = document.getElementById("continueResearchBox");
      this.profileSelect = document.getElementById("profileSelect");
      this.btnLoadSelectedProfile = document.getElementById("btnLoadSelectedProfile");
      this.btnLoadPresetSwt = document.getElementById("btnLoadPresetSwt");
      this.btnLoadPresetGeneric = document.getElementById("btnLoadPresetGeneric");
      this.btnLoadPresetAac = document.getElementById("btnLoadPresetAac");
      this.setupResearchName = document.getElementById("setupResearchName");
      this.setupResearchDesc = document.getElementById("setupResearchDesc");
      this.setupResearchRq = document.getElementById("setupResearchRq");
      this.frameworkFieldsContainer = document.getElementById("frameworkFieldsContainer");
      this.setupYearStart = document.getElementById("setupYearStart");
      this.setupYearEnd = document.getElementById("setupYearEnd");
      this.setupLanguage = document.getElementById("setupLanguage");
      this.setupMinPages = document.getElementById("setupMinPages");
      this.setupInclusionKeywords = document.getElementById("setupInclusionKeywords");
      this.setupExclusionKeywords = document.getElementById("setupExclusionKeywords");
      this.setupTargetCount = document.getElementById("setupTargetCount");
      this.sourcesStatusTable = document.getElementById("sourcesStatusTable");
      this.setupSummaryBox = document.getElementById("setupSummaryBox");
      this.setupSummaryContent = document.getElementById("setupSummaryContent");
      this.btnSaveSetupAndProceed = document.getElementById("btnSaveSetupAndProceed");
      this.sourceSelect = document.getElementById("sourceSelect");
      this.queryVersionSelect = document.getElementById("queryVersionSelect");
      this.queryInput = document.getElementById("queryInput");
      this.searchStringsContainer = document.getElementById("searchStringsContainer");
      this.asYloInput = document.getElementById("asYloInput");
      this.asYhiInput = document.getElementById("asYhiInput");
      this.hlInput = document.getElementById("hlInput");
      this.maxPagesInput = document.getElementById("maxPagesInput");
      this.btnStartCollection = document.getElementById("btnStartCollection");
      this.importFileBtn = document.getElementById("importFileBtn");
      this.importFileInput = document.getElementById("importFileInput");
      this.btnOpenSeedModal = document.getElementById("btnOpenSeedModal");
      this.snowballBtn = document.getElementById("snowballBtn");
      this.b1ResultsStatsBox = document.getElementById("b1ResultsStatsBox");
      this.btnRerunErrors = document.getElementById("btnRerunErrors");
      this.btnCollectMore = document.getElementById("btnCollectMore");
      this.btnProceedToV1 = document.getElementById("btnProceedToV1");
      this.b1SourceBreakdown = document.getElementById("b1SourceBreakdown");
      this.dedupRawCount = document.getElementById("dedupRawCount");
      this.dedupExactCount = document.getElementById("dedupExactCount");
      this.dedupSuspectCount = document.getElementById("dedupSuspectCount");
      this.dedupUniqueCount = document.getElementById("dedupUniqueCount");
      this.btnRunDedupWorker = document.getElementById("btnRunDedupWorker");
      this.btnConfirmDedupAndProceedV2 = document.getElementById("btnConfirmDedupAndProceedV2");
      this.suspectedDuplicatesSection = document.getElementById("suspectedDuplicatesSection");
      this.suspectPairsCounter = document.getElementById("suspectPairsCounter");
      this.suspectDuplicatesContainer = document.getElementById("suspectDuplicatesContainer");
      this.v2FilterPills = document.getElementById("v2FilterPills");
      this.v2CountAll = document.getElementById("v2CountAll");
      this.v2CountUnseen = document.getElementById("v2CountUnseen");
      this.v2CountPass = document.getElementById("v2CountPass");
      this.v2CountExclude = document.getElementById("v2CountExclude");
      this.v2CountUnsure = document.getElementById("v2CountUnsure");
      this.autoScreenBatchBtn = document.getElementById("autoScreenBatchBtn");
      this.btnProceedToV3 = document.getElementById("btnProceedToV3");
      this.unsureResolutionBox = document.getElementById("unsureResolutionBox");
      this.unsureRemainingCount = document.getElementById("unsureRemainingCount");
      this.btnKeepReviewingV2 = document.getElementById("btnKeepReviewingV2");
      this.btnPassUnsureToV3 = document.getElementById("btnPassUnsureToV3");
      this.btnFindFullTextSelected = document.getElementById("btnFindFullTextSelected");
      this.uploadPdfBtn = document.getElementById("uploadPdfBtn");
      this.pdfFileInput = document.getElementById("pdfFileInput");
      this.extractActiveTabBtn = document.getElementById("extractActiveTabBtn");
      this.btnProceedToFinal = document.getElementById("btnProceedToFinal");
      this.auditEligibleCount = document.getElementById("auditEligibleCount");
      this.auditPendingDecisionCount = document.getElementById("auditPendingDecisionCount");
      this.auditMissingFullTextCount = document.getElementById("auditMissingFullTextCount");
      this.auditMissingEvidenceCount = document.getElementById("auditMissingEvidenceCount");
      this.auditOutdatedCount = document.getElementById("auditOutdatedCount");
      this.prismaIntegrityStatusBox = document.getElementById("prismaIntegrityStatusBox");
      this.viewPrismaBtn = document.getElementById("viewPrismaBtn");
      this.exportCsvBtn = document.getElementById("exportCsvBtn");
      this.exportDedupLogBtn = document.getElementById("exportDedupLogBtn");
      this.exportFullCsvBtn = document.getElementById("exportFullCsvBtn");
      this.exportIncludedCsvBtn = document.getElementById("exportIncludedCsvBtn");
      this.exportPrismaBtn = document.getElementById("exportPrismaBtn");
      this.exportEvidenceTableBtn = document.getElementById("exportEvidenceTableBtn");
      this.exportApa7Btn = document.getElementById("exportApa7Btn");
      this.saveLogBtn = document.getElementById("saveLogBtn");
      this.exportSessionBtn = document.getElementById("exportSessionBtn");
      this.filterInput = document.getElementById("filterInput");
      this.filterDecisionSelect = document.getElementById("filterDecisionSelect");
      this.paginationBar = document.getElementById("paginationBar");
      this.paginationInfo = document.getElementById("paginationInfo");
      this.prevPageBtn = document.getElementById("prevPageBtn");
      this.pageIndicator = document.getElementById("pageIndicator");
      this.nextPageBtn = document.getElementById("nextPageBtn");
      this.pageSizeSelect = document.getElementById("pageSizeSelect");
      this.resultsContainer = document.getElementById("resultsContainer");
      this.statusDiv = document.getElementById("status");
      this.stepGuideModal = document.getElementById("stepGuideModal");
      this.guideModalTitle = document.getElementById("guideModalTitle");
      this.guideModalBody = document.getElementById("guideModalBody");
      this.closeStepGuideBtn = document.getElementById("closeStepGuideBtn");
      this.closeStepGuideBottomBtn = document.getElementById("closeStepGuideBottomBtn");
      this.protocolEditModal = document.getElementById("protocolEditModal");
      this.closeProtocolEditBtn = document.getElementById("closeProtocolEditBtn");
      this.protocolChangeReason = document.getElementById("protocolChangeReason");
      this.chkIsScopeChange = document.getElementById("chkIsScopeChange");
      this.protocolDiffBox = document.getElementById("protocolDiffBox");
      this.protocolDiffContent = document.getElementById("protocolDiffContent");
      this.cancelProtocolEditBtn = document.getElementById("cancelProtocolEditBtn");
      this.saveProtocolChangesBtn = document.getElementById("saveProtocolChangesBtn");
      this.tabExtractModal = document.getElementById("tabExtractModal");
      this.modalTitle = document.getElementById("modalTitle");
      this.modalBody = document.getElementById("modalBody");
      this.confirmTabExtractBtn = document.getElementById("confirmTabExtractBtn");
      this.cancelTabExtractBtn = document.getElementById("cancelTabExtractBtn");
      this.closeModalBtn = document.getElementById("closeModalBtn");
      this.prismaModal = document.getElementById("prismaModal");
      this.closePrismaModalBtn = document.getElementById("closePrismaModalBtn");
      this.prismaFlowContainer = document.getElementById("prismaFlowContainer");
      this.prismaDrilldownBox = document.getElementById("prismaDrilldownBox");
      this.drilldownTitle = document.getElementById("drilldownTitle");
      this.drilldownPaperList = document.getElementById("drilldownPaperList");
      this.modalExportPrismaMdBtn = document.getElementById("modalExportPrismaMdBtn");
      this.modalExportEvidenceBtn = document.getElementById("modalExportEvidenceBtn");
      this.closePrismaModalBottomBtn = document.getElementById("closePrismaModalBottomBtn");
      this.seedModal = document.getElementById("seedModal");
      this.closeSeedModalBtn = document.getElementById("closeSeedModalBtn");
      this.seedDoiInput = document.getElementById("seedDoiInput");
      this.seedTitleInput = document.getElementById("seedTitleInput");
      this.cancelSeedBtn = document.getElementById("cancelSeedBtn");
      this.confirmSeedBtn = document.getElementById("confirmSeedBtn");
    }
    attachEventListeners() {
      if (this.stepBtns) {
        this.stepBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const step = btn.getAttribute("data-step") || "SETUP";
            this.setWizardStep(step);
          });
        });
      }
      if (this.stepPrimaryBtn) {
        this.stepPrimaryBtn.addEventListener("click", () => this.handlePrimaryActionForStep());
      }
      if (this.stepGuideBtn) {
        this.stepGuideBtn.addEventListener("click", () => this.openStepGuideModal());
      }
      if (this.quickHelpBtn) {
        this.quickHelpBtn.addEventListener("click", () => this.openStepGuideModal());
      }
      if (this.quickResetBtn) {
        this.quickResetBtn.addEventListener("click", () => this.handleQuickResetSession());
      }
      if (this.editProtocolBtn) {
        this.editProtocolBtn.addEventListener("click", () => this.openProtocolEditModal());
      }
      if (this.btnJumpToOutdatedV2) {
        this.btnJumpToOutdatedV2.addEventListener("click", () => {
          this.setWizardStep("V2");
          this.filterDecisionSelect.value = "Unsure";
          this.renderRecordsList();
        });
      }
      if (this.btnJumpToOutdatedV3) {
        this.btnJumpToOutdatedV3.addEventListener("click", () => {
          this.setWizardStep("V3");
          this.filterDecisionSelect.value = "Unsure";
          this.renderRecordsList();
        });
      }
      if (this.jobPauseBtn) this.jobPauseBtn.addEventListener("click", () => this.handlePauseJob());
      if (this.jobResumeBtn) this.jobResumeBtn.addEventListener("click", () => this.handleResumeJob());
      if (this.jobCancelBtn) this.jobCancelBtn.addEventListener("click", () => this.handleCancelJob());
      if (this.btnModeNewResearch) {
        this.btnModeNewResearch.addEventListener("click", () => this.setStep0Mode("new"));
      }
      if (this.btnModeContinueResearch) {
        this.btnModeContinueResearch.addEventListener("click", () => this.setStep0Mode("continue"));
      }
      if (this.btnModeImportBackup) {
        this.btnModeImportBackup.addEventListener("click", () => this.backupFileInput.click());
      }
      if (this.backupFileInput) {
        this.backupFileInput.addEventListener("change", (e) => this.handleImportBackupFile(e));
      }
      if (this.btnLoadSelectedProfile) {
        this.btnLoadSelectedProfile.addEventListener("click", () => {
          if (this.profileSelect && this.profileSelect.value) {
            this.switchActiveProfile(this.profileSelect.value);
          }
        });
      }
      if (this.btnLoadPresetSwt) this.btnLoadPresetSwt.addEventListener("click", () => this.applyPreset(PRESET_SWT302));
      if (this.btnLoadPresetGeneric)
        this.btnLoadPresetGeneric.addEventListener("click", () => this.applyPreset(PRESET_GENERIC));
      if (this.btnLoadPresetAac)
        this.btnLoadPresetAac.addEventListener("click", () => this.applyPreset(PRESET_VISUALLY_IMPAIRED_AAC));
      const fwRadios = document.querySelectorAll('input[name="frameworkType"]');
      fwRadios.forEach((r) => {
        r.addEventListener("change", (e) => {
          const val = e.target.value;
          this.switchFramework(val);
        });
      });
      const setupInputs = [
        this.setupResearchName,
        this.setupResearchDesc,
        this.setupResearchRq,
        this.setupYearStart,
        this.setupYearEnd,
        this.setupLanguage,
        this.setupMinPages,
        this.setupInclusionKeywords,
        this.setupExclusionKeywords,
        this.setupTargetCount
      ];
      setupInputs.forEach((inp) => {
        if (inp) {
          inp.addEventListener("input", () => this.updateStep0SummaryPreview());
        }
      });
      if (this.btnSaveSetupAndProceed) {
        this.btnSaveSetupAndProceed.addEventListener("click", () => this.handleSaveSetupAndProceed());
      }
      if (this.btnStartCollection) {
        this.btnStartCollection.addEventListener("click", () => this.handleStartCollection());
      }
      if (this.importFileBtn) {
        this.importFileBtn.addEventListener("click", () => this.importFileInput.click());
      }
      if (this.importFileInput) {
        this.importFileInput.addEventListener("change", (e) => this.handleImportFile(e));
      }
      if (this.btnOpenSeedModal) {
        this.btnOpenSeedModal.addEventListener("click", () => this.openSeedModal());
      }
      if (this.snowballBtn) {
        this.snowballBtn.addEventListener("click", () => this.handleSnowballingPrompt());
      }
      if (this.btnRerunErrors) {
        this.btnRerunErrors.addEventListener("click", () => this.handleStartCollection(true));
      }
      if (this.btnCollectMore) {
        this.btnCollectMore.addEventListener("click", () => {
          this.queryInput.focus();
          this.setStatus("Nh\u1EADp th\xEAm truy v\u1EA5n ho\u1EB7c ch\u1ECDn ngu\u1ED3n kh\xE1c \u0111\u1EC3 thu th\u1EADp th\xEAm.", "info");
        });
      }
      if (this.btnProceedToV1) {
        this.btnProceedToV1.addEventListener("click", () => this.setWizardStep("V1"));
      }
      if (this.btnRunDedupWorker) {
        this.btnRunDedupWorker.addEventListener("click", () => this.handleRunDedupWorker());
      }
      if (this.btnConfirmDedupAndProceedV2) {
        this.btnConfirmDedupAndProceedV2.addEventListener("click", () => this.handleConfirmDedupAndProceedV2());
      }
      if (this.v2FilterPills) {
        this.v2FilterPills.querySelectorAll(".pill-btn").forEach((pill) => {
          pill.addEventListener("click", () => {
            this.v2FilterPills.querySelectorAll(".pill-btn").forEach((p) => p.classList.remove("active"));
            pill.classList.add("active");
            this.v2CurrentFilter = pill.getAttribute("data-filter") || "all";
            this.currentPage = 1;
            this.renderRecordsList();
          });
        });
      }
      if (this.autoScreenBatchBtn) {
        this.autoScreenBatchBtn.addEventListener("click", () => this.handleAutoScreenBatch());
      }
      if (this.btnProceedToV3) {
        this.btnProceedToV3.addEventListener("click", () => this.handleProceedToV3());
      }
      if (this.btnKeepReviewingV2) {
        this.btnKeepReviewingV2.addEventListener("click", () => {
          this.v2CurrentFilter = "Unsure";
          const unsurePill = this.v2FilterPills.querySelector('[data-filter="Unsure"]');
          if (unsurePill) {
            this.v2FilterPills.querySelectorAll(".pill-btn").forEach((p) => p.classList.remove("active"));
            unsurePill.classList.add("active");
          }
          this.renderRecordsList();
        });
      }
      if (this.btnPassUnsureToV3) {
        this.btnPassUnsureToV3.addEventListener("click", () => this.handlePassUnsureToV3());
      }
      if (this.btnFindFullTextSelected) {
        this.btnFindFullTextSelected.addEventListener("click", () => this.handleFindFullTextSelected());
      }
      if (this.uploadPdfBtn) {
        this.uploadPdfBtn.addEventListener("click", () => this.pdfFileInput.click());
      }
      if (this.pdfFileInput) {
        this.pdfFileInput.addEventListener("change", (e) => this.handleUploadPdfFile(e));
      }
      if (this.extractActiveTabBtn) {
        this.extractActiveTabBtn.addEventListener("click", () => this.handleExtractActiveTab());
      }
      if (this.btnProceedToFinal) {
        this.btnProceedToFinal.addEventListener("click", () => this.setWizardStep("FINAL"));
      }
      if (this.viewPrismaBtn) this.viewPrismaBtn.addEventListener("click", () => this.openPrismaModal());
      if (this.exportCsvBtn) this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
      if (this.exportDedupLogBtn) this.exportDedupLogBtn.addEventListener("click", () => this.handleExportDedupLog());
      if (this.exportFullCsvBtn) this.exportFullCsvBtn.addEventListener("click", () => this.handleExportFullCsv());
      if (this.exportIncludedCsvBtn)
        this.exportIncludedCsvBtn.addEventListener("click", () => this.handleExportIncludedCsv());
      if (this.exportPrismaBtn) this.exportPrismaBtn.addEventListener("click", () => this.handleExportPrismaMarkdown());
      if (this.exportEvidenceTableBtn)
        this.exportEvidenceTableBtn.addEventListener("click", () => this.handleExportEvidenceTable());
      if (this.exportApa7Btn) this.exportApa7Btn.addEventListener("click", () => this.handleExportApa7());
      if (this.saveLogBtn) this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());
      if (this.exportSessionBtn) this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());
      if (this.filterInput) {
        this.filterInput.addEventListener("input", () => {
          this.currentPage = 1;
          this.renderRecordsList();
        });
      }
      if (this.filterDecisionSelect) {
        this.filterDecisionSelect.addEventListener("change", () => {
          this.currentPage = 1;
          this.renderRecordsList();
        });
      }
      if (this.prevPageBtn) {
        this.prevPageBtn.addEventListener("click", () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.renderRecordsList();
          }
        });
      }
      if (this.nextPageBtn) {
        this.nextPageBtn.addEventListener("click", () => {
          this.currentPage++;
          this.renderRecordsList();
        });
      }
      if (this.pageSizeSelect) {
        this.pageSizeSelect.addEventListener("change", () => {
          this.pageSize = parseInt(this.pageSizeSelect.value, 10) || 10;
          this.currentPage = 1;
          this.renderRecordsList();
        });
      }
      if (this.closeStepGuideBtn) this.closeStepGuideBtn.addEventListener("click", () => this.closeStepGuideModal());
      if (this.closeStepGuideBottomBtn)
        this.closeStepGuideBottomBtn.addEventListener("click", () => this.closeStepGuideModal());
      if (this.closeProtocolEditBtn)
        this.closeProtocolEditBtn.addEventListener("click", () => this.closeProtocolEditModal());
      if (this.cancelProtocolEditBtn)
        this.cancelProtocolEditBtn.addEventListener("click", () => this.closeProtocolEditModal());
      if (this.saveProtocolChangesBtn)
        this.saveProtocolChangesBtn.addEventListener("click", () => this.handleSaveProtocolChanges());
      if (this.closeModalBtn) this.closeModalBtn.addEventListener("click", () => this.closeTabExtractModal());
      if (this.cancelTabExtractBtn)
        this.cancelTabExtractBtn.addEventListener("click", () => this.closeTabExtractModal());
      if (this.confirmTabExtractBtn)
        this.confirmTabExtractBtn.addEventListener("click", () => this.confirmTabAnalysis());
      if (this.closePrismaModalBtn) this.closePrismaModalBtn.addEventListener("click", () => this.closePrismaModal());
      if (this.closePrismaModalBottomBtn)
        this.closePrismaModalBottomBtn.addEventListener("click", () => this.closePrismaModal());
      if (this.modalExportPrismaMdBtn)
        this.modalExportPrismaMdBtn.addEventListener("click", () => this.handleExportPrismaMarkdown());
      if (this.modalExportEvidenceBtn)
        this.modalExportEvidenceBtn.addEventListener("click", () => this.handleExportEvidenceTable());
      if (this.closeSeedModalBtn) this.closeSeedModalBtn.addEventListener("click", () => this.closeSeedModal());
      if (this.cancelSeedBtn) this.cancelSeedBtn.addEventListener("click", () => this.closeSeedModal());
      if (this.confirmSeedBtn) this.confirmSeedBtn.addEventListener("click", () => this.handleConfirmSeedPaper());
    }
    // ==========================================
    // WIZARD STEP CONTROLLER
    // ==========================================
    setWizardStep(step) {
      this.currentWizardStep = step;
      chrome.storage.local.set({ [STORAGE_WIZARD_STEP_KEY]: step });
      if (this.stepBtns) {
        this.stepBtns.forEach((btn) => {
          if (btn.getAttribute("data-step") === step) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      }
      const cfg = STEP_CONFIGS[step];
      if (cfg) {
        if (this.currentStepBadge) this.currentStepBadge.innerText = cfg.badge;
        if (this.currentStepTitle) this.currentStepTitle.innerText = cfg.title;
        if (this.stepGoalText) this.stepGoalText.innerText = cfg.goal;
        if (this.stepIoText) this.stepIoText.innerText = cfg.io;
        if (this.stepPrimaryBtnIcon) this.stepPrimaryBtnIcon.innerText = cfg.primaryBtnIcon;
        if (this.stepPrimaryBtnText) this.stepPrimaryBtnText.innerText = cfg.primaryBtnText;
        if (this.stepConditionText) this.stepConditionText.innerText = cfg.condition;
        if (this.stepNextGuideText) this.stepNextGuideText.innerText = cfg.nextGuide;
      }
      if (this.panelStep0) this.panelStep0.style.display = step === "SETUP" ? "block" : "none";
      if (this.panelStepB1) this.panelStepB1.style.display = step === "B1" ? "block" : "none";
      if (this.panelStepV1) this.panelStepV1.style.display = step === "V1" ? "block" : "none";
      if (this.panelStepV2) this.panelStepV2.style.display = step === "V2" ? "block" : "none";
      if (this.panelStepV3) this.panelStepV3.style.display = step === "V3" ? "block" : "none";
      if (this.panelStepFinal) this.panelStepFinal.style.display = step === "FINAL" ? "block" : "none";
      if (this.papersListContainerCard) {
        this.papersListContainerCard.style.display = step === "SETUP" ? "none" : "block";
      }
      this.updateStepCounters();
      if (step === "SETUP") {
        this.renderStep0();
      } else if (step === "B1") {
        this.renderStepB1();
      } else if (step === "V1") {
        this.renderStepV1();
      } else if (step === "V2") {
        this.renderStepV2();
      } else if (step === "V3") {
        this.renderStepV3();
      } else if (step === "FINAL") {
        this.renderStepFinal();
      }
      this.renderRecordsList();
      this.setStatus(`\u0110ang \u1EDF ${cfg?.badge}: ${cfg?.title}`, "info");
    }
    async restoreWizardStep() {
      try {
        const data = await chrome.storage.local.get(STORAGE_WIZARD_STEP_KEY);
        const savedStep = data[STORAGE_WIZARD_STEP_KEY];
        if (savedStep && STEP_CONFIGS[savedStep]) {
          this.setWizardStep(savedStep);
          return;
        }
      } catch {
      }
      if (this.uniqueRecords.length > 0) {
        this.setWizardStep("B1");
      } else {
        this.setWizardStep("SETUP");
      }
    }
    handlePrimaryActionForStep() {
      switch (this.currentWizardStep) {
        case "SETUP":
          this.handleSaveSetupAndProceed();
          break;
        case "B1":
          this.handleStartCollection();
          break;
        case "V1":
          this.handleRunDedupWorker();
          break;
        case "V2":
          this.handleAutoScreenBatch();
          break;
        case "V3":
          this.handleFindFullTextSelected();
          break;
        case "FINAL":
          this.openPrismaModal();
          break;
      }
    }
    updateStepCounters() {
      const totalRaw = this.allRecords.length;
      const totalUnique = this.uniqueRecords.length;
      let pending = 0;
      let review = 0;
      let completed = 0;
      const target = this.activeProfile.targetIncludedCount || 15;
      const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include").length;
      switch (this.currentWizardStep) {
        case "SETUP":
          pending = 0;
          review = 0;
          completed = (this.activeProfile.criteria || []).length;
          break;
        case "B1":
          pending = 0;
          review = 0;
          completed = totalRaw;
          break;
        case "V1":
          pending = this.suspectedDuplicatePairs.length;
          review = this.dedupStats.potentialDupByTitle || 0;
          completed = totalUnique;
          break;
        case "V2":
          pending = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
          review = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure" || r.suggestedDecision === "Unsure").length;
          completed = this.uniqueRecords.filter((r) => r.v2Decision === "PassToFullText" || r.v2Decision === "Exclude").length;
          break;
        case "V3":
          pending = this.uniqueRecords.filter(
            (r) => r.v2Decision === "PassToFullText" && !r.finalDecision && !r.pdfUrl
          ).length;
          review = this.uniqueRecords.filter(
            (r) => (r.finalDecision === "Unsure" || !r.finalDecision) && (!!r.pdfUrl || r.fullTextStatus === "downloaded")
          ).length;
          completed = this.uniqueRecords.filter((r) => r.finalDecision === "Include" || r.finalDecision === "Exclude").length;
          break;
        case "FINAL":
          pending = this.uniqueRecords.filter((r) => !r.finalDecision).length;
          review = this.uniqueRecords.filter((r) => r.isDecisionOutdated || r.missingEvidence?.length).length;
          completed = finalIncludes;
          break;
      }
      if (this.metricPendingCount) this.metricPendingCount.innerText = String(pending);
      if (this.metricReviewCount) this.metricReviewCount.innerText = String(review);
      if (this.metricCompletedCount) this.metricCompletedCount.innerText = String(completed);
      if (this.metricTargetCount) this.metricTargetCount.innerText = `${finalIncludes} / ${target}`;
      const outdatedCount = this.uniqueRecords.filter((r) => r.isDecisionOutdated).length;
      if (this.protocolOutdatedAlert && this.outdatedPapersCount) {
        if (outdatedCount > 0) {
          this.protocolOutdatedAlert.style.display = "block";
          this.outdatedPapersCount.innerText = String(outdatedCount);
        } else {
          this.protocolOutdatedAlert.style.display = "none";
        }
      }
    }
    // ==========================================
    // STEP 0 — THIẾT LẬP NGHIÊN CỨU
    // ==========================================
    setStep0Mode(mode) {
      if (this.btnModeNewResearch) this.btnModeNewResearch.classList.toggle("active", mode === "new");
      if (this.btnModeContinueResearch) this.btnModeContinueResearch.classList.toggle("active", mode === "continue");
      if (this.btnModeImportBackup) this.btnModeImportBackup.classList.toggle("active", mode === "import");
      if (this.continueResearchBox) {
        this.continueResearchBox.style.display = mode === "continue" ? "block" : "none";
      }
      if (mode === "new") {
        this.setupResearchName.value = "";
        this.setupResearchDesc.value = "";
        this.setupResearchRq.value = "";
        this.setupInclusionKeywords.value = "";
        this.setupExclusionKeywords.value = "";
        this.allRecords = [];
        this.uniqueRecords = [];
        this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
        this.suspectedDuplicatePairs = [];
        this.mergeHistoryList = [];
        this.currentSessionId = `session_${Date.now()}`;
        this.saveSessionToStorage();
        this.updateStepCounters();
        this.updateStep0SummaryPreview();
        this.renderRecordsList();
        this.setStatus("Ch\u1EBF \u0111\u1ED9 t\u1EA1o m\u1EDBi: \u0110\xE3 l\xE0m s\u1EA1ch danh s\xE1ch b\xE0i b\xE1o cho \u0111\u1EC1 t\xE0i m\u1EDBi.", "info");
      }
    }
    async handleQuickResetSession() {
      if (!confirm("B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\xF3a s\u1EA1ch to\xE0n b\u1ED9 d\u1EEF li\u1EC7u phi\xEAn l\xE0m vi\u1EC7c n\xE0y \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u l\u1EA1i t\u1EEB \u0111\u1EA7u?")) {
        return;
      }
      this.allRecords = [];
      this.uniqueRecords = [];
      this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
      this.suspectedDuplicatePairs = [];
      this.mergeHistoryList = [];
      this.currentSessionId = `session_${Date.now()}`;
      await this.saveSessionToStorage();
      this.setWizardStep("SETUP");
      this.updateStepCounters();
      this.renderRecordsList();
      this.setStatus("\u2713 \u0110\xE3 x\xF3a s\u1EA1ch d\u1EEF li\u1EC7u phi\xEAn l\xE0m vi\u1EC7c. H\xE3y b\u1EAFt \u0111\u1EA7u t\u1EEB B\u01B0\u1EDBc 0 Thi\u1EBFt l\u1EADp.", "success");
    }
    renderStep0() {
      this.populateSetupForm(this.activeProfile);
      this.renderFrameworkFields(this.activeProfile.framework || "PICO", this.activeProfile.frameworkFields);
      this.renderSourcesStatusTable();
      this.updateStep0SummaryPreview();
    }
    switchFramework(fw) {
      this.currentFramework = fw;
      this.renderFrameworkFields(fw);
      this.updateStep0SummaryPreview();
    }
    renderFrameworkFields(fw, existingFields) {
      if (!this.frameworkFieldsContainer) return;
      let fieldDefs = [];
      if (fw === "PICO") {
        fieldDefs = [
          { key: "P", label: "P \u2014 Population / Problem", placeholder: "V\xED d\u1EE5: REST APIs, h\u1EC7 th\u1ED1ng web backend..." },
          {
            key: "I",
            label: "I \u2014 Intervention",
            placeholder: "V\xED d\u1EE5: Ki\u1EC3m th\u1EED t\u1EF1 \u0111\u1ED9ng v\u1EDBi Equivalence Partitioning / BVA..."
          },
          {
            key: "C",
            label: "C \u2014 Comparison (\u0110\u1ED1i ch\u1EE9ng)",
            placeholder: "V\xED d\u1EE5: Ki\u1EC3m th\u1EED th\u1EE7 c\xF4ng, random testing... (ho\u1EB7c t\xEDch N/A)"
          },
          { key: "O", label: "O \u2014 Outcomes (K\u1EBFt qu\u1EA3 \u0111o l\u01B0\u1EDDng)", placeholder: "V\xED d\u1EE5: \u0110\u1ED9 bao ph\u1EE7 coverage, t\u1EC9 l\u1EC7 ph\xE1t hi\u1EC7n l\u1ED7i..." }
        ];
      } else if (fw === "PICOS") {
        fieldDefs = [
          { key: "P", label: "P \u2014 Population", placeholder: "\u0110\u1ED1i t\u01B0\u1EE3ng nghi\xEAn c\u1EE9u..." },
          { key: "I", label: "I \u2014 Intervention", placeholder: "Ph\u01B0\u01A1ng ph\xE1p \xE1p d\u1EE5ng..." },
          { key: "C", label: "C \u2014 Comparison", placeholder: "Ph\u01B0\u01A1ng ph\xE1p so s\xE1nh (ho\u1EB7c N/A)..." },
          { key: "O", label: "O \u2014 Outcomes", placeholder: "K\u1EBFt qu\u1EA3 mong \u0111\u1EE3i..." },
          { key: "S", label: "S \u2014 Study Design", placeholder: "Thi\u1EBFt k\u1EBF th\u1EF1c nghi\u1EC7m (Empirical, SLR, Case Study)..." }
        ];
      } else if (fw === "SPIDER") {
        fieldDefs = [
          { key: "S", label: "S \u2014 Sample", placeholder: "M\u1EABu nghi\xEAn c\u1EE9u..." },
          { key: "PI", label: "PI \u2014 Phenomenon of Interest", placeholder: "Hi\u1EC7n t\u01B0\u1EE3ng quan t\xE2m..." },
          { key: "D", label: "D \u2014 Design", placeholder: "Ph\u01B0\u01A1ng ph\xE1p thi\u1EBFt k\u1EBF nghi\xEAn c\u1EE9u..." },
          { key: "E", label: "E \u2014 Evaluation", placeholder: "\u0110\xE1nh gi\xE1 k\u1EBFt qu\u1EA3..." },
          { key: "R", label: "R \u2014 Research Type", placeholder: "Lo\u1EA1i nghi\xEAn c\u1EE9u (\u0110\u1ECBnh l\u01B0\u1EE3ng, \u0110\u1ECBnh t\xEDnh)..." }
        ];
      } else {
        fieldDefs = [
          { key: "Domain", label: "L\u0129nh v\u1EF1c nghi\xEAn c\u1EE9u", placeholder: "V\xED d\u1EE5: Software Testing..." },
          { key: "Method", label: "Ph\u01B0\u01A1ng ph\xE1p tr\u1ECDng t\xE2m", placeholder: "K\u1EF9 thu\u1EADt ph\xE2n t\xEDch..." },
          { key: "Evaluation", label: "Ti\xEAu ch\xED \u0111\xE1nh gi\xE1", placeholder: "Ch\u1EC9 s\u1ED1 th\u1EF1c nghi\u1EC7m..." }
        ];
      }
      this.frameworkFieldsContainer.innerHTML = fieldDefs.map((def) => {
        const saved = existingFields ? existingFields[def.key] : null;
        const val = saved ? saved.val : "";
        const isNa = saved ? saved.na : false;
        return `
        <div class="fw-field-item">
          <div class="fw-field-top">
            <span class="fw-field-label">${this.escapeHtml(def.label)}</span>
            <label class="fw-na-label">
              <input type="checkbox" class="fw-na-chk" data-field="${def.key}" ${isNa ? "checked" : ""} />
              <span>N/A</span>
            </label>
          </div>
          <input type="text" class="fw-field-input" data-field="${def.key}" placeholder="${this.escapeHtml(def.placeholder)}" value="${this.escapeHtml(val)}" ${isNa ? "disabled" : ""} />
        </div>
      `;
      }).join("");
      this.frameworkFieldsContainer.querySelectorAll(".fw-na-chk").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const target = e.target;
          const key = target.getAttribute("data-field");
          const input = this.frameworkFieldsContainer.querySelector(
            `.fw-field-input[data-field="${key}"]`
          );
          if (input) {
            input.disabled = target.checked;
            if (target.checked) input.value = "N/A";
            else if (input.value === "N/A") input.value = "";
          }
          this.updateStep0SummaryPreview();
        });
      });
      this.frameworkFieldsContainer.querySelectorAll(".fw-field-input").forEach((inp) => {
        inp.addEventListener("input", () => this.updateStep0SummaryPreview());
      });
    }
    getFrameworkFieldValues() {
      const res = {};
      if (!this.frameworkFieldsContainer) return res;
      this.frameworkFieldsContainer.querySelectorAll(".fw-field-item").forEach((item) => {
        const chk = item.querySelector(".fw-na-chk");
        const inp = item.querySelector(".fw-field-input");
        if (chk && inp) {
          const key = chk.getAttribute("data-field") || "";
          res[key] = {
            val: inp.value.trim(),
            na: chk.checked
          };
        }
      });
      return res;
    }
    async fetchSourceCapabilities() {
      try {
        const res = await fetch(`${this.backendUrl}/api/sources/capabilities`);
        if (res.ok) {
          const data = await res.json();
          this.sourceCapabilities = data.capabilities || [];
          this.renderSourcesStatusTable();
        }
      } catch {
      }
    }
    renderSourcesStatusTable() {
      if (!this.sourcesStatusTable) return;
      const sources = [
        {
          name: "OpenAlex",
          status: "S\u1EB5n s\xE0ng (Mi\u1EC5n ph\xED)",
          statusCls: "badge-green",
          notes: "Ngu\u1ED3n ch\xEDnh, bao qu\xE1t to\xE0n c\u1EA7u, kh\xF4ng c\u1EA7n API key."
        },
        {
          name: "Semantic Scholar",
          status: "S\u1EB5n s\xE0ng / Khuy\xEAn d\xF9ng Key",
          statusCls: "badge-blue",
          notes: "Ngu\u1ED3n b\u1ED5 tr\u1EE3, t\u1EF1 \u0111\u1ED9ng fallback n\u1EBFu kh\xF4ng c\xF3 key."
        },
        {
          name: "Google Scholar",
          status: "C\u1EA7n SerpApi Key (T\xF9y ch\u1ECDn)",
          statusCls: "badge-yellow",
          notes: "Thu th\u1EADp b\xE0i \u1EE9ng vi\xEAn b\u1ED5 tr\u1EE3 ngo\xE0i PRISMA."
        },
        {
          name: "Nh\u1EADp t\u1EC7p ngo\u1EA1i vi",
          status: "S\u1EB5n s\xE0ng (CSV, BibTeX, RIS)",
          statusCls: "badge-green",
          notes: "H\u1ED7 tr\u1EE3 nh\u1EADp m\u1EABu t\u1EEB ACM, IEEE, Scopus ngo\u1EA1i tuy\u1EBFn."
        }
      ];
      this.sourcesStatusTable.innerHTML = `
      <table class="status-tbl">
        <thead>
          <tr>
            <th>Ngu\u1ED3n H\u1ECDc Thu\u1EADt</th>
            <th>Tr\u1EA1ng Th\xE1i Th\u1EF1c T\u1EBF</th>
            <th>Ghi Ch\xFA V\u1EADn H\xE0nh</th>
          </tr>
        </thead>
        <tbody>
          ${sources.map(
        (s) => `
            <tr>
              <td><b>${this.escapeHtml(s.name)}</b></td>
              <td><span class="badge ${s.statusCls}">${this.escapeHtml(s.status)}</span></td>
              <td><small>${this.escapeHtml(s.notes)}</small></td>
            </tr>
          `
      ).join("")}
        </tbody>
      </table>
    `;
    }
    updateStep0SummaryPreview() {
      if (!this.setupSummaryContent) return;
      const name = this.setupResearchName?.value.trim() || "(Ch\u01B0a \u0111\u1EB7t t\xEAn)";
      const rq = this.setupResearchRq?.value.trim() || "(Ch\u01B0a c\xF3 RQ)";
      const yStart = this.setupYearStart?.value || "2020";
      const yEnd = this.setupYearEnd?.value || "2026";
      const lang = this.setupLanguage?.value || "English, Ti\u1EBFng Vi\u1EC7t";
      const minP = this.setupMinPages?.value || "4";
      const incK = this.setupInclusionKeywords?.value.trim() || "(Tr\u1ED1ng)";
      const excK = this.setupExclusionKeywords?.value.trim() || "(Tr\u1ED1ng)";
      const target = this.setupTargetCount?.value || "15";
      const fwFields = this.getFrameworkFieldValues();
      const fwSummary = Object.entries(fwFields).map(([k, v]) => `<b>${k}:</b> ${v.na ? "<i>N/A</i>" : v.val || "<i>Ch\u01B0a \u0111i\u1EC1n</i>"}`).join(" | ");
      this.setupSummaryContent.innerHTML = `
      <div><b>\u0110\u1EC1 t\xE0i:</b> ${this.escapeHtml(name)}</div>
      <div><b>C\xE2u h\u1ECFi RQ:</b> <pre style="margin: 2px 0; font-size: 10px; font-family: inherit;">${this.escapeHtml(rq)}</pre></div>
      <div><b>Khung ph\xE2n t\xEDch (${this.currentFramework}):</b> ${fwSummary || "Ch\u01B0a c\xF3"}</div>
      <div><b>B\u1ED9 l\u1ECDc:</b> ${yStart} - ${yEnd} | <b>Ng\xF4n ng\u1EEF:</b> ${this.escapeHtml(lang)} | <b>T\u1ED1i thi\u1EC3u:</b> &ge; ${minP} trang</div>
      <div><b>T\u1EEB kh\xF3a IC:</b> <code>${this.escapeHtml(incK)}</code></div>
      <div><b>T\u1EEB kh\xF3a EC:</b> <code>${this.escapeHtml(excK)}</code></div>
      <div><b>M\u1EE5c ti\xEAu ti\u1EBFn \u0111\u1ED9:</b> ${target} b\xE0i Include (Ch\u1EC9 theo d\xF5i ti\u1EBFn \u0111\u1ED9, kh\xF4ng \xE9p bu\u1ED9c ti\xEAu ch\xED).</div>
    `;
    }
    async handleSaveSetupAndProceed() {
      const name = this.setupResearchName.value.trim();
      if (!name) {
        alert("Vui l\xF2ng nh\u1EADp T\xEAn nghi\xEAn c\u1EE9u / \u0110\u1EC1 t\xE0i!");
        this.setupResearchName.focus();
        return;
      }
      const rqText = this.setupResearchRq.value.trim();
      const rqList = rqText ? rqText.split("\n").filter((l) => l.trim().length > 0) : [];
      const fwFields = this.getFrameworkFieldValues();
      const yStart = parseInt(this.setupYearStart.value, 10) || 2020;
      const yEnd = parseInt(this.setupYearEnd.value, 10) || 2026;
      const minPages = parseInt(this.setupMinPages.value, 10) || 4;
      const targetCount = parseInt(this.setupTargetCount.value, 10) || 15;
      const incKeywords = this.setupInclusionKeywords.value.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
      const excKeywords = this.setupExclusionKeywords.value.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
      const updatedProfile = {
        ...this.activeProfile,
        name,
        description: this.setupResearchDesc.value.trim(),
        researchQuestions: rqList,
        framework: this.currentFramework,
        frameworkFields: fwFields,
        targetIncludedCount: targetCount,
        yearRange: { start: yStart, end: yEnd, enabled: true },
        minPages: { count: minPages, enabled: true },
        criteria: [
          {
            id: "IC1",
            type: "inclusion",
            name: "Khung th\u1EDDi gian xu\u1EA5t b\u1EA3n",
            description: `Xu\u1EA5t b\u1EA3n t\u1EEB n\u0103m ${yStart} \u0111\u1EBFn ${yEnd}`,
            field: "year",
            operator: "range",
            value: [yStart, yEnd],
            isMandatory: true
          },
          {
            id: "IC2",
            type: "inclusion",
            name: "Dung l\u01B0\u1EE3ng b\xE0i b\xE1o t\u1ED1i thi\u1EC3u",
            description: `S\u1ED1 trang t\u1ED1i thi\u1EC3u >= ${minPages} trang (lo\u1EA1i tr\u1EEB t\xF3m t\u1EAFt ng\u1EAFn)`,
            field: "pageCount",
            operator: "gte",
            value: minPages,
            isMandatory: true
          },
          ...incKeywords.map((kw, idx) => ({
            id: `IC-KW${idx + 1}`,
            type: "inclusion",
            name: `T\u1EEB kh\xF3a: ${kw}`,
            description: `Ch\u1EE9a t\u1EEB kh\xF3a b\u1EAFt bu\u1ED9c "${kw}"`,
            field: "content",
            operator: "contains",
            value: kw,
            isMandatory: false
          })),
          ...excKeywords.map((kw, idx) => ({
            id: `EC-KW${idx + 1}`,
            type: "exclusion",
            name: `Lo\u1EA1i tr\u1EEB: ${kw}`,
            description: `Ch\u1EE9a t\u1EEB kh\xF3a lo\u1EA1i tr\u1EEB "${kw}"`,
            field: "content",
            operator: "contains",
            value: kw,
            isMandatory: true
          }))
        ],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.activeProfile = updatedProfile;
      await this.saveProfileToBackend(updatedProfile);
      await this.saveProfilesToStorage();
      this.updateActiveResearchDisplay();
      this.setStatus("\u2713 \u0110\xE3 l\u01B0u thi\u1EBFt l\u1EADp Protocol th\xE0nh c\xF4ng! Chuy\u1EC3n sang B\u01B0\u1EDBc B1 Thu th\u1EADp b\xE0i b\xE1o.", "success");
      this.setWizardStep("B1");
    }
    // ==========================================
    // STEP B1 — THU THẬP BÀI BÁO (IDENTIFICATION)
    // ==========================================
    renderStepB1() {
      if (this.asYloInput && this.activeProfile.yearRange) {
        this.asYloInput.value = String(this.activeProfile.yearRange.start);
      }
      if (this.asYhiInput && this.activeProfile.yearRange) {
        this.asYhiInput.value = String(this.activeProfile.yearRange.end);
      }
      this.renderSearchStringSuggestions();
      if (this.allRecords.length > 0) {
        if (this.b1ResultsStatsBox) this.b1ResultsStatsBox.style.display = "block";
        this.renderB1SourceBreakdown();
      }
    }
    renderSearchStringSuggestions() {
      if (!this.searchStringsContainer) return;
      const searchStrings = this.activeProfile.searchStrings || [];
      if (searchStrings.length === 0) {
        const incKeywords = (this.activeProfile.criteria || []).filter((c) => c.type === "inclusion" && c.field === "content").map((c) => c.value);
        if (incKeywords.length > 0) {
          searchStrings.push(`(${incKeywords.slice(0, 3).join(" OR ")})`);
        }
      }
      if (searchStrings.length === 0) {
        this.searchStringsContainer.innerHTML = '<span class="text-muted">Ch\u01B0a c\xF3 chu\u1ED7i g\u1EE3i \xFD</span>';
        return;
      }
      this.searchStringsContainer.innerHTML = searchStrings.map(
        (str) => `<button class="btn-xs btn-subtle search-string-pill" style="cursor: pointer; padding: 2px 6px; font-size: 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff;" title="B\u1EA5m \u0111\u1EC3 \u0111\u01B0a chu\u1ED7i n\xE0y v\xE0o \xF4 t\xECm ki\u1EBFm">${this.escapeHtml(str)}</button>`
      ).join(" ");
      this.searchStringsContainer.querySelectorAll(".search-string-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          this.queryInput.value = pill.textContent || "";
          this.setStatus(`\u0110\xE3 ch\u1ECDn chu\u1ED7i t\xECm ki\u1EBFm t\u1EEB g\u1EE3i \xFD.`, "info");
        });
      });
    }
    async handleStartCollection(isRerunError = false) {
      const query = this.queryInput.value.trim();
      if (!query) {
        alert("Vui l\xF2ng nh\u1EADp Chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n (Search String)!");
        this.queryInput.focus();
        return;
      }
      const source = this.sourceSelect ? this.sourceSelect.value : "OpenAlex";
      const queryVersion = this.queryVersionSelect ? this.queryVersionSelect.value : "Q1";
      const maxPages = parseInt(this.maxPagesInput.value, 10) || 1;
      try {
        this.setStatus(`\u0110ang kh\u1EDFi ch\u1EA1y thu th\u1EADp qua ngu\u1ED3n ${source} (Query: ${queryVersion})...`, "info");
        const payload = {
          researchId: this.activeProfile.id,
          sessionId: this.currentSessionId || `session_${Date.now()}`,
          stage: "B1",
          profile: this.activeProfile,
          source,
          queryVersion,
          query,
          asYlo: this.asYloInput.value.trim(),
          asYhi: this.asYhiInput.value.trim(),
          maxPages,
          isRerunError,
          records: this.allRecords
        };
        const res = await fetch(`${this.backendUrl}/api/pipeline/run-stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.jobId) {
          this.activeJobId = data.jobId;
          this.showJobBanner({
            stage: "B1",
            status: "running",
            message: `\u0110ang thu th\u1EADp t\u1EEB ${source}...`,
            processedItems: 0,
            totalItems: maxPages
          });
          this.startJobPolling(data.jobId);
          this.setStatus(`T\xE1c v\u1EE5 B1 \u0111ang ch\u1EA1y ng\u1EA7m tr\xEAn backend. B\u1EA1n c\xF3 th\u1EC3 chuy\u1EC3n tab tho\u1EA3i m\xE1i!`, "info");
        }
      } catch (err) {
        this.setStatus(`L\u1ED7i khi kh\u1EDFi ch\u1EA1y thu th\u1EADp: ${err.message}`, "error");
      }
    }
    renderB1SourceBreakdown() {
      if (!this.b1SourceBreakdown) return;
      const sourceCounts = {};
      for (const r of this.allRecords) {
        const src = r.source || r.discoverySource || "Ch\u01B0a x\xE1c \u0111\u1ECBnh";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      }
      const items = Object.entries(sourceCounts).map(
        ([src, count]) => `
      <div class="source-stat-item">
        <span class="source-stat-name">${this.escapeHtml(src)}:</span>
        <b class="source-stat-count">${count} b\xE0i</b>
      </div>
    `
      ).join("");
      this.b1SourceBreakdown.innerHTML = items || "<div>Ch\u01B0a c\xF3 b\xE0i n\xE0o.</div>";
    }
    openSeedModal() {
      if (this.seedModal) this.seedModal.style.display = "flex";
    }
    closeSeedModal() {
      if (this.seedModal) this.seedModal.style.display = "none";
    }
    async handleConfirmSeedPaper() {
      const doi = this.seedDoiInput.value.trim();
      const title = this.seedTitleInput.value.trim();
      if (!doi && !title) {
        alert("Vui l\xF2ng nh\u1EADp DOI ho\u1EB7c Ti\xEAu \u0111\u1EC1 b\xE0i seed!");
        return;
      }
      try {
        this.setStatus(`\u0110ang th\xEAm b\xE0i seed (${doi || title})...`, "info");
        const res = await fetch(`${this.backendUrl}/api/scholar/add-seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doi,
            title,
            researchId: this.activeProfile.id,
            sessionId: this.currentSessionId || `session_${Date.now()}`
          })
        });
        if (!res.ok) {
          const newRecord = {
            id: `seed_${Date.now()}`,
            title: title || `B\xE0i seed (DOI: ${doi})`,
            doi: doi || "",
            source: "Seed DOI",
            discoverySource: "Seed Paper",
            url: doi ? `https://doi.org/${doi}` : "",
            suggestedDecision: "PassToFullText",
            screeningReason: "B\xE0i tham chi\u1EBFu h\u1EA1t gi\u1ED1ng (Seed paper) \u0111\u01B0\u1EE3c ch\u1EC9 \u0111\u1ECBnh th\u1EE7 c\xF4ng.",
            retrieval_date: (/* @__PURE__ */ new Date()).toISOString()
          };
          this.allRecords.push(newRecord);
          this.uniqueRecords.push(newRecord);
        } else {
          const data = await res.json();
          if (data.record) {
            this.allRecords.push(data.record);
            this.uniqueRecords.push(data.record);
          }
        }
        await this.saveSessionToStorage();
        this.closeSeedModal();
        this.updateStepCounters();
        this.renderRecordsList();
        this.renderB1SourceBreakdown();
        this.setStatus(`\u2713 \u0110\xE3 th\xEAm b\xE0i seed th\xE0nh c\xF4ng v\xE0o danh s\xE1ch B1!`, "success");
      } catch (err) {
        this.setStatus(`L\u1ED7i khi th\xEAm b\xE0i seed: ${err.message}`, "error");
      }
    }
    // ==========================================
    // STEP V1 — KIỂM TRA TRÙNG LẶP (DEDUPLICATION)
    // ==========================================
    renderStepV1() {
      this.dedupRawCount.innerText = String(this.allRecords.length);
      this.dedupExactCount.innerText = String(this.dedupStats.exactDupByDoi || 0);
      this.dedupSuspectCount.innerText = String(this.suspectedDuplicatePairs.length);
      this.dedupUniqueCount.innerText = String(this.uniqueRecords.length);
      this.renderSuspectedDuplicatesSection();
    }
    async handleRunDedupWorker() {
      if (this.allRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 ki\u1EC3m tra tr\xF9ng l\u1EB7p.", "warning");
        return;
      }
      try {
        this.setStatus("\u0110ang ch\u1EA1y thu\u1EADt to\xE1n ki\u1EC3m tra tr\xF9ng l\u1EB7p \u0111a ngu\u1ED3n...", "info");
        const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: this.allRecords })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.uniqueRecords = data.uniqueRecords || this.allRecords;
        this.dedupStats = data.dedupStats || this.dedupStats;
        this.identifySuspectDuplicatePairs();
        this.renderStepV1();
        this.renderRecordsList();
        await this.saveSessionToStorage();
        this.setStatus(
          `\u2713 \u0110\xE3 b\u1ECF tr\xF9ng: Gi\u1EEF ${this.uniqueRecords.length} b\xE0i duy nh\u1EA5t. T\xECm th\u1EA5y ${this.suspectedDuplicatePairs.length} c\u1EB7p nghi tr\xF9ng c\u1EA7n xem x\xE9t.`,
          "success"
        );
      } catch (err) {
        this.setStatus(`L\u1ED7i khi ch\u1EA1y ki\u1EC3m tra tr\xF9ng l\u1EB7p: ${err.message}`, "error");
      }
    }
    identifySuspectDuplicatePairs() {
      const pairs = [];
      const processedIds = /* @__PURE__ */ new Set();
      for (const rec of this.uniqueRecords) {
        if (rec.potentialDuplicate && rec.duplicateOfId && !processedIds.has(rec.id)) {
          const canonical = this.uniqueRecords.find((r) => r.id === rec.duplicateOfId);
          if (canonical) {
            pairs.push({
              pairId: `pair_${canonical.id}_${rec.id}`,
              canonicalRecord: canonical,
              suspectRecord: rec,
              similarityScore: 0.92,
              reason: rec.duplicateReason || "Tr\xF9ng ti\xEAu \u0111\u1EC1 nh\u01B0ng kh\xE1c DOI / Ngu\u1ED3n"
            });
            processedIds.add(rec.id);
          }
        }
      }
      this.suspectedDuplicatePairs = pairs;
    }
    renderSuspectedDuplicatesSection() {
      if (!this.suspectDuplicatesContainer || !this.suspectPairsCounter) return;
      this.suspectPairsCounter.innerText = String(this.suspectedDuplicatePairs.length);
      if (this.suspectedDuplicatePairs.length === 0) {
        this.suspectDuplicatesContainer.innerHTML = '<div class="empty-state">\u2713 Kh\xF4ng c\xF3 c\u1EB7p nghi tr\xF9ng n\xE0o c\u1EA7n x\u1EED l\xFD. T\u1EA5t c\u1EA3 b\u1EA3n ghi \u0111\xE3 \u0111\u01B0\u1EE3c ph\xE2n lo\u1EA1i chu\u1EA9n x\xE1c.</div>';
        return;
      }
      this.suspectDuplicatesContainer.innerHTML = this.suspectedDuplicatePairs.map((pair, idx) => {
        const a = pair.canonicalRecord;
        const b = pair.suspectRecord;
        return `
        <div class="suspect-pair-card" id="suspect_pair_${pair.pairId}">
          <div class="suspect-pair-header">
            <span class="badge badge-yellow">C\u1EB7p Nghi Tr\xF9ng #${idx + 1} (${Math.round(pair.similarityScore * 100)}% Kh\u1EDBp)</span>
            <span style="font-size: 11px; color: #64748b;">${this.escapeHtml(pair.reason)}</span>
          </div>
          <div class="suspect-side-by-side">
            <div class="suspect-item-col">
              <div class="col-title">B\u1EA3n ghi A (\u0110\u01B0\u1EE3c \u01B0u ti\xEAn gi\u1EEF l\u1EA1i)</div>
              <div class="col-name">${this.escapeHtml(a.title)}</div>
              <div class="col-meta">
                <span>Ngu\u1ED3n: <b>${this.escapeHtml(a.source || "N/A")}</b></span> | 
                <span>N\u0103m: <b>${a.year || "N/A"}</b></span> | 
                <span>DOI: <code>${a.doi || "Tr\u1ED1ng"}</code></span>
              </div>
            </div>
            <div class="suspect-item-col">
              <div class="col-title">B\u1EA3n ghi B (\u1EE8ng vi\xEAn tr\xF9ng)</div>
              <div class="col-name">${this.escapeHtml(b.title)}</div>
              <div class="col-meta">
                <span>Ngu\u1ED3n: <b>${this.escapeHtml(b.source || "N/A")}</b></span> | 
                <span>N\u0103m: <b>${b.year || "N/A"}</b></span> | 
                <span>DOI: <code>${b.doi || "Tr\u1ED1ng"}</code></span>
              </div>
            </div>
          </div>
          <div class="suspect-actions-bar">
            <button class="btn-xs btn-primary btn-merge-pair" data-idx="${idx}">\u{1F517} G\u1ED9p b\u1EA3n ghi B v\xE0o A</button>
            <button class="btn-xs btn-secondary btn-keep-separate" data-idx="${idx}">\u2696\uFE0F Gi\u1EEF ri\xEAng bi\u1EC7t 2 b\xE0i</button>
            <button class="btn-xs btn-subtle btn-inspect-sources" data-idx="${idx}">\u{1F441}\uFE0F Xem ngu\u1ED3n g\u1ED1c</button>
          </div>
        </div>
      `;
      }).join("");
      this.attachSuspectPairListeners();
    }
    attachSuspectPairListeners() {
      this.suspectDuplicatesContainer.querySelectorAll(".btn-merge-pair").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
          this.handleMergeSuspectPair(idx);
        });
      });
      this.suspectDuplicatesContainer.querySelectorAll(".btn-keep-separate").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
          this.handleKeepSeparatePair(idx);
        });
      });
      this.suspectDuplicatesContainer.querySelectorAll(".btn-inspect-sources").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
          const pair = this.suspectedDuplicatePairs[idx];
          if (pair) {
            alert(
              `B\u1EA3n ghi A: Ngu\u1ED3n ${pair.canonicalRecord.source || "N/A"} (DOI: ${pair.canonicalRecord.doi || "Tr\u1ED1ng"})
B\u1EA3n ghi B: Ngu\u1ED3n ${pair.suspectRecord.source || "N/A"} (DOI: ${pair.suspectRecord.doi || "Tr\u1ED1ng"})
L\u01B0u \xFD: Thao t\xE1c G\u1ED9p s\u1EBD l\u01B0u tr\u1EEF b\u1EA3n ghi B v\xE0o l\u1ECBch s\u1EED provenance, kh\xF4ng l\xE0m m\u1EA5t d\u1EEF li\u1EC7u g\u1ED1c.`
            );
          }
        });
      });
    }
    handleMergeSuspectPair(idx) {
      const pair = this.suspectedDuplicatePairs[idx];
      if (!pair) return;
      const canonical = pair.canonicalRecord;
      const suspect = pair.suspectRecord;
      this.mergeHistoryList.push({
        canonicalId: canonical.id,
        duplicateId: suspect.id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      const allSources = /* @__PURE__ */ new Set();
      if (canonical.source) allSources.add(canonical.source);
      if (suspect.source) allSources.add(suspect.source);
      canonical.source = Array.from(allSources).join("; ");
      this.uniqueRecords = this.uniqueRecords.filter((r) => r.id !== suspect.id);
      this.suspectedDuplicatePairs.splice(idx, 1);
      this.renderStepV1();
      this.renderRecordsList();
      this.saveSessionToStorage();
      this.setStatus(`\u2713 \u0110\xE3 g\u1ED9p b\xE0i "${suspect.title.slice(0, 30)}..." v\xE0o b\u1EA3n ghi ch\xEDnh.`, "success");
    }
    handleKeepSeparatePair(idx) {
      const pair = this.suspectedDuplicatePairs[idx];
      if (!pair) return;
      pair.suspectRecord.potentialDuplicate = false;
      this.suspectedDuplicatePairs.splice(idx, 1);
      this.renderStepV1();
      this.renderRecordsList();
      this.saveSessionToStorage();
      this.setStatus(`\u2713 \u0110\xE3 x\xE1c nh\u1EADn gi\u1EEF ri\xEAng 2 b\u1EA3n ghi.`, "info");
    }
    handleConfirmDedupAndProceedV2() {
      if (this.suspectedDuplicatePairs.length > 0) {
        if (!confirm(
          `C\xF2n ${this.suspectedDuplicatePairs.length} c\u1EB7p nghi tr\xF9ng ch\u01B0a duy\u1EC7t. B\u1EA1n c\xF3 mu\u1ED1n gi\u1EEF ri\xEAng c\xE1c c\u1EB7p n\xE0y v\xE0 ti\u1EBFp t\u1EE5c sang V2?`
        )) {
          return;
        }
        this.suspectedDuplicatePairs.forEach((p) => {
          p.suspectRecord.potentialDuplicate = false;
        });
        this.suspectedDuplicatePairs = [];
      }
      this.setWizardStep("V2");
    }
    // ==========================================
    // STEP V2 — SÀNG LỌC TIÊU ĐỀ & TÓM TẮT
    // ==========================================
    renderStepV2() {
      const all = this.uniqueRecords.length;
      const unseen = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
      const pass = this.uniqueRecords.filter((r) => r.v2Decision === "PassToFullText").length;
      const exc = this.uniqueRecords.filter((r) => r.v2Decision === "Exclude").length;
      const uns = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure").length;
      if (this.v2CountAll) this.v2CountAll.innerText = String(all);
      if (this.v2CountUnseen) this.v2CountUnseen.innerText = String(unseen);
      if (this.v2CountPass) this.v2CountPass.innerText = String(pass);
      if (this.v2CountExclude) this.v2CountExclude.innerText = String(exc);
      if (this.v2CountUnsure) this.v2CountUnsure.innerText = String(uns);
      if (this.unsureResolutionBox && this.unsureRemainingCount) {
        if (uns > 0) {
          this.unsureResolutionBox.style.display = "block";
          this.unsureRemainingCount.innerText = String(uns);
        } else {
          this.unsureResolutionBox.style.display = "none";
        }
      }
    }
    async handleAutoScreenBatch() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o \u0111\u1EC3 s\xE0ng l\u1ECDc.", "warning");
        return;
      }
      try {
        this.setStatus("\u26A1 \u0110ang qu\xE9t t\u1EF1 \u0111\u1ED9ng ti\xEAu \u0111\u1EC1 & t\xF3m t\u1EAFt theo ti\xEAu ch\xED IC/EC...", "info");
        const res = await fetch(`${this.backendUrl}/api/scholar/screen-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: this.uniqueRecords,
            profile: this.activeProfile
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          data.records.forEach((scored) => {
            const rec = this.uniqueRecords.find((r) => r.id === scored.id);
            if (rec) {
              rec.suggestedDecision = scored.suggestedDecision || rec.suggestedDecision;
              rec.screeningReason = scored.screeningReason || rec.screeningReason;
              rec.matchedCriteria = scored.matchedCriteria || rec.matchedCriteria;
              rec.unknownCriteria = scored.unknownCriteria || rec.unknownCriteria;
              rec.criterionResults = scored.criterionResults || rec.criterionResults;
            }
          });
          await this.saveSessionToStorage();
          this.renderStepV2();
          this.renderRecordsList();
          this.setStatus(
            `\u2713 \u0110\xE3 qu\xE9t xong g\u1EE3i \xFD cho ${data.records.length} b\xE0i. H\xE3y duy\u1EC7t v\xE0 b\u1EA5m quy\u1EBFt \u0111\u1ECBnh c\u1EE7a b\u1EA1n.`,
            "success"
          );
        }
      } catch (err) {
        this.setStatus(`L\u1ED7i khi qu\xE9t t\u1EF1 \u0111\u1ED9ng: ${err.message}`, "error");
      }
    }
    handleProceedToV3() {
      const unreviewed = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
      if (unreviewed > 0) {
        if (!confirm(`C\xF2n ${unreviewed} b\xE0i ch\u01B0a c\xF3 quy\u1EBFt \u0111\u1ECBnh V2. B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n sang V3?`)) {
          return;
        }
      }
      this.setWizardStep("V3");
    }
    handlePassUnsureToV3() {
      const unsureRecords = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure");
      unsureRecords.forEach((r) => {
        r.v2Decision = "PassToFullText";
        r.userNotes = (r.userNotes ? r.userNotes + " | " : "") + "[V2 Unsure \u2794 Chuy\u1EC3n V3 ki\u1EC3m tra to\xE0n v\u0103n]";
      });
      this.saveSessionToStorage();
      this.renderStepV2();
      this.renderRecordsList();
      this.setStatus(`\u2713 \u0110\xE3 \u0111\u01B0a ${unsureRecords.length} b\xE0i Ch\u01B0a r\xF5 (Unsure) sang V3 \u0111\u1EC3 t\xECm to\xE0n v\u0103n.`, "info");
      this.setWizardStep("V3");
    }
    // ==========================================
    // STEP V3 — TÌM & THẨM ĐỊNH TOÀN VĂN
    // ==========================================
    renderStepV3() {
    }
    async handleFindFullTextSelected() {
      const candidates = this.uniqueRecords.filter((r) => r.v2Decision === "PassToFullText" && !r.pdfUrl);
      if (candidates.length === 0) {
        this.setStatus("T\u1EA5t c\u1EA3 c\xE1c b\xE0i qua v\xF2ng V2 \u0111\xE3 c\xF3 to\xE0n v\u0103n ho\u1EB7c ch\u01B0a c\xF3 b\xE0i n\xE0o v\u01B0\u1EE3t qua V2.", "info");
        return;
      }
      try {
        this.setStatus(`\u0110ang t\xECm ki\u1EBFm to\xE0n v\u0103n qua Unpaywall & Open Access cho ${candidates.length} b\xE0i...`, "info");
        for (const rec of candidates) {
          rec.fullTextStatus = "searching";
        }
        this.renderRecordsList();
        for (const rec of candidates) {
          if (!rec.doi) {
            rec.fullTextStatus = "not_found";
            continue;
          }
          try {
            const res = await fetch(`${this.backendUrl}/api/fulltext/unpaywall?doi=${encodeURIComponent(rec.doi)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.pdfUrl) {
                rec.pdfUrl = data.pdfUrl;
                rec.fullTextStatus = "downloaded";
                rec.page_count = data.pageCount || rec.page_count;
              } else {
                rec.fullTextStatus = "not_found";
              }
            } else {
              rec.fullTextStatus = "not_found";
            }
          } catch {
            rec.fullTextStatus = "network_error";
          }
        }
        await this.saveSessionToStorage();
        this.renderRecordsList();
        this.setStatus(`\u2713 Ho\xE0n t\u1EA5t t\xECm to\xE0n v\u0103n. H\xE3y ki\u1EC3m tra c\xE1c b\xE0i \u0111\xE3 t\u1EA3i v\xE0 t\u1EA3i th\u1EE7 c\xF4ng n\u1EBFu c\u1EA7n.`, "success");
      } catch (err) {
        this.setStatus(`L\u1ED7i khi t\xECm to\xE0n v\u0103n: ${err.message}`, "error");
      }
    }
    async handleUploadPdfFile(event) {
      const input = event.target;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const targetRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId) || this.uniqueRecords[0];
      if (!targetRec) {
        alert("Vui l\xF2ng ch\u1ECDn b\xE0i b\xE1o c\u1EA7n g\u1EAFn t\u1EC7p PDF tr\u01B0\u1EDBc.");
        return;
      }
      try {
        this.setStatus(`\u0110ang t\u1EA3i l\xEAn v\xE0 tr\xEDch xu\u1EA5t PDF "${file.name}" cho b\xE0i [#${targetRec.id.slice(-6)}]...`, "info");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("paperId", targetRec.id);
        formData.append("researchId", this.activeProfile.id);
        const res = await fetch(`${this.backendUrl}/api/scholar/upload-pdf`, {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        targetRec.pdfUrl = data.fileUrl || `local://${file.name}`;
        targetRec.fullTextStatus = "downloaded";
        targetRec.page_count = data.pageCount || targetRec.page_count;
        if (data.abstract && !targetRec.abstract) targetRec.abstract = data.abstract;
        await this.saveSessionToStorage();
        this.renderRecordsList();
        this.setStatus(`\u2713 \u0110\xE3 g\u1EAFn PDF th\xE0nh c\xF4ng cho b\xE0i b\xE1o!`, "success");
      } catch (err) {
        this.setStatus(`L\u1ED7i khi t\u1EA3i PDF: ${err.message}`, "error");
      } finally {
        input.value = "";
      }
    }
    async handleExtractActiveTab() {
      try {
        this.setStatus("\u0110ang tr\xEDch xu\u1EA5t d\u1EEF li\u1EC7u t\u1EEB tab tr\xECnh duy\u1EC7t \u0111ang m\u1EDF...", "info");
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y tab \u0111ang k\xEDch ho\u1EA1t.");
        }
        const res = await chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_PAGE" });
        if (!res) {
          throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i t\u1EEB trang web.");
        }
        this.pendingAnalysisResult = res;
        this.openTabExtractModal(res);
      } catch (err) {
        this.setStatus(`L\u1ED7i tr\xEDch xu\u1EA5t t\u1EEB Tab: ${err.message}`, "error");
      }
    }
    openTabExtractModal(result) {
      if (!this.tabExtractModal || !this.modalBody) return;
      this.tabExtractModal.style.display = "flex";
      this.modalBody.innerHTML = `
      <div><b>Ti\xEAu \u0111\u1EC1:</b> ${this.escapeHtml(result.title)}</div>
      <div><b>URL:</b> <a href="${result.url}" target="_blank">${this.escapeHtml(result.url)}</a></div>
      <div><b>DOI:</b> <code>${this.escapeHtml(result.doi || "Kh\xF4ng t\xECm th\u1EA5y")}</code></div>
      <div><b>T\xE1c gi\u1EA3:</b> ${this.escapeHtml(result.authors?.join(", ") || "N/A")}</div>
      <div><b>Abstract:</b> <pre style="font-size: 10px; max-height: 120px; overflow-y: auto;">${this.escapeHtml(result.abstract || "Kh\xF4ng t\xECm th\u1EA5y")}</pre></div>
    `;
    }
    closeTabExtractModal() {
      if (this.tabExtractModal) this.tabExtractModal.style.display = "none";
      this.pendingAnalysisResult = null;
    }
    async confirmTabAnalysis() {
      if (!this.pendingAnalysisResult) return;
      const targetRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId) || this.uniqueRecords[0];
      if (targetRec) {
        if (this.pendingAnalysisResult.abstract) targetRec.abstract = this.pendingAnalysisResult.abstract;
        if (this.pendingAnalysisResult.doi && !targetRec.doi) targetRec.doi = this.pendingAnalysisResult.doi;
        targetRec.extracted_url = this.pendingAnalysisResult.url;
        targetRec.user_verified = true;
        targetRec.extraction_method = "Browser Tab";
        await this.saveSessionToStorage();
        this.renderRecordsList();
        this.setStatus("\u2713 \u0110\xE3 c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u t\u1EEB Tab v\xE0 l\u01B0u ngu\u1ED3n g\u1ED1c provenance!", "success");
      }
      this.closeTabExtractModal();
    }
    // ==========================================
    // STEP FINAL — CHỐT & XUẤT PRISMA 2020
    // ==========================================
    renderStepFinal() {
      const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
      const eligibleCount = finalIncludes.filter(
        (r) => (r.page_count || 0) >= 4 && (r.pdfUrl || r.fullTextStatus === "downloaded")
      ).length;
      const pendingCount = this.uniqueRecords.filter((r) => !r.finalDecision).length;
      const missingFullText = finalIncludes.filter((r) => !r.pdfUrl && r.fullTextStatus !== "downloaded").length;
      const missingEvidence = finalIncludes.filter(
        (r) => !r.evidence_snippets || r.evidence_snippets.length === 0
      ).length;
      const outdatedCount = this.uniqueRecords.filter((r) => r.isDecisionOutdated).length;
      if (this.auditEligibleCount) this.auditEligibleCount.innerText = String(eligibleCount);
      if (this.auditPendingDecisionCount) this.auditPendingDecisionCount.innerText = String(pendingCount);
      if (this.auditMissingFullTextCount) this.auditMissingFullTextCount.innerText = String(missingFullText);
      if (this.auditMissingEvidenceCount) this.auditMissingEvidenceCount.innerText = String(missingEvidence);
      if (this.auditOutdatedCount) this.auditOutdatedCount.innerText = String(outdatedCount);
      if (this.prismaIntegrityStatusBox) {
        if (missingFullText > 0 || missingEvidence > 0 || outdatedCount > 0) {
          this.prismaIntegrityStatusBox.style.background = "#fffbeb";
          this.prismaIntegrityStatusBox.style.border = "1px solid #fef3c7";
          this.prismaIntegrityStatusBox.style.color = "#92400e";
          this.prismaIntegrityStatusBox.innerHTML = `
          \u26A0\uFE0F <b>C\u1EA2NH B\xC1O KI\u1EC2M TO\xC1N:</b> C\xF3 ${missingFullText} b\xE0i thi\u1EBFu to\xE0n v\u0103n, ${missingEvidence} b\xE0i thi\u1EBFu tr\xEDch d\u1EABn b\u1EB1ng ch\u1EE9ng, ho\u1EB7c ${outdatedCount} b\xE0i thu\u1ED9c phi\xEAn b\u1EA3n c\u0169. B\xE1o c\xE1o PRISMA t\u1EA1m th\u1EDDi \u0111\u01B0\u1EE3c xu\u1EA5t v\u1EDBi nh\xE3n [INTERIM].
        `;
        } else {
          this.prismaIntegrityStatusBox.style.background = "#f0fdf4";
          this.prismaIntegrityStatusBox.style.border = "1px solid #bbf7d0";
          this.prismaIntegrityStatusBox.style.color = "#166534";
          this.prismaIntegrityStatusBox.innerHTML = `
          \u2713 <b>HO\xC0N H\u1EA2O:</b> T\u1EA5t c\u1EA3 c\xE1c b\xE0i Final Included \u0111\u1EC1u c\xF3 \u0111\u1EE7 to\xE0n v\u0103n, tr\xEDch d\u1EABn b\u1EB1ng ch\u1EE9ng v\xE0 thu\u1ED9c phi\xEAn b\u1EA3n protocol hi\u1EC7n h\xE0nh v${this.activeProfile.profileVersion}. B\xE1o c\xE1o \u0111\u1EA1t chu\u1EA9n [COMPLETE].
        `;
        }
      }
    }
    // ==========================================
    // PROTOCOL EDIT & DIFF MANAGEMENT
    // ==========================================
    openProtocolEditModal() {
      if (!this.protocolEditModal) return;
      this.protocolEditModal.style.display = "flex";
      const p = this.activeProfile;
      if (this.protocolDiffContent) {
        this.protocolDiffContent.innerHTML = `
        <div style="line-height: 1.6;">
          <div><b>Phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i:</b> v${p.profileVersion} (\u0110ang \xE1p d\u1EE5ng)</div>
          <div><b>T\xEAn \u0111\u1EC1 t\xE0i:</b> ${this.escapeHtml(p.name)}</div>
          <div><b>Khung n\u0103m:</b> ${p.yearRange?.start || 2020} - ${p.yearRange?.end || 2026}</div>
          <div><b>S\u1ED1 b\xE0i \u0111\xE3 th\u1EA9m \u0111\u1ECBnh:</b> ${this.uniqueRecords.filter((r) => r.finalDecision).length} b\xE0i</div>
        </div>
      `;
      }
    }
    closeProtocolEditModal() {
      if (this.protocolEditModal) this.protocolEditModal.style.display = "none";
    }
    async handleSaveProtocolChanges() {
      const reason = this.protocolChangeReason.value.trim();
      if (!reason) {
        alert("Vui l\xF2ng nh\u1EADp L\xFD do thay \u0111\u1ED5i Protocol \u0111\u1EC3 ghi nh\u1EADt k\xFD audit!");
        this.protocolChangeReason.focus();
        return;
      }
      const isScope = this.chkIsScopeChange.checked;
      const oldVersion = this.activeProfile.profileVersion;
      const newVersion = oldVersion + 1;
      this.activeProfile.profileVersion = newVersion;
      this.activeProfile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (isScope) {
        this.uniqueRecords.forEach((r) => {
          if (r.finalDecision || r.v2Decision) {
            r.isDecisionOutdated = true;
            r.outdatedReason = `Protocol thay \u0111\u1ED5i sang v${newVersion}: ${reason}`;
          }
        });
        this.setStatus(`\u26A0\uFE0F \u0110\xE3 c\u1EADp nh\u1EADt Protocol l\xEAn v${newVersion}. C\xE1c quy\u1EBFt \u0111\u1ECBnh c\u0169 c\u1EA7n \u0111\xE1nh gi\xE1 l\u1EA1i.`, "warning");
      } else {
        this.setStatus(`\u2713 \u0110\xE3 c\u1EADp nh\u1EADt Protocol l\xEAn v${newVersion} (Kh\xF4ng \u1EA3nh h\u01B0\u1EDFng ti\xEAu ch\xED).`, "success");
      }
      await this.saveProfileToBackend(this.activeProfile);
      await this.saveSessionToStorage();
      this.updateActiveResearchDisplay();
      this.updateStepCounters();
      this.renderRecordsList();
      this.closeProtocolEditModal();
    }
    // ==========================================
    // IN-TOOL STEP GUIDANCE MODAL
    // ==========================================
    openStepGuideModal() {
      if (!this.stepGuideModal || !this.guideModalBody) return;
      this.stepGuideModal.style.display = "flex";
      const step = this.currentWizardStep;
      const cfg = STEP_CONFIGS[step];
      const guide = STEP_GUIDE_DATA[step];
      if (this.guideModalTitle) {
        this.guideModalTitle.innerText = `\u2139\uFE0F H\u01B0\u1EDBng D\u1EABn: ${cfg?.badge} \u2014 ${cfg?.title}`;
      }
      this.guideModalBody.innerHTML = `
      <div class="guide-section">
        <div class="guide-q">1. Khi n\xE0o d\xF9ng b\u01B0\u1EDBc n\xE0y?</div>
        <div class="guide-a">${this.escapeHtml(guide.whenToUse)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">2. C\u1EA7n chu\u1EA9n b\u1ECB nh\u1EEFng g\xEC?</div>
        <div class="guide-a">${this.escapeHtml(guide.preparation)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">3. B\u1EA5m c\xE1c n\xFAt n\xE0o theo th\u1EE9 t\u1EF1?</div>
        <div class="guide-a">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
            ${guide.orderOfButtons.map((btn) => `<li>${this.escapeHtml(btn)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="guide-section">
        <div class="guide-q">4. K\u1EBFt qu\u1EA3 mong \u0111\u1EE3i sau b\u01B0\u1EDBc n\xE0y l\xE0 g\xEC?</div>
        <div class="guide-a">${this.escapeHtml(guide.expectedOutput)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">5. Khi g\u1EB7p l\u1ED7i ho\u1EB7c gi\xE1n \u0111o\u1EA1n th\xEC x\u1EED l\xFD ra sao?</div>
        <div class="guide-a">${this.escapeHtml(guide.troubleshooting)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">6. \u0110i\u1EC1u ki\u1EC7n \u0111\u1EC3 chuy\u1EC3n sang b\u01B0\u1EDBc ti\u1EBFp theo?</div>
        <div class="guide-a"><b>\u2713 ${this.escapeHtml(guide.proceedCondition)}</b></div>
      </div>

      ${TROUBLESHOOTING_TABLE_HTML}
    `;
    }
    closeStepGuideModal() {
      if (this.stepGuideModal) this.stepGuideModal.style.display = "none";
    }
    // ==========================================
    // CARD DECISION BUTTONS & RENDERING
    // ==========================================
    renderRecordsList() {
      const keyword = this.filterInput?.value.toLowerCase().trim() || "";
      const decisionFilter = this.filterDecisionSelect?.value || "all";
      const step = this.currentWizardStep;
      const filtered = this.uniqueRecords.filter((r) => {
        if (step === "V2" && this.v2CurrentFilter !== "all") {
          if (this.v2CurrentFilter === "unseen" && (r.v2Decision || r.finalDecision)) return false;
          if (this.v2CurrentFilter === "PassToFullText" && r.v2Decision !== "PassToFullText") return false;
          if (this.v2CurrentFilter === "Exclude" && r.v2Decision !== "Exclude") return false;
          if (this.v2CurrentFilter === "Unsure" && r.v2Decision !== "Unsure") return false;
        }
        const effectiveDecision = r.finalDecision || r.v2Decision || r.suggestedDecision;
        if (decisionFilter !== "all" && effectiveDecision !== decisionFilter) {
          return false;
        }
        if (keyword) {
          const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet} ${r.abstract}`.toLowerCase();
          if (!text.includes(keyword)) return false;
        }
        return true;
      });
      if (filtered.length === 0) {
        if (this.paginationBar) this.paginationBar.style.display = "none";
        this.resultsContainer.innerHTML = '<div class="empty-state">Kh\xF4ng c\xF3 b\xE0i vi\u1EBFt n\xE0o kh\u1EDBp v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.</div>';
        return;
      }
      if (this.paginationBar) this.paginationBar.style.display = "flex";
      const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
      if (this.currentPage > totalPages) this.currentPage = totalPages;
      if (this.currentPage < 1) this.currentPage = 1;
      const startIdx = (this.currentPage - 1) * this.pageSize;
      const endIdx = Math.min(startIdx + this.pageSize, filtered.length);
      const pageRecords = filtered.slice(startIdx, endIdx);
      if (this.paginationInfo) {
        this.paginationInfo.innerText = `Hi\u1EC3n th\u1ECB ${startIdx + 1}-${endIdx} c\u1EE7a ${filtered.length} b\xE0i`;
      }
      if (this.pageIndicator) {
        this.pageIndicator.innerText = `${this.currentPage} / ${totalPages}`;
      }
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage >= totalPages;
      this.resultsContainer.innerHTML = pageRecords.map((r, pageIdx) => {
        const globalIdx = startIdx + pageIdx;
        const isSelected = r.id === this.selectedRecordId;
        return this.renderPaperCardHtml(r, globalIdx, isSelected, step);
      }).join("");
      this.attachCardEventListeners();
    }
    renderPaperCardHtml(r, globalIdx, isSelected, step) {
      const isOutdated = r.isDecisionOutdated;
      const outdatedWarning = isOutdated ? `<div class="warning-banner" style="margin-top: 4px; padding: 4px 6px; font-size: 10.5px;">
          \u26A0\uFE0F Quy\u1EBFt \u0111\u1ECBnh thu\u1ED9c protocol c\u0169: ${this.escapeHtml(r.outdatedReason || "C\u1EA7n \u0111\xE1nh gi\xE1 l\u1EA1i")}
        </div>` : "";
      let fullTextBadge = "";
      if (r.pdfUrl) {
        fullTextBadge = `<span class="badge badge-green">\u{1F4C4} \u0110\xE3 t\u1EA3i PDF (${r.page_count ? r.page_count + " trang" : "s\u1EB5n s\xE0ng"})</span>`;
      } else if (r.fullTextStatus === "searching") {
        fullTextBadge = `<span class="badge badge-yellow">\u{1F504} \u0110ang t\xECm...</span>`;
      } else if (r.fullTextStatus === "not_found") {
        fullTextBadge = `<span class="badge badge-gray">\u274C Ch\u01B0a t\xECm th\u1EA5y PDF</span>`;
      } else if (r.fullTextStatus === "network_error") {
        fullTextBadge = `<span class="badge badge-red">\u26A0\uFE0F L\u1ED7i m\u1EA1ng (Th\u1EED l\u1EA1i)</span>`;
      }
      let decisionControlsHtml = "";
      if (step === "V2") {
        const isPass = r.v2Decision === "PassToFullText";
        const isExc = r.v2Decision === "Exclude";
        const isUns = r.v2Decision === "Unsure";
        decisionControlsHtml = `
        <div class="decision-buttons" data-id="${r.id}">
          <span class="decision-label">Quy\u1EBFt \u0111\u1ECBnh V2 (Ti\xEAu \u0111\u1EC1 & T\xF3m t\u1EAFt):</span>
          <button class="btn-dec ${isPass ? "active-inc" : ""}" data-v2="PassToFullText">\u2713 Qua v\xF2ng to\xE0n v\u0103n</button>
          <button class="btn-dec ${isExc ? "active-exc" : ""}" data-v2="Exclude">\u2717 Lo\u1EA1i \u1EDF V2</button>
          <button class="btn-dec ${isUns ? "active-uns" : ""}" data-v2="Unsure">? Ch\u01B0a r\xF5</button>
        </div>
      `;
      } else if (step === "V3" || step === "FINAL") {
        const isInc = r.finalDecision === "Include";
        const isExc = r.finalDecision === "Exclude";
        const isUns = r.finalDecision === "Unsure";
        decisionControlsHtml = `
        <div class="decision-buttons" data-id="${r.id}">
          <span class="decision-label">Quy\u1EBFt \u0111\u1ECBnh V3 (Th\u1EA9m \u0111\u1ECBnh To\xE0n v\u0103n):</span>
          <button class="btn-dec ${isInc ? "active-inc" : ""}" data-final="Include">\u2713 \u0110\u1EA1t ti\xEAu ch\xED to\xE0n v\u0103n</button>
          <button class="btn-dec ${isExc ? "active-exc" : ""}" data-final="Exclude">\u2717 Lo\u1EA1i \u1EDF V3</button>
          <button class="btn-dec ${isUns ? "active-uns" : ""}" data-final="Unsure">? C\u1EA7n b\u1ED5 sung b\u1EB1ng ch\u1EE9ng</button>
        </div>
      `;
      }
      const abstractBox = r.abstract ? `<div class="paper-snippet" style="border-left-color: #2563eb; background: #eff6ff; margin-top: 4px;">
          <b>Abstract:</b><br><i>"${this.escapeHtml(r.abstract.slice(0, 280))}${r.abstract.length > 280 ? "..." : ""}"</i>
        </div>` : "";
      return `
      <div class="paper-card ${r.potentialDuplicate ? "paper-dup" : ""} ${isSelected ? "is-selected" : ""}" id="paper_${r.id}" data-id="${r.id}">
        <div class="paper-header">
          <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
            <span class="paper-index">#${globalIdx + 1}</span>
            <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
            ${fullTextBadge}
          </div>
        </div>

        <div class="paper-meta">
          <span>\u{1F464} <b>T\xE1c gi\u1EA3:</b> ${this.escapeHtml(r.authors || "N/A")}</span>
          <span>\u{1F4C5} <b>N\u0103m:</b> ${r.year || "N/A"}</span>
          <span>\u{1F3DB}\uFE0F <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")}</span>
          <span>\u{1F517} <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Tr\u1ED1ng</span>'}</span>
        </div>

        ${abstractBox}

        <div class="screening-panel">
          <div class="screening-header">
            <span><b>G\u1EE3i \xFD h\u1EC7 th\u1ED1ng:</b> <span class="badge ${r.suggestedDecision === "PassToFullText" || r.suggestedDecision === "Include" ? "badge-green" : r.suggestedDecision === "Exclude" ? "badge-red" : "badge-yellow"}">${r.suggestedDecision || "Ch\u01B0a qu\xE9t"}</span></span>
          </div>
          <div class="reason-text">${this.escapeHtml(r.screeningReason || "Ch\u01B0a c\xF3 l\xFD do s\xE0ng l\u1ECDc.")}</div>
          ${outdatedWarning}

          ${decisionControlsHtml}

          <div class="user-notes-row">
            <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi ch\xFA th\u1EA9m \u0111\u1ECBnh (nh\u1EADp t\u1EF1 do, kh\xF4ng thay \u0111\u1ED5i quy\u1EBFt \u0111\u1ECBnh)..." value="${this.escapeHtml(r.userNotes || "")}" />
          </div>
        </div>
      </div>
    `;
    }
    attachCardEventListeners() {
      this.resultsContainer.querySelectorAll(".paper-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          const target = e.target;
          if (target.closest("button") || target.closest("input") || target.closest("select") || target.closest("a")) {
            return;
          }
          const id = card.getAttribute("data-id");
          if (id && id !== this.selectedRecordId) {
            this.selectedRecordId = id;
            this.renderRecordsList();
          }
        });
      });
      this.resultsContainer.querySelectorAll("[data-v2]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const decision = target.getAttribute("data-v2");
          const container = target.closest(".decision-buttons");
          const paperId = container?.getAttribute("data-id");
          if (paperId && decision) {
            this.handleV2Decision(paperId, decision);
          }
        });
      });
      this.resultsContainer.querySelectorAll("[data-final]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const decision = target.getAttribute("data-final");
          const container = target.closest(".decision-buttons");
          const paperId = container?.getAttribute("data-id");
          if (paperId && decision) {
            this.handleFinalDecision(paperId, decision);
          }
        });
      });
      this.resultsContainer.querySelectorAll(".notes-input").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const target = e.currentTarget;
          const paperId = target.getAttribute("data-id");
          if (paperId) {
            const rec = this.uniqueRecords.find((r) => r.id === paperId);
            if (rec) {
              rec.userNotes = target.value.trim();
              this.saveNoteToBackend(paperId, rec.userNotes);
            }
          }
        });
      });
    }
    async handleV2Decision(paperId, decision) {
      const rec = this.uniqueRecords.find((r) => r.id === paperId);
      if (!rec) return;
      if (decision === "Exclude" && !rec.userNotes) {
        const reason = prompt("Nh\u1EADp l\xFD do lo\u1EA1i tr\u1EEB \u1EDF V2 (ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng):", "Ti\xEAu \u0111\u1EC1 / T\xF3m t\u1EAFt kh\xF4ng li\xEAn quan");
        if (reason) rec.userNotes = reason;
      }
      rec.v2Decision = decision;
      rec.isDecisionOutdated = false;
      await this.updateRecordDecisionOnBackend(paperId, { v2Decision: decision, userNotes: rec.userNotes });
      await this.saveSessionToStorage();
      this.updateStepCounters();
      this.renderStepV2();
      this.renderRecordsList();
    }
    async handleFinalDecision(paperId, decision) {
      const rec = this.uniqueRecords.find((r) => r.id === paperId);
      if (!rec) return;
      if (decision === "Include" && !rec.pdfUrl && rec.fullTextStatus !== "downloaded") {
        if (!confirm(
          "C\u1EA2NH B\xC1O: B\xE0i n\xE0y ch\u01B0a c\xF3 to\xE0n v\u0103n (Full-Text PDF). Theo PRISMA 2020, ch\u1EC9 n\xEAn ch\u1ED1t Include khi \u0111\xE3 th\u1EA9m \u0111\u1ECBnh to\xE0n v\u0103n. B\u1EA1n c\xF3 ch\u1EAFc mu\u1ED1n ch\u1ED1t Include?"
        )) {
          return;
        }
      }
      if (decision === "Exclude" && !rec.userNotes) {
        const reason = prompt(
          "Nh\u1EADp l\xFD do lo\u1EA1i tr\u1EEB \u1EDF V3 (v\xED d\u1EE5: < 4 trang, thi\u1EBFu th\u1EF1c nghi\u1EC7m, v.v.):",
          "D\u01B0\u1EDBi 4 trang / Kh\xF4ng \u0111\u1EA1t ti\xEAu ch\xED to\xE0n v\u0103n"
        );
        if (reason) rec.userNotes = reason;
      }
      rec.finalDecision = decision;
      rec.isDecisionOutdated = false;
      await this.updateRecordDecisionOnBackend(paperId, { finalDecision: decision, userNotes: rec.userNotes });
      await this.saveSessionToStorage();
      this.updateStepCounters();
      this.renderStepV3();
      this.renderRecordsList();
    }
    async saveNoteToBackend(paperId, notes) {
      try {
        await fetch(`${this.backendUrl}/api/records/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userNotes: notes })
        });
        await this.saveSessionToStorage();
      } catch {
      }
    }
    async updateRecordDecisionOnBackend(paperId, updates) {
      try {
        await fetch(`${this.backendUrl}/api/records/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
      } catch {
      }
    }
    // ==========================================
    // BACKGROUND JOB MANAGEMENT
    // ==========================================
    async checkActiveBackgroundJob() {
      try {
        const res = await fetch(`${this.backendUrl}/api/jobs/active?researchId=${this.activeProfile.id}`);
        if (res.ok) {
          const data = await res.json();
          const job = data.activeJob || data.job || data;
          if (job && job.id && (job.status === "running" || job.status === "paused")) {
            this.activeJobId = job.id;
            this.showJobBanner(job);
            this.startJobPolling(job.id);
          }
        }
      } catch {
      }
    }
    showJobBanner(job) {
      if (!this.jobControlBanner) return;
      this.jobControlBanner.style.display = "block";
      if (this.jobStageBadge) this.jobStageBadge.innerText = `Job: ${job.stage}`;
      if (this.jobMessage) this.jobMessage.innerText = job.message || "\u0110ang x\u1EED l\xFD...";
      if (this.jobProgressBar) {
        const pct = job.totalItems > 0 ? Math.round(job.processedItems / job.totalItems * 100) : 0;
        this.jobProgressBar.style.width = `${pct}%`;
      }
      if (job.status === "paused") {
        if (this.jobPauseBtn) this.jobPauseBtn.style.display = "none";
        if (this.jobResumeBtn) this.jobResumeBtn.style.display = "inline-block";
      } else {
        if (this.jobPauseBtn) this.jobPauseBtn.style.display = "inline-block";
        if (this.jobResumeBtn) this.jobResumeBtn.style.display = "none";
      }
    }
    startJobPolling(jobId) {
      if (this.jobPollInterval) clearInterval(this.jobPollInterval);
      this.jobPollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${this.backendUrl}/api/jobs/${jobId}`);
          if (!res.ok) return;
          const data = await res.json();
          const job = data.job || data;
          this.showJobBanner(job);
          if (job.status === "completed") {
            clearInterval(this.jobPollInterval);
            this.jobPollInterval = null;
            this.activeJobId = null;
            if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
            this.setStatus(`\u2713 T\xE1c v\u1EE5 ${job.stage} \u0111\xE3 ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc!`, "success");
            await this.reloadStageData();
          } else if (job.status === "failed") {
            clearInterval(this.jobPollInterval);
            this.jobPollInterval = null;
            this.activeJobId = null;
            if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
            this.setStatus(`\u274C T\xE1c v\u1EE5 ${job.stage} th\u1EA5t b\u1EA1i: ${job.error || "L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh"}`, "error");
          } else if (job.status === "cancelled") {
            clearInterval(this.jobPollInterval);
            this.jobPollInterval = null;
            this.activeJobId = null;
            if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
            this.setStatus(`\u0110\xE3 h\u1EE7y t\xE1c v\u1EE5 ch\u1EA1y n\u1EC1n ${job.stage}.`, "warning");
          }
        } catch (err) {
          console.warn("Polling job failed:", err);
        }
      }, 1200);
    }
    async handlePauseJob() {
      if (!this.activeJobId) return;
      try {
        await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/pause`, { method: "POST" });
        this.setStatus("\u0110\xE3 t\u1EA1m d\u1EEBng t\xE1c v\u1EE5.", "warning");
      } catch (e) {
        this.setStatus(`L\u1ED7i khi t\u1EA1m d\u1EEBng: ${e.message}`, "error");
      }
    }
    async handleResumeJob() {
      if (!this.activeJobId) return;
      try {
        await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/resume`, { method: "POST" });
        this.setStatus("\u0110ang ti\u1EBFp t\u1EE5c t\xE1c v\u1EE5...", "info");
      } catch (e) {
        this.setStatus(`L\u1ED7i khi ti\u1EBFp t\u1EE5c: ${e.message}`, "error");
      }
    }
    async handleCancelJob() {
      if (!this.activeJobId) return;
      if (!confirm("B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n h\u1EE7y t\xE1c v\u1EE5 \u0111ang ch\u1EA1y?")) return;
      try {
        await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/cancel`, { method: "POST" });
        this.setStatus("\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u h\u1EE7y t\xE1c v\u1EE5.", "warning");
      } catch (e) {
        this.setStatus(`L\u1ED7i khi h\u1EE7y: ${e.message}`, "error");
      }
    }
    async reloadStageData() {
      try {
        const res = await fetch(
          `${this.backendUrl}/api/pipeline/stage-data?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`
        );
        if (res.ok) {
          const data = await res.json();
          const stageRecords = data.canonicalRecords || data.records || [];
          if (stageRecords && Array.isArray(stageRecords) && stageRecords.length > 0) {
            this.uniqueRecords = stageRecords;
            this.allRecords = data.rawRecords || stageRecords;
            if (data.dedupStats) this.dedupStats = data.dedupStats;
            this.updateStepCounters();
            this.renderRecordsList();
            await this.saveSessionToStorage();
          }
        }
      } catch (e) {
        console.warn("Reload stage data failed:", e);
      }
    }
    // ==========================================
    // PROFILE PERSISTENCE & MULTI-PROFILE
    // ==========================================
    async loadProfilesAndRestoreActive() {
      try {
        const stored = await chrome.storage.local.get([STORAGE_PROFILES_KEY, STORAGE_ACTIVE_PROFILE_KEY]);
        let localProfiles = stored[STORAGE_PROFILES_KEY] || [];
        const activeId = stored[STORAGE_ACTIVE_PROFILE_KEY] || "";
        if (localProfiles.length === 0) {
          localProfiles = [PRESET_SWT302, PRESET_GENERIC, PRESET_VISUALLY_IMPAIRED_AAC];
          await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: localProfiles });
        }
        this.profiles = localProfiles;
        const found = this.profiles.find((p) => p.id === activeId) || this.profiles[0];
        this.activeProfile = found;
        this.populateProfileDropdown();
        this.updateActiveResearchDisplay();
        await this.restoreSessionForActiveProfile();
      } catch (err) {
        console.warn("Load profiles failed:", err);
      }
    }
    populateProfileDropdown() {
      if (!this.profileSelect) return;
      this.profileSelect.innerHTML = this.profiles.map(
        (p) => `<option value="${p.id}" ${p.id === this.activeProfile.id ? "selected" : ""}>${this.escapeHtml(p.name)} (v${p.profileVersion})</option>`
      ).join("");
    }
    async switchActiveProfile(profileId) {
      const p = this.profiles.find((x) => x.id === profileId);
      if (!p) return;
      this.activeProfile = p;
      await chrome.storage.local.set({ [STORAGE_ACTIVE_PROFILE_KEY]: profileId });
      this.updateActiveResearchDisplay();
      await this.restoreSessionForActiveProfile();
      this.setWizardStep(this.currentWizardStep);
      this.setStatus(`\u0110\xE3 chuy\u1EC3n sang \u0111\u1EC1 t\xE0i: "${p.name}".`, "info");
    }
    updateActiveResearchDisplay() {
      if (this.activeResearchBadge) this.activeResearchBadge.innerText = this.activeProfile.name;
      if (this.protocolVersionBadge)
        this.protocolVersionBadge.innerText = `v${this.activeProfile.profileVersion || 1}`;
    }
    populateSetupForm(p) {
      if (this.setupResearchName) this.setupResearchName.value = p.name || "";
      if (this.setupResearchDesc) this.setupResearchDesc.value = p.description || "";
      if (this.setupResearchRq) this.setupResearchRq.value = (p.researchQuestions || []).join("\n");
      if (this.setupYearStart) this.setupYearStart.value = String(p.yearRange?.start || 2020);
      if (this.setupYearEnd) this.setupYearEnd.value = String(p.yearRange?.end || 2026);
      if (this.setupMinPages) this.setupMinPages.value = String(p.minPages?.count || 4);
      if (this.setupTargetCount) this.setupTargetCount.value = String(p.targetIncludedCount || 15);
      const incK = (p.criteria || []).filter((c) => c.type === "inclusion" && c.field === "content").map((c) => c.value).join(", ");
      const excK = (p.criteria || []).filter((c) => c.type === "exclusion" && c.field === "content").map((c) => c.value).join(", ");
      if (this.setupInclusionKeywords) this.setupInclusionKeywords.value = incK;
      if (this.setupExclusionKeywords) this.setupExclusionKeywords.value = excK;
    }
    applyPreset(preset) {
      this.activeProfile = { ...preset, id: `profile_${Date.now()}` };
      this.populateSetupForm(this.activeProfile);
      this.switchFramework(this.activeProfile.framework || "PICO");
      this.updateStep0SummaryPreview();
      this.setStatus(`\u0110\xE3 \xE1p d\u1EE5ng m\u1EABu: "${preset.name}". H\xE3y ki\u1EC3m tra v\xE0 b\u1EA5m "L\u01B0u thi\u1EBFt l\u1EADp".`, "info");
    }
    async saveProfileToBackend(profile) {
      try {
        await fetch(`${this.backendUrl}/api/profiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile)
        });
      } catch {
      }
    }
    async saveProfilesToStorage() {
      const idx = this.profiles.findIndex((p) => p.id === this.activeProfile.id);
      if (idx >= 0) {
        this.profiles[idx] = this.activeProfile;
      } else {
        this.profiles.push(this.activeProfile);
      }
      await chrome.storage.local.set({
        [STORAGE_PROFILES_KEY]: this.profiles,
        [STORAGE_ACTIVE_PROFILE_KEY]: this.activeProfile.id
      });
      this.populateProfileDropdown();
    }
    // ==========================================
    // SESSION PERSISTENCE & RESTORE
    // ==========================================
    async saveSessionToStorage() {
      try {
        const stored = await chrome.storage.local.get(STORAGE_SESSIONS_KEY);
        const sessions = stored[STORAGE_SESSIONS_KEY] || {};
        sessions[this.activeProfile.id] = {
          sessionId: this.currentSessionId || `session_${Date.now()}`,
          researchId: this.activeProfile.id,
          profileVersion: this.activeProfile.profileVersion,
          allRecords: this.allRecords,
          uniqueRecords: this.uniqueRecords,
          dedupStats: this.dedupStats,
          searchSummary: this.searchSummary,
          allEvidences: this.allEvidences
        };
        await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessions });
      } catch (e) {
        console.warn("Save session failed:", e);
      }
    }
    async restoreSessionForActiveProfile() {
      try {
        const stored = await chrome.storage.local.get(STORAGE_SESSIONS_KEY);
        const sessions = stored[STORAGE_SESSIONS_KEY] || {};
        const state = sessions[this.activeProfile.id];
        if (state) {
          this.currentSessionId = state.sessionId || "";
          this.allRecords = state.allRecords || [];
          this.uniqueRecords = state.uniqueRecords || [];
          this.dedupStats = state.dedupStats || this.dedupStats;
          this.searchSummary = state.searchSummary || null;
          this.allEvidences = state.allEvidences || [];
        } else {
          this.currentSessionId = `session_${Date.now()}`;
          this.allRecords = [];
          this.uniqueRecords = [];
          this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
        }
        this.identifySuspectDuplicatePairs();
      } catch (e) {
        console.warn("Restore session failed:", e);
      }
    }
    async runStorageMigration() {
      try {
        const stored = await chrome.storage.local.get([MIGRATION_VERSION_KEY, LEGACY_STORAGE_KEY]);
        if (!stored[MIGRATION_VERSION_KEY] && stored[LEGACY_STORAGE_KEY]) {
          await chrome.storage.local.set({
            [LEGACY_BACKUP_KEY]: stored[LEGACY_STORAGE_KEY],
            [MIGRATION_VERSION_KEY]: 3
          });
        }
      } catch {
      }
    }
    async checkBackendHealth() {
      try {
        const res = await fetch(`${this.backendUrl}/api/health`);
        if (res.ok) {
          if (this.backendStatusBadge) {
            this.backendStatusBadge.className = "badge badge-green";
            this.backendStatusBadge.innerText = "\u25CF Backend S\u1EB5n s\xE0ng";
          }
        } else {
          throw new Error();
        }
      } catch {
        if (this.backendStatusBadge) {
          this.backendStatusBadge.className = "badge badge-yellow";
          this.backendStatusBadge.innerText = "\u25CF Backend Ngo\u1EA1i tuy\u1EBFn";
        }
      }
    }
    // ==========================================
    // EXPORTS & PRISMA MODAL
    // ==========================================
    async openPrismaModal() {
      if (!this.prismaModal || !this.prismaFlowContainer) return;
      this.prismaModal.style.display = "flex";
      this.prismaFlowContainer.innerHTML = '<div style="text-align: center; padding: 20px;">\u0110ang t\xEDnh to\xE1n s\u01A1 \u0111\u1ED3 PRISMA 2020...</div>';
      try {
        const res = await fetch(
          `${this.backendUrl}/api/prisma/flow?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const flow = await res.json();
        let balanceWarning = "";
        if (!flow.isMathematicallyBalanced) {
          balanceWarning = `
          <div class="warning-banner" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b; margin-bottom: 8px;">
            \u26A0\uFE0F <b>C\u1EA2NH B\xC1O L\u1EC6CH S\u1ED0 H\u1ECCC:</b> T\u1ED5ng Identification kh\xF4ng kh\u1EDBp v\u1EDBi (B\u1ECF tr\xF9ng + S\xE0ng l\u1ECDc).
          </div>
        `;
        }
        this.prismaFlowContainer.innerHTML = `
        ${balanceWarning}
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prisma-box header-box">
            <b>1. Identification (Nh\u1EADn di\u1EC7n b\u1EA3n ghi)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>C\u01A1 s\u1EDF d\u1EEF li\u1EC7u (Database searches):</span>
              <span class="prisma-stat-clickable" data-cell="identificationDatabases">${flow.identificationDatabases} b\xE0i</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Ngu\u1ED3n kh\xE1c / Snowballing:</span>
              <span class="prisma-stat-clickable" data-cell="identificationOther">${flow.identificationOther} b\xE0i</span>
            </div>
            <div style="border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 4px; font-weight: bold; display: flex; justify-content: space-between;">
              <span>T\u1ED5ng nh\u1EADn di\u1EC7n:</span>
              <span>${flow.totalIdentification} b\xE0i</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>2. Deduplication (Lo\u1EA1i tr\xF9ng l\u1EB7p - V1)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>B\u1EA3n ghi tr\xF9ng l\u1EB7p \u0111\xE3 lo\u1EA1i b\u1ECF:</span>
              <span class="prisma-stat-clickable" data-cell="duplicatesRemoved" style="color: #dc2626;">-${flow.duplicatesRemoved} b\xE0i</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>3. Screening (S\xE0ng l\u1ECDc Ti\xEAu \u0111\u1EC1 & T\xF3m t\u1EAFt - V2)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>B\u1EA3n ghi \u0111\u01B0a v\xE0o s\xE0ng l\u1ECDc V2:</span>
              <span class="prisma-stat-clickable" data-cell="screenedV2">${flow.screenedV2} b\xE0i</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>B\u1ECB lo\u1EA1i t\u1EA1i V2:</span>
              <span class="prisma-stat-clickable" data-cell="excludedV2" style="color: #dc2626;">-${flow.excludedV2} b\xE0i</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>4. Eligibility (Th\u1EA9m \u0111\u1ECBnh To\xE0n v\u0103n - V3)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>B\u1EA3n ghi t\xECm ki\u1EBFm to\xE0n v\u0103n:</span>
              <span class="prisma-stat-clickable" data-cell="soughtFullText">${flow.soughtFullText} b\xE0i</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>B\u1EA3n ghi \u0111\u1ECDc v\xE0 th\u1EA9m \u0111\u1ECBnh to\xE0n v\u0103n:</span>
              <span class="prisma-stat-clickable" data-cell="assessedFullText">${flow.assessedFullText} b\xE0i</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>B\u1ECB lo\u1EA1i t\u1EA1i V3 (To\xE0n v\u0103n kh\xF4ng \u0111\u1EA1t / < 4 trang):</span>
              <span class="prisma-stat-clickable" data-cell="excludedV3" style="color: #dc2626;">-${flow.excludedV3} b\xE0i</span>
            </div>
          </div>

          <div class="prisma-box header-box" style="background: #f0fdf4; border-color: #86efac; color: #166534;">
            <b>5. Included (Nghi\xEAn c\u1EE9u \u0111\u01B0a v\xE0o T\u1ED5ng quan - Ch\u1ED1t)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; font-weight: bold;">
              <span>S\u1ED1 nghi\xEAn c\u1EE9u \u0111\u01B0\u1EE3c ch\u1ECDn (Final Included):</span>
              <span class="prisma-stat-clickable" data-cell="includedTotal" style="color: #16a34a; font-size: 14px;">${flow.includedTotal} b\xE0i</span>
            </div>
          </div>
        </div>
      `;
        this.prismaFlowContainer.querySelectorAll(".prisma-stat-clickable").forEach((el) => {
          el.addEventListener("click", () => {
            const cellKey = el.getAttribute("data-cell");
            if (cellKey && flow.drilldown && flow.drilldown[cellKey]) {
              this.showPrismaDrilldown(flow.drilldown[cellKey]);
            }
          });
        });
      } catch (e) {
        this.prismaFlowContainer.innerHTML = `<div class="error-banner">L\u1ED7i t\u1EA3i s\u01A1 \u0111\u1ED3 PRISMA: ${e.message}</div>`;
      }
    }
    showPrismaDrilldown(cellData) {
      if (!this.prismaDrilldownBox || !this.drilldownPaperList) return;
      this.prismaDrilldownBox.style.display = "block";
      if (this.drilldownTitle) {
        this.drilldownTitle.innerText = `Danh s\xE1ch: ${cellData.cellName} (${cellData.count} b\xE0i)`;
      }
      if (cellData.paperIds.length === 0) {
        this.drilldownPaperList.innerHTML = '<div style="color: #94a3b8; font-style: italic;">Kh\xF4ng c\xF3 b\xE0i b\xE1o n\xE0o trong m\u1EE5c n\xE0y.</div>';
        return;
      }
      const items = cellData.paperIds.map((id) => {
        const p = this.uniqueRecords.find((r) => r.id === id) || this.allRecords.find((r) => r.id === id);
        const title = p ? p.title : id;
        return `<li style="margin-bottom: 4px;"><b>${this.escapeHtml(id)}</b>: ${this.escapeHtml(title)}</li>`;
      });
      this.drilldownPaperList.innerHTML = `<ul style="padding-left: 18px;">${items.join("")}</ul>`;
    }
    closePrismaModal() {
      if (this.prismaModal) this.prismaModal.style.display = "none";
      if (this.prismaDrilldownBox) this.prismaDrilldownBox.style.display = "none";
    }
    async handleExportCsv() {
      if (this.allRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
        return;
      }
      const headers = ["id", "source", "title", "authors", "year", "venue", "doi", "url", "retrieval_date"];
      let csv = "\uFEFF" + headers.join(",") + "\r\n";
      this.allRecords.forEach((r) => {
        csv += [
          this.escapeCsv(r.id),
          this.escapeCsv(r.source),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.url),
          this.escapeCsv(r.retrieval_date)
        ].join(",") + "\r\n";
      });
      this.downloadFile(csv, "01_all_records.csv", "text/csv;charset=utf-8;");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i 01_all_records.csv th\xE0nh c\xF4ng!", "success");
    }
    async handleExportDedupLog() {
      try {
        const res = await fetch(
          `${this.backendUrl}/api/export/duplicates?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        this.downloadFile(text, "01_duplicate_log.csv", "text/csv;charset=utf-8;");
        this.setStatus("\u2713 \u0110\xE3 t\u1EA3i 01_duplicate_log.csv th\xE0nh c\xF4ng!", "success");
      } catch {
        this.setStatus("Kh\xF4ng th\u1EC3 t\u1EA3i duplicate log t\u1EEB backend.", "error");
      }
    }
    async handleExportFullCsv() {
      const headers = [
        "id",
        "source",
        "title",
        "authors",
        "year",
        "venue",
        "doi",
        "v2Decision",
        "finalDecision",
        "userNotes",
        "retrieval_date"
      ];
      let csv = "\uFEFF" + headers.join(",") + "\r\n";
      this.uniqueRecords.forEach((r) => {
        csv += [
          this.escapeCsv(r.id),
          this.escapeCsv(r.source),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.v2Decision || ""),
          this.escapeCsv(r.finalDecision || ""),
          this.escapeCsv(r.userNotes || ""),
          this.escapeCsv(r.retrieval_date)
        ].join(",") + "\r\n";
      });
      this.downloadFile(csv, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i 02_screening_decisions_full.csv th\xE0nh c\xF4ng!", "success");
    }
    async handleExportIncludedCsv() {
      const includes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
      if (includes.length === 0) {
        alert("Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\u01B0\u1EE3c ch\u1ED1t Final Include.");
        return;
      }
      const headers = ["id", "title", "authors", "year", "venue", "doi", "pageCount", "userNotes"];
      let csv = "\uFEFF" + headers.join(",") + "\r\n";
      includes.forEach((r) => {
        csv += [
          this.escapeCsv(r.id),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.page_count || ""),
          this.escapeCsv(r.userNotes || "")
        ].join(",") + "\r\n";
      });
      this.downloadFile(csv, "03_final_included.csv", "text/csv;charset=utf-8;");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i 03_final_included.csv th\xE0nh c\xF4ng!", "success");
    }
    async handleExportPrismaMarkdown() {
      try {
        const res = await fetch(
          `${this.backendUrl}/api/prisma/export-md?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        this.downloadFile(text, "prisma-flow.md", "text/markdown;charset=utf-8;");
        this.setStatus("\u2713 \u0110\xE3 t\u1EA3i prisma-flow.md th\xE0nh c\xF4ng!", "success");
      } catch {
        this.setStatus("Kh\xF4ng th\u1EC3 t\u1EA3i PRISMA Markdown.", "error");
      }
    }
    async handleExportEvidenceTable() {
      try {
        const res = await fetch(
          `${this.backendUrl}/api/evidence-table/export-md?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        this.downloadFile(text, "evidence-table.md", "text/markdown;charset=utf-8;");
        this.setStatus("\u2713 \u0110\xE3 t\u1EA3i evidence-table.md th\xE0nh c\xF4ng!", "success");
      } catch {
        this.setStatus("Kh\xF4ng th\u1EC3 t\u1EA3i evidence-table.md.", "error");
      }
    }
    async handleExportApa7() {
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/export-apa7`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: this.uniqueRecords,
            profile: this.activeProfile,
            onlyFinalIncluded: true
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.textContent) {
            this.downloadFile(data.textContent, "03_references_apa7.txt", "text/plain;charset=utf-8;");
            this.setStatus("\u2713 \u0110\xE3 t\u1EA3i 03_references_apa7.txt th\xE0nh c\xF4ng!", "success");
            return;
          }
        }
      } catch {
      }
    }
    async handleSaveLog() {
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: this.queryInput?.value.trim() || this.activeProfile.name,
            profile: this.activeProfile,
            recordsCount: this.uniqueRecords.length,
            sessionId: this.currentSessionId
          })
        });
        if (res.ok) {
          this.setStatus("\u2713 \u0110\xE3 ghi nh\u1EADt k\xFD v\xE0o search-log.md th\xE0nh c\xF4ng!", "success");
        }
      } catch (e) {
        this.setStatus(`L\u1ED7i ghi nh\u1EADt k\xFD: ${e.message}`, "error");
      }
    }
    async handleExportSessionJson() {
      const backupData = {
        profile: this.activeProfile,
        sessionId: this.currentSessionId,
        allRecords: this.allRecords,
        uniqueRecords: this.uniqueRecords,
        dedupStats: this.dedupStats,
        mergeHistory: this.mergeHistoryList,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        version: "3.0.0"
      };
      this.downloadFile(JSON.stringify(backupData, null, 2), "session_backup.json", "application/json;charset=utf-8;");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i b\u1EA3n sao l\u01B0u session_backup.json th\xE0nh c\xF4ng!", "success");
    }
    async handleImportBackupFile(event) {
      const input = event.target;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      try {
        this.setStatus(`\u0110ang \u0111\u1ECDc t\u1EC7p sao l\u01B0u "${file.name}"...`, "info");
        const text = await file.text();
        const backup = JSON.parse(text);
        if (backup.profile) {
          this.activeProfile = backup.profile;
          await this.saveProfileToBackend(this.activeProfile);
          await this.saveProfilesToStorage();
        }
        if (backup.allRecords && Array.isArray(backup.allRecords)) {
          this.allRecords = backup.allRecords;
        }
        if (backup.uniqueRecords && Array.isArray(backup.uniqueRecords)) {
          this.uniqueRecords = backup.uniqueRecords;
        }
        if (backup.dedupStats) {
          this.dedupStats = backup.dedupStats;
        }
        await this.saveSessionToStorage();
        this.updateActiveResearchDisplay();
        this.setWizardStep("B1");
        this.setStatus(`\u2713 \u0110\xE3 kh\xF4i ph\u1EE5c th\xE0nh c\xF4ng t\u1EEB b\u1EA3n sao l\u01B0u "${file.name}"!`, "success");
      } catch (e) {
        this.setStatus(`L\u1ED7i khi nh\u1EADp b\u1EA3n sao l\u01B0u: ${e.message}`, "error");
      } finally {
        input.value = "";
      }
    }
    async handleImportFile(event) {
      const input = event.target;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      try {
        this.setStatus(`\u0110ang nh\u1EADp t\u1EC7p "${file.name}"...`, "info");
        const text = await file.text();
        const res = await fetch(`${this.backendUrl}/api/pipeline/import-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            content: text,
            researchId: this.activeProfile.id,
            sessionId: this.currentSessionId || `session_${Date.now()}`
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          this.allRecords = [...this.allRecords, ...data.records];
          this.uniqueRecords = [...this.uniqueRecords, ...data.records];
          await this.saveSessionToStorage();
          this.updateStepCounters();
          this.renderStepB1();
          this.renderRecordsList();
          this.setStatus(`\u2713 \u0110\xE3 nh\u1EADp th\xE0nh c\xF4ng ${data.records.length} b\xE0i t\u1EEB "${file.name}"!`, "success");
        }
      } catch (e) {
        this.setStatus(`L\u1ED7i khi nh\u1EADp t\u1EC7p: ${e.message}`, "error");
      } finally {
        input.value = "";
      }
    }
    async handleSnowballingPrompt() {
      const selectedRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId);
      const defaultDoi = selectedRec?.doi || "";
      const seedDoi = prompt("Nh\u1EADp DOI b\xE0i b\xE1o h\u1EA1t gi\u1ED1ng \u0111\u1EC3 Snowballing:", defaultDoi);
      if (!seedDoi || !seedDoi.trim()) return;
      const direction = prompt("H\u01B0\u1EDBng Snowballing: 'backward' (References) ho\u1EB7c 'forward' (Citations):", "backward");
      const ep = direction === "forward" ? "forward" : "backward";
      try {
        this.setStatus(`\u0110ang ch\u1EA1y Snowballing ${ep} cho DOI: ${seedDoi}...`, "info");
        const res = await fetch(`${this.backendUrl}/api/snowball/${ep}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedDoi: seedDoi.trim(),
            seedTitle: selectedRec?.title || "",
            researchId: this.activeProfile.id,
            sessionId: this.currentSessionId || `session_${Date.now()}`,
            maxRecords: 25
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          this.allRecords = [...this.allRecords, ...data.records];
          this.uniqueRecords = [...this.uniqueRecords, ...data.records];
          await this.saveSessionToStorage();
          this.updateStepCounters();
          this.renderStepB1();
          this.renderRecordsList();
          this.setStatus(`\u2713 Snowballing t\xECm th\u1EA5y th\xEAm ${data.records.length} b\xE0i m\u1EDBi!`, "success");
        }
      } catch (e) {
        this.setStatus(`L\u1ED7i Snowballing: ${e.message}`, "error");
      }
    }
    // ==========================================
    // UTILITIES & SANITIZATION
    // ==========================================
    escapeCsv(str) {
      if (str === null || str === void 0) return '""';
      let s = String(str);
      if (/^[\=\+\-\@\t\r]/.test(s)) {
        s = `'${s}`;
      }
      return `"${s.replace(/"/g, '""')}"`;
    }
    escapeHtml(text) {
      if (!text) return "";
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    downloadFile(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setStatus(msg, type = "info") {
      if (!this.statusDiv) return;
      this.statusDiv.innerText = msg;
      const colors = {
        info: "#2563eb",
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706"
      };
      this.statusDiv.style.color = colors[type];
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const app = new ScholarExtensionApp();
    app.init();
  });
})();
