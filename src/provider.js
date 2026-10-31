import { parseProviderResponse } from "./core.js";

// This is a demonstrative provider adapter; real Bayut API schemas vary by authorization
// and must be implemented from the account's official provider documentation.
export async function fetchInquiries(env) {
  const endpoint = env.INQUIRIES_API_URL;
  const token = env.INQUIRIES_API_TOKEN;
  if (!endpoint || !token) throw new Error("PROVIDER_CONFIG_MISSING");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("INVALID_PROVIDER_URL");
  }
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("PROVIDER_HTTP_" + response.status);
  return parseProviderResponse(await response.json());
}
