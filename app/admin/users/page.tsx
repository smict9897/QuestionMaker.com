import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteUser, setRole } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  const me = (await auth())?.user;
  if (me?.role !== "ADMIN") redirect("/admin");

  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm font-sans">
      <h1 className="text-2xl font-bold text-slate-900">Users ({users.length})</h1>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        ADMIN can do everything. TEACHER can add content but cannot change settings or users.
      </p>

      <ul className="grid gap-2">
        {users.map((u) => {
          // 🔒 মূল সুপার অ্যাডমিন শনাক্তকরণ
          const isSuperAdmin = u.email?.toLowerCase() === "smict9897@gmail.com";
          const isMe = u.id === me.id || (me?.email && u.email?.toLowerCase() === me.email.toLowerCase());

          return (
            <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 bg-white">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">
                  {u.name ?? "No name"}
                  {isMe && <span className="ml-2 text-xs text-slate-400 font-semibold">(you)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {u.email} · joined {u.createdAt.toLocaleDateString("en-GB")}
                </p>
              </div>

              {/* 🎯 ১. smict9897 এর জন্য ড্রপডাউন বন্ধ এবং স্থায়ী লক ব্যাজ */}
              {isSuperAdmin ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold tracking-tight flex items-center gap-1 shadow-xs">
                  🔒 সুপার অ্যাডমিন (ডিফল্ট)
                </span>
              ) : !isMe ? (
                /* ২. অন্যান্য ইউজারের জন্য রোল পরিবর্তন ও ডিলিট অপশন */
                <>
                  <form action={setRole.bind(null, u.id)} className="flex gap-1">
                    <select
                      name="role"
                      defaultValue={u.role}
                      aria-label="Role"
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-royal"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="rounded-lg bg-royal hover:bg-blue-700 px-3 py-1 text-sm font-semibold text-white transition">
                      Save
                    </button>
                  </form>

                  <form action={deleteUser.bind(null, u.id)}>
                    <button className="rounded-lg border border-red-300 hover:bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 transition">
                      Delete
                    </button>
                  </form>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
