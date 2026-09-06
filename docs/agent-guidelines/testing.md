# Testing

Apply these rules when adding or changing tests.

- Put assertions inside `it()` or `test()` blocks.
- Use promises or `async`/`await` for asynchronous tests rather than `done` callbacks.
- Do not commit focused or disabled tests such as `.only` or `.skip`.
- Keep suites shallow. Add nested `describe` blocks only when they clarify distinct behavior or setup.
