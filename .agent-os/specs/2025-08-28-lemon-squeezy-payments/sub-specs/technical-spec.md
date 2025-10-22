# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-28-lemon-squeezy-payments/spec.md

## Technical Requirements

- Install and configure @lemonsqueezy/lemonsqueezy.js SDK for API integration
- Implement webhook signature verification using HMAC-SHA256 for security
- Create React components using existing UI patterns from the application (Sheet, Card, Button components)
- Use Supabase RLS policies to ensure users can only view their organization's billing data
- Implement IP-based geolocation for currency detection using edge function or client-side detection
- Cache product and pricing data with 1-hour TTL to minimize API calls
- Handle subscription state transitions gracefully (active, past_due, cancelled, expired)
- Implement retry logic for failed webhook processing with exponential backoff
- Store all monetary values in cents to avoid floating-point precision issues
- Use Supabase Edge Functions for secure API key handling when creating checkout sessions

## External Dependencies

- **@lemonsqueezy/lemonsqueezy.js** - Official SDK for Lemon Squeezy API integration
- **Justification:** Official SDK provides type safety and handles authentication, reducing implementation complexity
- **Version:** Latest stable version (^2.x)