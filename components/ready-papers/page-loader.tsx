export default function PageLoader({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const known = Number.isInteger(total) && total > 0;
  const done = known ? Math.max(0, Math.min(total, Math.floor(completed))) : 0;
  const percent = known ? Math.floor((done / total) * 100) : 0;
  const bn = (n: number) => n.toLocaleString("bn-BD");
  return (
    <section
      className="rp-page-loader"
      data-noprint
      aria-labelledby="rp-loader-title"
      aria-busy="true"
    >
      <div className="rp-loader-visual" aria-hidden="true">
        <div className="rp-loader-orbit" />
        <div className="rp-loader-orbit rp-loader-orbit-inner" />
        <div className="rp-loader-robot">
          <div className="rp-robot-antenna" />
          <div className="rp-robot-head">
            <span className="rp-robot-ear rp-robot-ear-left" />
            <div className="rp-robot-face">
              <i />
              <i />
              <span />
            </div>
            <span className="rp-robot-ear rp-robot-ear-right" />
          </div>
          <div className="rp-robot-body">
            <span />
            <i />
            <i />
            <i />
          </div>
        </div>
        <span className="rp-loader-page rp-loader-page-one">≡</span>
        <span className="rp-loader-page rp-loader-page-two">≡</span>
      </div>
      <span className="rp-loader-label">QUESTIONMAKERBD · PAPER STUDIO</span>
      <h2 id="rp-loader-title">আপনার প্রশ্নপত্র প্রস্তুত করছি</h2>
      <p className="rp-loader-subtitle">
        পাতাগুলো সাজিয়ে দেখার উপযোগী করা হচ্ছে।
      </p>
      <div
        className="rp-loader-progress"
        role="progressbar"
        aria-label="প্রস্তুত পৃষ্ঠার অগ্রগতি"
        aria-valuemin={0}
        aria-valuemax={known ? total : undefined}
        aria-valuenow={known ? done : undefined}
        aria-valuetext={
          known
            ? `${bn(total)}টির মধ্যে ${bn(done)}টি পৃষ্ঠা প্রস্তুত`
            : "PDF খোলা হচ্ছে"
        }
      >
        <span style={{ width: known ? `${percent}%` : "0%" }} />
      </div>
      <div
        className="rp-loader-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>
          {known ? (
            <>
              <strong>{bn(total)}</strong>টির মধ্যে <strong>{bn(done)}</strong>টি
              পৃষ্ঠা প্রস্তুত
            </>
          ) : (
            "PDF খোলা হচ্ছে…"
          )}
        </span>
        {known && <strong>{bn(percent)}%</strong>}
      </div>
      <p className="rp-loader-hint">
        <span aria-hidden="true" />
        প্রস্তুত হলে পৃষ্ঠা নির্বাচন দেখাবে
      </p>
    </section>
  );
}
