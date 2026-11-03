import { auth } from "@/auth";

// 🔒 অ্যাডমিন ভ্যালিডেশন
export async function admin() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("অননুমোদিত: শুধুমাত্র অ্যাডমিন এই কাজটি করতে পারবেন।");
  }

  return session.user;
}

// 🔒 স্টাফ ভ্যালিডেশন (এখানেও শুধুমাত্র ADMIN অনুমোদিত করা হলো)
export async function staff() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("অননুমোদিত: শুধুমাত্র অ্যাডমিন এই কাজটি করতে পারবেন।");
  }

  return session.user;
}
