import { READY_PREFIX } from "@/lib/ready-papers";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { readyUploadActor, canManagePending } from "@/lib/ready-submissions";
import { db } from "@/lib/db";
import { PENDING_PART, finalizeReadyPart } from "@/lib/ready-part-storage";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const actor = await readyUploadActor();
        const match = /^ready-papers\/parts\/([a-f0-9-]{36})\.pdf$/.exec(
          pathname,
        );
        if (!match) throw Error("Invalid path");
        const row = await db.setting.findUnique({
          where: { key: PENDING_PART + match[1] },
        });
        if (!row) throw Error("Missing session");
        const existing = await db.setting.findUnique({
          where: { key: READY_PREFIX + match[1] },
        });
        if (existing) throw Error("Already finalized");
        const p = JSON.parse(row.value);
        if (!canManagePending(actor, p)) throw Error("Not owner");
        if (p.path !== pathname || Date.now() - Date.parse(p.at) > 3600000)
          throw Error("Expired session");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 10_000_000,
          addRandomSuffix: false,
          validUntil: Date.now() + 3600000,
          tokenPayload: match[1],
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload || !/^[-a-f0-9]{36}$/.test(tokenPayload))
          throw Error("Invalid callback");
        await finalizeReadyPart(tokenPayload, blob.url);
      },
    });
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Upload অনুমতি বা storage যাচাই হয়নি।" },
      { status: 400 },
    );
  }
}
