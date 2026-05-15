import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const SITE_URL = "https://ai-debate.sdee3.com";

const http = httpRouter();

// Auth routes (OAuth callbacks)
auth.addHttpRoutes(http);

// Rate limit check for sign-in attempts (5 per hour per IP)
http.route({
  path: "/api/check-rate-limit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    try {
      await ctx.runMutation(api.rateLimit.recordIpAttempt, {
        ip,
        action: "signIn",
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Too many sign-in attempts. Please try again later.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

/**
 * SEO prerendering for debate pages.
 * Returns HTML with debate-specific Open Graph and Twitter Card meta tags.
 * Social media crawlers (which don't execute JS) get this instead of the SPA's index.html.
 */
http.route({
  pathPrefix: "/debate/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const debateId = pathParts[pathParts.length - 1];

    if (!debateId || debateId.length < 10) {
      return debateNotFoundHtml("");
    }

    const debate = await ctx.runQuery(api.queries.getDebate, {
      id: debateId as any,
    });

    if (!debate) {
      return debateNotFoundHtml(debateId);
    }

    const modelNames = debate.responses
      .map((r) => r.modelId)
      .slice(0, 3)
      .join(", ");

    const title = `${debate.topic} | AI Debate`;
    const description = `AI models debate "${debate.topic}". See how ${modelNames || "multiple AI models"} rank their agreement on this topic.`;
    const canonicalUrl = `${SITE_URL}/debate/${debateId}`;
    const isPublic = debate.isPublic ?? false;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#09090b">
  ${isPublic ? '<meta name="robots" content="index, follow">' : '<meta name="robots" content="noindex, nofollow">'}
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:site_name" content="AI Debate">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
</head>
<body>
  <noscript>
    <h1>${escapeHtml(debate.topic)}</h1>
    <p>${escapeHtml(description)}</p>
  </noscript>
  <div id="root"></div>
  <script>
    window.location.replace("/debate/${debateId}");
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
      },
    });
  }),
});

/**
 * Dynamic sitemap.xml with all public debates.
 */
http.route({
  path: "/sitemap.xml",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const debates = await ctx.runQuery(api.queries.listPublicDebates);

    const staticUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [
      { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${SITE_URL}/credits`, priority: "0.3", changefreq: "monthly" },
    ];

    const debateUrls = debates.map((d) => ({
      loc: `${SITE_URL}/debate/${d._id}`,
      lastmod: new Date(d._creationTime).toISOString().split("T")[0],
      priority: "0.6",
      changefreq: "weekly",
    }));

    const allUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [...staticUrls, ...debateUrls];

    const urlEntries = allUrls
      .map(
        (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
      },
    });
  }),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function debateNotFoundHtml(debateId: string): Response {
  const title = "Debate Not Found | AI Debate";
  const description =
    "This debate could not be found. It may have been removed or made private.";
  const canonicalUrl = debateId
    ? `${SITE_URL}/debate/${debateId}`
    : `${SITE_URL}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:site_name" content="AI Debate">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
</head>
<body>
  <noscript>
    <p>${escapeHtml(description)}</p>
  </noscript>
  <div id="root"></div>
  <script>
    window.location.replace("/debate/${debateId || ""}");
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    },
  });
}

export default http;
