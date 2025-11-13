# Spec Summary (Lite)

Add quantity-based billing for yearly subscriptions to create hybrid billing system: monthly subscriptions use usage-based billing (pay at end of month), yearly subscriptions use quantity-based billing (pay upfront with immediate proration for seat changes).

Critical constraint: Do NOT modify existing monthly subscription workflow - it's working correctly and must remain unchanged. Only add new yearly subscription logic alongside existing code.
