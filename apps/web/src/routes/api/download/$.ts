import { createDb } from "@patche/db";
import { variant } from "@patche/db/schema/catalog";
import { downloadGrant, order, orderItem } from "@patche/db/schema/orders";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq, isNull } from "drizzle-orm";

import { getRequestSession, isAdminUser } from "@/lib/session";
import { getDigitalBucket } from "@/lib/storage.server";

const downloadRoutePrefix = "/api/download/";

export const Route = createFileRoute("/api/download/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getRequestSession(request);
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { pathname } = new URL(request.url);
        if (!pathname.startsWith(downloadRoutePrefix)) {
          return new Response(null, { status: 404 });
        }
        let grantId: string;
        try {
          grantId = decodeURIComponent(
            pathname.slice(downloadRoutePrefix.length)
          );
        } catch {
          return new Response("Download Grant inválido", { status: 400 });
        }
        if (!grantId) {
          return new Response(null, { status: 404 });
        }

        const db = createDb();
        const grant = await db
          .select({
            customerId: downloadGrant.customerId,
            fileKey: variant.digitalFileKey,
            fileName: variant.digitalFileName,
          })
          .from(downloadGrant)
          .innerJoin(variant, eq(downloadGrant.variantId, variant.id))
          .innerJoin(orderItem, eq(downloadGrant.orderItemId, orderItem.id))
          .innerJoin(order, eq(orderItem.orderId, order.id))
          .where(
            and(
              eq(downloadGrant.id, grantId),
              isNull(downloadGrant.revokedAt),
              eq(order.paymentStatus, "succeeded")
            )
          )
          .get();
        const canDownload =
          grant &&
          (grant.customerId === session.user.id || isAdminUser(session.user));
        if (!(canDownload && grant.fileKey)) {
          return new Response("Download no disponible", { status: 404 });
        }

        const object = await getDigitalBucket().get(grant.fileKey);
        if (!object) {
          return new Response("Archivo no encontrado", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("cache-control", "private, no-store");
        headers.set(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(
            grant.fileName ?? "descarga"
          )}`
        );
        headers.set("etag", object.httpEtag);
        headers.set("x-content-type-options", "nosniff");
        return new Response(object.body, { headers });
      },
    },
  },
});
