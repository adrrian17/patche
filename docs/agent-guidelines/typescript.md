# TypeScript and code structure

Apply these rules when changing TypeScript or JavaScript.

## Types

- Prefer `unknown` to `any` when a value's type is not known.
- Narrow types instead of forcing them with type assertions.
- Use `as const` when values must retain literal types or remain immutable.
- Replace unexplained literals with named constants when the name adds domain meaning.

## Functions and asynchronous code

- Use function declarations for named functions. The Oxlint configuration enforces this style.
- Use arrow functions for anonymous callbacks.
- Await promises in async functions and use `async`/`await` instead of promise chains.
- Do not use async functions as Promise executors.

## Control flow and errors

- Prefer early returns and named conditions to nested branches or nested ternaries.
- Throw descriptive `Error` objects.
- Catch errors only when adding context, recovering, or translating them into a domain result.
- Remove `console.log`, `debugger`, and `alert` before finishing production code.

## Modules

- Prefer direct imports over namespace imports.
- Do not add barrel files. Existing barrels allowed by `oxlint.config.ts` are explicit exceptions.
