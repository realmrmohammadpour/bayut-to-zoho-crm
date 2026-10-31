export function normalizeInquiry(input) {
  if (!input || typeof input !== "object") throw new Error("INVALID_INQUIRY");
  const id = String(input.id ?? "").trim();
  if (!id || id.length > 200) throw new Error("INVALID_INQUIRY_ID");
  const name = String(input.name || "").trim();
  const nameParts = name.split(/\s+/).filter(Boolean);
  return {
    id,
    firstName: String(input.firstName || nameParts.slice(0, -1).join(" ")).trim().slice(0, 100),
    lastName: String(input.lastName || nameParts.at(-1) || "Unknown").trim().slice(0, 100),
    email: String(input.email || "").trim().slice(0, 200),
    phone: String(input.phone || "").trim().slice(0, 50),
    message: String(input.message || "").trim().slice(0, 5000),
    createdAt: String(input.createdAt || "").trim(),
  };
}

export function parseProviderResponse(response) {
  const records = Array.isArray(response) ? response : response?.items;
  if (!Array.isArray(records)) throw new Error("UNSUPPORTED_PROVIDER_RESPONSE");
  if (records.length > 1000) throw new Error("OVERSIZED_PROVIDER_BATCH");
  return records.map(normalizeInquiry);
}

export function retryDelaySeconds(attempt) {
  return Math.min(3600, 15 * 2 ** Math.min(10, Math.max(0, Number(attempt) || 0)));
}

export function makeZohoRecord(inquiry, env) {
  const field = env.ZOHO_EXTERNAL_ID_FIELD;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(field || "")) {
    throw new Error("MISSING_UNIQUE_FIELD");
  }
  const record = {
    Last_Name: inquiry.lastName,
    Company: env.ZOHO_COMPANY_LABEL || "Inbound Inquiry",
    Description: inquiry.message || "Provider inquiry",
  };
  record[field] = inquiry.id;
  if (inquiry.firstName) record.First_Name = inquiry.firstName;
  if (inquiry.email) record.Email = inquiry.email;
  if (inquiry.phone) record.Phone = inquiry.phone;
  return record;
}
