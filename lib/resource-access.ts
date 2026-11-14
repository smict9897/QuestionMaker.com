/** Redirect destinations are legacy admin-provided external links, not private storage. */
export function resourceDestination(raw: string) {
  const url = new URL(raw);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("Invalid resource link");
  return url.href;
}
