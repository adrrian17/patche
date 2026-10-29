import { createDb } from "@patche/db";
import { storeSetting } from "@patche/db/schema/settings";
import { homeImageSlots, mediaPublicUrl } from "@patche/storage";
import type { HomeImageSlot } from "@patche/storage";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";

import { getMediaPublicBaseUrl } from "@/lib/storage.server";

export function homeImageSettingKey(slot: HomeImageSlot) {
  return `home_image_${slot}`;
}

export type HomeImages = Record<HomeImageSlot, string | null>;

export const getHomeImages = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeImages> => {
    const rows = await createDb()
      .select({ key: storeSetting.key, value: storeSetting.value })
      .from(storeSetting)
      .where(
        inArray(storeSetting.key, homeImageSlots.map(homeImageSettingKey))
      );
    const keys = new Map(rows.map((row) => [row.key, row.value]));
    const baseUrl = getMediaPublicBaseUrl();
    function urlFor(slot: HomeImageSlot) {
      const key = keys.get(homeImageSettingKey(slot));
      return key ? mediaPublicUrl(baseUrl, key) : null;
    }
    return {
      hero: urlFor("hero"),
      pens: urlFor("pens"),
      washi: urlFor("washi"),
    };
  }
);
