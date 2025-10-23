# Spec Summary (Lite)

Audit and fix all 30+ organization-scoped API routes to ensure proper workspace isolation for multi-organization admins. Prevent data leakage by enforcing consistent use of `active-organization-id` cookie across all endpoints that query organization data, with comprehensive integration tests to verify isolation.
