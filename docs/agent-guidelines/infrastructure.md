# Infrastructure and deployment

Apply these rules when changing Cloudflare configuration or deployment scripts.

- The root `wrangler.jsonc` defines the Worker and runtime bindings; do not recreate every service once managed by Alchemy.
- Keep Worker secrets in Varlock's root `.env.schema`, sourced from 1Password. Do not commit secret values.
- Production deploys through Cloudflare Workers Builds using `varlock-wrangler deploy`; `OP_SERVICE_ACCOUNT_TOKEN` must be a secret build variable.
- D1 and R2 resources/domains are configured in Cloudflare. Update binding identifiers in Wrangler config when those resources change.
- Review D1 migrations in `packages/db/src/migrations` before production deployment.
