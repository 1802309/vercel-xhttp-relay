export const config = { runtime: "nodejs" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

export default async function handler(req, res) {
  if (!TARGET_BASE) {
    res.status(500).send("Missing TARGET_DOMAIN");
    return;
  }

  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = new URL(req.url, `${proto}://${req.headers.host}`);
    const targetUrl = TARGET_BASE + baseUrl.pathname + baseUrl.search;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (["host","connection","keep-alive","transfer-encoding","upgrade"].includes(k)) continue;
      headers[k] = v;
    }
    headers["host"] = new URL(TARGET_BASE).hostname;

    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    const fetchOptions = {
      method: req.method,
      headers,
      redirect: "manual",
    };

    if (hasBody) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      fetchOptions.body = Buffer.concat(chunks);
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const data = await response.arrayBuffer();
    res.send(Buffer.from(data));

  } catch (err) {
    console.error("Relay error:", err);
    res.status(502).send("Bad Gateway");
  }
}
