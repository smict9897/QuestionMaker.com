"use client";

import React from "react";
// @ts-ignore
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className = "" }: MathTextProps) {
  if (!text) return null;

  // 🎯 ১. আবৃত্ত দশমিক / পৌনঃপুনিক ডট (\u0307) থাকলে KaTeX \dot{} এ রূপান্তর (বক্স দূর করার ম্যাজিক)
  let preparedText = text
    .replace(/([০-৯\d])\s*[\u0307\u0308\u02D9\u0358]/gu, (_, d) => `$\\dot{${d}}$`)
    .replace(/[\u0307\u0308\u02D9]([০-৯\d])/gu, (_, d) => `$\\dot{${d}}$`);

  // 🎯 ২. সাধারণ ভগ্নাংশ যেমন "১/৩" বা "4/5" কে স্বয়ংক্রিয়ভাবে উপর-নিচে রূপান্তর
  preparedText = preparedText.replace(
    /(?<![\$\w])([০-৯\d]+)\/([০-৯\d]+)(?![\$\w])/g,
    (_, num, den) => `$\\frac{${num}}{${den}}$`
  );

  // ৩. $...$ (ম্যাথ ফর্মুলা) এবং সাধারণ টেক্সট আলাদা করে রেন্ডার
  const parts = preparedText.split(/(\$[^$]+\$)/g);

  return (
    <span className={`inline-math-wrapper ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, {
              throwOnError: false,
              displayMode: false,
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline-block px-0.5 align-middle"
              />
            );
          } catch {
            return <span key={index}>{part}</span>;
          }
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
