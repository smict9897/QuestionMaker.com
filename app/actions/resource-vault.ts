"use server";
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
