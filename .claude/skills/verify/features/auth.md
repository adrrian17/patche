# Accounts and sign-in

A visitor registers with name, email, and password, confirms the emailed link, and lands on their dashboard. They can sign out, sign back in, and recover a forgotten password by email. Admins land on `/admin`; Customers are kept out of it.

## Sub-features

- `auth-register` creates an account and blocks sign-in until the email is verified.
- `auth-verify` follows the emailed `/verify-email?` link to `/dashboard`.
- `auth-signin` signs in with a password and rejects a wrong one.
- `auth-signout` ends the session and protects `/dashboard`.
- `auth-reset` requests a reset email and saves a new password.
- `auth-roles` sends Customers away from `/admin` and Admins to `/admin`.

## How to get to it (user POV)

- Choose `Iniciar sesión` on the home page `/`, or open `/login` directly.
- On `/login`, choose `¿Aún no tienes cuenta? Regístrate` to register.
- On `/login`, choose `Olvidé mi contraseña` to start recovery.
- Choose `Cerrar sesión` on `/dashboard`.

## Driving it with Playwright

Preconditions:

- Fresh launch; email files land in `packages/infra/.alchemy/local/email/text/`.
- Import helpers from `../../../../apps/web/e2e/support/password-auth`.
- Worked drive: `drives/auth.spec.ts` covers every sub-feature.

- **Register.** Go to `/login`, click button `¿Aún no tienes cuenta? Regístrate`, fill label `Nombre`, label `Correo electrónico`, label `Contraseña` (exact), click button `Crear cuenta` (exact). Heading `Verifica tu correo` appears.
- **Verify.** `page.goto(await emailLink(email, "/verify-email?"))`. URL ends in `/dashboard` and text `Bienvenido, <name>` plus the email are visible. `registerWithPassword(page, { email, name })` does register and verify in one call.
- **Sign in.** `signIn(page, email, "wrong")` shows alert `Correo o contraseña incorrectos`; `signIn(page, email)` lands on `/dashboard`.
- **Sign out.** Click button `Cerrar sesión`. URL ends in `/login`; `page.goto("/dashboard")` redirects to `/login`.
- **Reset.** `requestReset(page, email)` shows status `Si existe una cuenta…`. Go to `await emailLink(email, "/reset-password/")`, fill label `Nueva contraseña`, click button `Guardar contraseña`. Heading `Iniciar sesión` and text `Contraseña guardada. Inicia sesión con tu nueva contraseña.` appear; the old password now fails and the new one signs in.
- **Roles.** With `customer.json`, `page.goto("/admin")` ends on `/dashboard`. With `admin.json`, `/admin` stays and shows the admin email.
- **Proof.** Screenshot each landing page and save `findRow("SELECT email, email_verified, role FROM user WHERE email = ?", email)` as JSON.

## Gotchas

- `registerWithPassword` sets a random `cf-connecting-ip` header so Better Auth's rate limiter does not trip across many sign-ups. Hand-written registrations need the same.
- Better Auth allows 3 sign-in attempts per IP every 10 seconds; a 4th shows alert `No pudimos iniciar sesión. Inténtalo de nuevo.`, not the wrong-password message. Rotate `cf-connecting-ip` between phases of a long drive.
- `Cerrar sesión` is disabled until hydration; click it only after the page has loaded.
- The reset link is single use. Reusing it shows alert `El enlace ya no es válido`.
- Unknown emails get the same `Si existe una cuenta` status on purpose; it does not prove an email was sent. Check the email directory.
