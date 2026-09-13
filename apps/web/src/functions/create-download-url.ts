import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { downloadGrant } from "@patche/db/schema/orders";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { isAdminUser } from "@/lib/session";
import { createDigitalGetUrl } from "@/lib/storage.server";
import { authMiddleware } from "@/middleware/auth";

export const createDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ grantId: z.string().min(1).max(32) }))
  .handler(async ({ context, data }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }

    const db = createDb();
    const grant = await db
      .select({
        customerId: downloadGrant.customerId,
        digitalFileKey: variant.digitalFileKey,
        revokedAt: downloadGrant.revokedAt,
      })
      .from(downloadGrant)
      .innerJoin(variant, eq(downloadGrant.variantId, variant.id))
      .where(
        and(eq(downloadGrant.id, data.grantId), isNull(downloadGrant.revokedAt))
      )
      .get();
    if (!grant?.digitalFileKey) {
      throw new Error("Download Grant no disponible");
    }

    const isOwner = grant.customerId === context.session.user.id;
    if (!(isOwner || isAdminUser(context.session.user))) {
      throw new Error("Download Grant no disponible");
    }

    return { url: await createDigitalGetUrl(grant.digitalFileKey) };
  });
