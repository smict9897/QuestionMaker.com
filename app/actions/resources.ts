"use server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import {
  prepareResourcePdf,
  discardResourcePdf,
  privateResourceMarker,
  resourceVaultKey,
} from "@/lib/resource-vault";
export async function addResource(fd: FormData): Promise<void> {
  const actor = await staff();
  if (
    !actor.id ||
    (
      await db.user.findUnique({
        where: { id: actor.id },
        select: { role: true },
      })
    )?.role !== "ADMIN"
  )
    throw Error("অনুমতি নেই।");
  const d = z
    .object({
      title: z.string().min(2),
      category: z.enum(["Academic", "Admission", "NTRCA", "Library", "Video"]),
      price: z.coerce.number().int().min(0),
      link: z.string(),
    })
    .parse(Object.fromEntries(fd));
  const file = fd.get("file");
  if (d.price > 0 && d.category !== "Video") {
    if (
      !(file instanceof File) ||
      file.type !== "application/pdf" ||
      file.size < 5 ||
      file.size > 3_000_000
    )
      throw Error(
        "পেইড PDF-এর জন্য সর্বোচ্চ ৩ MB ফাইল দিন। Public/external লিংক দিয়ে নতুন পেইড PDF যোগ করা যাবে না। Storage keyring/Blob আগে যুক্ত করুন।",
      );
    const id = randomUUID(),
      manifest = await prepareResourcePdf(
        id,
        new Uint8Array(await file.arrayBuffer()),
      ).catch(() => {
        throw Error(
          "Encrypted PDF সংরক্ষণ/যাচাই হয়নি। Keyring, Blob সংযোগ ও PDF-এর ৩ MB/১০০ পৃষ্ঠা সীমা যাচাই করুন। Public fallback হয়নি।",
        );
      });
    let keep = false;
    try {
      await db.$transaction(async (tx) => {
        if (
          (
            await tx.user.findUnique({
              where: { id: actor.id },
              select: { role: true },
            })
          )?.role !== "ADMIN"
        )
          throw Error("অনুমতি নেই।");
        await tx.resource.create({
          data: {
            id,
            title: d.title,
            category: d.category,
            fileUrl: privateResourceMarker(id),
            priceBdt: d.price,
          },
        });
        await tx.setting.create({
          data: { key: resourceVaultKey(id), value: JSON.stringify(manifest) },
        });
      });
      keep = true;
    } finally {
      if (!keep) await discardResourcePdf(manifest);
    }
  } else {
    let fileUrl = d.link;
    if (file instanceof File && file.size > 0) {
      if (d.price > 0)
        throw Error("পেইড Video-তে PDF upload নয়; যথাযথ video hosting প্রয়োজন।");
      if (file.type !== "application/pdf" || file.size > 4_000_000)
        throw new Error("Upload a PDF up to 4 MB, or paste a link instead.");
      fileUrl = (
        await put(`notes/${Date.now()}-${file.name}`, file, {
          access: "public",
        })
      ).url;
    }
    if (!fileUrl) throw new Error("Add a PDF or a link.");
    const url = new URL(fileUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error("সঠিক HTTP/HTTPS লিংক দিন।");
    await db.resource.create({
      data: {
        title: d.title,
        category: d.category,
        fileUrl,
        priceBdt: d.price,
      },
    });
  }
  revalidatePath("/", "layout");
}
