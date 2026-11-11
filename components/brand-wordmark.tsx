import "./brand-wordmark.css";

/** Compact header branding: no splash, timers or perpetual flashing. */
export default function BrandWordmark({
  name = "QuestionMakerBd.com",
}: {
  name?: string;
}) {
  const branded = name === "QuestionMakerBd.com";
  return (
    <span className="qm-wordmark">
      <span className="qm-wordmark-title">
        {branded ? (
          <>
            QuestionMaker<span className="qm-wordmark-bd">Bd</span>
            <span className="qm-wordmark-domain">.com</span>
          </>
        ) : (
          name
        )}
      </span>
      <span className="qm-wordmark-tagline">
        Empowering Assessments with AI
      </span>
    </span>
  );
}
