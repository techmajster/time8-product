# Spec Summary (Lite)

Implement a mandatory absence types system that enforces two non-deletable global leave types (Urlop wypoczynkowy and Urlop bezpłatny) for all workspaces, ensuring Polish labor law compliance. The system provides workspace-level default configuration for Urlop wypoczynkowy (default 20 days, configurable to 26) with individual employee balance overrides, while Urlop bezpłatny remains unlimited and non-deletable. Database schema adds `is_mandatory` flag to prevent deletion and supports per-user balance customization.
