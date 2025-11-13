# Spec Summary (Lite)

Fix all critical issues in usage-based billing implementation discovered through comparison with official LemonSqueezy documentation.

Key fixes:
- **Free tier logic**: 1-3 users = $0 billing with quantity:0, 4+ users = pay for ALL seats
- **Data storage**: Store subscription_item_id at creation, add billing_type tracking
- **Error handling**: Proactive legacy subscription detection with clear user messages
- **Documentation**: Update specs to match correct API endpoints and LemonSqueezy terminology
- **Testing**: Comprehensive E2E coverage for free tier, paid tier, and all edge cases

The original migration has billing math errors, missing data fields, unclear comments, and incomplete error handling that prevent usage-based billing from working correctly.
