"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { marketPreviewModel } from "@/lib/marketplace-preview";
import { paperDimensions } from "@/lib/paper-builder";
import PaperPreview from "@/components/paper-builder/preview";
import "@/components/paper-builder/paper.css";
import "katex/dist/katex.min.css";

/** Private owner/admin review only. No save, question-edit or public delivery action. */
export default function MarketplacePaperPreview({
  snapshot,
  institution,
}: {
  snapshot: { settings: unknown; questions: unknown[] };
  institution?: string;
}) {
  const [setName, setSetName] = useState<"ক" | "খ">();
  const model = useMemo(() => {
    const model = marketPreviewModel(snapshot, setName);
    if (institution) {
      model.settings = {
        ...model.settings,
        info: { ...model.settings.info, inst: institution },
        header: {
          ...model.settings.header,
          fields: {
            ...model.settings.header.fields,
            institute: {
              ...model.settings.header.fields.institute,
              value: institution,
            },
          },
        },
      };
    }
    return model;
  }, [snapshot, setName, institution]);
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [width] = paperDimensions(model.settings);
  useEffect(() => {
    if (!container.current) return;
    const target = container.current;
    const resize = () =>
      setScale(
        Math.min(
          1,
          Math.max(0.1, (target.clientWidth - 8) / ((width * 96) / 25.4)),
        ),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(target);
    return () => observer.disconnect();
  }, [width]);
  if (!model.sections.length)
    return (
      <p role="alert">
        এই স্থির কপিতে প্রদর্শনযোগ্য প্রশ্ন নেই। অনুমোদনের আগে সংশোধন চাইুন।
      </p>
    );
  const first = model.sections[0];
  return (
    <section
      className="paper-builder-root space-y-3"
      aria-label="স্থির প্রশ্নপত্রের পৃষ্ঠা প্রিভিউ"
    >
      <p data-noprint className="rounded bg-indigo-50 p-3 text-sm">
        জমা দেওয়া স্থির কপির প্রিভিউ। এখানে প্রশ্ন বা সেটিংস সম্পাদনা করা যায় না।
        সংরক্ষিত পৃষ্ঠার মাপ ও ফন্ট বজায় রাখা হয়েছে।
      </p>
      {model.settings.show.autoSet && (
        <label data-noprint>
          সেট দেখুন{" "}
          <select
            className="rounded border p-2"
            value={model.setName}
            onChange={(e) => setSetName(e.target.value as "ক" | "খ")}
          >
            <option>ক</option>
            <option>খ</option>
          </select>
        </label>
      )}
      <div className="paper-preview-scroll" ref={container}>
        <PaperPreview
          readOnly
          s={model.settings}
          questions={first.questions}
          type={first.type}
          title={first.title}
          sections={model.sections.length > 1 ? model.sections : undefined}
          setName={model.setName}
          duplicate={model.duplicate}
          onImageSize={() => {}}
          previewScale={scale}
        />
      </div>
    </section>
  );
}
