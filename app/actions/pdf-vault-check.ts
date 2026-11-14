"use server";
import { auth } from "@/auth";
import { runPdfVaultCheck } from "@/lib/pdf-vault-check";
export async function checkPdfVault(
  _: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const id = (await auth())?.user?.id;
    if (!id || form.get("confirmed") !== "on") throw Error("Consent required");
    const result = await runPdfVaultCheck(id);
    return {
      ok: result.verified && result.cleanup,
      message: result.verified
        ? result.cleanup
          ? "পরীক্ষার PDF encrypt, upload, read, decrypt ও delete সফল। এটি শুধু এই deployment-এর storage পরীক্ষা; buyer/seller বা mobile E2E নয়।"
          : "Encrypt/read যাচাই সফল, কিন্তু test ciphertext cleanup হয়নি। Private diagnostic audit দেখে cleanup করুন; production প্রস্তুত ধরে নেবেন না।"
        : "Storage পরীক্ষা সফল হয়নি। Test object মুছে ফেলা হয়েছে কি না diagnostic audit যাচাই করুন। Provider error, URL বা key এখানে দেখানো হচ্ছে না।",
    };
  } catch {
    return {
      ok: false,
      message:
        "পরীক্ষা চালানো যায়নি। বর্তমান ADMIN অনুমতি, server keyring/Blob configuration ও অন্তত ৬০ সেকেন্ড বিরতি যাচাই করুন।",
    };
  }
}
