# Spec Summary (Lite)

Optimize database for scaling to 100,000+ accounts by adding composite indexes, fixing SQL anti-patterns in team-utils.ts, and optionally optimizing RLS policies. All changes are safe, reversible, and preserve current behavior. Focus on 50-90% performance improvements for dashboard, calendar, and API queries without breaking production.
