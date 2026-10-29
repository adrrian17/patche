# 0002. Serve Home images from R2 through Admin-managed slots

**Date**: 2026-10-28 **Status**: Accepted

## Summary

The three Home images (hero, washi tapes, fine pens) move from `apps/web/public/storefront/` to the existing Media bucket. The Admin uploads each one from the Settings page into a fixed **slot**. D1 `store_setting` records the R2 key of each slot, and the Home loader turns those keys into `/api/media/...` URLs. An empty slot renders a plain panel in the slot's brand color, so a new stage (local, E2E, preview) works before anyone uploads. The three JPG files are deleted from the repo.

## Context

- `apps/web/src/routes/_store/index.tsx` hardcodes `/storefront/hero-planner.jpg`, `/storefront/washi-tapes.jpg`, and `/storefront/fine-pens.jpg`.
- Product Media already lives in `MEDIA_BUCKET` under `products/<productId>/<id>` (`packages/storage/src/keys.ts`). It is uploaded by `POST /api/admin/media` (admin session, type allowlist, `MEDIA_FILE_MAX_BYTES`) and served in every stage by the Worker proxy `GET /api/media/$`, because `MEDIA_PUBLIC_PROXY` is always `"true"` (`packages/infra/alchemy.run.ts`).
- `store_setting` is a key/value table that already holds `shipping_rate_amount` and is edited from `/admin/settings`.
- Every non-production stage gets its own empty bucket. `alchemy dev --stage e2e` wipes it on each run.

## Requirements

- **AC-1**: The Home hero and both collection cards render `<img>` elements whose `src` is served by `/api/media/` from `MEDIA_BUCKET`.
- **AC-2**: `apps/web/public/storefront/` no longer exists in git, and nothing references `/storefront/*.jpg`.
- **AC-3**: An Admin can replace each of the three images from `/admin/settings` without touching a Product. The Home page shows the new image on the next load.
- **AC-4**: When a slot has no image, Home renders without a broken image or console 404, showing the slot's colored panel and its existing copy.
- **AC-5**: Non-admins get 403 from the upload endpoint. Type and size validation match Product Media.
- **AC-6**: Replacing a slot removes the previous R2 object (best effort, as Product Media does).

## Options considered

### Option 1: Fixed R2 keys uploaded out of band

Upload the files with `wrangler r2 object put` to keys such as `site/home/hero.jpg`, and hardcode those URLs in Home. This needs no app code beyond the URLs. It is rejected because each preview, E2E, and local stage starts with an empty bucket and would show broken images. Production also depends on a manual CLI step with Cloudflare credentials, and a replaced object keeps the same URL, so cached copies go stale.

### Option 2: Admin-managed slots in `store_setting` (chosen)

The Admin uploads into named slots. Each upload creates a new key, so a URL never serves stale content. Empty slots degrade gracefully. This reuses the bucket, proxy, validation, and settings table, and adds no new table or binding.

## Decision

Option 2.

## Feature design

Usage, which the design is derived from:

```tsx
// _store/index.tsx
loader: async () => {
  const [digitalProducts, homeImages] = await Promise.all([
    listStoreProducts({ data: { kind: "digital", limit: 4 } }),
    getHomeImages(),
  ]);
  return { digitalProducts, homeImages };
},
// <HomeImage src={homeImages.hero} className="…" fallbackClassName="bg-brand/20" />
```

Types and signatures:

```ts
// packages/storage/src/keys.ts
export const homeImageSlots = ["hero", "washi", "pens"] as const;
export type HomeImageSlot = (typeof homeImageSlots)[number];
export function homeImageObjectKey(
  slot: HomeImageSlot,
  objectId: string
): string; // `home/${slot}/${objectId}`

// apps/web/src/functions/home-images.ts
export const getHomeImages: ServerFn<
  GET,
  public,
  () => Record<HomeImageSlot, string | null>
>;
// Reads store_setting keys `home_image_<slot>`, maps each to mediaPublicUrl(getMediaPublicBaseUrl(), key).

// apps/web/src/routes/api/admin/home-images.ts
// POST multipart { slot: HomeImageSlot, file: File } → { slot, url }
// Admin check → validateMediaFile(file) → put home/<slot>/<nanoid> → upsert setting → delete previous key (best effort).
// If the upsert fails, delete the new object and return 500.

// apps/web/src/lib/storage.server.ts (moved from api/admin/media.ts, shared by both routes)
export function validateMediaFile(file: unknown): Response | null; // null when valid
```

UI:

- `/admin/settings` gets a "Imágenes de inicio" section with three rows (preview, file input, upload button) that follow the existing Media upload controls. Home images are decorative (`alt=""`): an uploaded photo can show anything, and the adjacent copy already names each block. Collection fallbacks use a dark background under the color overlay so the white copy keeps its contrast. Changed after PR #17 review (CodeRabbit), approved by the owner on 2026-10-28.
- Home gets a small local `HomeImage` component: it renders `<img>` when `src` is set, otherwise an `aria-hidden` `div` with the same box classes plus the fallback color.

## Build plan

1. Storage key helper and unit test; `validateMediaFile` extraction with `api/admin/media.ts` switched to it (behavior unchanged).
2. `getHomeImages` and the upload route; integration test: admin upload sets the setting and the object, non-admin gets 403, replace deletes the old key.
3. Home loader and `HomeImage` fallback; Settings section.
4. Delete `apps/web/public/storefront/`. E2E: Admin uploads a fixture image to the hero slot, and Home shows an `img` whose `src` starts with `/api/media/home/hero/` and loads (HTTP 200). Use a generated test image, not a committed photo.
5. After deploying, the owner uploads the three photos to production from `/admin/settings`. Keep the originals outside the repo.

## Consequences

- Production Home shows color panels until the owner uploads the three images after deploy. This is acceptable for a one-time step and is listed in the build plan.
- The proxy serves any key in `MEDIA_BUCKET`, so Home images are public just like Product Media. That is intended.
- No migration: `store_setting` already exists.

## Follow-up

- Per-upload alt text or more slots only if the Home design starts changing often. Not requested.
