import Link from "next/link";
import { addResource } from "@/app/actions/resources";
const f = "rounded-md border border-slate-300 p-2";
export default function Page() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-bold">Add material</h1>
      <p className="mb-4">
        পেইড PDF: সর্বোচ্চ ৩ MB/১০০ পৃষ্ঠা ফাইল ও configured encrypted storage
        প্রয়োজন; public/external PDF link দিয়ে নতুন paid material নয়। বিনামূল্যের
        PDF সর্বোচ্চ ৪ MB; ভিডিওর বাহ্যিক hosting encrypted PDF নয়।{" "}
        <Link className="underline" href="/admin/pdf-storage">
          Storage প্রস্তুতি যাচাই করুন →
        </Link>
      </p>
      <form action={addResource} className="grid gap-3">
        <input name="title" required className={f} placeholder="Title" />
        <select name="category" className={f}>
          <option>Academic</option>
          <option>Admission</option>
          <option>NTRCA</option>
          <option>Library</option>
          <option>Video</option>
        </select>
        <input
          name="price"
          type="number"
          min={0}
          defaultValue={0}
          className={f}
          aria-label="Price in BDT (0 is free)"
        />
        <input name="file" type="file" accept="application/pdf" className={f} />
        <input
          name="link"
          type="url"
          className={f}
          placeholder="External link: free material or hosted video only"
        />
        <button className="rounded-md bg-royal px-4 py-2 text-white">
          Save material
        </button>
      </form>
    </main>
  );
}
