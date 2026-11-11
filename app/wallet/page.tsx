import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/wallet";
import {
  workspaceSummary,
  safeWalletRecord,
  displayDate,
} from "@/lib/workspace-summary";
import { db } from "@/lib/db";
import {
  PAYMENT_NUMBER,
  PAYMENT_TYPE,
  PAYMENT_METHODS,
} from "@/lib/payment-info";
import RechargeForm from "@/components/recharge-form";
import TeacherWorkspace, {
  CopyPaymentNumber,
} from "@/components/teacher-workspace";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "আমার ওয়ালেট", robots: { index: false } };
export default async function WalletPage() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?next=/wallet");
  const [data, rows, receipts] = await Promise.all([
    workspaceSummary(s.user.id),
    db.setting
      .findMany({
        where: { key: { startsWith: `wallet:recharge:${s.user.id}:` } },
        take: 50,
      })
      .catch(() => null),
    db.setting
      .findMany({
        where: { key: { startsWith: `wallet:question:${s.user.id}:` } },
        take: 50,
      })
      .catch(() => null),
  ]);
  const w = data.wallet,
    balance = w ? (w.admin ? "চার্জমুক্ত" : formatMoney(w.balance)) : "লোড হয়নি";
  const history = (list: typeof rows) =>
    list
      ?.flatMap((row) => {
        const r = safeWalletRecord(row.value);
        return r ? [{ ...r, key: row.key }] : [];
      })
      .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const recharges = history(rows),
    purchases = history(receipts);
  return (
    <TeacherWorkspace
      name={s.user.name || "আপনি"}
      email={s.user.email || ""}
      balance={balance}
      admin={!!w?.admin}
    >
      <main className="tw-main">
        <div className="tw-section-title">
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>আমার ওয়ালেট</h1>
          <Link href="/dashboard">ড্যাশবোর্ডে ফিরুন →</Link>
        </div>
        <section className="tw-wallet-stats">
          <div className="tw-stats">
            <div className="tw-stat">
              <small>বর্তমান balance</small>
              <strong>{balance}</strong>
              <span>নগদ উত্তোলনযোগ্য নয়</span>
            </div>
            <div className="tw-stat">
              <small>প্রশ্নের মূল্য</small>
              <strong style={{ fontSize: "1.1rem" }}>২০ / ৩০ / ৫০ পয়সা</strong>
              <span>MCQ / SQ / CQ</span>
            </div>
            <div className="tw-stat">
              <small>আমার প্যাকেজ</small>
              <strong style={{ fontSize: "1.1rem" }}>
                {data.packagePurchase === undefined
                  ? "যাচাই হয়নি"
                  : data.packagePurchase?.package.title || "সক্রিয় প্যাকেজ নেই"}
              </strong>
              <Link className="tw-link" href="/packages">
                প্যাকেজ দেখুন
              </Link>
            </div>
          </div>
          <p className="tw-muted">
            প্রথম লগইনে একবার ৳২০ bonus credit। আগে কেনা একই প্রশ্নে পুনরায় চার্জ
            নেই। প্যাকেজ ও account balance—দুটিই ব্যবহার করতে পারবেন।
          </p>
        </section>
        {!w && (
          <p role="alert" className="tw-warning">
            Balance যাচাই করা যায়নি। আবার চেষ্টা করুন।
          </p>
        )}
        {!w?.admin && (
          <section className="tw-panel" id="recharge">
            <h2>ওয়ালেটে টাকা যোগ করুন</h2>
            <p>
              সর্বনিম্ন রিচার্জ <strong>৳২০</strong>। নিচের নম্বরে{" "}
              <strong>{PAYMENT_TYPE}</strong> করুন, তারপর SMS-এর TrxID দিয়ে অনুরোধ
              পাঠান। অ্যাডমিন মিলিয়ে অনুমোদন করলে তবেই balance যোগ হবে।
            </p>
            {PAYMENT_METHODS.map((method) => (
              <div className="tw-payment-number" key={method.id}>
                <strong style={{ color: method.color }}>{method.label}</strong>
                <strong>{PAYMENT_NUMBER}</strong>
                <CopyPaymentNumber number={PAYMENT_NUMBER} />
              </div>
            ))}
            <p className="tw-warning">
              শুধু Send Money করুন—Cash Out নয়। ভুল বা আগে ব্যবহৃত TrxID গ্রহণযোগ্য নয়।
              নতুন অনুরোধের আগে আগের pending অনুরোধ যাচাই হওয়া প্রয়োজন।
            </p>
            <RechargeForm />
          </section>
        )}
        <section className="tw-panel">
          <h2>আমার রিচার্জ অনুরোধ</h2>
          <p className="tw-muted">সর্বোচ্চ ৫০টি রেকর্ড দেখানো হচ্ছে।</p>
          {recharges === undefined ? (
            <p role="alert">তালিকা লোড হয়নি। আবার চেষ্টা করুন।</p>
          ) : !recharges.length ? (
            <p className="tw-muted">এখনও কোনো রিচার্জ অনুরোধ নেই।</p>
          ) : (
            <div className="tw-table-wrap">
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>মাধ্যম / TrxID</th>
                    <th>পরিমাণ</th>
                    <th>অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {recharges.map((r) => (
                    <tr key={r.key}>
                      <td>{displayDate(r.at)}</td>
                      <td>
                        {String(r.method || "—")} / {String(r.trx || "—")}
                      </td>
                      <td>
                        {Number.isSafeInteger(r.amount)
                          ? formatMoney(r.amount)
                          : "—"}
                      </td>
                      <td>
                        <span className="tw-status">
                          {r.status === "APPROVED"
                            ? "অনুমোদিত"
                            : r.status === "REJECTED"
                              ? "বাতিল"
                              : "যাচাই বাকি"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="tw-panel">
          <h2>প্রশ্ন কেনার রসিদ</h2>
          <p className="tw-muted">
            সর্বোচ্চ ৫০টি প্রশ্নের ব্যবহারাধিকার রেকর্ড। এটি পূর্ণ balance ledger নয়।
          </p>
          {purchases === undefined ? (
            <p role="alert">রসিদ লোড হয়নি।</p>
          ) : !purchases.length ? (
            <p className="tw-muted">এখনও কোনো প্রশ্ন কেনার রসিদ নেই।</p>
          ) : (
            <div className="tw-table-wrap">
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>প্রশ্ন</th>
                    <th>কেটেছে</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((r) => (
                    <tr key={r.key}>
                      <td>{displayDate(r.at)}</td>
                      <td>{String(r.questionId || "—")}</td>
                      <td>
                        {Number.isSafeInteger(r.amount)
                          ? formatMoney(r.amount)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </TeacherWorkspace>
  );
}
