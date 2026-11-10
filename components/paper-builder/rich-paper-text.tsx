import { Fragment, type ReactNode } from "react";
import MathText from "@/components/MathText";
import { preparePaperMath } from "@/lib/paper-builder";
// Only our four formatting markers are interpreted. Never evaluate HTML or attributes.
export default function RichPaperText({ text }: { text: string }) {
  const parts = text.split(/(\[(?:\/?[bius])\])/g);
  const stack: { tag: string; children: ReactNode[] }[] = [
    { tag: "", children: [] },
  ];
  parts.forEach((part, i) => {
    const open = part.match(/^\[([bius])\]$/),
      close = part.match(/^\[\/([bius])\]$/);
    if (open && stack.length < 20) {
      stack.push({ tag: open[1], children: [] });
      return;
    }
    if (close && stack.length > 1 && stack[stack.length - 1].tag === close[1]) {
      const item = stack.pop()!;
      const children = <Fragment key={i}>{item.children}</Fragment>;
      stack[stack.length - 1].children.push(
        item.tag === "b" ? (
          <strong key={i}>{children}</strong>
        ) : item.tag === "i" ? (
          <em key={i}>{children}</em>
        ) : item.tag === "u" ? (
          <u key={i}>{children}</u>
        ) : (
          <s key={i}>{children}</s>
        ),
      );
      return;
    }
    stack[stack.length - 1].children.push(
      <MathText key={i} text={preparePaperMath(part)} />,
    );
  });
  while (stack.length > 1) {
    const item = stack.pop()!;
    stack[stack.length - 1].children.push(
      <Fragment key={`unclosed-${stack.length}`}>
        [{item.tag}]{item.children}
      </Fragment>,
    );
  }
  return <>{stack[0].children}</>;
}
