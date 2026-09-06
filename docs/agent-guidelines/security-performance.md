# Security and performance

Apply these rules when changing browser behavior, input handling, imports, or hot paths.

## Security

- Validate untrusted input at system boundaries.
- Do not use `eval()` or assign directly to `document.cookie`.
- Avoid `dangerouslySetInnerHTML`. If it is required, sanitize the input and document why ordinary rendering cannot be used.
- Add `rel="noopener"` to links that use `target="_blank"`.

## Performance

- Do not copy an accumulator with spread syntax on every loop iteration.
- Define reusable regular expressions outside loops.
- Import the symbols a module needs instead of importing the entire namespace, except where a library API requires a namespace import.
