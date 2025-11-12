# Spec Summary (Lite)

Fix critical production issues: billing period changes are broken due to client-side API key exposure, and reconciliation cron generates false positive alerts by comparing wrong database fields.

Replace direct `getDynamicPricing()` call with server-side `/api/billing/pricing` fetch in billing period change page, add proper error handling with retry mechanism, and fix reconciliation cron to compare `quantity` (DB) vs `quantity` (LemonSqueezy) instead of `current_seats` vs `quantity`.
