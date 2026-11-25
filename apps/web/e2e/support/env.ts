// Relative to apps/web, where Playwright runs. `alchemy dev` runs in packages/infra.
export const alchemyDir = "../../packages/infra/.alchemy";
// WEB_PORT moves the run off :3001 when that port is taken; alchemy.run.ts reads the same variable.
export const baseURL = `http://localhost:${process.env.WEB_PORT ?? "3001"}`;
