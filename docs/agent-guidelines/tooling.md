# Linting and formatting

Ultracite configures Oxlint and Oxfmt for this repository. Use the package scripts so commands stay pinned to the workspace configuration.

- Run `bun run check` to report lint and formatting problems.
- Run `bun run fix` to apply automatic fixes.
- Run `bunx ultracite doctor` only when diagnosing the Ultracite setup.

The configured checks ignore `packages/ui/**`, generated database migrations, and agent or Claude skill directories. Review changes in those paths directly rather than assuming `bun run check` validates them.
