import { createFileRoute } from "@tanstack/react-router";

import { getMediaBucket, isLocalMediaProxyEnabled } from "@/lib/storage.server";

const mediaRoutePrefix = "/api/media/";

export const Route = createFileRoute("/api/media/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isLocalMediaProxyEnabled()) {
          return new Response(null, { status: 404 });
        }

        const { pathname } = new URL(request.url);
        if (!pathname.startsWith(mediaRoutePrefix)) {
          return new Response(null, { status: 404 });
        }

        let key: string;
        try {
          key = decodeURIComponent(pathname.slice(mediaRoutePrefix.length));
        } catch {
          return new Response("Media key inválida", { status: 400 });
        }
        if (!key) {
          return new Response(null, { status: 404 });
        }

        const object = await getMediaBucket().get(key);
        if (!object) {
          return new Response(null, { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        return new Response(object.body, { headers });
      },
    },
  },
});
