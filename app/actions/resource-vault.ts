"use server";
import { retireResourceOriginal } from "@/lib/resource-retirement";
import { auth } from "@/auth";
import { migrateResourcePdf } from "@/lib/resource-vault";
import { revalidatePath } from "next/cache";
export async function migratePaidResource(
  _: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const id = (await auth())?.user?.id;
    if (!id || form.get("confirmed") !== "on") throw Error("Consent required");
    await migrateResourcePdf(id, String(form.get("resourceId") || ""));
    revalidatePath("/admin/pdf-storage/resources");
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        "নতুন encrypted কপি যাচাই করে download route বদলানো হয়েছে। পুরোনো public ফাইল মুছে ফেলা হয়নি—shared reference ও backup যাচাই করে আলাদা retirement প্রয়োজন।",
    };
  } catch {
    return {
      ok: false,
      message:
        "Migration হয়নি। বর্তমান ADMIN, key/Blob config, নিজের প্রকল্পের public Blob PDF, সর্বোচ্চ ৩ MB/১০০ পৃষ্ঠা ও দিনে ১০টি চেষ্টার সীমা যাচাই করুন। ভিডিও/external link migrate করা হয় না।",
    };
  }
}

export async function retirePaidResourceOriginal(
  _: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const actor = (await auth())?.user?.id;
    if (
      !actor ||
      form.get("confirmed") !== "on" ||
      form.get("backupConfirmed") !== "on"
    )
      throw Error("Consent required");
    const result = await retireResourceOriginal(
      actor,
      String(form.get("resourceId") || ""),
    );
    revalidatePath("/admin/pdf-storage/resources");
    return {
      ok: result === "REMOVED",
      message:
        result === "REMOVED"
          ? "Storage deletion সফল হিসেবে নথিভুক্ত। আগে নেওয়া কপি, বাইরের link/cache বা provider propagation সঙ্গে সঙ্গে বন্ধ হওয়ার নিশ্চয়তা নেই। Download এখন encrypted কপি থেকে হয়।"
          : "Provider deletion-এর ফল নিশ্চিত নয়। Intent ও blocked-source marker রাখা হয়েছে; private retirement audit/provider যাচাই ছাড়া সফল ধরে নেবেন না।",
    };
  } catch {
    return {
      ok: false,
      message:
        "Retirement নিশ্চিত হয়নি। বর্তমান ADMIN, backup সম্মতি, verified encrypted copy, migration audit ও shared reference যাচাই করুন। শুধু notes/ upload সমর্থিত। চলমান চেষ্টা থাকলে অন্তত ৫ মিনিট অপেক্ষা করে অবস্থা তদন্ত করুন; মুছে গেছে ধরে নেবেন না।",
    };
  }
}
