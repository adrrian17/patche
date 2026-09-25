# Testing

Apply these rules when adding or changing tests.

## Approach

- Never write unit tests after you write code.
- Prove features with end-to-end tests. Every E2E test ends by producing an artifact that can be checked and reproduced.
- If you must test a system in isolation, first write down every way it could fail, then write the code.

## Mechanics

- Run Bun unit tests with `bun test`.
- Run Cloudflare Workers and D1 integration tests with `bun run test:integration`.
- Put assertions inside `it()` or `test()` blocks.
- Use promises or `async`/`await` for asynchronous tests rather than `done` callbacks.
- Do not commit focused or disabled tests such as `.only` or `.skip`.
- Keep suites shallow. Add nested `describe` blocks only when they clarify distinct behavior or setup.
