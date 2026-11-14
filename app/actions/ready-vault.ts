"use server";
import { auth } from "@/auth";
import { captureReadyVault } from "@/lib/ready-vault";
import { revalidatePath } from "next/cache";
export async function saveReadySourceCheckpoint(receiptId: string) {
  try {
    const id = (await auth())?.user?.id;
    if (!id || !/^[a-f0-9]{64}$/.test(receiptId)) throw Error("Unauthorized");
    await captureReadyVault(id, receiptId);
    revalidatePath("/ready-papers/saved");
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error:
        "সুরক্ষিত উৎস কপি তৈরি হয়নি। Storage/key configuration, উৎস PDF, দৈনিক সর্বোচ্চ ১০টি চেষ্টা ও ৩ MB নির্বাচিত কপির সীমা যাচাই করুন। পুরোনো উৎসবিহীন কপিতে এই সুবিধা নেই।",
    };
  }
}
