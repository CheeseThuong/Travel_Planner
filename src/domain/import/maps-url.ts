export class MapsUrlError extends Error {
  constructor(readonly code: "UNSUPPORTED_URL" | "UNSAFE_REDIRECT") { super(code); }
}

export interface MapsUrl {
  readonly kind: "full" | "short";
  readonly query?: string;
  readonly provider_place_id?: string;
}

/** URL hints are unverified search text, never authoritative place coordinates. */
export function parseMapsUrl(input: string): MapsUrl {
  const reject = () => { throw new MapsUrlError("UNSUPPORTED_URL"); };
  if (input.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(input) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(input)) return reject();
  let url: URL;
  try { url = new URL(input); } catch { return reject(); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return reject();
  if (url.hostname === "maps.app.goo.gl" && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) return { kind: "short" };
  if (url.hostname === "goo.gl" && /^\/maps\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) return { kind: "short" };
  if (!["www.google.com", "google.com", "maps.google.com"].includes(url.hostname) || !/^\/maps(?:\/|$)/.test(url.pathname)) return reject();
  let pathTitle: string | undefined;
  try { pathTitle = /^\/maps\/place\/([^/]+)/.exec(url.pathname)?.[1]; pathTitle = pathTitle ? decodeURIComponent(pathTitle.replace(/\+/g, " ")) : undefined; }
  catch { return reject(); }
  const query = (url.searchParams.get("query") ?? url.searchParams.get("q") ?? pathTitle)?.trim();
  const placeId = url.searchParams.get("query_place_id");
  return { kind: "full", ...(query && query.length <= 200 ? { query } : {}), ...(placeId && /^[A-Za-z0-9_-]{1,256}$/.test(placeId) ? { provider_place_id: placeId } : {}) };
}

/** Pure validation only. A future transport must additionally pin public DNS and bound hops. */
export function validateMapsRedirect(current: string, location: string): MapsUrl {
  try {
    parseMapsUrl(current);
    if (/[\\\u0000-\u0020\u007f]/u.test(location)) throw new Error();
    return parseMapsUrl(new URL(location, current).href);
  } catch { throw new MapsUrlError("UNSAFE_REDIRECT"); }
}
