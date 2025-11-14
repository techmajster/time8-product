# LemonSqueezy Webhook Events

## Subscription Events
- `subscription_created` - When a new subscription is created
- `subscription_updated` - When subscription details change (status, plan, etc.)
- `subscription_cancelled` - When a subscription is cancelled
- `subscription_resumed` - When a paused subscription is resumed
- `subscription_expired` - When a subscription expires
- `subscription_paused` - When a subscription is paused
- `subscription_unpaused` - When a subscription is unpaused

## Payment Events
- `subscription_payment_success` - When a subscription payment succeeds
- `subscription_payment_failed` - When a subscription payment fails
- `subscription_payment_recovered` - When a failed payment is recovered
- `subscription_payment_refunded` - When a payment is refunded

## Order Events
- `order_created` - When a one-time purchase order is created
- `order_refunded` - When an order is refunded

## License Events (if using licenses)
- `license_key_created` - When a license key is created
- `license_key_updated` - When a license key is updated

## Recommended for Your App

For usage-based billing with seat management, you should enable:

✅ `subscription_created` - Already enabled
✅ `subscription_updated` - Already enabled  
✅ `subscription_payment_success` - Already enabled
✅ `subscription_payment_failed` - Recommended (to handle failed payments)
✅ `subscription_cancelled` - Recommended (to downgrade to free tier)
✅ `subscription_expired` - Recommended (same as cancelled)

## Important Notes

### subscription_updated Webhook
This webhook fires when:
- Subscription status changes (active → paused, etc.)
- Subscription plan/variant changes
- Subscription renewal date changes
- **BUT NOT when usage records are created!**

### Usage Records
Usage records are **NOT** sent via webhooks! They are:
1. Created by your app via POST to `/v1/usage-records`
2. Aggregated by LemonSqueezy at billing period end
3. Billed automatically based on peak/sum (depending on aggregation method)

### Testing Seat Changes

To test if seat changes work, you should:
1. **NOT** wait for a webhook (webhooks don't fire for usage records)
2. **Instead**: Use your app's UI to change seats
3. **Then**: Check if usage record was created using this script:

```bash
node check-correct-subscription.mjs
```

This will show you if new usage records appear after changing seats in your app.
