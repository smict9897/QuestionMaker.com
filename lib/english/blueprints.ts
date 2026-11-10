/** User-supplied reference blueprints for 2027 practice papers; not independently certified 2027 circulars. */
export type EnglishGrade = 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type EnglishPaper = 1 | 2;
export type EnglishItem = {
  id: string;
  title: string;
  section: "reading" | "grammar" | "writing";
  marks: number;
  /** Number printed / number answered, only when specified by the supplied reference. */
  count?: number;
  answerCount?: number;
  markEach?: number;
  words?: number;
  sourceGroup?:
    "seen-1" | "seen-2" | "unseen" | "textbook-poems" | "textbook-stories";
  writingChoices?: readonly string[];
};
export type EnglishBlueprint = {
  id: string;
  grade: EnglishGrade;
  paper: EnglishPaper;
  practiceYear: 2027;
  total: number;
  sections: { id: EnglishItem["section"]; marks: number }[];
  items: EnglishItem[];
  reference: { id: string; description: string; status: "user-supplied" };
};
const reading = (
  id: string,
  title: string,
  marks: number,
  extra: Partial<EnglishItem> = {},
): EnglishItem => ({ id, title, section: "reading", marks, ...extra });
const grammar = (
  id: string,
  title: string,
  marks: number,
  extra: Partial<EnglishItem> = {},
): EnglishItem => ({ id, title, section: "grammar", marks, ...extra });
const writing = (
  id: string,
  title: string,
  marks: number,
  extra: Partial<EnglishItem> = {},
): EnglishItem => ({ id, title, section: "writing", marks, ...extra });
function juniorFirst(grade: 6 | 7 | 8): EnglishItem[] {
  return [
    reading("mcq", "Multiple choice questions", 7, {
      count: 7,
      markEach: 1,
      sourceGroup: "seen-1",
    }),
    reading("comprehension", "Answering questions", 10, {
      count: 5,
      markEach: 2,
      sourceGroup: "seen-1",
    }),
    reading("gap", "Gap filling", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "seen-2",
    }),
    reading("vocabulary", "Vocabulary: synonyms and antonyms", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "seen-2",
    }),
    reading("information", "Information transfer", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "unseen",
    }),
    reading("true-false", "True/False", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "unseen",
    }),
    reading("summary", "Writing summary", 10, { sourceGroup: "unseen" }),
    reading("matching", "Matching", 5, { count: 5, markEach: 1 }),
    reading("rearranging", "Rearranging sentences", 8, {
      count: 8,
      markEach: 1,
    }),
    reading(
      "poems",
      "Answering questions from poems in English for Today",
      10,
      { count: 8, answerCount: 5, markEach: 2, sourceGroup: "textbook-poems" },
    ),
    writing("story", "Completing a story", 10),
    writing("paragraph", "Writing a paragraph", 10, {
      words: grade === 6 ? 120 : 150,
    }),
    writing("dialogue", "Writing a dialogue", 10),
  ];
}
function juniorSecond(grade: 6 | 7 | 8): EnglishItem[] {
  const items: EnglishItem[] =
    grade === 6
      ? [
          grammar("parts-of-speech", "Identification of parts of speech", 5, {
            count: 10,
            markEach: 0.5,
          }),
          grammar(
            "gap-clues",
            "Gap filling with clues: parts of speech, articles and prepositions",
            5,
            { count: 10, markEach: 0.5 },
          ),
          grammar("substitution", "Substitution table", 5, {
            count: 5,
            markEach: 1,
          }),
          grammar("verbs", "Right form of verbs", 5, { count: 5, markEach: 1 }),
          grammar(
            "transformation",
            "Changing sentences: tense, affirmative, negative, assertive, interrogative, optative, imperative and exclamatory",
            5,
            { count: 5, markEach: 1 },
          ),
        ]
      : [
          grammar(
            "gap-clues",
            "Gap filling with/without clues: parts of speech, articles and prepositions",
            5,
            { count: 10, markEach: 0.5 },
          ),
          grammar("substitution", "Substitution table", 5, {
            count: 5,
            markEach: 1,
          }),
          grammar("verbs", "Right form of verbs", 5, { count: 5, markEach: 1 }),
          grammar(
            "narration",
            grade === 7
              ? "Narration: individual sentences"
              : "Passage narration",
            5,
            grade === 7 ? { count: 5, markEach: 1 } : {},
          ),
          grammar(
            "transformation",
            `Changing sentences: affirmative, negative, assertive, interrogative, optative, imperative, exclamatory and voice${grade === 8 ? "; degrees of comparison" : ""}`,
            5,
            { count: 5, markEach: 1 },
          ),
        ];
  return [
    ...items,
    grammar("punctuation", "Punctuation and capitalization", 5),
    writing("letter-email", "Letter/email: formal or informal", 8, {
      writingChoices: [
        "formal-letter",
        "informal-letter",
        "formal-email",
        "informal-email",
      ],
    }),
    writing("composition", "Writing a short composition", 12, {
      words: grade === 6 ? 200 : 250,
    }),
  ];
}
function sscFirst(): EnglishItem[] {
  return [
    reading("mcq", "Multiple choice questions", 7, {
      count: 7,
      markEach: 1,
      sourceGroup: "seen-1",
    }),
    reading("comprehension", "Answering questions", 10, {
      count: 5,
      markEach: 2,
      sourceGroup: "seen-1",
    }),
    reading("gap", "Gap filling without clues", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "seen-2",
    }),
    reading("information", "Information transfer", 5, {
      count: 5,
      markEach: 1,
      sourceGroup: "unseen",
    }),
    reading("summary", "Writing a summary", 10, { sourceGroup: "unseen" }),
    reading("matching", "Matching parts of sentences", 5, {
      count: 5,
      markEach: 1,
    }),
    reading("rearranging", "Rearranging sentences", 8, {
      count: 8,
      markEach: 1,
    }),
    reading("poems", "Answering questions from poems", 10, {
      count: 8,
      answerCount: 5,
      markEach: 2,
      sourceGroup: "textbook-poems",
    }),
    reading("stories", "Answering questions from short stories", 10, {
      count: 8,
      answerCount: 5,
      markEach: 2,
      sourceGroup: "textbook-stories",
    }),
    writing("story", "Completing a story", 15),
    writing("dialogue", "Writing a dialogue", 15),
  ];
}
function sscSecond(): EnglishItem[] {
  return [
    grammar("gap-clues", "Gap filling with clues", 10, {
      count: 10,
      markEach: 1,
    }),
    grammar("substitution", "Substitution table", 5, { count: 5, markEach: 1 }),
    grammar("verbs", "Right forms of verbs", 10, { count: 10, markEach: 1 }),
    grammar("transformation", "Changing sentences", 10, {
      count: 10,
      markEach: 1,
    }),
    grammar("tags", "Tag questions", 5, { count: 5, markEach: 1 }),
    grammar("affixes", "Suffixes and prefixes", 5, { count: 5, markEach: 1 }),
    grammar("prepositions", "Gap filling with prepositions", 5, {
      count: 5,
      markEach: 1,
    }),
    grammar("connectors", "Sentence connectors/linking words", 5, {
      count: 5,
      markEach: 1,
    }),
    grammar("punctuation", "Punctuation and capitalization", 5),
    writing("paragraph", "Writing a paragraph", 10),
    writing("letter-email", "Writing email/letter/application", 10, {
      writingChoices: ["email", "letter", "application"],
    }),
    writing("composition", "Writing a short composition", 20),
  ];
}
function hscFirst(): EnglishItem[] {
  return [
    reading("mcq", "MCQ: guessing meaning from context", 5, {
      sourceGroup: "seen-1",
    }),
    reading(
      "comprehension",
      "Comprehension: analysis, synthesis and evaluation",
      10,
      { sourceGroup: "seen-1" },
    ),
    reading("information", "Information transfer/flow chart", 10, {
      sourceGroup: "seen-1",
    }),
    reading("summary", "Summarizing", 10, { sourceGroup: "seen-1" }),
    reading("cloze-clues", "Cloze test with clues", 5),
    reading("cloze-no-clues", "Cloze test without clues", 10),
    reading("rearranging", "Rearranging: unseen", 10),
    writing("paragraph", "Writing paragraph by answering questions", 10),
    writing("story", "Completing a story", 7),
    writing("informal-letter-email", "Informal letter/email", 5, {
      writingChoices: ["informal-letter", "informal-email"],
    }),
    writing("graph", "Analyzing maps/graphs/charts", 10),
    writing(
      "appreciation",
      "Appreciating short stories/poems: theme, subject matter and interpretation",
      8,
    ),
  ];
}
function hscSecond(): EnglishItem[] {
  return [
    ...[
      ["articles", "Articles", 10, 0.5],
      ["prepositions", "Prepositions", 10, 0.5],
      ["phrases", "Special use of phrases/words", 10, 0.5],
      ["completion", "Completing sentences with clauses/phrases", 10, 0.5],
      ["verbs", "Right forms of verbs and subject-verb agreement", 10, 0.5],
      ["transformation", "Changing sentences", 5, 1],
      ["narration", "Narrative style: direct/indirect", 5, 1],
      ["pronouns", "Pronoun reference", 5, 1],
      ["modifiers", "Modifiers", 10, 0.5],
      ["connectors", "Sentence connectors", 10, 0.5],
      ["synonyms-antonyms", "Synonyms and antonyms", 10, 0.5],
      ["punctuation", "Punctuation", 10, 0.5],
    ].map(([id, title, count, markEach]) =>
      grammar(String(id), String(title), 5, {
        count: Number(count),
        markEach: Number(markEach),
      }),
    ),
    writing("formal-letter-email", "Formal letter/email", 8, {
      writingChoices: ["formal-letter", "formal-email"],
    }),
    writing("report", "Report writing", 8),
    writing("paragraph", "Writing a paragraph", 10),
    writing("composition", "Composition", 14),
  ];
}
export function englishBlueprint(
  grade: EnglishGrade,
  paper: EnglishPaper,
): EnglishBlueprint {
  const junior = grade <= 8,
    ssc = grade === 9 || grade === 10;
  const items = junior
    ? paper === 1
      ? juniorFirst(grade as 6 | 7 | 8)
      : juniorSecond(grade as 6 | 7 | 8)
    : ssc
      ? paper === 1
        ? sscFirst()
        : sscSecond()
      : paper === 1
        ? hscFirst()
        : hscSecond();
  const firstSection = paper === 1 ? "reading" : "grammar";
  const firstMarks = junior
    ? paper === 1
      ? 70
      : 30
    : ssc
      ? paper === 1
        ? 70
        : 60
      : 60;
  const writingMarks = junior
    ? paper === 1
      ? 30
      : 20
    : ssc
      ? paper === 1
        ? 30
        : 40
      : 40;
  return {
    id: `english-${grade}-${paper}-practice-2027-v1`,
    grade,
    paper,
    practiceYear: 2027,
    total: firstMarks + writingMarks,
    sections: [
      { id: firstSection, marks: firstMarks },
      { id: "writing", marks: writingMarks },
    ],
    items,
    reference: {
      id: junior
        ? `user-class-${grade}-distribution`
        : ssc
          ? `user-ssc-paper-${paper}`
          : `user-hsc-paper-${paper}`,
      description: junior
        ? `User supplied Class ${grade} distribution image`
        : ssc
          ? "User approved SSC screenshots; second-paper gap filling confirmed 10 marks"
          : paper === 1
            ? "User supplied NCTB image labelled 2024–25, approved for 2027 practice"
            : "User supplied HSC second-paper image labelled 2026, approved for 2027 practice",
      status: "user-supplied",
    },
  };
}
