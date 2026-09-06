# React and accessibility

Apply these rules when changing React components or TanStack Start routes.

- Put reusable primitives and shared styles in `packages/ui`.
- Keep blocks that belong only to the storefront in `apps/web`.
- Import shared primitives through paths such as `@patche/ui/components/button`.
- Use function components. Named components must use function declarations.
- Call hooks only at the top level and keep dependency arrays complete.
- Define components at module scope rather than inside other components.
- Use stable identifiers for list keys. Do not use array indexes when items can be reordered, inserted, or removed.
- Put child content between JSX tags instead of passing it through a `children` prop.
- Use native semantic elements such as `button` and `nav` before adding ARIA roles to generic elements.
- Give form controls accessible labels, images meaningful alternative text, and pages a logical heading order.
- When a custom interactive element is unavoidable, support both pointer and keyboard input.

This project uses TanStack Start, not Next.js. Do not introduce Next.js-only APIs such as `next/image` or `next/head`.
