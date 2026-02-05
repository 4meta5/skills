---
name: google-oauth
description: |
  Configure and maintain Google OAuth for web apps. Use when setting up client
  credentials, redirect URIs, and environment variables, or debugging auth
  failures. Applies only to Google OAuth (not generic OIDC providers).
category: security
---

# Google OAuth

## Required Inputs

- Google OAuth client ID and client secret
- Exact redirect/callback URL(s)
- Allowed origins (if applicable)

## Workflow (High Level)

1. Confirm the live domain(s) that should be authorized.
2. Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set consistently across services.
3. Verify redirect/callback URLs match exactly (scheme/host/path).
4. Re-test sign-in and confirm errors like `invalid_client` or `redirect_uri_mismatch` are resolved.

## Guardrails

- Do not add extra redirect URIs without product approval.
- Avoid wildcard origins; use explicit URLs only.
- Keep credentials aligned across frontend/backend services.

## References

- Google OAuth 2.0 for web server apps:
  https://developers.google.com/identity/protocols/oauth2/web-server
- Google OAuth 2.0 policies and compliance:
  https://developers.google.com/identity/protocols/oauth2/policies
