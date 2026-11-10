import RichPaperText from "./rich-paper-text";
import { answerParts, answerLines, equalitySteps } from "@/lib/paper-answers";
export default function PaperAnswer({
  explanation,
  answers,
  cq = false,
}: {
  explanation?: string;
  answers?: Record<string, string>;
  cq?: boolean;
}) {
  return (
    <div className="paper-answer-steps">
      {answerParts(explanation, answers, cq).map((part, i) => (
        <div className="paper-answer-part" key={i}>
          {part.label && <b className="paper-answer-label">({part.label})</b>}
          <div className="paper-answer-content">
            {answerLines(part.text).map((line, j) => {
              const steps = equalitySteps(line);
              return steps ? (
                <div className="paper-equation-steps" key={j}>
                  {steps.right.map((right, k) => (
                    <div className="paper-equation-row" key={k}>
                      <div className="paper-equation-left">
                        {k === 0 && <RichPaperText text={steps.left} />}
                      </div>
                      <span className="paper-equation-equals">=</span>
                      <div className="paper-equation-right">
                        <RichPaperText text={right} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div key={j}>
                  <RichPaperText text={line} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
