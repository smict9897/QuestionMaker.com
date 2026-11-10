import type { PaperHeaderConfig } from "@/lib/paper-header";
export default function HeaderPreview({
  header: h,
  setName,
  autoSet = false,
  sectionTitle,
}: {
  header: PaperHeaderConfig;
  setName?: string;
  autoSet?: boolean;
  sectionTitle?: string;
}) {
  const f = h.fields;
  const text = (key: keyof typeof f) => (f[key].enabled ? f[key].value : "");
  const set = text("setCode")
    ? autoSet
      ? `সেট: ${setName}`
      : text("setCode")
    : "";
  return (
    <div
      className={`custom-paper-header ${h.mode === "dynamic" ? "custom-paper-header-dynamic" : ""} ${h.layout === "branded" && h.mode === "dynamic" ? "custom-paper-header-branded" : ""}`}
    >
      {h.mode === "dynamic" && h.layout === "branded" && h.branding && (
        <div className="header-branding">{h.branding}</div>
      )}
      <div className="header-institute">{text("institute")}</div>
      {text("program") && (
        <div className="header-program">{text("program")}</div>
      )}
      {text("class") && <div>{text("class")}</div>}
      {text("subject") && <div>{text("subject")}</div>}
      {(set || text("subjectCode")) && (
        <div className="header-codes">
          {set && <div>{set}</div>}
          {text("subjectCode") && (
            <div>
              বিষয় কোড:{" "}
              <span className="header-code-boxes">
                {Array.from(text("subjectCode")).map((char, i) => (
                  <span key={i}>{char}</span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="header-exam-row">
        <span>{text("time") && `সময়– ${text("time")}`}</span>
        <strong>
          {sectionTitle || (f.questionType.enabled ? f.questionType.value : "")}
        </strong>
        <span>{text("fullMarks") && `পূর্ণমান– ${text("fullMarks")}`}</span>
      </div>
      {text("note") && (
        <p
          className={
            h.mode === "dynamic" && h.layout === "branded"
              ? "header-note-box"
              : "header-note"
          }
        >
          {text("note")}
        </p>
      )}
      {text("extraInfo") && <p className="header-extra">{text("extraInfo")}</p>}
      {text("addNew") && <p>{text("addNew")}</p>}
      {(text("studentName") || text("studentRoll")) && (
        <div className="header-student-row">
          {text("studentName") && <span>{text("studentName")}</span>}
          {text("studentRoll") && <span>{text("studentRoll")}</span>}
        </div>
      )}
    </div>
  );
}
