export interface ParsedMCQ {
  id: string;
  text: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
}

export interface ParsedShort {
  id: string;
  text: string;
  marks?: string;
}

export interface ParsedCQ {
  id: string;
  stimulus: string; // উদ্দীপক / দৃশ্যকল্প
  subQuestions: {
    k: string;
    kh: string;
    g: string;
    gh: string;
  };
}

export interface ParseResult {
  mcqs: ParsedMCQ[];
  shortQuestions: ParsedShort[];
  cqs: ParsedCQ[];
}

// টেক্সট ক্লিন করার হেল্পার
function cleanText(t: string): string {
  return t
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBanglaQuestions(rawText: string): ParseResult {
  const result: ParseResult = {
    mcqs: [],
    shortQuestions: [],
    cqs: [],
  };

  if (!rawText) return result;

  // ১. সেকশন অনুযায়ী আলাদা করা (বহুনির্বাচনি, সংক্ষিপ্ত, সৃজনশীল)
  let mcqSection = "";
  let shortSection = "";
  let cqSection = "";

  const shortIdx = rawText.search(/(?:সংক্ষিপ্ত\s*উত্তর\s*প্রশ্ন|সংক্ষিপ্ত\s*প্রশ্ন)/i);
  const cqIdx = rawText.search(/(?:সৃজনশীল\s*প্রশ্ন)/i);

  if (shortIdx !== -1 && cqIdx !== -1) {
    if (shortIdx < cqIdx) {
      mcqSection = rawText.slice(0, shortIdx);
      shortSection = rawText.slice(shortIdx, cqIdx);
      cqSection = rawText.slice(cqIdx);
    } else {
      mcqSection = rawText.slice(0, cqIdx);
      cqSection = rawText.slice(cqIdx, shortIdx);
      shortSection = rawText.slice(shortIdx);
    }
  } else if (shortIdx !== -1) {
    mcqSection = rawText.slice(0, shortIdx);
    shortSection = rawText.slice(shortIdx);
  } else if (cqIdx !== -1) {
    mcqSection = rawText.slice(0, cqIdx);
    cqSection = rawText.slice(cqIdx);
  } else {
    // সেকশন হেডলাইন না থাকলে পুরো টেক্সটকে প্রথমে বহুনির্বাচনি হিসেবে ধরা হবে
    mcqSection = rawText;
  }

  // ========================================================
  // ২. বহুনির্বাচনি (MCQ) পার্সিং লজিক
  // ========================================================
  if (mcqSection) {
    // প্রশ্ন নম্বর দিয়ে ভাগ করা (যেমন: ০১। বা 1. বা ১))
    const mcqBlocks = mcqSection.split(/(?=(?:^|\n)\s*[০-৯\d]{1,3}\s*[।\.\)]\s*)/u).filter(Boolean);

    mcqBlocks.forEach((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed || trimmed.length < 10) return;

      // অপশন আলাদা করা: (ক), (খ), (গ), (ঘ)
      const optSplit = trimmed.split(/(?=\([কখগঘabcd]\)|\b[কখগঘabcd][\.\)]\s*)/u);
      if (optSplit.length >= 4) {
        const questionText = cleanText(optSplit[0]).replace(/^[০-৯\d]{1,3}\s*[।\.\)]\s*/, "");
        const options: Record<string, string> = {};

        const banglaKeys = ["ক", "খ", "গ", "ঘ"];
        for (let i = 1; i < optSplit.length && i <= 4; i++) {
          const rawOpt = cleanText(optSplit[i]);
          const optVal = rawOpt.replace(/^\([কখগঘabcd]\)\s*|^[কখগঘabcd][\.\)]\s*/u, "");
          const key = banglaKeys[i - 1] || `ক${i}`;
          options[key] = optVal;
        }

        result.mcqs.push({
          id: `mcq-${idx + 1}`,
          text: questionText,
          options,
          correct: "ক",
          explanation: "",
        });
      }
    });
  }

  // ========================================================
  // ৩. সংক্ষিপ্ত প্রশ্ন পার্সিং লজিক (মান ২)
  // ========================================================
  if (shortSection) {
    const shortBlocks = shortSection.split(/(?=(?:^|\n)\s*[০-৯\d]{1,3}\s*[।\.\)]\s*)/u).filter(Boolean);

    shortBlocks.forEach((block, idx) => {
      const trimmed = cleanText(block);
      // হেডার লাইন বাদ দেওয়া
      if (trimmed.includes("সংক্ষিপ্ত উত্তর প্রশ্ন") || trimmed.length < 5) return;

      const cleanedQuestion = trimmed.replace(/^[০-৯\d]{1,3}\s*[।\.\)]\s*/, "");
      result.shortQuestions.push({
        id: `short-${idx + 1}`,
        text: cleanedQuestion,
        marks: "২",
      });
    });
  }

  // ========================================================
  // ৪. সৃজনশীল প্রশ্ন (CQ) পার্সিং লজিক (উদ্দীপক + ক, খ, গ, ঘ)
  // ========================================================
  if (cqSection) {
    const cqBlocks = cqSection.split(/(?=(?:^|\n)\s*[০-৯\d]{1,3}\s*[।\.\)]\s*)/u).filter(Boolean);

    cqBlocks.forEach((block, idx) => {
      const trimmed = block.trim();
      if (trimmed.includes("সৃজনশীল প্রশ্ন") || trimmed.length < 15) return;

      // ক, খ, গ, ঘ ভাগ করা
      const parts = trimmed.split(/(?=\([কখগঘ]\)\s*)/u);
      const stimulus = cleanText(parts[0]).replace(/^[০-৯\d]{1,3}\s*[।\.\)]\s*/, "");

      const subQ = { k: "", kh: "", g: "", gh: "" };

      parts.slice(1).forEach((p) => {
        const text = cleanText(p);
        if (text.startsWith("(ক)")) subQ.k = text.replace(/^\(ক\)\s*/, "");
        else if (text.startsWith("(খ)")) subQ.kh = text.replace(/^\(খ\)\s*/, "");
        else if (text.startsWith("(গ)")) subQ.g = text.replace(/^\(গ\)\s*/, "");
        else if (text.startsWith("(ঘ)")) subQ.gh = text.replace(/^\(ঘ\)\s*/, "");
      });

      result.cqs.push({
        id: `cq-${idx + 1}`,
        stimulus: stimulus || "উদ্দীপক",
        subQuestions: subQ,
      });
    });
  }

  return result;
}
