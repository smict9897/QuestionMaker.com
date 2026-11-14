"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { privateResourceMarker } from "@/lib/resource-vault";
import { staff } from "@/lib/guard";

const done = () => revalidatePath("/", "layout");
export async function addPost(fd: FormData): Promise<void> {
  await staff();
  const d = z
    .object({ title: z.string().min(3), body: z.string().min(20) })
    .parse(Object.fromEntries(fd));
  await db.post.create({ data: d });
  done();
}
export async function addTestimonial(fd: FormData): Promise<void> {
  await staff();
  const d = z
    .object({
      name: z.string().min(2),
      role: z.string(),
      quote: z.string().min(10),
    })
    .parse(Object.fromEntries(fd));
  await db.testimonial.create({ data: { ...d, role: d.role || null } });
  done();
}
export async function remove(
  kind: "resource" | "job" | "post" | "testimonial" | "question",
  id: string,
): Promise<void> {
  await staff();
  if (kind === "resource") await db.resource.delete({ where: { id } });
  else if (kind === "job") await db.job.delete({ where: { id } });
  else if (kind === "post") await db.post.delete({ where: { id } });
  else if (kind === "testimonial")
    await db.testimonial.delete({ where: { id } });
  else await db.question.delete({ where: { id } });
  done();
}
export async function updateResource(id: string, fd: FormData): Promise<void> {
  const actor = await staff();
  const d = z
    .object({ title: z.string().min(2), price: z.coerce.number().int().min(0) })
    .parse(Object.fromEntries(fd));
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`resource-vault:v1:${id}`}))`;
    if (
      !actor.id ||
      (
        await tx.user.findUnique({
          where: { id: actor.id },
          select: { role: true },
        })
      )?.role !== "ADMIN"
    )
      throw Error("অনুমতি নেই।");
    const current = await tx.resource.findUnique({ where: { id } });
    if (!current) throw Error("উপকরণ নেই।");
    if (
      current.priceBdt === 0 &&
      d.price > 0 &&
      current.category !== "Video" &&
      current.fileUrl !== privateResourceMarker(id)
    )
      throw Error(
        "Public free PDF-কে সরাসরি paid করবেন না। Encrypted নতুন paid PDF হিসেবে যোগ করুন।",
      );
    await tx.resource.update({
      where: { id },
      data: { title: d.title, priceBdt: d.price },
    });
  });
  done();
}
export async function updateJob(id: string, fd: FormData): Promise<void> {
  await staff();
  const d = z
    .object({ title: z.string().min(3), org: z.string().min(2) })
    .parse(Object.fromEntries(fd));
  await db.job.update({ where: { id }, data: d });
  done();
}
export async function updateQuestion(id: string, fd: FormData): Promise<void> {
  await staff();
  const d = z
    .object({ text: z.string().min(3), explanation: z.string() })
    .parse(Object.fromEntries(fd));
  await db.question.update({ where: { id }, data: d });
  done();
}
