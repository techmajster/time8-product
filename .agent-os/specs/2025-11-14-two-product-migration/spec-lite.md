# Spec Summary (Lite)

Migrate from single-product variant-switching to two-product architecture (monthly product 621389, yearly product 693341) to enable monthly→yearly billing upgrades. This works around LemonSqueezy's limitation preventing switches between usage-based and non-usage-based variants. Users on monthly can upgrade to yearly anytime via cancel + create flow with seat preservation; yearly→monthly is blocked until renewal.
