# Spec Summary (Lite)

Fix critical payment bypass vulnerability in subscription upgrade flow where seats are granted before payment confirmation. Ensure all LemonSqueezy webhook events properly sync subscription state to the application database. Replace new checkout creation with Subscription Items API for immediate upgrades, add missing `subscription_payment_success` webhook handler, and fix conditional logic blocking manual LemonSqueezy updates from syncing to the app.
