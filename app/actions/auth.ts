"use server";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { db } from "@/lib/db";

const Login = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function login(_: string, fd: FormData): Promise<string> {
  const p = Login.safeParse(Object.fromEntries(fd));
  if (!p.success) return "Enter a valid email and a password of at least 8 characters.";
  try { await signIn("credentials", { ...p.data, redirectTo: "/" }); }
  catch (e) { if (e instanceof AuthError) return "Email or password is wrong."; throw e; }
  return "";
}

export async function register(_: string, fd: FormData): Promise<string> {
  const p = Login.extend({ name: z.string().min(2) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return "Enter your name, a valid email and a password of at least 8 characters.";
  const email = p.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return "This email already has an account. Log in instead.";
  await db.user.create({ data: {
    email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 10),
    role: "STUDENT", // Email/password registration never grants elevated privileges.
  } });
  return login("", fd);
}

export async function googleLogin(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}
