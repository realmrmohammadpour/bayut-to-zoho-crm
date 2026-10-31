import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInquiry, parseProviderResponse, makeZohoRecord, retryDelaySeconds } from "../src/core.js";

const fixture = {
  id: "demo-001",
  name: "Sample Customer",
  email: "sample@example.invalid",
  phone: "+10000000000",
  message: "Interested in the example apartment.",
  createdAt: "2026-01-01T12:00:00Z",
};

test("normalizes synthetic provider enquiries", () => {
  const normalized = normalizeInquiry(fixture);
  assert.equal(normalized.id, "demo-001");
  assert.equal(normalized.firstName, "Sample");
  assert.equal(normalized.lastName, "Customer");
});

test("supports illustrative array or items envelope", () => {
  assert.equal(parseProviderResponse([fixture]).length, 1);
  assert.equal(parseProviderResponse({ items: [fixture] }).length, 1);
  assert.throws(() => parseProviderResponse({ data: [fixture] }), /UNSUPPORTED_PROVIDER_RESPONSE/);
});

test("requires a stable provider ID", () => {
  assert.throws(() => normalizeInquiry({ name: "Missing ID" }), /INVALID_INQUIRY_ID/);
});

test("CRM mapping requires a unique ID field", () => {
  const lead = normalizeInquiry(fixture);
  assert.throws(() => makeZohoRecord(lead, {}), /MISSING_UNIQUE_FIELD/);
  const record = makeZohoRecord(lead, { ZOHO_EXTERNAL_ID_FIELD: "External_Inquiry_ID" });
  assert.equal(record.External_Inquiry_ID, "demo-001");
  assert.equal(record.Email, "sample@example.invalid");
});

test("retry delay is bounded", () => {
  assert.ok(retryDelaySeconds(3) > retryDelaySeconds(2));
  assert.equal(retryDelaySeconds(100), 3600);
});
