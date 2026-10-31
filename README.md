# Bayut to Zoho CRM

A **generalized, public reference** for synchronizing real-estate inquiries from a provider API to **Zoho CRM** through **Cloudflare Workers and D1**.

This repository demonstrates a resilient **scheduled polling** integration, independent from the separate [Property Finder webhook example](https://github.com/realmrmohammadpour/property-finder-to-zoho-crm).

It is **not** a live brokerage codebase or a drop-in replacement for an operational integration. Internal ownership rules, production provider credentials, agent data, customer records, deployment identifiers and private endpoints are intentionally excluded.

## Architecture

```text
Scheduled Cloudflare Worker
        |
        v
Provider API adapter (configurable endpoint + API token)
        |
        v
Normalise inquiry records
        |
        v
D1 durable inbox (unique provider event IDs)
        |
        v
Zoho CRM Leads Upsert (unique external lead field)
        |
        +--> retry on transient errors
```

## Main features

- Scheduled polling using Cloudflare Worker Cron Triggers.
- Configurable provider API URL, bearer token, and optional request window.
- Normalization of standard inquiry fields; adjust the provider adapter to your **authorized API contract**.
- Durable, idempotent D1 storage and bounded retry processing.
- Zoho OAuth refresh-token flow and CRM Leads upserts.
- Synthetic fixtures and offline automated tests.
- No built-in agent-to-owner assignments, customer imports or deployed production secrets.

## Provider API compatibility

The public adapter expects a JSON envelope with an `items` array (or an array response) of objects using `id`, `name`, `email`, `phone`, `message` and `createdAt`. **This shape is a synthetic contract for demonstration, not a claim about Bayut's official API.** Actual integrations must implement the specific authorized Bayut API endpoints, fields, credentials and pagination. Do not scrape or use undocumented endpoints.

## Setup

1. Create your own Cloudflare D1 database. Apply `migrations/0001.sql`.
2. Copy `wrangler.toml.example` to local `wrangler.toml` and replace the D1 placeholders.
3. Configure `INQUIRIES_API_URL` as an approved HTTPS provider endpoint.
4. Set the Worker **secrets** `INQUIRIES_API_TOKEN`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`.
5. Create a single-line **unique** custom field in Zoho Leads, and supply its API name as `ZOHO_EXTERNAL_ID_FIELD`.
6. Test with a sandbox API endpoint before enabling schedules against real customer data.

Run `npm run check` and `npm test` locally with Node 20+.

## Important boundaries

This is an architectural sample, not a production-approved integration. The real provider response contract, pagination, field mappings, Zoho permissions, data privacy controls, alerting, and deployment rollback must be validated separately. A GitHub push does **not** deploy to Cloudflare.

## Documentation

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Zoho CRM Upsert API](https://www.zoho.com/crm/developer/docs/api/v8/upsert-records.html)

No reuse license is granted merely by making the repository public.
