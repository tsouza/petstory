# Security policy

Security discipline for petstory.co lives in [`docs/engineering-rules.md`](docs/engineering-rules.md) R8 (baseline) with cross-cutting threading through R6 (observability), R14 (toolchain), and every pack's Ubiquitous Language glossary (PII class per Domain Event).

## Reporting a vulnerability

Do **not** file a public issue for security concerns.

- Email: `thiago@petstory.co` with subject `security: <short description>`.
- Encrypt if sensitive (PGP key on request).
- Expect an acknowledgement within 72 hours.

Please include:

- A concrete description of the issue and its scope.
- Steps to reproduce (if applicable).
- Your suggested severity and potential impact.
- Any proposed mitigation, if you have one.

## Scope

This repository is currently a pre-code scaffold — canonical in-scope targets are mostly docs and configuration. As feature code lands, scope will expand to:

- Client apps (`apps/petstory-mobile`, `apps/petstory-web`)
- Kernel + primitives + domain packs (`packages/*`)
- Convex backend (`convex/`)
- CI + dependency supply chain (`.github/`, `package.json`, `bun.lock`, `turbo.json`)

Third-party vendor security (Convex, Clerk, Anthropic, Stripe, Vercel, Braintrust, Sentry, PostHog, Mastra) is out of scope here — report directly to the vendor.

## Non-negotiables we've already wired

- Secrets in Infisical/Doppler (never in git / lockfiles / env files).
- License allowlist (no GPL/AGPL for app-shipped code; `license-checker` in CI).
- Gitleaks on every CI run (secret scan).
- Socket.dev supply-chain scan on dependency diff.
- Clerk PKCE + session rotation.
- TLS 1.3 everywhere in transit; Convex default encryption at rest for health data.
- PII class declared per Domain Event — Sentry `beforeSend` redacts before send; Convex schema tags label sensitive fields.

See `docs/engineering-rules.md` R8 for the full list.
