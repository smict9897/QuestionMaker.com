import { summarizeHomeBank } from "@/lib/home-data";
const fmt = (n: number) => n.toLocaleString("bn-BD");
const colors = ["#1976ed", "#8441e8", "#ffc044", "#16a465", "#92a8c5"];
export default function HomeStats({
  rows,
  daily,
}: {
  rows: { category: string; count: number }[] | null;
  daily: number[] | null;
}) {
  const { total, items } = summarizeHomeBank(rows || []);
  let position = 0;
  const stops = items.map(([, count], i) => {
    const start = position;
    position += total ? (count / total) * 100 : 0;
    return `${colors[i]} ${start}% ${position}%`;
  });
  const max = Math.max(1, ...(daily || []));
  return (
    <section
      className="hm-panel hm-stats"
      aria-label="প্রশ্নব্যাংকের পরিসংখ্যান"
    >
      <div className="hm-panel-title">
        <h2>প্রশ্ন ব্যাংকের পরিসংখ্যান</h2>
        <p>অনুমোদিত প্রশ্নের বর্তমান অবস্থা</p>
        <span className="hm-live">
          ● {rows === null ? "তথ্য অনুপলব্ধ" : "সর্বশেষ তথ্য"}
        </span>
      </div>
      {rows === null ? (
        <p className="hm-empty" role="status">
          এই মুহূর্তে পরিসংখ্যান লোড করা যায়নি। পরে আবার চেষ্টা করুন।
        </p>
      ) : (
        <>
          <div className="hm-stat-body">
            <div
              className="hm-donut"
              style={{
                background: total
                  ? `conic-gradient(${stops.join(",")})`
                  : "#e4ecf7",
              }}
            >
              <div>
                <strong>{fmt(total)}</strong>
                <small>মোট প্রশ্ন</small>
              </div>
            </div>
            <div className="hm-stat-legend">
              {items.length ? (
                items.map(([name, count], i) => (
                  <div key={name} style={{ borderLeftColor: colors[i] }}>
                    <span>
                      {name}
                      <small>
                        {fmt(total ? Math.round((count / total) * 100) : 0)}%
                      </small>
                    </span>
                    <strong>{fmt(count)}</strong>
                    <div className="hm-progress">
                      <i
                        style={{
                          width: `${total ? (count / total) * 100 : 0}%`,
                          background: colors[i],
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p>এখনও অনুমোদিত প্রশ্ন যোগ হয়নি।</p>
              )}
            </div>
          </div>
        </>
      )}
      <div className="hm-week">
        <h3>গত ৭ দিনে যোগ হওয়া প্রশ্ন</h3>
        <p>প্রশ্ন তৈরির তারিখ অনুযায়ী · UTC</p>
        {daily ? (
          <div className="hm-bars">
            {daily.map((count, i) => {
              const date = new Date();
              date.setUTCDate(date.getUTCDate() - (6 - i));
              return (
                <div key={i}>
                  <span>{fmt(count)}</span>
                  <i
                    style={{ height: `${Math.max(2, (count / max) * 76)}px` }}
                  />
                  <small>
                    {i === 6
                      ? "আজ"
                      : date.toLocaleDateString("bn-BD", {
                          weekday: "short",
                          timeZone: "UTC",
                        })}
                  </small>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="hm-empty">সাপ্তাহিক তথ্য এখন পাওয়া যাচ্ছে না।</p>
        )}
      </div>
      <div className="hm-stat-foot">
        {daily
          ? `এই সপ্তাহে মোট ${fmt(daily.reduce((a, b) => a + b, 0))}টি প্রশ্ন যোগ হয়েছে`
          : "সাপ্তাহিক তথ্য অনুপলব্ধ"}
        <span>পৃষ্ঠা খোলার সময় হালনাগাদ</span>
      </div>
    </section>
  );
}
