// Clerk JWT integration per ADR-001.
//
// Stage A: when CLERK_JWT_ISSUER_DOMAIN is unset, auth is disabled so an
// anonymous dev user can exercise the browser → Convex → LLM pipeline
// without a Clerk tenant. Stage B flips this on; production deployments
// MUST set the env var (enforced at deploy time, not here — keep local
// bootstrapping zero-friction).
//
// Value lives in Clerk dashboard → JWT Templates → Convex → Issuer.
const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: issuerDomain ? [{ domain: issuerDomain, applicationID: 'convex' }] : [],
};
