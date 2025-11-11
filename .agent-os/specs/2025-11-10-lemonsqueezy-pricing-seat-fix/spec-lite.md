# Spec Summary (Lite)

Fix critical LemonSqueezy pricing fetch failures and seat calculation inconsistencies affecting admin team management, settings billing tab, onboarding add-users, and invite users dialog. Replace deprecated SDK function with REST API to fetch correct graduated pricing (10 PLN monthly, 96 PLN yearly), clarify confusing "free seats" terminology by distinguishing between "tier threshold (3)" and "available empty seats", and update all affected components to display accurate seat counts and pricing with proper fallbacks.
