import { Readable } from "stream";

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
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function handler(req, res) {
  if (!TARGET_BASE) {
    res.status(500).send("Missing TARGET_DOMAIN");
    return;
  }

  try {
    const proto = req.headers["x-forwarded-proto"] || "https";

    const incomingUrl = new URL(
      req.url,
      `${proto}://${req.headers.host}`
    );

    const targetUrl =
      TARGET_BASE + incomingUrl.pathname + incomingUrl.search;

    const headers = { ...req.headers };

    for (const h of STRIP_HEADERS) {
      delete headers[h];
    }

    headers.host = new URL(TARGET_BASE).hostname;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : req,
      redirect: "manual",
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      try {
        res.setHeader(key, value);
      } catch (_) {}
    });

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Relay error:", err);
    res.status(502).send("Bad Gateway");
  }
}
