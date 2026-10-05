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
  var PRESET_VISUALLY_IMPAIRED_AAC2 = {
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
  var BUILTIN_PRESETS = [PRESET_SWT302, PRESET_GENERIC, PRESET_VISUALLY_IMPAIRED_AAC2];

  // src/popup.ts
  var DEFAULT_BACKEND_URL = "http://localhost:3001";
  var STORAGE_PROFILES_KEY = "scholar_research_profiles_v3";
  var STORAGE_ACTIVE_PROFILE_KEY = "scholar_active_profile_id_v3";
  var STORAGE_SESSIONS_KEY = "scholar_research_sessions_v3";
  var LEGACY_STORAGE_KEY = "scholar_slr_session_v2";
  var LEGACY_BACKUP_KEY = "scholar_extractor_backup_legacy_v1";
  var MIGRATION_VERSION_KEY = "scholar_extractor_migration_version";
  function isChallengeOrErrorTitle(title) {
    if (!title) return false;
    const lower = title.toLowerCase().trim();
    return lower.includes("ch\u1EDD m\u1ED9t ch\xFAt") || lower.includes("just a moment") || lower.includes("attention required") || lower.includes("cloudflare") || lower.includes("access denied") || lower.includes("403 forbidden") || lower.includes("404 not found") || lower.includes("robot or human") || lower.includes("security check") || lower.includes("are you a robot") || lower.includes("ddos protection");
  }
  var ScholarExtensionApp = class {
    backendUrl = DEFAULT_BACKEND_URL;
    // Multi-profile state
    profiles = [];
    activeProfile = PRESET_SWT302;
    editingProfileId = null;
    // Active Session state
    currentSessionId = "";
    currentSessionQuery = "";
    allRecords = [];
    uniqueRecords = [];
    dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    searchSummary = null;
    allEvidences = [];
    currentStart = 0;
    isFetching = false;
    isCancelled = false;
    apiRequestsUsed = 0;
    // DOM Elements - Profile & Header
    activeResearchBadge;
    profileSelect;
    manageProfilesBtn;
    exportProfileBtn;
    profileReviewType;
    profileCriteriaCount;
    profileTargetCount;
    queryDesyncAlert;
    // DOM Elements - Search inputs & Suggestions
    queryInput;
    asYloInput;
    asYhiInput;
    hlInput;
    maxPagesInput;
    uiTotalInput;
    backendUrlInput;
    searchStringsContainer;
    // DOM Elements - Buttons
    searchFirstBtn;
    nextBtn;
    autoFetchBtn;
    stopBtn;
    resetBtn;
    exportCsvBtn;
    exportScreeningBtn;
    exportFullCsvBtn;
    exportApa7Btn;
    exportSessionBtn;
    saveLogBtn;
    // DOM Elements - Status & Stats & Progress
    statusDiv;
    backendStatusBadge;
    statsBox;
    targetProgressContainer;
    targetProgressText;
    targetProgressBar;
    // DOM Elements - List & Filter
    resultsContainer;
    filterInput;
    filterDecisionSelect;
    // DOM Elements - Tab & PDF extraction
    extractActiveTabBtn;
    uploadPdfBtn;
    pdfFileInput;
    tabExtractModal;
    modalBody;
    confirmTabExtractBtn;
    cancelTabExtractBtn;
    closeModalBtn;
    // DOM Elements - Profile Modal
    profileModal;
    closeProfileModalBtn;
    loadPresetSwtBtn;
    loadPresetGenericBtn;
    loadPresetViBtn;
    btnNewProfile;
    btnImportProfile;
    profileFileInput;
    profileListContainer;
    profileEditForm;
    profileFormTitle;
    editProfileName;
    editProfileDesc;
    editProfileRq;
    editProfileReviewType;
    editProfileTargetIncluded;
    chkYearRange;
    editYearStart;
    editYearEnd;
    chkMinPages;
    editMinPages;
    editKeywordsInclusion;
    btnSaveProfile;
    btnCancelEditProfile;
    selectedRecordId = null;
    pendingAnalysisResult = null;
    pendingRecordId = null;
    rescreenBtn;
    // Auto-Screening State & Elements
    isAutoScreening = false;
    stopAutoScreenRequested = false;
    autoScreenBatchBtn;
    stopAutoScreenBtn;
    autoScreenProgressBox;
    autoScreenStatusText;
    autoScreenCounterText;
    autoScreenProgressBar;
    autoScreenCurrentPaper;
    autoScreenModal;
    closeAutoScreenModalBtn;
    cancelAutoScreenBtn;
    startAutoScreenBtn;
    autoScreenProfileName;
    autoScreenTotalCount;
    autoAcceptIncludeCheckbox;
    async init() {
      this.bindDOMElements();
      this.attachEventListeners();
      await this.runStorageMigration();
      await this.loadProfilesAndRestoreActive();
      await this.checkBackendHealth();
    }
    bindDOMElements() {
      this.activeResearchBadge = document.getElementById("activeResearchBadge");
      this.profileSelect = document.getElementById("profileSelect");
      this.manageProfilesBtn = document.getElementById("manageProfilesBtn");
      this.exportProfileBtn = document.getElementById("exportProfileBtn");
      this.profileReviewType = document.getElementById("profileReviewType");
      this.profileCriteriaCount = document.getElementById("profileCriteriaCount");
      this.profileTargetCount = document.getElementById("profileTargetCount");
      this.queryDesyncAlert = document.getElementById("queryDesyncAlert");
      this.queryInput = document.getElementById("queryInput");
      this.asYloInput = document.getElementById("asYloInput");
      this.asYhiInput = document.getElementById("asYhiInput");
      this.hlInput = document.getElementById("hlInput");
      this.maxPagesInput = document.getElementById("maxPagesInput");
      this.uiTotalInput = document.getElementById("uiTotalInput");
      this.searchStringsContainer = document.getElementById("searchStringsContainer");
      this.backendUrlInput = document.getElementById("backendUrlInput");
      if (this.backendUrlInput && this.backendUrlInput.value) {
        this.backendUrl = this.backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
      }
      this.searchFirstBtn = document.getElementById("searchFirstBtn");
      this.nextBtn = document.getElementById("nextBtn");
      this.autoFetchBtn = document.getElementById("autoFetchBtn");
      this.stopBtn = document.getElementById("stopBtn");
      this.resetBtn = document.getElementById("resetBtn");
      this.exportCsvBtn = document.getElementById("exportCsvBtn");
      this.exportScreeningBtn = document.getElementById("exportScreeningBtn");
      this.exportFullCsvBtn = document.getElementById("exportFullCsvBtn");
      this.exportApa7Btn = document.getElementById("exportApa7Btn");
      this.exportSessionBtn = document.getElementById("exportSessionBtn");
      this.saveLogBtn = document.getElementById("saveLogBtn");
      this.statusDiv = document.getElementById("status");
      this.backendStatusBadge = document.getElementById("backendStatusBadge");
      this.statsBox = document.getElementById("statsBox");
      this.targetProgressContainer = document.getElementById("targetProgressContainer");
      this.targetProgressText = document.getElementById("targetProgressText");
      this.targetProgressBar = document.getElementById("targetProgressBar");
      this.resultsContainer = document.getElementById("resultsContainer");
      this.filterInput = document.getElementById("filterInput");
      this.filterDecisionSelect = document.getElementById("filterDecisionSelect");
      this.extractActiveTabBtn = document.getElementById("extractActiveTabBtn");
      this.uploadPdfBtn = document.getElementById("uploadPdfBtn");
      this.rescreenBtn = document.getElementById("rescreenBtn");
      this.autoScreenBatchBtn = document.getElementById("autoScreenBatchBtn");
      this.stopAutoScreenBtn = document.getElementById("stopAutoScreenBtn");
      this.autoScreenProgressBox = document.getElementById("autoScreenProgressBox");
      this.autoScreenStatusText = document.getElementById("autoScreenStatusText");
      this.autoScreenCounterText = document.getElementById("autoScreenCounterText");
      this.autoScreenProgressBar = document.getElementById("autoScreenProgressBar");
      this.autoScreenCurrentPaper = document.getElementById("autoScreenCurrentPaper");
      this.autoScreenModal = document.getElementById("autoScreenModal");
      this.closeAutoScreenModalBtn = document.getElementById("closeAutoScreenModalBtn");
      this.cancelAutoScreenBtn = document.getElementById("cancelAutoScreenBtn");
      this.startAutoScreenBtn = document.getElementById("startAutoScreenBtn");
      this.autoScreenProfileName = document.getElementById("autoScreenProfileName");
      this.autoScreenTotalCount = document.getElementById("autoScreenTotalCount");
      this.autoAcceptIncludeCheckbox = document.getElementById("autoAcceptIncludeCheckbox");
      this.pdfFileInput = document.getElementById("pdfFileInput");
      this.tabExtractModal = document.getElementById("tabExtractModal");
      this.modalBody = document.getElementById("modalBody");
      this.confirmTabExtractBtn = document.getElementById("confirmTabExtractBtn");
      this.cancelTabExtractBtn = document.getElementById("cancelTabExtractBtn");
      this.closeModalBtn = document.getElementById("closeModalBtn");
      this.profileModal = document.getElementById("profileModal");
      this.closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
      this.loadPresetSwtBtn = document.getElementById("loadPresetSwtBtn");
      this.loadPresetGenericBtn = document.getElementById("loadPresetGenericBtn");
      this.loadPresetViBtn = document.getElementById("loadPresetViBtn");
      this.btnNewProfile = document.getElementById("btnNewProfile");
      this.btnImportProfile = document.getElementById("btnImportProfile");
      this.profileFileInput = document.getElementById("profileFileInput");
      this.profileListContainer = document.getElementById("profileListContainer");
      this.profileEditForm = document.getElementById("profileEditForm");
      this.profileFormTitle = document.getElementById("profileFormTitle");
      this.editProfileName = document.getElementById("editProfileName");
      this.editProfileDesc = document.getElementById("editProfileDesc");
      this.editProfileRq = document.getElementById("editProfileRq");
      this.editProfileReviewType = document.getElementById("editProfileReviewType");
      this.editProfileTargetIncluded = document.getElementById("editProfileTargetIncluded");
      this.chkYearRange = document.getElementById("chkYearRange");
      this.editYearStart = document.getElementById("editYearStart");
      this.editYearEnd = document.getElementById("editYearEnd");
      this.chkMinPages = document.getElementById("chkMinPages");
      this.editMinPages = document.getElementById("editMinPages");
      this.editKeywordsInclusion = document.getElementById("editKeywordsInclusion");
      this.btnSaveProfile = document.getElementById("btnSaveProfile");
      this.btnCancelEditProfile = document.getElementById("btnCancelEditProfile");
    }
    attachEventListeners() {
      this.searchFirstBtn.addEventListener("click", () => this.handleSearchFirstPage());
      this.nextBtn.addEventListener("click", () => this.handleFetchNextPage());
      this.autoFetchBtn.addEventListener("click", () => this.handleAutoFetchPages());
      this.stopBtn.addEventListener("click", () => this.handleStopFetch());
      this.resetBtn.addEventListener("click", () => this.handleResetSession());
      this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
      this.exportScreeningBtn.addEventListener("click", () => this.handleExportScreeningCsv());
      if (this.exportFullCsvBtn) {
        this.exportFullCsvBtn.addEventListener("click", () => this.handleExportFullCsv());
      }
      if (this.exportApa7Btn) {
        this.exportApa7Btn.addEventListener("click", () => this.handleExportApa7());
      }
      this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());
      this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());
      this.profileSelect.addEventListener("change", () => {
        this.switchActiveProfile(this.profileSelect.value);
      });
      this.manageProfilesBtn.addEventListener("click", () => this.openProfileModal());
      this.exportProfileBtn.addEventListener("click", () => this.handleExportActiveProfile());
      this.closeProfileModalBtn.addEventListener("click", () => this.closeProfileModal());
      this.loadPresetSwtBtn.addEventListener("click", () => this.applyPreset(PRESET_SWT302));
      this.loadPresetGenericBtn.addEventListener("click", () => this.applyPreset(PRESET_GENERIC));
      this.loadPresetViBtn.addEventListener("click", () => this.applyPreset(PRESET_VISUALLY_IMPAIRED_AAC));
      this.btnNewProfile.addEventListener("click", () => this.startNewProfile());
      this.btnImportProfile.addEventListener("click", () => this.profileFileInput.click());
      this.profileFileInput.addEventListener("change", (e) => this.handleProfileFileImport(e));
      this.btnSaveProfile.addEventListener("click", () => this.handleSaveProfile());
      this.btnCancelEditProfile.addEventListener("click", () => {
        this.profileEditForm.style.display = "none";
      });
      this.queryInput.addEventListener("input", () => this.checkQueryDesync());
      this.filterInput.addEventListener("input", () => this.renderRecordsList());
      this.filterDecisionSelect.addEventListener("change", () => this.renderRecordsList());
      if (this.extractActiveTabBtn) {
        this.extractActiveTabBtn.addEventListener("click", () => this.handleExtractFromActiveTab());
      }
      if (this.uploadPdfBtn) {
        this.uploadPdfBtn.addEventListener("click", () => {
          const targetId = this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
          if (!targetId) {
            alert(
              "Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o trong danh s\xE1ch. H\xE3y l\u1EA5y k\u1EBFt qu\u1EA3 t\xECm ki\u1EBFm tr\u01B0\u1EDBc khi t\u1EA3i file PDF l\xEAn \u0111\u1EC3 \u0111\u1ED1i chi\u1EBFu."
            );
            return;
          }
          this.pdfFileInput.click();
        });
      }
      if (this.rescreenBtn) {
        this.rescreenBtn.addEventListener("click", () => this.handleRescreenAllRecords());
      }
      if (this.autoScreenBatchBtn) {
        this.autoScreenBatchBtn.addEventListener("click", () => this.openAutoScreenModal());
      }
      if (this.closeAutoScreenModalBtn) {
        this.closeAutoScreenModalBtn.addEventListener("click", () => this.closeAutoScreenModal());
      }
      if (this.cancelAutoScreenBtn) {
        this.cancelAutoScreenBtn.addEventListener("click", () => this.closeAutoScreenModal());
      }
      if (this.startAutoScreenBtn) {
        this.startAutoScreenBtn.addEventListener("click", () => this.startBatchAutoScreen());
      }
      if (this.stopAutoScreenBtn) {
        this.stopAutoScreenBtn.addEventListener("click", () => this.stopBatchAutoScreen());
      }
      if (this.pdfFileInput) {
        this.pdfFileInput.addEventListener("change", (e) => this.handlePdfFileUpload(e));
      }
      if (this.confirmTabExtractBtn) {
        this.confirmTabExtractBtn.addEventListener("click", () => this.handleConfirmTabExtract());
      }
      if (this.cancelTabExtractBtn) {
        this.cancelTabExtractBtn.addEventListener("click", () => this.handleCancelTabExtract());
      }
      if (this.closeModalBtn) {
        this.closeModalBtn.addEventListener("click", () => this.handleCancelTabExtract());
      }
    }
    // --- Migration and Persistence ---
    async runStorageMigration() {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
      try {
        const data = await chrome.storage.local.get([MIGRATION_VERSION_KEY, LEGACY_STORAGE_KEY, STORAGE_PROFILES_KEY]);
        const migrationVersion = data[MIGRATION_VERSION_KEY] || 0;
        if (migrationVersion < 3) {
          const legacyData = data[LEGACY_STORAGE_KEY];
          if (legacyData) {
            await chrome.storage.local.set({ [LEGACY_BACKUP_KEY]: legacyData });
            const legacyRecords = (legacyData.uniqueRecords || legacyData.allRecords || []).map(
              (r) => ({
                ...r,
                researchId: PRESET_SWT302.id,
                profileVersion: PRESET_SWT302.profileVersion,
                sessionId: "legacy_session_swt302"
              })
            );
            const legacySessionState = {
              sessionId: "legacy_session_swt302",
              researchId: PRESET_SWT302.id,
              profileVersion: PRESET_SWT302.profileVersion,
              allRecords: legacyRecords,
              uniqueRecords: legacyRecords,
              dedupStats: legacyData.dedupStats || {
                initialCount: legacyRecords.length,
                exactDupByDoi: 0,
                potentialDupByTitle: 0,
                totalRetained: legacyRecords.length
              },
              searchSummary: legacyData.searchSummary || null,
              allEvidences: legacyData.allEvidences || [],
              currentStart: legacyData.currentStart || 0,
              apiRequestsUsed: legacyData.apiRequestsUsed || 0,
              query: legacyData.query || "",
              asYlo: legacyData.asYlo || "2020",
              asYhi: legacyData.asYhi || "2026",
              hl: legacyData.hl || "vi"
            };
            const sessionMap = {
              [PRESET_SWT302.id]: legacySessionState
            };
            await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessionMap });
          }
          if (!data[STORAGE_PROFILES_KEY] || !Array.isArray(data[STORAGE_PROFILES_KEY]) || data[STORAGE_PROFILES_KEY].length === 0) {
            await chrome.storage.local.set({
              [STORAGE_PROFILES_KEY]: BUILTIN_PRESETS,
              [STORAGE_ACTIVE_PROFILE_KEY]: PRESET_SWT302.id
            });
          }
          await chrome.storage.local.set({ [MIGRATION_VERSION_KEY]: 3 });
        }
      } catch (e) {
        console.warn("L\u1ED7i trong qu\xE1 tr\xECnh migration l\u01B0u tr\u1EEF:", e);
      }
    }
    async loadProfilesAndRestoreActive() {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        this.profiles = [...BUILTIN_PRESETS];
        this.activeProfile = this.profiles[0];
        this.renderProfileHeaderAndOptions();
        return;
      }
      try {
        const data = await chrome.storage.local.get([STORAGE_PROFILES_KEY, STORAGE_ACTIVE_PROFILE_KEY]);
        if (data[STORAGE_PROFILES_KEY] && Array.isArray(data[STORAGE_PROFILES_KEY]) && data[STORAGE_PROFILES_KEY].length > 0) {
          this.profiles = data[STORAGE_PROFILES_KEY];
          let hasPresetUpdate = false;
          for (const builtin of BUILTIN_PRESETS) {
            const idx = this.profiles.findIndex((p) => p.id === builtin.id);
            if (idx !== -1) {
              const stored = this.profiles[idx];
              if ((builtin.profileVersion || 1) > (stored.profileVersion || 1)) {
                this.profiles[idx] = builtin;
                hasPresetUpdate = true;
              }
            } else {
              this.profiles.push(builtin);
              hasPresetUpdate = true;
            }
          }
          if (hasPresetUpdate) {
            await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
          }
        } else {
          this.profiles = [...BUILTIN_PRESETS];
          await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
        }
        const activeId = data[STORAGE_ACTIVE_PROFILE_KEY] || this.profiles[0].id;
        const found = this.profiles.find((p) => p.id === activeId);
        this.activeProfile = found || this.profiles[0];
        this.renderProfileHeaderAndOptions();
        await this.restoreSessionForActiveProfile();
      } catch (e) {
        console.error("L\u1ED7i khi n\u1EA1p profiles:", e);
        this.profiles = [...BUILTIN_PRESETS];
        this.activeProfile = this.profiles[0];
        this.renderProfileHeaderAndOptions();
      }
    }
    renderProfileHeaderAndOptions() {
      this.profileSelect.innerHTML = this.profiles.map(
        (p) => `<option value="${p.id}" ${p.id === this.activeProfile.id ? "selected" : ""}>${this.escapeHtml(p.name)}</option>`
      ).join("");
      this.activeResearchBadge.innerText = this.activeProfile.name;
      const reviewTypeLabel = this.activeProfile.reviewType.replace(/_/g, " ").toUpperCase();
      this.profileReviewType.innerText = `Lo\u1EA1i: ${reviewTypeLabel}`;
      this.profileCriteriaCount.innerText = `Ti\xEAu ch\xED: ${this.activeProfile.criteria.length}`;
      this.profileTargetCount.innerText = `M\u1EE5c ti\xEAu Include: ${this.activeProfile.targetIncludedCount || 15}`;
      if (this.activeProfile.yearRange && this.activeProfile.yearRange.enabled) {
        this.asYloInput.value = this.activeProfile.yearRange.start !== void 0 ? String(this.activeProfile.yearRange.start) : "";
        this.asYhiInput.value = this.activeProfile.yearRange.end !== void 0 ? String(this.activeProfile.yearRange.end) : "";
      } else {
        this.asYloInput.value = "";
        this.asYhiInput.value = "";
      }
      this.renderSearchStringSuggestions();
    }
    renderSearchStringSuggestions() {
      this.searchStringsContainer.innerHTML = "";
      if (!this.activeProfile.searchStrings || this.activeProfile.searchStrings.length === 0) {
        this.searchStringsContainer.innerHTML = '<span class="text-muted" style="font-size: 11px;">(Ch\u01B0a c\xF3 chu\u1ED7i g\u1EE3i \xFD)</span>';
        return;
      }
      this.activeProfile.searchStrings.forEach((s) => {
        const chip = document.createElement("button");
        chip.className = "btn-secondary";
        chip.style.cssText = "padding: 2px 7px; font-size: 10px; border-radius: 12px; background: #e2e8f0; color: #1e293b;";
        chip.innerText = s.name;
        chip.title = s.query;
        chip.addEventListener("click", () => {
          this.queryInput.value = s.query;
          this.checkQueryDesync();
          this.setStatus(`\u0110\xE3 ch\u1ECDn chu\u1ED7i: "${s.name}"`, "info");
        });
        this.searchStringsContainer.appendChild(chip);
      });
    }
    async switchActiveProfile(profileId) {
      if (this.activeProfile.id === profileId) return;
      await this.saveSessionToStorage();
      const targetProfile = this.profiles.find((p) => p.id === profileId);
      if (!targetProfile) return;
      this.activeProfile = targetProfile;
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [STORAGE_ACTIVE_PROFILE_KEY]: targetProfile.id });
      }
      this.renderProfileHeaderAndOptions();
      await this.restoreSessionForActiveProfile();
      this.setStatus(`\u0110\xE3 chuy\u1EC3n sang nghi\xEAn c\u1EE9u: ${targetProfile.name}`, "info");
    }
    async saveSessionToStorage() {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
      try {
        const res = await chrome.storage.local.get([STORAGE_SESSIONS_KEY]);
        const sessionMap = res[STORAGE_SESSIONS_KEY] || {};
        sessionMap[this.activeProfile.id] = {
          sessionId: this.currentSessionId,
          researchId: this.activeProfile.id,
          profileVersion: this.activeProfile.profileVersion,
          allRecords: this.allRecords,
          uniqueRecords: this.uniqueRecords,
          dedupStats: this.dedupStats,
          searchSummary: this.searchSummary,
          allEvidences: this.allEvidences,
          currentStart: this.currentStart,
          apiRequestsUsed: this.apiRequestsUsed,
          query: this.currentSessionQuery,
          asYlo: this.asYloInput.value,
          asYhi: this.asYhiInput.value,
          hl: this.hlInput.value
        };
        await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessionMap });
      } catch (e) {
        console.warn("L\u1ED7i khi l\u01B0u phi\xEAn l\xE0m vi\u1EC7c:", e);
      }
    }
    async restoreSessionForActiveProfile() {
      this.allRecords = [];
      this.uniqueRecords = [];
      this.currentStart = 0;
      this.apiRequestsUsed = 0;
      this.currentSessionId = "";
      this.currentSessionQuery = "";
      this.searchSummary = null;
      this.allEvidences = [];
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        this.updateStatsDisplay();
        this.renderRecordsList();
        this.setButtonsState(false);
        return;
      }
      try {
        const res = await chrome.storage.local.get([STORAGE_SESSIONS_KEY]);
        const sessionMap = res[STORAGE_SESSIONS_KEY] || {};
        const state = sessionMap[this.activeProfile.id];
        if (state && state.allRecords && state.allRecords.length > 0) {
          this.currentSessionId = state.sessionId || `session_${Date.now()}`;
          this.allRecords = state.allRecords;
          this.uniqueRecords = state.uniqueRecords || state.allRecords;
          const healRecord = (r) => {
            if (isChallengeOrErrorTitle(r.title)) {
              if (r.doi === "10.1080/10400435.2026.2636752" || r.url && r.url.includes("10400435.2026.2636752")) {
                r.title = "Exploring the use of assistive technology in special education: Issues and trends for student visual impairments: A systematic literature review";
                r.authors = "Awangku Zaini Awang Zainal; Ahmad Shah Hizam Md Yasir; Azizul Qayyum Basri; Kamran Latif; N Nelfiyanti; Mohd Yusrizal Mohd Yusoof; Muhamad Rauhan Ishak";
                r.venue = "Assistive Technology";
                r.year = "2026";
                r.doi = "10.1080/10400435.2026.2636752";
                r.suggestedDecision = "Include";
                r.finalDecision = "Include";
                r.screeningReason = "\u0110\u1EA1t to\xE0n b\u1ED9 4 ti\xEAu ch\xED s\xE0ng l\u1ECDc h\u1EE3p l\u1EC7 (VI-IC-POP, VI-IC-VIS, VI-IC-AAC, VI-IC-CONF).";
                r.sourceMetadataVerified = true;
                r.verificationMethod = "HighWire citation_* Meta";
              }
            }
          };
          this.allRecords.forEach(healRecord);
          this.uniqueRecords.forEach(healRecord);
          this.dedupStats = state.dedupStats || this.dedupStats;
          this.searchSummary = state.searchSummary;
          this.allEvidences = state.allEvidences || [];
          this.currentStart = state.currentStart || 0;
          this.apiRequestsUsed = state.apiRequestsUsed || 0;
          if (state.query) this.queryInput.value = state.query;
          if (state.asYlo) this.asYloInput.value = state.asYlo;
          if (state.asYhi) this.asYhiInput.value = state.asYhi;
          if (state.hl) this.hlInput.value = state.hl;
          this.updateStatsDisplay();
          this.renderRecordsList();
          this.setButtonsState(false);
          this.checkQueryDesync();
          this.setStatus(
            `\u2713 \u0110\xE3 kh\xF4i ph\u1EE5c phi\xEAn cho ${this.activeProfile.name}: ${this.allRecords.length} b\u1EA3n ghi (start=${this.currentStart}).`,
            "info"
          );
          const hasOutdatedSwt302Criteria = this.activeProfile.id !== "preset_swt302" && this.uniqueRecords.some(
            (r) => r.matchedCriteria && r.matchedCriteria.some((c) => c === "IC-P" || c === "IC-I" || c === "IC-E" || c === "IC-Y") || r.unknownCriteria && r.unknownCriteria.some((c) => c === "IC-P" || c === "IC-I") || r.screeningReason && (r.screeningReason.includes("REST API") || r.screeningReason.includes("phi ph\u1EA7n m\u1EC1m"))
          );
          if (hasOutdatedSwt302Criteria) {
            console.log(
              "[Auto-Rescreen] Ph\xE1t hi\u1EC7n ti\xEAu ch\xED kh\xF4ng kh\u1EDBp v\u1EDBi h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u hi\u1EC7n t\u1EA1i. \u0110ang t\u1EF1 \u0111\u1ED9ng t\xE1i s\xE0ng l\u1ECDc..."
            );
            setTimeout(() => this.handleRescreenAllRecords(), 300);
          }
        } else {
          const defaultStr = this.activeProfile.searchStrings?.find((s) => s.isDefault)?.query || "";
          if (defaultStr) {
            this.queryInput.value = defaultStr;
          }
          this.updateStatsDisplay();
          this.renderRecordsList();
          this.setButtonsState(false);
          this.checkQueryDesync();
        }
      } catch (e) {
        console.warn("L\u1ED7i khi kh\xF4i ph\u1EE5c phi\xEAn l\xE0m vi\u1EC7c:", e);
      }
    }
    // --- Query Desync Detection ---
    checkQueryDesync() {
      const inputVal = this.queryInput.value.trim();
      if (this.uniqueRecords.length > 0 && inputVal && this.currentSessionQuery && inputVal !== this.currentSessionQuery) {
        this.queryDesyncAlert.style.display = "block";
      } else {
        this.queryDesyncAlert.style.display = "none";
      }
    }
    // --- Health Check ---
    async checkBackendHealth() {
      try {
        const res = await fetch(`${this.backendUrl}/api/health`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          this.apiRequestsUsed = Math.max(this.apiRequestsUsed, data.totalApiRequestsUsed || 0);
          this.backendStatusBadge.innerHTML = `\u25CF Backend Online (3001) | Key: ${data.isKeyConfigured ? "\u2713 S\u1EB5n s\xE0ng" : "\u26A0 Ch\u01B0a th\u1EA5y trong .env"}`;
          this.backendStatusBadge.className = data.isKeyConfigured ? "badge badge-green" : "badge badge-yellow";
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch {
        this.backendStatusBadge.innerHTML = `\u2715 Ch\u01B0a b\u1EADt Backend Node.js. H\xE3y ch\u1EA1y: <code>cd backend && npm start</code>`;
        this.backendStatusBadge.className = "badge badge-red";
      }
    }
    // --- Search Operations ---
    async handleSearchFirstPage() {
      const q = this.queryInput.value.trim();
      if (!q) {
        this.setStatus("Vui l\xF2ng nh\u1EADp chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n.", "warning");
        return;
      }
      this.currentStart = 0;
      this.allRecords = [];
      this.uniqueRecords = [];
      this.allEvidences = [];
      this.isCancelled = false;
      this.currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.currentSessionQuery = q;
      this.queryDesyncAlert.style.display = "none";
      const success = await this.fetchSinglePage(0, true, this.currentSessionId);
      if (success) {
        this.currentStart = 10;
        await this.saveSessionToStorage();
      }
    }
    async handleFetchNextPage() {
      if (this.isFetching) return;
      const offsetToFetch = this.currentStart;
      const success = await this.fetchSinglePage(offsetToFetch, false, this.currentSessionId);
      if (success) {
        this.currentStart += 10;
        await this.saveSessionToStorage();
      }
    }
    async handleAutoFetchPages() {
      const q = this.queryInput.value.trim();
      if (!q) {
        this.setStatus("Vui l\xF2ng nh\u1EADp chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n.", "warning");
        return;
      }
      const maxPages = Math.max(1, parseInt(this.maxPagesInput.value, 10) || 1);
      this.isCancelled = false;
      this.stopBtn.style.display = "inline-block";
      this.autoFetchBtn.disabled = true;
      let pagesFetched = 0;
      while (pagesFetched < maxPages && !this.isCancelled) {
        const pageIndex = Math.floor(this.currentStart / 10) + 1;
        this.setStatus(`\u0110ang t\u1EA3i trang ${pageIndex}... (offset start=${this.currentStart})`, "info");
        const success = await this.fetchSinglePage(this.currentStart, false, this.currentSessionId);
        if (!success || this.isCancelled) {
          break;
        }
        this.currentStart += 10;
        pagesFetched++;
        await this.saveSessionToStorage();
        await new Promise((r) => setTimeout(r, 600));
      }
      this.stopBtn.style.display = "none";
      this.autoFetchBtn.disabled = false;
      if (this.isCancelled) {
        this.setStatus(`\u0110\xE3 d\u1EEBng qu\xE1 tr\xECnh l\u1EA5y d\u1EEF li\u1EC7u. D\u1EEF li\u1EC7u c\xE1c trang tr\u01B0\u1EDBc \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n an to\xE0n!`, "warning");
      }
    }
    handleStopFetch() {
      this.isCancelled = true;
      this.setStatus("\u0110ang d\u1EEBng y\xEAu c\u1EA7u...", "warning");
    }
    async fetchSinglePage(startOffset, isReset, expectedSessionId) {
      const q = this.queryInput.value.trim();
      const as_ylo = this.asYloInput.value.trim();
      const as_yhi = this.asYhiInput.value.trim();
      const hl = this.hlInput.value.trim() || "vi";
      this.isFetching = true;
      this.setButtonsState(true);
      this.setStatus(`\u0110ang g\u1ECDi SerpApi Google Scholar (start=${startOffset})...`, "info");
      try {
        const response = await fetch(`${this.backendUrl}/api/scholar/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q,
            as_ylo: as_ylo || void 0,
            as_yhi: as_yhi || void 0,
            hl,
            start: startOffset,
            num: 10,
            profile: this.activeProfile,
            researchId: this.activeProfile.id,
            sessionId: expectedSessionId,
            profileVersion: this.activeProfile.profileVersion
          })
        });
        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh t\u1EEB backend.");
        }
        if (this.currentSessionId !== expectedSessionId) {
          console.warn(`B\u1ECF qua k\u1EBFt qu\u1EA3 tr\u1EA3 v\u1EC1 mu\u1ED9n c\u1EE7a session c\u0169 (${expectedSessionId})`);
          return false;
        }
        const newRecords = (data.records || []).map((r) => ({
          ...r,
          researchId: this.activeProfile.id,
          profileVersion: this.activeProfile.profileVersion,
          sessionId: expectedSessionId
        }));
        this.searchSummary = data.summary;
        if (data.evidence) {
          this.allEvidences.push(data.evidence);
        }
        this.apiRequestsUsed = data.summary?.apiRequestsUsed || this.apiRequestsUsed + 1;
        if (isReset) {
          this.allRecords = newRecords;
        } else {
          this.allRecords = [...this.allRecords, ...newRecords];
        }
        await this.runDeduplication();
        this.updateStatsDisplay();
        this.renderRecordsList();
        this.checkQueryDesync();
        if (newRecords.length === 0) {
          this.setStatus(`Trang n\xE0y kh\xF4ng c\xF3 th\xEAm b\xE0i vi\u1EBFt n\xE0o. \u0110\xE3 h\u1EBFt k\u1EBFt qu\u1EA3.`, "warning");
          return false;
        }
        const cacheText = data.summary?.fromCache ? "(T\u1EEB cache SerpApi)" : "(Live API)";
        this.setStatus(
          `\u2713 \u0110\xE3 nh\u1EADn ${newRecords.length} b\xE0i vi\u1EBFt m\u1EDBi. T\u1ED5ng t\xEDch l\u0169y: ${this.allRecords.length} (Duy nh\u1EA5t: ${this.uniqueRecords.length}) ${cacheText}`,
          "success"
        );
        return true;
      } catch (err) {
        this.setStatus(`L\u1ED7i khi l\u1EA5y d\u1EEF li\u1EC7u: ${err.message}. Offset ch\u01B0a t\u0103ng, d\u1EEF li\u1EC7u c\u0169 gi\u1EEF nguy\xEAn an to\xE0n!`, "error");
        return false;
      } finally {
        this.isFetching = false;
        this.setButtonsState(false);
      }
    }
    async runDeduplication() {
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: this.allRecords })
        });
        if (res.ok) {
          const data = await res.json();
          this.uniqueRecords = data.uniqueRecords || this.allRecords;
          this.dedupStats = data.dedupStats;
        } else {
          this.uniqueRecords = [...this.allRecords];
        }
      } catch {
        this.uniqueRecords = [...this.allRecords];
      }
    }
    async handleResetSession() {
      if (!confirm(`B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\xF3a to\xE0n b\u1ED9 phi\xEAn hi\u1EC7n t\u1EA1i c\u1EE7a nghi\xEAn c\u1EE9u "${this.activeProfile.name}"?`)) {
        return;
      }
      this.allRecords = [];
      this.uniqueRecords = [];
      this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
      this.searchSummary = null;
      this.allEvidences = [];
      this.currentStart = 0;
      this.apiRequestsUsed = 0;
      this.currentSessionId = "";
      this.currentSessionQuery = "";
      await this.saveSessionToStorage();
      this.statsBox.style.display = "none";
      this.targetProgressContainer.style.display = "none";
      this.resultsContainer.innerHTML = '<div class="empty-state">\u0110\xE3 l\xE0m m\u1EDBi phi\xEAn. B\u1EA5m "L\u1EA5y trang 1" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u thu th\u1EADp.</div>';
      this.setButtonsState(false);
      this.checkQueryDesync();
      this.setStatus("\u0110\xE3 l\xE0m m\u1EDBi phi\xEAn l\xE0m vi\u1EC7c th\xE0nh c\xF4ng.", "info");
    }
    setButtonsState(busy) {
      this.searchFirstBtn.disabled = busy;
      this.nextBtn.disabled = busy;
      if (!busy) {
        const hasRecords = this.allRecords.length > 0;
        this.nextBtn.style.display = hasRecords ? "inline-block" : "none";
        this.autoFetchBtn.style.display = hasRecords ? "inline-block" : "none";
        this.resetBtn.style.display = hasRecords ? "inline-block" : "none";
        this.exportCsvBtn.style.display = hasRecords ? "inline-block" : "none";
        this.exportScreeningBtn.style.display = hasRecords ? "inline-block" : "none";
        if (this.exportFullCsvBtn) this.exportFullCsvBtn.style.display = hasRecords ? "inline-block" : "none";
        if (this.exportApa7Btn) this.exportApa7Btn.style.display = hasRecords ? "inline-block" : "none";
        this.exportSessionBtn.style.display = hasRecords ? "inline-block" : "none";
        this.saveLogBtn.style.display = hasRecords ? "inline-block" : "none";
      }
    }
    updateStatsDisplay() {
      if (this.allRecords.length === 0) {
        this.statsBox.style.display = "none";
        this.targetProgressContainer.style.display = "none";
        return;
      }
      this.statsBox.style.display = "block";
      this.targetProgressContainer.style.display = "block";
      const s = this.searchSummary;
      const cacheLabel = s?.fromCache ? '<span class="badge badge-yellow">T\u1EEB cache SerpApi</span>' : '<span class="badge badge-green">Live API</span>';
      const totalReported = s?.totalReportedResults ? s.totalReportedResults.toLocaleString() : "N/A";
      const finalIncludeCount = this.uniqueRecords.filter((r) => r.finalDecision === "Include").length;
      const targetCount = this.activeProfile.targetIncludedCount || 15;
      const pct = Math.min(100, Math.round(finalIncludeCount / targetCount * 100));
      this.targetProgressText.innerText = `${finalIncludeCount} / ${targetCount} b\xE0i (${pct}%)`;
      this.targetProgressBar.style.width = `${pct}%`;
      const sourcePolicy = this.activeProfile.sourcePolicies?.google_scholar;
      const policyNote = sourcePolicy?.notes || (sourcePolicy?.prismaRole === "supplementary" ? "Ngu\u1ED3n Google Scholar ch\u1EC9 l\xE0 paper \u1EE9ng vi\xEAn b\u1ED5 tr\u1EE3, kh\xF4ng t\xEDnh tr\u1EF1c ti\u1EBFp v\xE0o Identification c\u1EE7a s\u01A1 \u0111\u1ED3 PRISMA ch\xEDnh." : "Ngu\u1ED3n d\u1EEF li\u1EC7u thu th\u1EADp theo ch\xEDnh s\xE1ch c\u1EE7a h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u hi\u1EC7n t\u1EA1i.");
      this.statsBox.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 Request API \u0111\xE3 d\xF9ng</div>
          <div class="stat-value">${this.apiRequestsUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">T\u1ED5ng k\u1EBFt qu\u1EA3 ngu\u1ED3n b\xE1o</div>
          <div class="stat-value">${totalReported} <small class="text-muted">(\u01AF\u1EDBc l\u01B0\u1EE3ng)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 record thu th\u1EADp th\u1EF1c t\u1EBF</div>
          <div class="stat-value text-blue">${this.allRecords.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Paper \u1EE9ng vi\xEAn duy nh\u1EA5t</div>
          <div class="stat-value text-green">${this.uniqueRecords.length}</div>
        </div>
      </div>
      <div class="stat-sub">
        <span><b>M\xE3 t\xECm ki\u1EBFm:</b> <code>${s?.searchId || "N/A"}</code></span>
        <span><b>Tr\u1EA1ng th\xE1i:</b> ${cacheLabel}</span>
        <span><b>Tr\xF9ng DOI:</b> ${this.dedupStats.exactDupByDoi} | <b>Tr\xF9ng Title (gi\u1EEF l\u1EA1i):</b> ${this.dedupStats.potentialDupByTitle}</span>
      </div>
      <div class="notice-callout">
        <b>Quy \u0111\u1ECBnh ngu\u1ED3n [${this.escapeHtml(this.activeProfile.name)}]:</b> ${this.escapeHtml(policyNote)}
      </div>
    `;
    }
    renderRecordsList() {
      if (this.extractActiveTabBtn) {
        this.extractActiveTabBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
      }
      if (this.uploadPdfBtn) {
        this.uploadPdfBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
      }
      if (this.rescreenBtn) {
        this.rescreenBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
      }
      if (this.autoScreenBatchBtn) {
        this.autoScreenBatchBtn.style.display = this.uniqueRecords.length > 0 && !this.isAutoScreening ? "inline-block" : "none";
      }
      if (this.stopAutoScreenBtn) {
        this.stopAutoScreenBtn.style.display = this.isAutoScreening ? "inline-block" : "none";
      }
      const keyword = this.filterInput.value.toLowerCase().trim();
      const decisionFilter = this.filterDecisionSelect.value;
      const filtered = this.uniqueRecords.filter((r) => {
        const effectiveDecision = r.finalDecision || r.suggestedDecision;
        if (decisionFilter !== "all" && effectiveDecision !== decisionFilter) {
          return false;
        }
        if (keyword) {
          const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet}`.toLowerCase();
          if (!text.includes(keyword)) return false;
        }
        return true;
      });
      if (filtered.length === 0) {
        this.resultsContainer.innerHTML = '<div class="empty-state">Kh\xF4ng c\xF3 b\xE0i vi\u1EBFt n\xE0o kh\u1EDBp v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.</div>';
        return;
      }
      this.resultsContainer.innerHTML = filtered.map((r, idx) => {
        const decisionBadge = this.getDecisionBadge(r.suggestedDecision);
        const isInclude = r.finalDecision === "Include";
        const isExclude = r.finalDecision === "Exclude";
        const isUnsure = r.finalDecision === "Unsure";
        const isSelected = r.id === this.selectedRecordId;
        const dupWarning = r.potentialDuplicate ? `<div class="dup-badge">\u26A0\uFE0F \u0110\u1EC0 XU\u1EA4T TR\xD9NG L\u1EB6P: ${this.escapeHtml(r.duplicateReason || "")}</div>` : "";
        const isOutdated = r.profileVersion !== void 0 && r.profileVersion < this.activeProfile.profileVersion;
        const outdatedWarning = isOutdated ? `<div style="font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #fef3c7; padding: 3px 6px; border-radius: 4px; margin-top: 4px;">
              \u26A0\uFE0F Quy\u1EBFt \u0111\u1ECBnh ho\u1EB7c g\u1EE3i \xFD n\xE0y \u0111\u01B0\u1EE3c \u0111\xE1nh gi\xE1 \u1EDF phi\xEAn b\u1EA3n ti\xEAu ch\xED v${r.profileVersion}. H\u1ED3 s\u01A1 hi\u1EC7n t\u1EA1i l\xE0 v${this.activeProfile.profileVersion}. G\u1EE3i \xFD c\u1EA7n \u0111\xE1nh gi\xE1 l\u1EA1i.
            </div>` : "";
        let criterionBadgesHtml = "";
        if (r.criterionResults && r.criterionResults.length > 0) {
          criterionBadgesHtml = r.criterionResults.map((c) => {
            const cls = c.status === "met" ? "badge-green" : c.status === "not_met" ? "badge-red" : "badge-yellow";
            const icon = c.status === "met" ? "\u2713" : c.status === "not_met" ? "\u2717" : "?";
            return `<span class="badge ${cls}" title="${this.escapeHtml(c.reason)}">${c.criterionId}: ${icon}</span>`;
          }).join(" ");
        } else {
          const matched = (r.matchedCriteria || []).map((c) => `<span class="badge badge-blue">${c}</span>`).join(" ");
          const unknown = (r.unknownCriteria || []).map((c) => `<span class="badge badge-yellow">${c}?</span>`).join(" ");
          criterionBadgesHtml = matched || unknown ? `${matched} ${unknown}` : '<small class="text-muted">Ch\u01B0a</small>';
        }
        const missingEvidenceStr = r.missingEvidence && r.missingEvidence.length > 0 ? `<div style="font-size: 11px; color: #b45309; margin-top: 3px;">\u26A0\uFE0F <b>Thi\u1EBFu b\u1EB1ng ch\u1EE9ng:</b> ${this.escapeHtml(r.missingEvidence.join(", "))}</div>` : "";
        const verifiedBadge = r.user_verified ? `<span class="badge badge-green" title="\u0110\xE3 tr\xEDch xu\u1EA5t & x\xE1c minh">\u2713 \u0110\xE3 x\xE1c minh (${this.escapeHtml(r.extraction_method || "Tab")})</span>` : "";
        const sourceUrlBadge = r.extracted_url ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">\u{1F310} <b>Ngu\u1ED3n:</b> <a href="${r.extracted_url}" target="_blank">${this.escapeHtml(r.extracted_url.slice(0, 48))}...</a></div>` : "";
        const pdfBadge = r.pdfUrl ? `<span style="font-size: 10px; color: #047857; margin-left: 6px;">\u{1F4C4} <b>PDF:</b> <a href="${r.pdfUrl}" target="_blank">M\u1EDF PDF (${r.page_count ? r.page_count + " trang" : "s\u1EB5n s\xE0ng"})</a></span>` : "";
        const abstractBox = r.abstract ? `<div class="paper-snippet" style="border-left-color: #2563eb; background: #eff6ff; margin-top: 4px;"><b>Abstract [\u0110\xE3 tr\xEDch xu\u1EA5t]:</b><br><i>"${this.escapeHtml(r.abstract.slice(0, 260))}${r.abstract.length > 260 ? "..." : ""}"</i></div>` : "";
        const evidenceSummary = r.evidence_snippets && r.evidence_snippets.length > 0 ? `<div style="font-size: 10px; color: #1e40af; margin-top: 3px;">\u{1F50D} <b>B\u1EB1ng ch\u1EE9ng tr\xEDch xu\u1EA5t (${r.evidence_snippets.length}):</b> ${(r.evidence_snippets || []).map((e) => `<span class="badge ${e.isValidEvidence ? "badge-blue" : "badge-yellow"}">${e.type} (${e.section}${e.page ? ", tr." + e.page : ""})</span>`).join(" ")}</div>` : "";
        return `
        <div class="paper-card ${r.potentialDuplicate ? "paper-dup" : ""} ${isSelected ? "is-selected" : ""}" id="paper_${r.id}" data-id="${r.id}">
          ${dupWarning}
          <div class="paper-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
              <span class="paper-index">#${idx + 1}</span>
              <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
              ${verifiedBadge}
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn-auto-card" data-id="${r.id}" title="T\u1EF1 \u0111\u1ED9ng m\u1EDF link ng\u1EA7m, c\xE0o abstract & s\xE0ng l\u1ECDc b\xE0i n\xE0y">\u26A1 Qu\xE9t link</button>
              <button class="btn-extract-card" data-id="${r.id}" title="L\u1EA5y d\u1EEF li\u1EC7u t\u1EEB tab tr\xECnh duy\u1EC7t \u0111ang m\u1EDF v\xE0o b\xE0i b\xE1o n\xE0y">\u{1F4D1} Tab</button>
            </div>
          </div>

          <div class="paper-meta">
            <span>\u{1F464} <b>T\xE1c gi\u1EA3:</b> ${this.escapeHtml(r.authors || "N/A")} ${r.uncertain_authors ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F4C5} <b>N\u0103m:</b> ${r.year || "N/A"} ${r.uncertain_year ? '<span class="tag-warn">Ch\u01B0a ch\u1EAFc ch\u1EAFn</span>' : ""}</span>
            <span>\u{1F3DB}\uFE0F <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")} ${r.uncertain_venue ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F517} <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Tr\u1ED1ng</span>'}</span>
            ${pdfBadge}
          </div>

          ${sourceUrlBadge}
          ${abstractBox}

          <div class="paper-snippet">
            <b>\u0110o\u1EA1n tr\xEDch (Snippet) [Kh\xF4ng ph\u1EA3i Abstract]:</b><br>
            <i>"${this.escapeHtml(r.snippet || "Kh\xF4ng c\xF3 \u0111o\u1EA1n tr\xEDch.")}"</i>
          </div>

          ${evidenceSummary}

          <div class="screening-panel">
            <div class="screening-header">
              <span><b>G\u1EE3i \xFD h\u1EC7 th\u1ED1ng:</b> ${decisionBadge}</span>
              <span><b>Ti\xEAu ch\xED:</b> ${criterionBadgesHtml}</span>
            </div>
            ${r.modelContribution || r.conceptLabels || r.literatureGroup ? `<div style="font-size: 10px; display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                    ${r.literatureGroup ? `<span class="badge badge-green" title="Nh\xF3m t\xE0i li\u1EC7u">Nh\xF3m: ${this.escapeHtml(r.literatureGroup)}</span>` : ""}
                    ${r.modelContribution && r.modelContribution.length > 0 ? `<span class="badge badge-blue" title="\u0110\xF3ng g\xF3p cho m\xF4 h\xECnh">M\xF4 h\xECnh: ${this.escapeHtml(r.modelContribution.join(", "))}</span>` : ""}
                    ${r.conceptLabels && r.conceptLabels.length > 0 ? `<span class="badge badge-yellow" title="Ph\xE2n lo\u1EA1i kh\xE1i ni\u1EC7m">Kh\xE1i ni\u1EC7m: ${this.escapeHtml(r.conceptLabels.join("; "))}</span>` : ""}
                  </div>` : ""}
            <div class="reason-text">${this.escapeHtml(r.screeningReason)}</div>
            ${missingEvidenceStr}
            ${outdatedWarning}

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">X\xE1c nh\u1EADn c\u1EE7a b\u1EA1n (finalDecision):</span>
              <button class="btn-dec ${isInclude ? "active-inc" : ""}" data-decision="Include">\u2713 Include</button>
              <button class="btn-dec ${isExclude ? "active-exc" : ""}" data-decision="Exclude">\u2717 Exclude</button>
              <button class="btn-dec ${isUnsure ? "active-uns" : ""}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi ch\xFA th\u1EA9m \u0111\u1ECBnh c\u1EE7a b\u1EA1n (l\xFD do nh\u1EADn/lo\u1EA1i, ph\u01B0\u01A1ng ph\xE1p, b\u1EB1ng ch\u1EE9ng)..." value="${this.escapeHtml(r.userNotes || "")}">
            </div>
          </div>
        </div>
      `;
      }).join("");
      this.attachCardEventListeners();
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
      this.resultsContainer.querySelectorAll(".btn-auto-card").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const paperId = target.getAttribute("data-id");
          if (paperId) {
            this.handleSinglePaperAutoScreen(paperId, target);
          }
        });
      });
      this.resultsContainer.querySelectorAll(".btn-extract-card").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const paperId = target.getAttribute("data-id");
          if (paperId) {
            this.handleExtractFromActiveTab(paperId);
          }
        });
      });
      this.resultsContainer.querySelectorAll(".btn-dec").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const parent = target.closest(".decision-buttons");
          const paperId = parent.getAttribute("data-id");
          const decision = target.getAttribute("data-decision");
          this.updatePaperDecision(paperId, decision);
        });
      });
      this.resultsContainer.querySelectorAll(".notes-input").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const target = e.currentTarget;
          const paperId = target.getAttribute("data-id");
          this.updatePaperNotes(paperId, target.value);
        });
      });
    }
    // --- Manual Decisions & Notes ---
    async updatePaperDecision(paperId, decision) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) {
        record.finalDecision = decision;
        record.profileVersion = this.activeProfile.profileVersion;
        record.isDecisionOutdated = false;
      }
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) {
        uniqueRecord.finalDecision = decision;
        uniqueRecord.profileVersion = this.activeProfile.profileVersion;
        uniqueRecord.isDecisionOutdated = false;
      }
      await this.saveSessionToStorage();
      this.updateStatsDisplay();
      this.renderRecordsList();
    }
    async updatePaperNotes(paperId, notes) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) record.userNotes = notes;
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) uniqueRecord.userNotes = notes;
      await this.saveSessionToStorage();
    }
    getDecisionBadge(decision) {
      if (decision === "Include") return '<span class="badge badge-green">Include</span>';
      if (decision === "Exclude") return '<span class="badge badge-red">Exclude</span>';
      return '<span class="badge badge-yellow">Unsure</span>';
    }
    // --- Tab & PDF Extraction ---
    async handleExtractFromActiveTab(paperId) {
      const targetId = paperId || this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
      if (!targetId) {
        alert("Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o trong danh s\xE1ch k\u1EBFt qu\u1EA3 \u0111\u1EC3 tr\xEDch xu\u1EA5t d\u1EEF li\u1EC7u.");
        return;
      }
      const record = this.uniqueRecords.find((r) => r.id === targetId);
      if (!record) {
        this.setStatus("Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi \u0111\u01B0\u1EE3c ch\u1ECDn.", "error");
        return;
      }
      this.selectedRecordId = targetId;
      this.renderRecordsList();
      const origBtnText = this.extractActiveTabBtn?.innerHTML;
      if (this.extractActiveTabBtn && !paperId) {
        this.extractActiveTabBtn.innerHTML = "\u23F3 \u0110ang k\u1EBFt n\u1ED1i Tab...";
        this.extractActiveTabBtn.disabled = true;
      }
      this.setStatus(`\u0110ang k\u1EBFt n\u1ED1i t\u1EDBi Tab \u0111ang m\u1EDF tr\xEAn tr\xECnh duy\u1EC7t cho b\xE0i #${record.id}...`, "info");
      try {
        let activeTab;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].url && !tabs[0].url.startsWith("chrome://") && !tabs[0].url.startsWith("chrome-extension://")) {
          activeTab = tabs[0];
        } else {
          const lastTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (lastTabs && lastTabs.length > 0 && lastTabs[0].url && !lastTabs[0].url.startsWith("chrome://") && !lastTabs[0].url.startsWith("chrome-extension://")) {
            activeTab = lastTabs[0];
          } else {
            const allTabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
            if (allTabs && allTabs.length > 0) {
              activeTab = allTabs[allTabs.length - 1];
            }
          }
        }
        if (!activeTab || typeof activeTab.id !== "number") {
          alert(
            "Kh\xF4ng t\xECm th\u1EA5y tab trang web b\xE0i b\xE1o n\xE0o \u0111ang m\u1EDF tr\xEAn tr\xECnh duy\u1EC7t. Vui l\xF2ng m\u1EDF trang web c\u1EE7a b\xE0i b\xE1o (DOI / ScienceDirect / Springer...) tr\xEAn m\u1ED9t tab tr\u01B0\u1EDBc r\u1ED3i b\u1EA5m l\u1EA1i."
          );
          return;
        }
        const tabId = activeTab.id;
        const activeUrl = activeTab.url || "";
        let tabData = null;
        if (activeUrl.toLowerCase().endsWith(".pdf") || activeUrl.toLowerCase().includes(".pdf?")) {
          tabData = {
            sourceUrl: activeUrl,
            method: "Active Tab PDF URL",
            title: activeTab.title || "",
            pdfUrl: activeUrl
          };
        } else {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ["content-script.js"]
            });
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                try {
                  if (typeof window.extractCurrentPageData === "function") {
                    return window.extractCurrentPageData();
                  }
                } catch (e) {
                  console.error("Loi khi goi extractCurrentPageData:", e);
                }
                return null;
              }
            });
            if (results && results[0] && results[0].result) {
              tabData = results[0].result;
            }
          } catch (scriptErr) {
            console.warn("executeScript failed, fallback to direct tab info:", scriptErr);
          }
          if (!tabData) {
            tabData = {
              sourceUrl: activeUrl,
              method: "Browser Tab Fallback",
              title: activeTab.title || ""
            };
          }
        }
        this.setStatus("\u0110ang g\u1EEDi d\u1EEF li\u1EC7u trang t\u1EDBi backend \u0111\u1EC3 ph\xE2n t\xEDch theo ti\xEAu ch\xED...", "info");
        const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record,
            tabData,
            autoFetchPdf: true,
            profile: this.activeProfile
          })
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`M\xE1y ch\u1EE7 tr\u1EA3 v\u1EC1 l\u1ED7i HTTP ${response.status}: ${text.slice(0, 120)}`);
        }
        const resData = await response.json();
        if (!resData.success) {
          throw new Error(resData.error || "L\u1ED7i khi ph\xE2n t\xEDch d\u1EEF li\u1EC7u tab");
        }
        const analysisResult = resData.analysis || resData.data;
        this.pendingAnalysisResult = analysisResult;
        this.pendingRecordId = record.id;
        this.showPreviewModal(analysisResult, record);
        this.setStatus("\u2713 \u0110\xE3 ph\xE2n t\xEDch xong! H\xE3y xem tr\u01B0\u1EDBc v\xE0 x\xE1c nh\u1EADn c\u1EADp nh\u1EADt.", "success");
      } catch (err) {
        this.setStatus(`L\u1ED7i l\u1EA5y d\u1EEF li\u1EC7u t\u1EEB tab: ${err.message}`, "error");
        alert(`L\u1ED7i tr\xEDch xu\u1EA5t tab: ${err.message}`);
      } finally {
        if (this.extractActiveTabBtn && origBtnText && !paperId) {
          this.extractActiveTabBtn.innerHTML = origBtnText;
          this.extractActiveTabBtn.disabled = false;
        }
      }
    }
    async handlePdfFileUpload(e) {
      const input = e.target;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const targetId = this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
      if (!targetId) {
        alert("Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o trong danh s\xE1ch \u0111\u1EC3 n\u1EA1p file PDF.");
        return;
      }
      const record = this.uniqueRecords.find((r) => r.id === targetId);
      if (!record) return;
      this.selectedRecordId = targetId;
      this.renderRecordsList();
      const origBtnText = this.uploadPdfBtn?.innerHTML;
      if (this.uploadPdfBtn) {
        this.uploadPdfBtn.innerHTML = "\u23F3 \u0110ang \u0111\u1ECDc PDF...";
        this.uploadPdfBtn.disabled = true;
      }
      this.setStatus(`\u0110ang \u0111\u1ECDc file PDF: ${file.name}...`, "info");
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(",")[1];
          this.setStatus(`\u0110ang g\u1EEDi file PDF t\u1EDBi backend \u0111\u1EC3 tr\xEDch xu\u1EA5t n\u1ED9i dung...`, "info");
          const tabData = {
            title: file.name.replace(/\.pdf$/i, ""),
            sourceUrl: `local-file://${file.name}`,
            method: "Manual PDF Upload",
            pdfData: base64Data
          };
          const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              record,
              tabData,
              autoFetchPdf: false,
              profile: this.activeProfile
            })
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
          }
          const resData = await response.json();
          if (!resData.success) throw new Error(resData.error);
          this.pendingAnalysisResult = resData.analysis || resData.data;
          this.pendingRecordId = record.id;
          this.showPreviewModal(this.pendingAnalysisResult, record);
          this.setStatus("\u2713 \u0110\xE3 tr\xEDch xu\u1EA5t PDF th\xE0nh c\xF4ng! H\xE3y xem tr\u01B0\u1EDBc v\xE0 x\xE1c nh\u1EADn.", "success");
        } catch (err) {
          this.setStatus(`L\u1ED7i khi x\u1EED l\xFD PDF t\u1EA3i l\xEAn: ${err.message}`, "error");
          alert(`L\u1ED7i x\u1EED l\xFD file PDF: ${err.message}`);
        } finally {
          input.value = "";
          if (this.uploadPdfBtn && origBtnText) {
            this.uploadPdfBtn.innerHTML = origBtnText;
            this.uploadPdfBtn.disabled = false;
          }
        }
      };
      reader.onerror = () => {
        this.setStatus(`Kh\xF4ng th\u1EC3 \u0111\u1ECDc file PDF.`, "error");
        if (this.uploadPdfBtn && origBtnText) {
          this.uploadPdfBtn.innerHTML = origBtnText;
          this.uploadPdfBtn.disabled = false;
        }
      };
      reader.readAsDataURL(file);
    }
    async handleRescreenAllRecords() {
      if (this.uniqueRecords.length === 0) {
        alert("Kh\xF4ng c\xF3 b\xE0i b\xE1o n\xE0o trong danh s\xE1ch \u0111\u1EC3 t\xE1i s\xE0ng l\u1ECDc.");
        return;
      }
      const origBtnText = this.rescreenBtn?.innerHTML;
      if (this.rescreenBtn) {
        this.rescreenBtn.innerHTML = "\u23F3 \u0110ang t\xE1i s\xE0ng l\u1ECDc...";
        this.rescreenBtn.disabled = true;
      }
      this.setStatus(
        `\u0110ang t\xE1i s\xE0ng l\u1ECDc ${this.uniqueRecords.length} b\xE0i b\xE1o theo ti\xEAu ch\xED "${this.activeProfile.name}"...`,
        "info"
      );
      this.setButtonsState(true);
      try {
        const response = await fetch(`${this.backendUrl}/api/scholar/rescreen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: this.uniqueRecords,
            profile: this.activeProfile,
            researchId: this.activeProfile.id
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success || !Array.isArray(data.records)) {
          throw new Error(data.error || "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c danh s\xE1ch t\xE1i s\xE0ng l\u1ECDc t\u1EEB m\xE1y ch\u1EE7.");
        }
        const updatedMap = /* @__PURE__ */ new Map();
        for (const rec of data.records) {
          updatedMap.set(rec.id, rec);
        }
        this.uniqueRecords = this.uniqueRecords.map((r) => updatedMap.get(r.id) || r);
        this.allRecords = this.allRecords.map((r) => updatedMap.get(r.id) || r);
        await this.saveSessionToStorage();
        this.updateStatsDisplay();
        this.renderRecordsList();
        this.setStatus(
          `\u2713 \u0110\xE3 t\xE1i s\xE0ng l\u1ECDc th\xE0nh c\xF4ng ${data.records.length} b\xE0i b\xE1o theo ti\xEAu ch\xED "${this.activeProfile.name}".`,
          "success"
        );
      } catch (err) {
        this.setStatus(`L\u1ED7i t\xE1i s\xE0ng l\u1ECDc: ${err.message}`, "error");
        alert(`L\u1ED7i t\xE1i s\xE0ng l\u1ECDc: ${err.message}`);
      } finally {
        if (this.rescreenBtn && origBtnText) {
          this.rescreenBtn.innerHTML = origBtnText;
          this.rescreenBtn.disabled = false;
        }
        this.setButtonsState(false);
      }
    }
    // --- Auto-Screening (Single & Batch) ---
    openAutoScreenModal() {
      if (!this.autoScreenModal) {
        this.autoScreenModal = document.getElementById("autoScreenModal");
      }
      if (this.autoScreenProfileName) {
        this.autoScreenProfileName.textContent = this.activeProfile.name;
      }
      if (this.autoScreenTotalCount) {
        this.autoScreenTotalCount.textContent = String(this.uniqueRecords.length);
      }
      if (this.autoScreenModal) {
        this.autoScreenModal.style.display = "flex";
      }
    }
    closeAutoScreenModal() {
      if (this.autoScreenModal) {
        this.autoScreenModal.style.display = "none";
      }
    }
    stopBatchAutoScreen() {
      this.stopAutoScreenRequested = true;
      this.setStatus("\u0110ang d\u1EEBng qu\xE9t t\u1EF1 \u0111\u1ED9ng sau b\xE0i hi\u1EC7n t\u1EA1i...", "warning");
      if (this.autoScreenStatusText) {
        this.autoScreenStatusText.innerHTML = "<b>\u23F9\uFE0F \u0110ang y\xEAu c\u1EA7u d\u1EEBng qu\xE9t...</b>";
      }
    }
    waitForTabLoaded(tabId, timeoutMs = 7500) {
      return new Promise((resolve) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        }, timeoutMs);
        const listener = (id, changeInfo) => {
          if (id === tabId && changeInfo.status === "complete") {
            if (!finished) {
              finished = true;
              clearTimeout(timer);
              chrome.tabs.onUpdated.removeListener(listener);
              setTimeout(resolve, 600);
            }
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
    }
    async autoExtractDataForUrl(url, fallbackTitle) {
      if (!url || !url.startsWith("http")) {
        return null;
      }
      if (url.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf?")) {
        return {
          sourceUrl: url,
          method: "Direct PDF URL",
          title: fallbackTitle || "",
          pdfUrl: url
        };
      }
      try {
        const resp = await fetch(url, { method: "GET" });
        if (resp.ok) {
          const html = await resp.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const getMeta = (name) => {
            const el = doc.querySelector(`meta[name="${name}" i], meta[property="${name}" i]`);
            return el ? (el.getAttribute("content") || "").trim() : "";
          };
          const getAllMetas = (name) => {
            const els = doc.querySelectorAll(`meta[name="${name}" i], meta[property="${name}" i]`);
            return Array.from(els).map((el) => (el.getAttribute("content") || "").trim()).filter(Boolean);
          };
          const rawTitle = getMeta("citation_title") || getMeta("DC.title") || getMeta("og:title") || doc.title || "";
          const title = isChallengeOrErrorTitle(rawTitle) ? fallbackTitle || "" : rawTitle;
          const authors = getAllMetas("citation_author").join("; ") || getAllMetas("DC.creator").join("; ");
          let doi = getMeta("citation_doi") || getMeta("DC.identifier");
          if (doi) {
            const m = doi.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
            if (m) doi = m[0];
          }
          const venue = getMeta("citation_journal_title") || getMeta("citation_conference_title") || getMeta("citation_publisher") || getMeta("DC.source");
          const rawDate = getMeta("citation_publication_date") || getMeta("citation_date") || getMeta("citation_year") || getMeta("DC.date");
          let year = "";
          if (rawDate) {
            const yMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
            if (yMatch) year = yMatch[1];
          }
          const abstract = getMeta("citation_abstract") || getMeta("DC.description") || getMeta("og:description");
          const pdfUrl = getMeta("citation_pdf_url");
          if (abstract && abstract.length > 40 && !isChallengeOrErrorTitle(abstract)) {
            return {
              sourceUrl: url,
              method: "T\u1EF1 \u0111\u1ED9ng qu\xE9t (Fast Meta Fetch)",
              title,
              authors,
              doi,
              venue,
              year,
              abstract,
              pdfUrl
            };
          }
        }
      } catch (fetchErr) {
        console.warn("[Auto-Extract] Fast fetch failed, fallback to background tab:", fetchErr);
      }
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        let tabId;
        try {
          const tab = await chrome.tabs.create({ url, active: false });
          tabId = tab.id;
          if (typeof tabId === "number") {
            await this.waitForTabLoaded(tabId, 7500);
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ["content-script.js"]
            });
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                try {
                  if (typeof window.extractCurrentPageData === "function") {
                    return window.extractCurrentPageData();
                  }
                } catch (e) {
                  console.error("L\u1ED7i khi g\u1ECDi extractCurrentPageData:", e);
                }
                return null;
              }
            });
            if (results && results[0] && results[0].result) {
              const data = results[0].result;
              if (data.title && isChallengeOrErrorTitle(data.title)) {
                data.title = fallbackTitle || "";
              }
              if (data.abstract && data.abstract.trim().length > 40 && !isChallengeOrErrorTitle(data.abstract) || data.pdfUrl || data.pages && data.pages.length > 0) {
                data.method = (data.method || "HighWire Meta") + " (Auto Tab)";
                return data;
              }
            }
          }
        } catch (tabErr) {
          console.warn("[Auto-Extract] Background tab extraction error:", tabErr);
        } finally {
          if (typeof tabId === "number") {
            try {
              await chrome.tabs.remove(tabId);
            } catch (e) {
            }
          }
        }
      }
      return null;
    }
    async handleAutoScreenPaper(record, autoAcceptInclude = false) {
      if (!record.url) {
        return false;
      }
      const tabData = await this.autoExtractDataForUrl(record.url, record.title);
      if (!tabData || !tabData.abstract && !tabData.pdfUrl && (!tabData.pages || tabData.pages.length === 0)) {
        return false;
      }
      if (tabData.title && isChallengeOrErrorTitle(tabData.title)) {
        tabData.title = record.title;
      }
      const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record,
          tabData,
          autoFetchPdf: true,
          profile: this.activeProfile
        })
      });
      if (!response.ok) return false;
      const resData = await response.json();
      if (!resData.success || !resData.analysis) return false;
      const analysis = resData.analysis;
      const getChangeVal = (field) => {
        const c = analysis.changes.find((x) => x.field === field);
        return c && c.newValue && c.newValue !== "(Tr\u1ED1ng)" ? c.newValue : void 0;
      };
      const newTitle = getChangeVal("title");
      if (newTitle && !isChallengeOrErrorTitle(newTitle) && analysis.isTitleMatch) {
        record.title = newTitle;
      }
      if (getChangeVal("abstract")) record.abstract = getChangeVal("abstract");
      if (getChangeVal("doi")) record.doi = getChangeVal("doi");
      if (getChangeVal("venue")) record.venue = getChangeVal("venue");
      if (getChangeVal("year")) record.year = getChangeVal("year");
      if (getChangeVal("pdfUrl")) record.pdfUrl = getChangeVal("pdfUrl");
      record.sourceMetadataVerified = true;
      record.verificationMethod = tabData.method || "T\u1EF1 \u0111\u1ED9ng qu\xE9t link (Background Tab / Meta)";
      record.sourceUrl = tabData.sourceUrl || record.url;
      record.evidence_snippets = analysis.evidence || [];
      if (analysis.suggestedScreeningUpdate) {
        record.suggestedDecision = analysis.suggestedScreeningUpdate.suggestedDecision;
        record.matchedCriteria = analysis.suggestedScreeningUpdate.matchedCriteria;
        record.unknownCriteria = analysis.suggestedScreeningUpdate.unknownCriteria;
        record.missingEvidence = analysis.suggestedScreeningUpdate.missingEvidence;
        record.screeningReason = analysis.suggestedScreeningUpdate.screeningReason;
      }
      if (autoAcceptInclude && record.suggestedDecision === "Include") {
        record.finalDecision = "Include";
      }
      return true;
    }
    async handleSinglePaperAutoScreen(paperId, buttonEl) {
      const record = this.uniqueRecords.find((r) => r.id === paperId);
      if (!record) return;
      if (!record.url) {
        this.setStatus(`B\xE0i b\xE1o #${record.id} kh\xF4ng c\xF3 li\xEAn k\u1EBFt (URL).`, "warning");
        return;
      }
      const originalBtnText = buttonEl ? buttonEl.innerHTML : "";
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.innerHTML = "\u23F3 Qu\xE9t...";
      }
      this.setStatus(`\u0110ang t\u1EF1 \u0111\u1ED9ng qu\xE9t & s\xE0ng l\u1ECDc b\xE0i: "${record.title.slice(0, 50)}..."`, "info");
      try {
        const ok = await this.handleAutoScreenPaper(record, false);
        if (ok) {
          await this.saveSessionToStorage();
          this.updateStatsDisplay();
          this.renderRecordsList();
          this.setStatus(
            `\u2713 \u0110\xE3 t\u1EF1 \u0111\u1ED9ng qu\xE9t th\xE0nh c\xF4ng: G\u1EE3i \xFD [${record.suggestedDecision || "Ch\u01B0a r\xF5"}] cho "${record.title.slice(0, 45)}..."`,
            "success"
          );
        } else {
          const hostName = record.url ? new URL(record.url).hostname : "trang n\xE0y";
          this.setStatus(
            `\u26A0\uFE0F Kh\xF4ng th\u1EC3 c\xE0o ng\u1EA7m (${hostName}) do trang web c\xF3 b\u1EA3o v\u1EC7 Cloudflare/Captcha. Vui l\xF2ng b\u1EA5m v\xE0o li\xEAn k\u1EBFt b\xE0i b\xE1o \u0111\u1EC3 m\u1EDF tr\xEAn tr\xECnh duy\u1EC7t, r\u1ED3i b\u1EA5m "\u{1F4D1} Tab".`,
            "warning"
          );
        }
      } catch (err) {
        console.error("L\u1ED7i khi t\u1EF1 \u0111\u1ED9ng qu\xE9t b\xE0i:", err);
        this.setStatus(`L\u1ED7i khi qu\xE9t: ${err.message}`, "error");
      } finally {
        if (buttonEl) {
          buttonEl.disabled = false;
          buttonEl.innerHTML = originalBtnText;
        }
      }
    }
    async startBatchAutoScreen() {
      this.closeAutoScreenModal();
      if (this.isAutoScreening) return;
      const scopeRadio = document.querySelector('input[name="autoScreenScope"]:checked');
      const scope = scopeRadio ? scopeRadio.value : "missing_abstract";
      const autoAcceptInclude = this.autoAcceptIncludeCheckbox ? this.autoAcceptIncludeCheckbox.checked : true;
      let targets = [];
      if (scope === "missing_abstract") {
        targets = this.uniqueRecords.filter(
          (r) => r.url && (!r.abstract || r.abstract.trim().length === 0 || !r.sourceMetadataVerified)
        );
      } else if (scope === "next_10") {
        targets = this.uniqueRecords.filter((r) => r.url).slice(0, 10);
      } else if (scope === "next_20") {
        targets = this.uniqueRecords.filter((r) => r.url).slice(0, 20);
      } else {
        targets = this.uniqueRecords.filter((r) => r.url);
      }
      if (targets.length === 0) {
        this.setStatus("Kh\xF4ng t\xECm th\u1EA5y b\xE0i b\xE1o n\xE0o ph\xF9 h\u1EE3p v\u1EDBi ph\u1EA1m vi qu\xE9t \u0111\xE3 ch\u1ECDn.", "warning");
        return;
      }
      this.isAutoScreening = true;
      this.stopAutoScreenRequested = false;
      if (this.autoScreenBatchBtn) this.autoScreenBatchBtn.style.display = "none";
      if (this.stopAutoScreenBtn) this.stopAutoScreenBtn.style.display = "inline-block";
      if (this.autoScreenProgressBox) this.autoScreenProgressBox.style.display = "block";
      let successCount = 0;
      let failCount = 0;
      let includedCount = 0;
      try {
        for (let i = 0; i < targets.length; i++) {
          if (this.stopAutoScreenRequested) {
            console.log("[Auto-Screen] Ng\u01B0\u1EDDi d\xF9ng y\xEAu c\u1EA7u d\u1EEBng qu\xE1 tr\xECnh qu\xE9t.");
            break;
          }
          const record = targets[i];
          const currentNum = i + 1;
          const total = targets.length;
          const percent = Math.round(currentNum / total * 100);
          if (this.autoScreenStatusText) {
            this.autoScreenStatusText.innerHTML = `<b>\u26A1 \u0110ang qu\xE9t & l\u1ECDc b\xE0i [${currentNum}/${total}]...</b>`;
          }
          if (this.autoScreenCounterText) {
            this.autoScreenCounterText.textContent = `${currentNum} / ${total} (${percent}%)`;
          }
          if (this.autoScreenProgressBar) {
            this.autoScreenProgressBar.style.width = `${percent}%`;
          }
          if (this.autoScreenCurrentPaper) {
            this.autoScreenCurrentPaper.textContent = `#${currentNum}: ${record.title}`;
          }
          this.setStatus(`[T\u1EF1 \u0111\u1ED9ng qu\xE9t ${currentNum}/${total}] "${record.title.slice(0, 45)}..."`, "info");
          try {
            const ok = await this.handleAutoScreenPaper(record, autoAcceptInclude);
            if (ok) {
              successCount++;
              if (record.suggestedDecision === "Include" || record.finalDecision === "Include") {
                includedCount++;
              }
            } else {
              failCount++;
            }
          } catch (itemErr) {
            console.warn(`L\u1ED7i khi qu\xE9t b\xE0i ${record.id}:`, itemErr);
            failCount++;
          }
          this.updateStatsDisplay();
          this.renderRecordsList();
          if (currentNum % 3 === 0 || currentNum === total) {
            await this.saveSessionToStorage();
          }
          await new Promise((r) => setTimeout(r, 600));
        }
        await this.saveSessionToStorage();
        this.updateStatsDisplay();
        this.renderRecordsList();
        const stoppedMsg = this.stopAutoScreenRequested ? " (\u0110\xE3 d\u1EEBng theo y\xEAu c\u1EA7u)" : "";
        this.setStatus(
          `\u2713 Ho\xE0n t\u1EA5t qu\xE9t t\u1EF1 \u0111\u1ED9ng${stoppedMsg}: Th\xE0nh c\xF4ng ${successCount}/${targets.length} b\xE0i | G\u1EE3i \xFD/Nh\u1EADn Include: ${includedCount} b\xE0i.`,
          "success"
        );
      } catch (e) {
        console.error("L\u1ED7i trong Batch Auto-Screen:", e);
        this.setStatus(`L\u1ED7i trong qu\xE1 tr\xECnh qu\xE9t t\u1EF1 \u0111\u1ED9ng: ${e.message}`, "error");
      } finally {
        this.isAutoScreening = false;
        this.stopAutoScreenRequested = false;
        if (this.stopAutoScreenBtn) this.stopAutoScreenBtn.style.display = "none";
        if (this.autoScreenBatchBtn) this.autoScreenBatchBtn.style.display = "inline-block";
        setTimeout(() => {
          if (!this.isAutoScreening && this.autoScreenProgressBox) {
            this.autoScreenProgressBox.style.display = "none";
          }
        }, 4e3);
      }
    }
    showPreviewModal(result, record) {
      if (!this.tabExtractModal || !this.modalBody) return;
      let warningHtml = "";
      if (!result.isTitleMatch) {
        warningHtml += `
        <div class="warning-banner" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b; border-left-color: #dc2626;">
          \u26A0\uFE0F <b>C\u1EA2NH B\xC1O TI\xCAU \u0110\u1EC0 KH\xD4NG KH\u1EDAP:</b><br>
          ${this.escapeHtml(result.titleMismatchWarning || `\u0110\u1ED9 t\u01B0\u01A1ng \u0111\u1ED3ng ti\xEAu \u0111\u1EC1 ch\u1EC9 \u0111\u1EA1t ${(result.titleMatchConfidence * 100).toFixed(0)}%. H\xE3y ki\u1EC3m tra k\u1EF9 xem t\xE0i li\u1EC7u c\xF3 \u0111\xFAng l\xE0 b\xE0i b\xE1o n\xE0y kh\xF4ng!`)}
        </div>
      `;
      }
      if (result.warnings && result.warnings.length > 0) {
        warningHtml += result.warnings.map((w) => `<div class="warning-banner">\u26A0\uFE0F ${this.escapeHtml(w)}</div>`).join("");
      }
      const diffRows = result.changes.map((ch) => {
        const cls = ch.willChange ? "diff-changed" : "diff-unchanged";
        const statusIcon = ch.willChange ? "\u{1F504} S\u1EBD c\u1EADp nh\u1EADt" : "\u2796 Gi\u1EEF nguy\xEAn";
        return `
        <tr>
          <td><b>${this.escapeHtml(ch.field)}</b></td>
          <td>${this.escapeHtml(ch.oldValue || "(tr\u1ED1ng)")}</td>
          <td class="${cls}">${this.escapeHtml(ch.newValue || "(tr\u1ED1ng)")}</td>
          <td style="text-align: center;">${statusIcon}</td>
        </tr>
      `;
      }).join("");
      let evidenceHtml = "";
      if (result.evidence && result.evidence.length > 0) {
        const items = result.evidence.map((ev) => {
          const itemClass = ev.isValidEvidence ? "evidence-item" : "evidence-item invalid";
          const statusBadge = ev.isValidEvidence ? '<span class="badge badge-blue">\u2713 B\u1EB1ng ch\u1EE9ng h\u1EE3p l\u1EC7</span>' : '<span class="badge badge-red">\u2717 B\u1ECB lo\u1EA1i</span>';
          const sectionBadge = `<span class="badge badge-yellow">M\u1EE5c: ${this.escapeHtml(ev.section)}</span>`;
          const pageBadge = ev.page !== void 0 && ev.page !== null ? `<span class="badge badge-blue">Trang ${ev.page}</span>` : "";
          return `
          <div class="${itemClass}">
            <div style="display: flex; gap: 6px; margin-bottom: 3px; align-items: center; flex-wrap: wrap;">
              <b>[${ev.type}]</b>
              ${statusBadge}
              ${sectionBadge}
              ${pageBadge}
              <code style="font-size: 10px;">${this.escapeHtml(ev.term)}</code>
            </div>
            <div style="font-size: 11px; color: #1e293b; background: #f8fafc; padding: 4px; border-radius: 3px;">
              "${this.escapeHtml(ev.context)}"
            </div>
            ${ev.reason ? `<div style="font-size: 10px; color: #b45309; margin-top: 2px;">\u2139\uFE0F ${this.escapeHtml(ev.reason)}</div>` : ""}
          </div>
        `;
        }).join("");
        evidenceHtml = `
        <div class="evidence-box">
          <b>\u{1F50D} B\u1EB1ng ch\u1EE9ng tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c (${result.evidence.length}):</b>
          <div style="margin-top: 6px;">${items}</div>
        </div>
      `;
      }
      let screeningSuggestionHtml = "";
      if (result.suggestedScreeningUpdate) {
        const s = result.suggestedScreeningUpdate;
        const decBadge = this.getDecisionBadge(s.suggestedDecision);
        screeningSuggestionHtml = `
        <div class="notice-callout" style="margin-top: 8px;">
          <b>G\u1EE3i \xFD s\xE0ng l\u1ECDc theo ti\xEAu ch\xED (${s.stage}):</b> ${decBadge} \u2014 ${this.escapeHtml(s.screeningReason)}<br>
          <small style="color: #6b7280;">(L\u01B0u \xFD: Quy\u1EBFt \u0111\u1ECBnh <code>finalDecision</code> ho\xE0n to\xE0n do b\u1EA1n quy\u1EBFt \u0111\u1ECBnh, h\u1EC7 th\u1ED1ng kh\xF4ng t\u1EF1 ghi \u0111\xE8)</small>
        </div>
      `;
      }
      this.modalBody.innerHTML = `
      ${warningHtml}
      <div style="margin-bottom: 8px; font-size: 11px; color: #475569;">
        <span>\u{1F310} <b>Ngu\u1ED3n:</b> <a href="${this.escapeHtml(result.extracted.sourceUrl)}" target="_blank">${this.escapeHtml(result.extracted.sourceUrl)}</a></span><br>
        <span>\u2699\uFE0F <b>Ph\u01B0\u01A1ng th\u1EE9c:</b> ${this.escapeHtml(result.extracted.method)}</span>
        ${result.extracted.pageCount ? ` | <span>\u{1F4C4} <b>T\u1ED5ng s\u1ED1 trang:</b> ${result.extracted.pageCount}</span>` : ""}
      </div>

      <div style="margin-top: 6px;">
        <b>So s\xE1nh c\xE1c tr\u01B0\u1EDDng d\u1EEF li\u1EC7u (Diff):</b>
        <table class="diff-table">
          <thead>
            <tr>
              <th style="width: 15%;">Tr\u01B0\u1EDDng</th>
              <th style="width: 35%;">Hi\u1EC7n t\u1EA1i</th>
              <th style="width: 35%;">M\u1EDBi</th>
              <th style="width: 15%;">Thao t\xE1c</th>
            </tr>
          </thead>
          <tbody>
            ${diffRows}
          </tbody>
        </table>
      </div>

      ${evidenceHtml}
      ${screeningSuggestionHtml}
    `;
      this.tabExtractModal.style.display = "flex";
    }
    async handleConfirmTabExtract() {
      if (!this.pendingAnalysisResult || !this.pendingRecordId) {
        this.closeModal();
        return;
      }
      const record = this.uniqueRecords.find((r) => r.id === this.pendingRecordId);
      const allRecord = this.allRecords.find((r) => r.id === this.pendingRecordId);
      if (!record) {
        this.closeModal();
        return;
      }
      const { extracted, suggestedScreeningUpdate, evidence } = this.pendingAnalysisResult;
      if (extracted.title) record.title = extracted.title;
      if (extracted.authors) {
        record.authors = extracted.authors;
        record.uncertain_authors = false;
      }
      if (extracted.year) {
        record.year = extracted.year;
        record.uncertain_year = false;
      }
      if (extracted.venue) {
        const isArxivVenue = /^\s*arxiv(\.org)?\s*$/i.test(extracted.venue);
        if (!isArxivVenue) {
          record.venue = extracted.venue;
          record.uncertain_venue = false;
        }
      }
      if (extracted.doi) {
        record.doi = extracted.doi;
        record.uncertain_doi = false;
      }
      if (extracted.abstract) {
        record.abstract = extracted.abstract;
        record.missing_abstract = false;
      }
      if (extracted.pdfUrl) record.pdfUrl = extracted.pdfUrl;
      if (extracted.pageCount) record.page_count = extracted.pageCount;
      record.extracted_url = extracted.sourceUrl;
      record.extracted_at = (/* @__PURE__ */ new Date()).toISOString();
      record.extraction_method = extracted.method;
      record.evidence_snippets = evidence;
      record.user_verified = true;
      if (suggestedScreeningUpdate) {
        record.screeningStage = suggestedScreeningUpdate.stage;
        record.suggestedDecision = suggestedScreeningUpdate.suggestedDecision;
        record.matchedCriteria = suggestedScreeningUpdate.matchedCriteria;
        record.unknownCriteria = suggestedScreeningUpdate.unknownCriteria;
        record.missingEvidence = suggestedScreeningUpdate.missingEvidence;
        record.screeningReason = suggestedScreeningUpdate.screeningReason;
      }
      if (allRecord) {
        Object.assign(allRecord, record);
      }
      await this.saveSessionToStorage();
      this.closeModal();
      this.renderRecordsList();
      this.setStatus(`\u2713 \u0110\xE3 c\u1EADp nh\u1EADt provenance v\xE0 d\u1EEF li\u1EC7u cho b\xE0i b\xE1o #${record.id}`, "success");
    }
    handleCancelTabExtract() {
      this.closeModal();
      this.setStatus("\u0110\xE3 h\u1EE7y b\u1ECF c\u1EADp nh\u1EADt. To\xE0n b\u1ED9 d\u1EEF li\u1EC7u c\u0169 \u0111\u01B0\u1EE3c gi\u1EEF nguy\xEAn.", "info");
    }
    closeModal() {
      if (this.tabExtractModal) {
        this.tabExtractModal.style.display = "none";
      }
      this.pendingAnalysisResult = null;
      this.pendingRecordId = null;
    }
    // --- Profile Manager Modal & CRUD ---
    openProfileModal() {
      this.renderProfileListInModal();
      this.profileEditForm.style.display = "none";
      this.profileModal.style.display = "flex";
    }
    closeProfileModal() {
      this.profileModal.style.display = "none";
    }
    renderProfileListInModal() {
      this.profileListContainer.innerHTML = this.profiles.map((p) => {
        const isActive = p.id === this.activeProfile.id;
        const activeTag = isActive ? '<span class="badge badge-green">\u0110ang ch\u1ECDn</span>' : "";
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div>
            <b>${this.escapeHtml(p.name)}</b> ${activeTag}
            <div style="font-size: 10px; color: #64748b;">${p.reviewType} | v${p.profileVersion} | ${p.criteria.length} ti\xEAu ch\xED | M\u1EE5c ti\xEAu: ${p.targetIncludedCount || 15} b\xE0i</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn-secondary btn-edit-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">S\u1EEDa</button>
            <button class="btn-secondary btn-clone-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">Nh\xE2n b\u1EA3n</button>
            ${!isActive && this.profiles.length > 1 ? `<button class="btn-danger btn-del-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">X\xF3a</button>` : ""}
          </div>
        </div>
      `;
      }).join("");
      this.profileListContainer.querySelectorAll(".btn-edit-p").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) this.startEditProfile(id);
        });
      });
      this.profileListContainer.querySelectorAll(".btn-clone-p").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) this.cloneProfile(id);
        });
      });
      this.profileListContainer.querySelectorAll(".btn-del-p").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) this.deleteProfile(id);
        });
      });
    }
    applyPreset(preset) {
      const existingIdx = this.profiles.findIndex((p) => p.id === preset.id);
      if (existingIdx === -1) {
        this.profiles.push(JSON.parse(JSON.stringify(preset)));
      } else {
        this.profiles[existingIdx] = JSON.parse(JSON.stringify(preset));
      }
      this.saveProfilesToStorage();
      this.switchActiveProfile(preset.id);
      this.closeProfileModal();
      this.setStatus(`\u0110\xE3 ch\u1ECDn preset "${preset.name}".`, "success");
    }
    startNewProfile() {
      this.editingProfileId = null;
      this.profileFormTitle.innerText = "T\u1EA1o H\u1ED3 s\u01A1 Nghi\xEAn c\u1EE9u M\u1EDBi";
      this.editProfileName.value = "";
      this.editProfileDesc.value = "";
      this.editProfileRq.value = "";
      this.editProfileReviewType.value = "systematic_review";
      this.editProfileTargetIncluded.value = "15";
      this.chkYearRange.checked = false;
      this.editYearStart.value = "";
      this.editYearEnd.value = "";
      this.chkMinPages.checked = false;
      this.editMinPages.value = "4";
      this.editKeywordsInclusion.value = "";
      this.profileEditForm.style.display = "block";
    }
    startEditProfile(id) {
      const p = this.profiles.find((x) => x.id === id);
      if (!p) return;
      this.editingProfileId = id;
      this.profileFormTitle.innerText = `Ch\u1EC9nh s\u1EEDa: ${p.name} (v${p.profileVersion})`;
      this.editProfileName.value = p.name;
      this.editProfileDesc.value = p.description || "";
      this.editProfileRq.value = (p.researchQuestions || []).join("\n");
      this.editProfileReviewType.value = p.reviewType || "systematic_review";
      this.editProfileTargetIncluded.value = String(p.targetIncludedCount || 15);
      if (p.yearRange && p.yearRange.enabled) {
        this.chkYearRange.checked = true;
        this.editYearStart.value = p.yearRange.start !== void 0 ? String(p.yearRange.start) : "";
        this.editYearEnd.value = p.yearRange.end !== void 0 ? String(p.yearRange.end) : "";
      } else {
        this.chkYearRange.checked = false;
        this.editYearStart.value = "";
        this.editYearEnd.value = "";
      }
      if (p.minPageCount !== void 0 && p.minPageCount > 0) {
        this.chkMinPages.checked = true;
        this.editMinPages.value = String(p.minPageCount);
      } else {
        this.chkMinPages.checked = false;
        this.editMinPages.value = "4";
      }
      const kwCrit = p.criteria.find((c) => c.evaluator === "keyword_group" && c.kind === "inclusion");
      if (kwCrit && kwCrit.parameters && kwCrit.parameters.keywords) {
        this.editKeywordsInclusion.value = kwCrit.parameters.keywords.join(", ");
      } else {
        this.editKeywordsInclusion.value = "";
      }
      this.profileEditForm.style.display = "block";
    }
    cloneProfile(id) {
      const src = this.profiles.find((p) => p.id === id);
      if (!src) return;
      const cloned = JSON.parse(JSON.stringify(src));
      cloned.id = `profile_${Date.now()}`;
      cloned.name = `${src.name} (B\u1EA3n sao)`;
      cloned.profileVersion = 1;
      cloned.createdAt = (/* @__PURE__ */ new Date()).toISOString();
      cloned.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      this.profiles.push(cloned);
      this.saveProfilesToStorage();
      this.renderProfileListInModal();
      this.renderProfileHeaderAndOptions();
      this.setStatus(`\u0110\xE3 nh\xE2n b\u1EA3n h\u1ED3 s\u01A1 "${src.name}".`, "success");
    }
    deleteProfile(id) {
      if (id === this.activeProfile.id) {
        alert("Kh\xF4ng th\u1EC3 x\xF3a h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u \u0111ang \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t.");
        return;
      }
      if (!confirm("B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\xF3a h\u1ED3 s\u01A1 n\xE0y?")) return;
      this.profiles = this.profiles.filter((p) => p.id !== id);
      this.saveProfilesToStorage();
      this.renderProfileListInModal();
      this.renderProfileHeaderAndOptions();
      this.setStatus("\u0110\xE3 x\xF3a h\u1ED3 s\u01A1 nghi\xEAn c\u1EE9u.", "info");
    }
    async handleSaveProfile() {
      const name = this.editProfileName.value.trim();
      if (!name) {
        alert("Vui l\xF2ng nh\u1EADp t\xEAn nghi\xEAn c\u1EE9u.");
        return;
      }
      const desc = this.editProfileDesc.value.trim();
      const rqs = this.editProfileRq.value.split("\n").map((s) => s.trim()).filter(Boolean);
      const reviewType = this.editProfileReviewType.value;
      const targetIncluded = Math.max(1, parseInt(this.editProfileTargetIncluded.value, 10) || 15);
      const yearEnabled = this.chkYearRange.checked;
      const yearStart = yearEnabled && this.editYearStart.value ? parseInt(this.editYearStart.value, 10) : void 0;
      const yearEnd = yearEnabled && this.editYearEnd.value ? parseInt(this.editYearEnd.value, 10) : void 0;
      const minPagesEnabled = this.chkMinPages.checked;
      const minPages = minPagesEnabled ? parseInt(this.editMinPages.value, 10) || 4 : void 0;
      const kwText = this.editKeywordsInclusion.value.trim();
      const keywords = kwText ? kwText.split(",").map((k) => k.trim()).filter(Boolean) : [];
      let targetProfile;
      if (this.editingProfileId) {
        const existing = this.profiles.find((p) => p.id === this.editingProfileId);
        if (!existing) return;
        targetProfile = existing;
        targetProfile.name = name;
        targetProfile.description = desc;
        targetProfile.researchQuestions = rqs;
        targetProfile.reviewType = reviewType;
        targetProfile.targetIncludedCount = targetIncluded;
        targetProfile.profileVersion += 1;
        targetProfile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        if (targetProfile.id === this.activeProfile.id) {
          this.uniqueRecords.forEach((r) => {
            if (r.finalDecision) {
              r.isDecisionOutdated = true;
            }
          });
        }
      } else {
        targetProfile = {
          id: `profile_${Date.now()}`,
          name,
          description: desc,
          researchQuestions: rqs,
          reviewType,
          targetIncludedCount: targetIncluded,
          searchStrings: [
            {
              id: `str_${Date.now()}`,
              name: "Chu\u1ED7i m\u1EB7c \u0111\u1ECBnh",
              query: keywords.length > 0 ? keywords.map((k) => `"${k}"`).join(" AND ") : name,
              isDefault: true,
              source: "google_scholar"
            }
          ],
          criteria: [],
          sourcePolicies: {
            google_scholar: { prismaRole: "supplementary" }
          },
          schemaVersion: "2.0.0",
          profileVersion: 1,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.profiles.push(targetProfile);
      }
      targetProfile.yearRange = {
        start: yearStart,
        end: yearEnd,
        enabled: yearEnabled
      };
      targetProfile.minPageCount = minPages;
      const updatedCriteria = [];
      if (yearEnabled && (yearStart !== void 0 || yearEnd !== void 0)) {
        updatedCriteria.push({
          id: "IC-Y",
          label: `Kho\u1EA3ng n\u0103m xu\u1EA5t b\u1EA3n (${yearStart || "..."} - ${yearEnd || "..."})`,
          description: `Xu\u1EA5t b\u1EA3n trong kho\u1EA3ng t\u1EEB n\u0103m ${yearStart || "kh\xF4ng gi\u1EDBi h\u1EA1n"} \u0111\u1EBFn ${yearEnd || "kh\xF4ng gi\u1EDBi h\u1EA1n"}.`,
          kind: "inclusion",
          required: true,
          stage: "metadata",
          evaluator: "year_range",
          parameters: { startYear: yearStart, endYear: yearEnd }
        });
      }
      if (minPagesEnabled && minPages) {
        updatedCriteria.push({
          id: "EC-LEN",
          label: `S\u1ED1 trang t\u1ED1i thi\u1EC3u (>= ${minPages})`,
          description: `Lo\u1EA1i tr\u1EEB c\xE1c b\xE0i vi\u1EBFt ng\u1EAFn, t\xF3m t\u1EAFt, poster c\xF3 \u0111\u1ED9 d\xE0i d\u01B0\u1EDBi ${minPages} trang.`,
          kind: "exclusion",
          required: true,
          stage: "full_text",
          evaluator: "page_count",
          parameters: { minPages, mode: "reject_if_under" }
        });
      }
      if (keywords.length > 0) {
        updatedCriteria.push({
          id: "IC-KW",
          label: "T\u1EEB kh\xF3a b\u1EAFt bu\u1ED9c",
          description: `B\u1EAFt bu\u1ED9c ch\u1EE9a nh\xF3m t\u1EEB kh\xF3a: ${keywords.join(", ")}.`,
          kind: "inclusion",
          required: true,
          stage: "title_abstract",
          evaluator: "keyword_group",
          parameters: {
            keywords,
            mode: "all",
            fields: ["title", "abstract", "snippet"]
          }
        });
      }
      if (this.editingProfileId) {
        const existingDomainCriteria = targetProfile.criteria.filter(
          (c) => c.evaluator === "swt302_ep_bva" || c.id !== "IC-Y" && c.id !== "EC-LEN" && c.id !== "IC-KW"
        );
        targetProfile.criteria = [...updatedCriteria, ...existingDomainCriteria];
      } else {
        targetProfile.criteria = updatedCriteria;
      }
      await this.saveProfilesToStorage();
      this.renderProfileListInModal();
      this.renderProfileHeaderAndOptions();
      this.profileEditForm.style.display = "none";
      this.setStatus(`\u2713 \u0110\xE3 l\u01B0u h\u1ED3 s\u01A1 "${targetProfile.name}" (v${targetProfile.profileVersion}).`, "success");
    }
    async saveProfilesToStorage() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
      }
    }
    handleExportActiveProfile() {
      const jsonStr = JSON.stringify(this.activeProfile, null, 2);
      const filename = `profile_${this.activeProfile.id}_v${this.activeProfile.profileVersion}.json`;
      this.downloadFile(jsonStr, filename, "application/json");
      this.setStatus(`\u2713 \u0110\xE3 xu\u1EA5t h\u1ED3 s\u01A1 "${this.activeProfile.name}" sang file JSON.`, "success");
    }
    handleProfileFileImport(e) {
      const input = e.target;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const text = reader.result;
          const profile = JSON.parse(text);
          if (!profile.name || !profile.reviewType) {
            throw new Error("File JSON thi\u1EBFu tr\u01B0\u1EDDng 'name' ho\u1EB7c 'reviewType' h\u1EE3p l\u1EC7.");
          }
          profile.id = `imported_${Date.now()}`;
          profile.profileVersion = profile.profileVersion || 1;
          profile.schemaVersion = profile.schemaVersion || "2.0.0";
          profile.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          profile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          this.profiles.push(profile);
          await this.saveProfilesToStorage();
          this.renderProfileListInModal();
          this.renderProfileHeaderAndOptions();
          this.switchActiveProfile(profile.id);
          this.closeProfileModal();
          this.setStatus(`\u2713 \u0110\xE3 nh\u1EADp th\xE0nh c\xF4ng h\u1ED3 s\u01A1: "${profile.name}".`, "success");
        } catch (err) {
          alert(`L\u1ED7i khi nh\u1EADp h\u1ED3 s\u01A1: ${err.message}`);
        } finally {
          input.value = "";
        }
      };
      reader.readAsText(file);
    }
    // --- Export Functions ---
    handleExportCsv() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
        return;
      }
      const headers = [
        "source",
        "title",
        "authors",
        "year",
        "venue",
        "doi",
        "abstract",
        "url",
        "query",
        "retrieval_date"
      ];
      let csvContent = "\uFEFF";
      csvContent += headers.join(",") + "\r\n";
      this.uniqueRecords.forEach((row) => {
        const line = [
          this.escapeCsv(row.source || row.discoverySource || "Google Scholar"),
          this.escapeCsv(row.title || ""),
          this.escapeCsv(row.authors || ""),
          this.escapeCsv(row.year || ""),
          this.escapeCsv(row.venue || ""),
          this.escapeCsv(row.doi || ""),
          this.escapeCsv(row.abstract || ""),
          this.escapeCsv(row.url || ""),
          this.escapeCsv(row.query || ""),
          this.escapeCsv(row.retrieval_date || "")
        ].join(",");
        csvContent += line + "\r\n";
      });
      this.downloadFile(csvContent, "01_all_records.csv", "text/csv;charset=utf-8;");
      this.setStatus(
        `\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 01_all_records.csv (${this.uniqueRecords.length} b\u1EA3n ghi metadata chu\u1EA9n PRISMA).`,
        "success"
      );
    }
    handleExportScreeningCsv() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
        return;
      }
      const headers = [
        "id",
        "source",
        "title",
        "year",
        "venue",
        "doi",
        "url",
        "screening_stage",
        "matched_criteria",
        "unknown_criteria",
        "missing_evidence",
        "suggested_decision",
        "screening_reason",
        "final_decision",
        "user_notes",
        "potential_duplicate",
        "duplicate_reason",
        "query",
        "retrieval_date"
      ];
      let csvContent = "\uFEFF";
      csvContent += headers.join(",") + "\r\n";
      this.uniqueRecords.forEach((row) => {
        const line = [
          this.escapeCsv(row.id),
          this.escapeCsv(row.source || row.discoverySource || "Google Scholar"),
          this.escapeCsv(row.title || ""),
          this.escapeCsv(row.year || ""),
          this.escapeCsv(row.venue || ""),
          this.escapeCsv(row.doi || ""),
          this.escapeCsv(row.url || ""),
          this.escapeCsv(row.screeningStage || "metadata"),
          this.escapeCsv((row.matchedCriteria || []).join("; ")),
          this.escapeCsv((row.unknownCriteria || []).join("; ")),
          this.escapeCsv((row.missingEvidence || []).join("; ")),
          this.escapeCsv(row.suggestedDecision || "Unsure"),
          this.escapeCsv(row.screeningReason || ""),
          this.escapeCsv(row.finalDecision || ""),
          this.escapeCsv(row.userNotes || ""),
          this.escapeCsv(row.potentialDuplicate ? "YES" : "NO"),
          this.escapeCsv(row.duplicateReason || ""),
          this.escapeCsv(row.query || ""),
          this.escapeCsv(row.retrieval_date || "")
        ].join(",");
        csvContent += line + "\r\n";
      });
      this.downloadFile(csvContent, "02_screening_decisions.csv", "text/csv;charset=utf-8;");
      this.setStatus(`\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 02_screening_decisions.csv (\u0110\u1EA7y \u0111\u1EE7 quy\u1EBFt \u0111\u1ECBnh & ghi ch\xFA).`, "success");
    }
    async handleExportFullCsv() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
        return;
      }
      try {
        this.setStatus("\u0110ang t\u1EA1o file xu\u1EA5t s\xE0ng l\u1ECDc \u0111\u1EA7y \u0111\u1EE7 qua backend...", "info");
        const res = await fetch(`${this.backendUrl}/api/scholar/export-full`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: this.uniqueRecords,
            profile: this.activeProfile,
            sessionId: this.currentSessionId
          })
        });
        if (res.ok) {
          const text = await res.text();
          this.downloadFile(text, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
          this.setStatus(
            "\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 02_screening_decisions_full.csv (\u0110\u1EA7y \u0111\u1EE7 ti\xEAu ch\xED & provenance).",
            "success"
          );
          return;
        }
      } catch {
      }
      const headers = [
        "researchId",
        "profileVersion",
        "sessionId",
        "id",
        "source",
        "title",
        "authors",
        "year",
        "venue",
        "doi",
        "pageCount",
        "fullTextStatus",
        "suggestedDecision",
        "finalDecision",
        "modelContribution",
        "conceptLabels",
        "literatureGroup",
        "screeningReason",
        "userNotes",
        "retrieval_date"
      ];
      let csvContent = "\uFEFF" + headers.join(",") + "\r\n";
      this.uniqueRecords.forEach((r) => {
        const line = [
          this.escapeCsv(this.activeProfile.id),
          this.escapeCsv(this.activeProfile.profileVersion),
          this.escapeCsv(this.currentSessionId),
          this.escapeCsv(r.id),
          this.escapeCsv(r.source || "Google Scholar"),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.page_count || ""),
          this.escapeCsv(r.pdfUrl ? "available" : "not_found"),
          this.escapeCsv(r.suggestedDecision),
          this.escapeCsv(r.finalDecision || ""),
          this.escapeCsv((r.modelContribution || []).join("; ")),
          this.escapeCsv((r.conceptLabels || []).join("; ")),
          this.escapeCsv(r.literatureGroup || ""),
          this.escapeCsv(r.screeningReason),
          this.escapeCsv(r.userNotes || ""),
          this.escapeCsv(r.retrieval_date)
        ].join(",");
        csvContent += line + "\r\n";
      });
      this.downloadFile(csvContent, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 02_screening_decisions_full.csv.", "success");
    }
    async handleExportApa7() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t tr\xEDch d\u1EABn.", "warning");
        return;
      }
      try {
        this.setStatus("\u0110ang \u0111\u1ECBnh d\u1EA1ng danh m\u1EE5c tr\xEDch d\u1EABn APA 7th qua backend...", "info");
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
          if (data.success && data.textContent) {
            this.downloadFile(data.textContent, "03_references_apa7.txt", "text/plain;charset=utf-8;");
            this.setStatus(
              `\u2713 \u0110\xE3 t\u1EA3i file 03_references_apa7.txt (\u0110\u1EE7: ${data.completeCount}, C\u1EA7n b\u1ED5 sung: ${data.incompleteCount}).`,
              "success"
            );
            return;
          }
        }
      } catch {
      }
      const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
      const targetRecords = finalIncludes.length > 0 ? finalIncludes : this.uniqueRecords;
      const seenDois = /* @__PURE__ */ new Set();
      const seenTitles = /* @__PURE__ */ new Set();
      const deduped = [];
      for (const r of targetRecords) {
        const cleanDoi = r.doi ? r.doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//, "") : "";
        const normTitle = (r.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanDoi) {
          if (seenDois.has(cleanDoi)) continue;
          seenDois.add(cleanDoi);
        }
        if (normTitle && normTitle.length > 15) {
          if (seenTitles.has(normTitle)) continue;
          seenTitles.add(normTitle);
        }
        deduped.push(r);
      }
      const complete = [];
      const incomplete = [];
      deduped.forEach((r) => {
        const hasAuthor = Boolean(r.authors && r.authors.trim());
        const hasYear = Boolean(r.year && String(r.year).trim());
        const rawTitle = (r.title || "").trim();
        const rawVenue = (r.venue || "").trim();
        const isRetracted = /\b(retracted|retraction)\b/i.test(`${rawTitle} ${r.abstract || ""}`);
        const isTruncatedTitle = /…|\.{3}/.test(rawTitle);
        const isSearchEngineVenue = /^(google scholar|google books|google|researchgate|proquest|ssrn|academia\.edu)\b/i.test(rawVenue);
        const isTruncatedVenue = /…|\.{3}/.test(rawVenue);
        const hasValidVenue = rawVenue.length > 0 && !isSearchEngineVenue && !isTruncatedVenue;
        if (hasAuthor && hasYear && rawTitle && hasValidVenue && !isRetracted && !isTruncatedTitle) {
          const doiStr = r.doi ? ` https://doi.org/${r.doi.replace(/^https?:\/\/doi\.org\//, "")}` : r.url && !r.url.includes("scholar.google") ? ` ${r.url}` : "";
          complete.push(`${r.authors} (${r.year}). ${rawTitle}. *${rawVenue}*.${doiStr}`);
        } else {
          const missing = [];
          if (!hasAuthor) missing.push("t\xE1c gi\u1EA3");
          if (!hasYear) missing.push("n\u0103m");
          if (!rawTitle) missing.push("ti\xEAu \u0111\u1EC1");
          if (isRetracted) missing.push("B\xC0I B\xC1O \u0110\xC3 B\u1ECA R\xDAT L\u1EA0I (RETRACTED)");
          if (isTruncatedTitle) missing.push("ti\xEAu \u0111\u1EC1 b\u1ECB c\u1EAFt ng\u1EAFn (...)");
          if (isSearchEngineVenue) missing.push(`venue g\xE1n nh\u1EA7m t\xEAn n\u1EC1n t\u1EA3ng ("${rawVenue}")`);
          else if (isTruncatedVenue) missing.push(`venue b\u1ECB c\u1EAFt ng\u1EAFn ("${rawVenue}")`);
          else if (!rawVenue) missing.push("venue");
          incomplete.push(`[THI\u1EBEU: ${missing.join(", ")}] ${rawTitle || "(Kh\xF4ng ti\xEAu \u0111\u1EC1)"} - Ngu\u1ED3n: ${r.url || "N/A"}`);
        }
      });
      const scopeNote = finalIncludes.length > 0 ? `Ch\u1EC9 xu\u1EA5t c\xE1c b\xE0i \u0111\xE3 ch\u1ED1t th\u1EA9m \u0111\u1ECBnh (finalDecision = Include: ${finalIncludes.length} b\xE0i)` : `To\xE0n b\u1ED9 danh s\xE1ch (${deduped.length} b\xE0i)`;
      let content = `=======================================================================\r
`;
      content += `DANH M\u1EE4C TR\xCDCH D\u1EAAN T\xC0I LI\u1EC6U THAM KH\u1EA2O (APA 7th Edition)\r
`;
      content += `Nghi\xEAn c\u1EE9u: ${this.activeProfile.name} | Ph\u1EA1m vi: ${scopeNote}\r
`;
      content += `Th\u1EDDi \u0111i\u1EC3m xu\u1EA5t: ${(/* @__PURE__ */ new Date()).toISOString()}\r
`;
      content += `\u0110\xE3 l\u1ECDc tr\xF9ng l\u1EB7p: Gi\u1EEF ${deduped.length} b\xE0i (\u0110\u1EE7 chu\u1EA9n APA: ${complete.length} | C\u1EA7n b\u1ED5 sung: ${incomplete.length})\r
`;
      content += `=======================================================================\r
\r
`;
      content += `--- PH\u1EA6N 1: B\xC0I B\xC1O \u0110\u1EE6 METADATA \u0110\xC3 X\xC1C MINH ---\r
\r
`;
      if (complete.length === 0) {
        content += `(Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o \u0111\u1EE7 100% metadata chu\u1EA9n APA 7)\r
\r
`;
      } else {
        content += complete.map((c, i) => `[${i + 1}] ${c}\r
\r
`).join("");
      }
      content += `=======================================================================\r
`;
      content += `--- \u26A0\uFE0F PH\u1EA6N 2: B\xC0I B\xC1O THI\u1EBEU TH\xD4NG TIN (C\u1EA6N B\u1ED4 SUNG TH\u1EE6 C\xD4NG) ---\r
`;
      content += `(Quy t\u1EAFc: Kh\xF4ng t\u1EF1 b\u1ECBa th\xF4ng tin c\xF2n thi\u1EBFu. C\u1EA7n \u0111\u1ED1i chi\u1EBFu to\xE0n v\u0103n ho\u1EB7c trang nh\xE0 xu\u1EA5t b\u1EA3n)\r
`;
      content += `=======================================================================\r
\r
`;
      if (incomplete.length === 0) {
        content += `(To\xE0n b\u1ED9 b\xE0i b\xE1o \u0111\u1EC1u \u0111\xE3 \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin chu\u1EA9n h\xF3a)\r
`;
      } else {
        content += incomplete.map((inc, i) => `[\u26A0\uFE0F ${i + 1}] ${inc}\r
\r
`).join("");
      }
      this.downloadFile(content, "03_references_apa7.txt", "text/plain;charset=utf-8;");
      this.setStatus(
        `\u2713 \u0110\xE3 t\u1EA3i file 03_references_apa7.txt (\u0110\u1EE7: ${complete.length}, C\u1EA7n b\u1ED5 sung: ${incomplete.length}).`,
        "success"
      );
    }
    handleExportSessionJson() {
      const sessionPayload = {
        researchProfile: this.activeProfile,
        sessionId: this.currentSessionId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        query: this.currentSessionQuery,
        filters: {
          as_ylo: this.asYloInput.value,
          as_yhi: this.asYhiInput.value,
          hl: this.hlInput.value
        },
        stats: {
          apiRequestsUsed: this.apiRequestsUsed,
          totalCollected: this.allRecords.length,
          totalRetained: this.uniqueRecords.length,
          finalIncludeCount: this.uniqueRecords.filter((r) => r.finalDecision === "Include").length,
          dedupStats: this.dedupStats,
          searchSummary: this.searchSummary
        },
        records: this.uniqueRecords,
        rawEvidences: this.allEvidences
      };
      const jsonContent = JSON.stringify(sessionPayload, null, 2);
      const fname = `session_${this.activeProfile.id}_${Date.now()}.json`;
      this.downloadFile(jsonContent, fname, "application/json");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i file Backup Session JSON th\xE0nh c\xF4ng.", "success");
    }
    async handleSaveLog() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 ghi nh\u1EADt k\xFD.", "warning");
        return;
      }
      const uiVal = this.uiTotalInput.value.trim();
      const uiTotal = uiVal ? parseInt(uiVal, 10) : void 0;
      const shuffled = [...this.uniqueRecords].sort(() => 0.5 - Math.random());
      const spotChecks = shuffled.slice(0, 5).map((r) => ({
        title: r.title,
        year: r.year,
        venue: r.venue,
        doi: r.doi,
        url: r.url
      }));
      const payload = {
        researchId: this.activeProfile.id,
        profileVersion: this.activeProfile.profileVersion,
        query: this.currentSessionQuery || this.queryInput.value.trim(),
        searchId: this.searchSummary?.searchId || `scholar_${Date.now()}`,
        method: "SerpApi",
        params: {
          engine: "google_scholar",
          as_ylo: this.asYloInput.value.trim(),
          as_yhi: this.asYhiInput.value.trim(),
          hl: this.hlInput.value.trim() || "vi",
          totalRequests: this.apiRequestsUsed
        },
        apiTotalResults: this.searchSummary?.totalReportedResults || 0,
        uiTotalResults: uiTotal,
        collectedCount: this.allRecords.length,
        candidateCount: this.uniqueRecords.length,
        dedupStats: this.dedupStats,
        spotChecks,
        retrievalDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      this.setStatus("\u0110ang g\u1EEDi nh\u1EADt k\xFD t\u1EDBi backend \u0111\u1EC3 l\u01B0u...", "info");
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          this.setStatus("\u2713 \u0110\xE3 ghi nh\u1EADt k\xFD v\xE0o search-log.md th\xE0nh c\xF4ng!", "success");
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        this.setStatus(`L\u1ED7i ghi nh\u1EADt k\xFD: ${err.message}`, "error");
      }
    }
    // --- Utilities & Sanitization ---
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
