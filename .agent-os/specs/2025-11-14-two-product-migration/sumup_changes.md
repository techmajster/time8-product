ok to sum up what we already have and works:

- create new workspace in free tier (1-3 seats)

and what does not work

- upgrade to paid monthly plan works on side of lemonsqueezy and change number of seats and update our ui does not work here is webhook we have in our lemonsqueezy:
subscription_created
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_created","processingTime":"710ms","data":{"subscription":"f60953ec-0760-4026-97bb-57bd812c8d55","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","quantity":0,"initialUsageRecordCreated":true}}
Request:
{
  "data": {
    "id": "1652021",
    "type": "subscriptions",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021"
    },
    "attributes": {
      "urls": {
        "customer_portal": "https://time8.lemonsqueezy.com/billing?expires=1763571898&test_mode=1&user=5064956&signature=dd634c80eb3de76a28e73263c47bbe12c748bf7cea8a7a87a74a48a442e7d0c6",
        "update_payment_method": "https://time8.lemonsqueezy.com/subscription/1652021/payment-details?expires=1763571898&signature=527e88d30b3286a433006a0661718e42c09fd334ac7771e2b487cc7b7e14accc",
        "customer_portal_update_subscription": "https://time8.lemonsqueezy.com/billing/1652021/update?expires=1763571898&user=5064956&signature=25e4389dba94464197e43763846ab1eed387d43230bf8ea32e44909f1b30f087"
      },
      "pause": null,
      "status": "active",
      "ends_at": null,
      "order_id": 6859465,
      "store_id": 217313,
      "cancelled": false,
      "renews_at": "2025-12-19T11:04:52.000000Z",
      "test_mode": true,
      "user_name": "testlemoniady",
      "card_brand": null,
      "created_at": "2025-11-19T11:04:54.000000Z",
      "product_id": 621389,
      "updated_at": "2025-11-19T11:04:57.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "variant_id": 972634,
      "customer_id": 7137295,
      "product_name": "Leave Management Per-Seat",
      "variant_name": "Monthly - Per User",
      "order_item_id": 6800244,
      "trial_ends_at": null,
      "billing_anchor": 19,
      "card_last_four": null,
      "status_formatted": "Active",
      "payment_processor": "stripe",
      "first_subscription_item": {
        "id": 5382684,
        "price_id": 1806273,
        "quantity": 0,
        "created_at": "2025-11-19T11:04:58.000000Z",
        "updated_at": "2025-11-19T11:04:58.000000Z",
        "is_usage_based": true,
        "subscription_id": 1652021
      }
    },
    "relationships": {
      "order": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/order",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/order"
        }
      },
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/store"
        }
      },
      "product": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/product",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/product"
        }
      },
      "variant": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/variant",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/variant"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/customer"
        }
      },
      "order-item": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/order-item",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/order-item"
        }
      },
      "subscription-items": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/subscription-items",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/subscription-items"
        }
      },
      "subscription-invoices": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/subscription-invoices",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/subscription-invoices"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_created",
    "webhook_id": "0d6ccaf7-20aa-4f82-be00-0cf887cc0e81",
    "custom_data": {
      "tier": "monthly",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_id": "9f2379eb-1738-4262-9e3f-58104f2afb2e",
      "organization_name": "testlemoniady",
      "organization_slug": "testlemoniady"
    }
  }
}subscription_updated
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_updated","processingTime":"319ms","data":{"subscription":"f60953ec-0760-4026-97bb-57bd812c8d55","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","previousQuantity":0,"newQuantity":0}}
Request:
{
  "data": {
    "id": "1652021",
    "type": "subscriptions",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021"
    },
    "attributes": {
      "urls": {
        "customer_portal": "https://time8.lemonsqueezy.com/billing?expires=1763571901&test_mode=1&user=5064956&signature=dc2d7cb52462b622a9c23747611845dbe727a2126c426f43d903535b66d13534",
        "update_payment_method": "https://time8.lemonsqueezy.com/subscription/1652021/payment-details?expires=1763571901&signature=10012e1f2dd8462cd75a895a1b00fe35aefb06bcf8337ec2f0984fca19fb0549",
        "customer_portal_update_subscription": "https://time8.lemonsqueezy.com/billing/1652021/update?expires=1763571901&user=5064956&signature=34fc58530d35931de57d827b194fdd73cf37421816a84e332b8a8b5cafc3cdce"
      },
      "pause": null,
      "status": "active",
      "ends_at": null,
      "order_id": 6859465,
      "store_id": 217313,
      "cancelled": false,
      "renews_at": "2025-12-19T11:04:52.000000Z",
      "test_mode": true,
      "user_name": "testlemoniady",
      "card_brand": "visa",
      "created_at": "2025-11-19T11:04:54.000000Z",
      "product_id": 621389,
      "updated_at": "2025-11-19T11:05:01.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "variant_id": 972634,
      "customer_id": 7137295,
      "product_name": "Leave Management Per-Seat",
      "variant_name": "Monthly - Per User",
      "order_item_id": 6800244,
      "trial_ends_at": null,
      "billing_anchor": 19,
      "card_last_four": "4242",
      "status_formatted": "Active",
      "payment_processor": "stripe",
      "first_subscription_item": {
        "id": 5382684,
        "price_id": 1806273,
        "quantity": 0,
        "created_at": "2025-11-19T11:04:58.000000Z",
        "updated_at": "2025-11-19T11:05:01.000000Z",
        "is_usage_based": true,
        "subscription_id": 1652021
      }
    },
    "relationships": {
      "order": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/order",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/order"
        }
      },
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/store"
        }
      },
      "product": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/product",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/product"
        }
      },
      "variant": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/variant",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/variant"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/customer"
        }
      },
      "order-item": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/order-item",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/order-item"
        }
      },
      "subscription-items": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/subscription-items",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/subscription-items"
        }
      },
      "subscription-invoices": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/relationships/subscription-invoices",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652021/subscription-invoices"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_updated",
    "webhook_id": "354e802b-ab0e-475b-ae05-64743c735aa2",
    "custom_data": {
      "tier": "monthly",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_id": "9f2379eb-1738-4262-9e3f-58104f2afb2e",
      "organization_name": "testlemoniady",
      "organization_slug": "testlemoniady"
    }
  }
}
subscription_payment_success
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_payment_success","processingTime":"159ms","data":{"subscription":"f60953ec-0760-4026-97bb-57bd812c8d55","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","billingType":"usage_based","note":"Payment confirmed - seats already set during subscription creation"}}
Request:
{
  "data": {
    "id": "5113387",
    "type": "subscription-invoices",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387"
    },
    "attributes": {
      "tax": 0,
      "urls": {
        "invoice_url": "https://app.lemonsqueezy.com/my-orders/26c64a4c-9cd2-47b8-8e72-6c272fd46823/subscription-invoice/5113387?expires=1763571926&signature=8c2430d81a189d7127f7eab870d3b049deb4cb26193ee30ecb71ea9e470f0588"
      },
      "total": 0,
      "status": "paid",
      "tax_usd": 0,
      "currency": "PLN",
      "refunded": false,
      "store_id": 217313,
      "subtotal": 0,
      "test_mode": true,
      "total_usd": 0,
      "user_name": "testlemoniady",
      "card_brand": null,
      "created_at": "2025-11-19T11:04:55.000000Z",
      "updated_at": "2025-11-19T11:05:26.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "customer_id": 7137295,
      "refunded_at": null,
      "subtotal_usd": 0,
      "currency_rate": "0.27281601",
      "tax_formatted": "PLN0.00",
      "tax_inclusive": true,
      "billing_reason": "initial",
      "card_last_four": null,
      "discount_total": 0,
      "refunded_amount": 0,
      "subscription_id": 1652021,
      "total_formatted": "PLN0.00",
      "status_formatted": "Paid",
      "discount_total_usd": 0,
      "subtotal_formatted": "PLN0.00",
      "refunded_amount_usd": 0,
      "discount_total_formatted": "PLN0.00",
      "refunded_amount_formatted": "PLN0.00"
    },
    "relationships": {
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/store"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/customer"
        }
      },
      "subscription": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/relationships/subscription",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113387/subscription"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_payment_success",
    "webhook_id": "882543c3-e1d4-43c9-9aca-f17f8bc19536",
    "custom_data": {
      "tier": "monthly",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_id": "9f2379eb-1738-4262-9e3f-58104f2afb2e",
      "organization_name": "testlemoniady",
      "organization_slug": "testlemoniady"
    }
  }
}

- create new workspace in paid tier we have positive creation in lemonsqueezy, nothing is updated in our UI and app

subscription_created
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_created","processingTime":"346ms","data":{"subscription":"639a3662-f263-47e7-95e7-a4041e4f7b88","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","quantity":6,"initialUsageRecordCreated":true}}
Request:
{
  "data": {
    "id": "1652029",
    "type": "subscriptions",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029"
    },
    "attributes": {
      "urls": {
        "customer_portal": "https://time8.lemonsqueezy.com/billing?expires=1763572171&test_mode=1&user=5064956&signature=21552c0857d1ecf8b2d87efdf11e2b1147ee91b2c2d3a449cf86628e141dba33",
        "update_payment_method": "https://time8.lemonsqueezy.com/subscription/1652029/payment-details?expires=1763572171&signature=8910db6919e84de90ae85996298535311f8702ea194dac04d522a43271182152",
        "customer_portal_update_subscription": "https://time8.lemonsqueezy.com/billing/1652029/update?expires=1763572171&user=5064956&signature=f4d5703170e33ffa384501a04ef5fb897e7b62c86ab1cee3b0f4d80d452d8bad"
      },
      "pause": null,
      "status": "active",
      "ends_at": null,
      "order_id": 6859490,
      "store_id": 217313,
      "cancelled": false,
      "renews_at": "2026-11-19T11:09:23.000000Z",
      "test_mode": true,
      "user_name": "testlemoniady_narok",
      "card_brand": "visa",
      "created_at": "2025-11-19T11:09:25.000000Z",
      "product_id": 693341,
      "updated_at": "2025-11-19T11:09:30.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "variant_id": 1090954,
      "customer_id": 7137295,
      "product_name": "Leave Management Per-Seat Yearly",
      "variant_name": "Yearly - Per User (Save 20%)",
      "order_item_id": 6800269,
      "trial_ends_at": null,
      "billing_anchor": 19,
      "card_last_four": "4242",
      "status_formatted": "Active",
      "payment_processor": "stripe",
      "first_subscription_item": {
        "id": 5382737,
        "price_id": 1806320,
        "quantity": 6,
        "created_at": "2025-11-19T11:09:31.000000Z",
        "updated_at": "2025-11-19T11:09:31.000000Z",
        "is_usage_based": false,
        "subscription_id": 1652029
      }
    },
    "relationships": {
      "order": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/order",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/order"
        }
      },
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/store"
        }
      },
      "product": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/product",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/product"
        }
      },
      "variant": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/variant",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/variant"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/customer"
        }
      },
      "order-item": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/order-item",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/order-item"
        }
      },
      "subscription-items": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/subscription-items",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/subscription-items"
        }
      },
      "subscription-invoices": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/subscription-invoices",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/subscription-invoices"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_created",
    "webhook_id": "81f42342-070a-4224-971f-c020d189b563",
    "custom_data": {
      "tier": "annual",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_name": "testlemoniady_narok"
    }
  }
}
subscription_payment_success
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_payment_success","processingTime":"152ms","data":{"subscription":"639a3662-f263-47e7-95e7-a4041e4f7b88","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","billingType":"quantity_based","note":"Payment confirmed - seats already set during subscription creation"}}
Request:
{
  "data": {
    "id": "5113449",
    "type": "subscription-invoices",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449"
    },
    "attributes": {
      "tax": 0,
      "urls": {
        "invoice_url": "https://app.lemonsqueezy.com/my-orders/9e06a8c6-d82c-409c-a437-01adb4403a6f/subscription-invoice/5113449?expires=1763572171&signature=edd12f5b14c5f6b92554c95a2572f09e5a1e4a1dd7b291886aab3010db669b76"
      },
      "total": 57599,
      "status": "paid",
      "tax_usd": 0,
      "currency": "PLN",
      "refunded": false,
      "store_id": 217313,
      "subtotal": 57599,
      "test_mode": true,
      "total_usd": 15714,
      "user_name": "testlemoniady_narok",
      "card_brand": "visa",
      "created_at": "2025-11-19T11:09:26.000000Z",
      "updated_at": "2025-11-19T11:09:31.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "customer_id": 7137295,
      "refunded_at": null,
      "subtotal_usd": 15714,
      "currency_rate": "0.27281601",
      "tax_formatted": "PLN0.00",
      "tax_inclusive": true,
      "billing_reason": "initial",
      "card_last_four": "4242",
      "discount_total": 0,
      "refunded_amount": 0,
      "subscription_id": 1652029,
      "total_formatted": "PLN575.99",
      "status_formatted": "Paid",
      "discount_total_usd": 0,
      "subtotal_formatted": "PLN575.99",
      "refunded_amount_usd": 0,
      "discount_total_formatted": "PLN0.00",
      "refunded_amount_formatted": "PLN0.00"
    },
    "relationships": {
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/store"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/customer"
        }
      },
      "subscription": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/relationships/subscription",
          "related": "https://api.lemonsqueezy.com/v1/subscription-invoices/5113449/subscription"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_payment_success",
    "webhook_id": "2f438530-f4b6-43d7-99dc-b04b82a087ec",
    "custom_data": {
      "tier": "annual",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_name": "testlemoniady_narok"
    }
  }
}
subscription_updated
https://app.time8.io/api/webhooks/lemonsqueezy
Resend
Response:
200
{"message":"Webhook processed successfully","eventType":"subscription_updated","processingTime":"188ms","data":{"subscription":"639a3662-f263-47e7-95e7-a4041e4f7b88","organization":"c919b954-b2c2-45eb-80f5-fc65aea73cea","previousQuantity":6,"newQuantity":6}}
Request:
{
  "data": {
    "id": "1652029",
    "type": "subscriptions",
    "links": {
      "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029"
    },
    "attributes": {
      "urls": {
        "customer_portal": "https://time8.lemonsqueezy.com/billing?expires=1763572201&test_mode=1&user=5064956&signature=76551a04a0f3b7e2d718fdc4628e03f22801e6185020179ed835abf6246f589f",
        "update_payment_method": "https://time8.lemonsqueezy.com/subscription/1652029/payment-details?expires=1763572201&signature=3e6435ed4e3d3a5e3c393889e6cf2d582935b4e13bc0761ea16d9ac8a7786cc6",
        "customer_portal_update_subscription": "https://time8.lemonsqueezy.com/billing/1652029/update?expires=1763572201&user=5064956&signature=2c09d23dcba61f25817618bed0429e86bfd1c6302fdfaa052d8b763208cb9a6f"
      },
      "pause": null,
      "status": "active",
      "ends_at": null,
      "order_id": 6859490,
      "store_id": 217313,
      "cancelled": false,
      "renews_at": "2026-11-19T11:09:23.000000Z",
      "test_mode": true,
      "user_name": "testlemoniady_narok",
      "card_brand": "visa",
      "created_at": "2025-11-19T11:09:25.000000Z",
      "product_id": 693341,
      "updated_at": "2025-11-19T11:09:30.000000Z",
      "user_email": "szymon.rajca@bb8.pl",
      "variant_id": 1090954,
      "customer_id": 7137295,
      "product_name": "Leave Management Per-Seat Yearly",
      "variant_name": "Yearly - Per User (Save 20%)",
      "order_item_id": 6800269,
      "trial_ends_at": null,
      "billing_anchor": 19,
      "card_last_four": "4242",
      "status_formatted": "Active",
      "payment_processor": "stripe",
      "first_subscription_item": {
        "id": 5382737,
        "price_id": 1806320,
        "quantity": 6,
        "created_at": "2025-11-19T11:09:31.000000Z",
        "updated_at": "2025-11-19T11:10:01.000000Z",
        "is_usage_based": false,
        "subscription_id": 1652029
      }
    },
    "relationships": {
      "order": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/order",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/order"
        }
      },
      "store": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/store",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/store"
        }
      },
      "product": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/product",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/product"
        }
      },
      "variant": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/variant",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/variant"
        }
      },
      "customer": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/customer",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/customer"
        }
      },
      "order-item": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/order-item",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/order-item"
        }
      },
      "subscription-items": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/subscription-items",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/subscription-items"
        }
      },
      "subscription-invoices": {
        "links": {
          "self": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/relationships/subscription-invoices",
          "related": "https://api.lemonsqueezy.com/v1/subscriptions/1652029/subscription-invoices"
        }
      }
    }
  },
  "meta": {
    "test_mode": true,
    "event_name": "subscription_updated",
    "webhook_id": "97b7d8f1-b221-4251-b0a9-ce9170466b69",
    "custom_data": {
      "tier": "annual",
      "user_count": "6",
      "user_email": "szymon.rajca@bb8.pl",
      "organization_name": "testlemoniady_narok"
    }
  }
}
