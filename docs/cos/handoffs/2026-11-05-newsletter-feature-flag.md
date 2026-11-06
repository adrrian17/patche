# Boletín detrás de un feature flag

## Resultado local

Revisión observada el 2026-11-05 en la rama `feat/newsletter-feature-flag`, con base `541fd40f3dc2ce98e0af77fe917d47baebb4f433`. En la entrega inicial el cambio estaba sin commit. No se había realizado push, PR, merge ni despliegue. No se modificó el checkout raíz ni se copió su brief CoS.

Home y footer ocultan por defecto los bloques del boletín, sus formularios y sus promesas del 10%. El condicional elimina toda la sección de Home y toda la columna del footer. El footer usa tres columnas en escritorio cuando está apagado y cuatro cuando está encendido. `apps/web/src/lib/newsletter.ts` conserva su handler provisional. No se implementaron suscripciones, cupones ni integraciones.

## Configuración

`VITE_NEWSLETTER_ENABLED` se valida en `packages/env/src/web.ts` y se documenta en `.env.schema`. Ausente, vacío o `false` significa apagado. Solo `true` lo activa. Otros valores fallan la validación al evaluar el módulo. Es una variable pública de compilación. SSR y cliente consumen el mismo valor de Vite. Cambiarla requiere reiniciar desarrollo o reconstruir los artefactos del servidor y del cliente juntos. `turbo.globalEnv` transmite la variable a las tareas y la incluye en sus hashes.

Para recuperar la interfaz existente en desarrollo o en una compilación local, ejecutar uno de estos comandos.

```sh
VITE_NEWSLETTER_ENABLED=true bun run dev
VITE_NEWSLETTER_ENABLED=true bun run build
```

Activarlo recupera el formulario provisional. No habilita una suscripción funcional. Mantenerlo apagado hasta implementar esa capacidad.

## Verificaciones

Ejecutadas en este workspace con Bun 1.4.0.

- `bun install --frozen-lockfile` terminó correctamente.
- `CI=true bun run build` y `VITE_NEWSLETTER_ENABLED=true CI=true bun run build` pasaron. `CI=true` evita la resolución local de credenciales de caché en 1Password. No realiza un despliegue.
- `CI=true bun run check-types` pasó en los nueve paquetes con tarea de tipos.
- `bun run check` terminó con código 0. Emitió avisos de resolución de dependencias `catalog:` del tooling.
- `bun test` pasó los 30 tests, sin fallos.
- `bunx react-doctor@latest --verbose --scope changed` no encontró problemas nuevos en las dos vistas modificadas.
- El E2E focalizado pasó con el flag ausente, dos tests, y con `true`, tres tests. Comprobó HTML SSR, DOM, ausencia de errores de consola e hidratación, columnas del footer y capturas de escritorio y móvil. Con el flag activo comprobó el toast provisional y el reset del formulario.
- Se inspeccionaron capturas del resultado. No queda una sección vacía ni una cuarta columna reservada con el flag apagado.
- Los artefactos de producción incorporan el valor en servidor y cliente. La importación del módulo SSR compilado confirmó `true` y después `false` tras reconstruir sin el flag.
- Los dry runs de Turbo, sin cambiar el código entre ellos, produjeron hashes diferentes para `web#build`, `14768036876843bb` apagado y `c4432fadef0cbc66` encendido.

Comando E2E desde la raíz, primero sin el flag y después anteponiendo `VITE_NEWSLETTER_ENABLED=true`.

```sh
STRIPE_SECRET_KEY=sk_test_placeholder_unused_startup_only bunx turbo run test:e2e -F web -- newsletter-flag.spec.ts --project=chromium --no-deps
```

La clave indicada es un placeholder de arranque local. No hubo llamadas a Stripe. Se omitió el setup de cuentas porque la superficie comprobada es pública. Los reportes, capturas y logs locales están en `.verify/evidence/newsletter/`, con `off-report/index.html` y `on-report/index.html`.

## Revisión y decisiones

La exploración local encontró dos superficies del boletín. La revisión de diseño comparó configuración estática, flag de Vite y binding del Worker. Se eligió Vite para reutilizar el módulo de configuración y evitar loaders o estado adicional. La validación acepta únicamente los textos explícitos `true` y `false`. El líder revisó el diff trasladado del checkout aislado y verificó el resultado en este workspace. La revisión de comentarios propuso cuatro eliminaciones, aplicadas, y renombrar la expectativa del test, aplicada como `newsletterFlagOn`. No se añadieron proyectos Playwright por estado porque cada valor necesita un proceso Vite distinto. Los dos procesos se ejecutaron por separado.

Principios aplicados de poteto-mode. Model the Domain mantiene un solo booleano validado para las dos vistas. Type System Discipline convierte el texto externo en booleano en la frontera de configuración. Prove It Works exige comprobar SSR, DOM, layout y compilación.

Registro de delegación.

- Exploración `how` en `claudeAgent/claude-sonnet-5-5`.
- Candidatos de diseño en `claudeAgent/claude-sonnet-5-5`, `codex/gpt-6.1-sol` y `muse/muse-wonder-1.0`. Muse falló inicialmente por cuota y T3 entregó después su resultado reanudado, coincidente en usar Vite.
- Selección de diseño en `claudeAgent/claude-opus-5-5`.
- Implementación aislada en `claudeAgent/claude-sonnet-5-5`.
- Revisión de comentarios en `claudeAgent/claude-opus-5-5`.
- Integración del parche y verificaciones finales en el thread principal.

## Pendientes y límites

No hay bloqueo para revisar el cambio local. No se ejecutaron la suite E2E completa ni la suite de integración de Cloudflare y D1. El E2E usó Alchemy local. No se sirvió por HTTP el Worker de producción compilado ni se verificaron sesiones autenticadas, pagos o producción. La suscripción funcional y los demás pendientes del brief CoS quedan fuera de esta tarea. Los artefactos locales terminan compilados con el flag apagado. El puerto 3001 quedó libre después de las pruebas.

## Continuación del 2026-11-06

El usuario autorizó crear el commit y abrir un PR hacia `main`. La autorización no incluye merge ni despliegue manual. Se conserva este handoff como registro de la entrega inicial y de sus verificaciones.

La revisión independiente previa al PR encontró que Alchemy no detectaba un cambio exclusivo del flag. Se reprodujo con su provider instalado, sin red, un plan `noop` al pasar de `false` a `true`. El flag queda declarado también en `Web.env` de `packages/infra/alchemy.run.ts`. La comprobación corregida conserva `noop` sin cambios y produce `update` cuando cambia el flag. No se ejecutó ningún despliegue.
