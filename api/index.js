export const config = { runtime: "nodejs" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Missing TARGET_DOMAIN", { status: 500 });
  }

  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
const url = new URL(req.url, `${proto}://${req.headers.host}`);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    const headers = new Headers(req.headers);
    for (const h of STRIP_HEADERS) headers.delete(h);

    headers.set("host", new URL(TARGET_BASE).hostname);

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body,
      redirect: "manual",
    });

    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (e) {
    console.error(e);
    return new Response("Bad Gateway", { status: 502 });
  }
}
