import { Suspense } from "react";
import { redirect } from "next/navigation";
import HomePage from "@/app/page";
import { auth } from "@/auth";
import { safeLoginRedirect } from "@/lib/login-redirect";
import LoginDialog from "@/components/auth/login-dialog";
export const dynamic = "force-dynamic";
export const metadata = { title: "লগইন করুন" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeLoginRedirect((await searchParams).next);
  if ((await auth())?.user?.id) redirect(next);
  // Use the actual site homepage, not a copied competitor backdrop. Native modal makes it inert.
  return (
    <>
      <Suspense
        fallback={
          <div
            style={{ minHeight: "100vh", background: "#edf3fa" }}
            aria-hidden="true"
          />
        }
      >
        <HomePage />
      </Suspense>
      <LoginDialog next={next} />
    </>
  );
}
