# Infrastructure and deployment

Apply these rules when changing `packages/infra`, Alchemy resources, deployment commands, or Cloudflare configuration.

- Treat `packages/infra/alchemy.run.ts` as the source of truth for provisioned resources and their connections.
- Keep instructions and code compatible with the Alchemy version pinned in `packages/infra/package.json`.
- Use a personal development stage for validation so changes do not affect production.
- Production commands must name the production stage explicitly. From `packages/infra`, deploy with `bunx alchemy deploy --stage production`.
- Review the planned resource and migration changes before approving a production deployment.
- Do not destroy a stage until its exact name and resources have been inspected. Production destruction requires explicit user authorization.
- Alchemy applies the D1 migrations in `packages/db/src/migrations` during deployment. Review those migrations with the infrastructure changes.
