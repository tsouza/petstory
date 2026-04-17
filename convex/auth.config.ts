// Clerk JWT integration per ADR-001.
// Set CLERK_JWT_ISSUER_DOMAIN via Convex dashboard or .env.local
// (Clerk dashboard → JWT Templates → Convex → Issuer).

const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!issuerDomain) {
  throw new Error(
    'CLERK_JWT_ISSUER_DOMAIN env var is required. Get the value from your Clerk dashboard under JWT Templates → Convex.',
  );
}

export default {
  providers: [
    {
      domain: issuerDomain,
      applicationID: 'convex',
    },
  ],
};
