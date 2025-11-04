# Spec Summary (Lite)

Implement seat management with grace periods: users marked for removal keep access until billing renewal, then automatically archive while updating Lemon Squeezy billing. Includes automated background jobs (update seats 24h before renewal), webhook-based archival at renewal, and admin dashboard for monitoring pending changes. Ensures customers only pay for active seats while providing fair grace periods for removed users.
