let cachedToken;

async function accessToken(env) {
  if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET || !env.ZOHO_REFRESH_TOKEN) {
    throw new Error("ZOHO_CONFIG_MISSING");
  }
  const accounts = (env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com").replace(/\/$/, "");
  if (cachedToken?.clientId === env.ZOHO_CLIENT_ID && cachedToken.accounts === accounts &&
    Date.now() < cachedToken.expiresAt) return cachedToken;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    refresh_token: env.ZOHO_REFRESH_TOKEN,
  });
  const response = await fetch(accounts + "/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("ZOHO_AUTH_HTTP_" + response.status);
  const data = await response.json();
  if (!data.access_token) throw new Error("ZOHO_AUTH_INVALID_RESPONSE");
  cachedToken = {
    clientId: env.ZOHO_CLIENT_ID,
    accounts,
    token: data.access_token,
    domain: (env.ZOHO_API_DOMAIN || data.api_domain || "https://www.zohoapis.com").replace(/\/$/, ""),
    expiresAt: Date.now() + Math.max(0, (Number(data.expires_in) || 3600) * 1000 - 120000),
  };
  return cachedToken;
}

export async function upsertInquiry(env, record) {
  const auth = await accessToken(env);
  const response = await fetch(auth.domain + "/crm/v8/Leads/upsert", {
    method: "POST",
    headers: {
      Authorization: "Zoho-oauthtoken " + auth.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [record], duplicate_check_fields: [env.ZOHO_EXTERNAL_ID_FIELD] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("ZOHO_UPSERT_HTTP_" + response.status);
  const payload = await response.json();
  if (payload?.data?.[0]?.status !== "success") throw new Error("ZOHO_UPSERT_REJECTED");
}
