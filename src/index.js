import { fetchInquiries } from "./provider.js";
import { normalizeInquiry, makeZohoRecord, retryDelaySeconds } from "./core.js";
import { upsertInquiry } from "./zoho.js";

const LEASE_SECONDS = 300;
const MAX_ATTEMPTS = 10;

async function persist(env, records) {
  const now = Math.floor(Date.now() / 1000);
  // No existing record or successful CRM write is overwritten by a repeated poll.
  for (const inquiry of records) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO inquiry_inbox (inquiry_id, normalized_json, status, available_at) VALUES (?, ?, 'pending', ?)"
    ).bind(inquiry.id, JSON.stringify(inquiry), now).run();
  }
}

async function drain(env, count = 25) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "UPDATE inquiry_inbox SET status='retry', claimed_at=NULL WHERE status='processing' AND claimed_at < ?"
  ).bind(now - LEASE_SECONDS).run();
  const pending = await env.DB.prepare(
    "SELECT inquiry_id, normalized_json, attempts FROM inquiry_inbox WHERE status IN ('pending','retry') AND available_at <= ? ORDER BY created_at LIMIT ?"
  ).bind(now, count).all();

  for (const item of pending.results || []) {
    const claim = await env.DB.prepare(
      "UPDATE inquiry_inbox SET status='processing', claimed_at=? WHERE inquiry_id=? AND status IN ('pending','retry') AND available_at <= ?"
    ).bind(now, item.inquiry_id, now).run();
    if (Number(claim.meta?.changes || 0) !== 1) continue;

    try {
      const inquiry = normalizeInquiry(JSON.parse(item.normalized_json));
      await upsertInquiry(env, makeZohoRecord(inquiry, env));
      await env.DB.prepare(
        "UPDATE inquiry_inbox SET status='done', claimed_at=NULL, error_code=NULL WHERE inquiry_id=?"
      ).bind(item.inquiry_id).run();
    } catch (error) {
      const attempts = Number(item.attempts || 0) + 1;
      const state = attempts >= MAX_ATTEMPTS ? "dead" : "retry";
      const code = String(error?.message || "SYNC_FAILED").replace(/[^A-Z0-9_]/gi, "_").slice(0, 80);
      await env.DB.prepare(
        "UPDATE inquiry_inbox SET status=?, attempts=?, available_at=?, claimed_at=NULL, error_code=? WHERE inquiry_id=?"
      ).bind(state, attempts, now + retryDelaySeconds(attempts), code, item.inquiry_id).run();
      console.error("sync_failed", code);
    }
  }
}

export default {
  async fetch(request) {
    if (request.method === "GET" && new URL(request.url).pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, mode: "public-reference" }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      if (!env.DB) throw new Error("D1_NOT_CONFIGURED");
      // Retry old work even if the provider API is temporarily offline.
      await drain(env, 25);
      try {
        const inquiries = await fetchInquiries(env);
        await persist(env, inquiries);
      } catch (error) {
        console.error("poll_failed", String(error?.message || "PROVIDER_FAILED").replace(/[^A-Z0-9_]/gi, "_").slice(0, 80));
      }
      await drain(env, 25);
    })());
  },
};
