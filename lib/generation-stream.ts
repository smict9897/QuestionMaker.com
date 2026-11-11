/** Extract only complete objects in a named root-level JSON array. Never repair truncated objects. */
export function completeArrayObjects(input: string, key: string): unknown[] {
  const result: unknown[] = [];
  let depth = 0,
    quoted = false,
    escaped = false,
    start = -1,
    arrayDepth = -1;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') {
      if (depth === 1 && arrayDepth < 0) {
        const match = /^"([^"\\]*)"\s*:\s*\[/.exec(input.slice(i));
        if (match && match[1] === key) {
          i += match[0].length - 1;
          arrayDepth = ++depth;
          continue;
        }
      }
      quoted = true;
    } else if (c === "{" || c === "[") {
      if (arrayDepth === depth && c === "{") start = i;
      depth++;
    } else if (c === "}" || c === "]") {
      if (
        arrayDepth > 0 &&
        depth === arrayDepth + 1 &&
        c === "}" &&
        start >= 0
      ) {
        try {
          result.push(JSON.parse(input.slice(start, i + 1)));
        } catch {
          /* invalid object is not recoverable */
        }
        start = -1;
      }
      if (depth === arrayDepth && c === "]") break;
      depth--;
    }
  }
  return result;
}

/** Bounded SSE consumption. Await checkpoints before consuming more output; supports JSON responses too. */
export async function readGenerationResponse(
  response: Response,
  onContent: (text: string) => Promise<void>,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("EMPTY_RESPONSE");
  const decoder = new TextDecoder();
  let bytes = 0,
    pending = "",
    content = "",
    finish: string | null = null;
  const streaming = response.headers
    .get("content-type")
    ?.includes("text/event-stream");
  async function line(value: string) {
    if (!value.startsWith("data:")) return;
    const data = value.slice(5).trim();
    if (!data || data === "[DONE]") return;
    const envelope = JSON.parse(data);
    const choice = envelope?.choices?.[0];
    if (typeof choice?.delta?.content === "string") {
      content += choice.delta.content;
      if (choice.delta.content.includes("}")) await onContent(content);
    }
    if (choice?.finish_reason) finish = choice.finish_reason;
  }
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 1000000) throw new Error("TOO_LARGE");
      pending += decoder.decode(next.value, { stream: true });
      if (streaming) {
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          await line(pending.slice(0, end).replace(/\r$/, ""));
          pending = pending.slice(end + 1);
        }
      }
    }
    pending += decoder.decode();
    if (streaming) await line(pending);
    else {
      const choice = JSON.parse(pending)?.choices?.[0];
      content =
        typeof choice?.message?.content === "string"
          ? choice.message.content
          : "";
      finish = choice?.finish_reason;
      await onContent(content);
    }
    return { content, finish };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
