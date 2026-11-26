// oxlint-disable sonarjs/no-duplicate-string -- fixture data repeats kinds and variant names by design.
import type { HomeImageSlot } from "@patche/storage";

// Single source of truth for the demo catalog, shared by the local seed script and the preview seeder.
export const demoShippingRateAmount = "9900";

export interface DemoVariant {
  kind: "digital" | "physical";
  name: string;
  price: number;
  stock?: number;
}

export type DemoImageKey =
  | "hero"
  | "washi"
  | "pens"
  | "daily-planner"
  | "planner-view-1"
  | "planner-view-2"
  | "planner-view-3"
  | "planner-view-4"
  | "canvas-planner"
  | "daily-journal"
  | "journal-kit"
  | "wall-calendar"
  | "calendar-template"
  | "digital-planner"
  | "task-manager"
  | "habit-tracker"
  | "habit-tracker-app"
  | "washi-set"
  | "washi-tape"
  | "washi-tapes"
  | "lettering-pens"
  | "gel-pens"
  | "fine-pens"
  | "sticky-notes"
  | "desk-organizer";

export interface DemoProduct {
  category: string;
  description: string;
  images: readonly DemoImageKey[];
  name: string;
  variants: readonly DemoVariant[];
}

export interface DemoCategory {
  name: string;
  slug: string;
}

export interface DemoImageSource {
  fallbackUrl: string;
  primaryUrl: string;
}

export const demoCategories: readonly DemoCategory[] = [
  { name: "Agendas", slug: "agendas" },
  { name: "Libretas", slug: "libretas" },
  { name: "Calendarios", slug: "calendarios" },
  { name: "Planners digitales", slug: "planners-digitales" },
  { name: "Washi tapes", slug: "washi-tapes" },
  { name: "Plumas y escritura", slug: "plumas" },
  { name: "Escritorio", slug: "escritorio" },
];

export const demoHomeImages: Readonly<Record<HomeImageSlot, DemoImageKey>> = {
  hero: "hero",
  pens: "pens",
  washi: "washi",
};

const plannerViews = [
  "planner-view-1",
  "planner-view-2",
  "planner-view-3",
  "planner-view-4",
] as const satisfies readonly DemoImageKey[];

export const demoProducts: readonly DemoProduct[] = [
  {
    category: "agendas",
    description:
      "Papel marfil de 120 g que no traspasa, tapa de lino suave al tacto y detalles en dorado.\nFormato sin fechas para empezar cuando quieras.",
    images: ["daily-planner", ...plannerViews],
    name: "Agenda Diaria Premium",
    variants: [
      { kind: "physical", name: "Versión física", price: 49_900, stock: 25 },
      { kind: "digital", name: "Versión digital", price: 19_900 },
    ],
  },
  {
    category: "agendas",
    description:
      "Tapa dura de canvas, encuadernación que abre plano y cinta separadora.\nIdeal para planear semana a semana.",
    images: ["canvas-planner", "planner-view-2"],
    name: "Agenda Canvas Tapa Dura",
    variants: [
      { kind: "physical", name: "Verde bosque", price: 59_900, stock: 12 },
      { kind: "physical", name: "Arena", price: 59_900, stock: 4 },
    ],
  },
  {
    category: "agendas",
    description: "Vista semanal horizontal con espacio para hábitos y notas.",
    images: ["planner-view-3"],
    name: "Agenda Semanal Minimal",
    variants: [{ kind: "physical", name: "A5", price: 34_900, stock: 30 }],
  },
  {
    category: "agendas",
    description: "Planeación mensual y trimestral con metas y revisiones.",
    images: ["planner-view-4", "planner-view-1"],
    name: "Agenda de Metas 2027",
    variants: [
      { kind: "physical", name: "A5", price: 44_900, stock: 18 },
      { kind: "physical", name: "B5", price: 52_900, stock: 9 },
    ],
  },
  {
    category: "agendas",
    description: "Edición limitada con tapa bordada a mano.",
    images: ["planner-view-1"],
    name: "Agenda Bordada Edición Limitada",
    variants: [{ kind: "physical", name: "Única", price: 89_900, stock: 0 }],
  },
  {
    category: "libretas",
    description:
      "Tapa de lino y papel marfil de 120 g para escribir con pluma fuente sin manchas.",
    images: ["daily-journal"],
    name: "Libreta Diaria Tapa Dura",
    variants: [
      { kind: "physical", name: "Rayada", price: 32_000, stock: 40 },
      { kind: "physical", name: "Punteada", price: 32_000, stock: 35 },
      { kind: "physical", name: "Lisa", price: 32_000, stock: 2 },
    ],
  },
  {
    category: "libretas",
    description: "Hojas punteadas para bullet journal, 160 páginas numeradas.",
    images: ["journal-kit", "daily-journal"],
    name: "Bullet Journal Punteado",
    variants: [{ kind: "physical", name: "A5", price: 29_900, stock: 50 }],
  },
  {
    category: "libretas",
    description: "Set de tres libretas delgadas para llevar a todos lados.",
    images: ["daily-journal"],
    name: "Set de Libretas de Bolsillo",
    variants: [
      { kind: "physical", name: "Set de 3", price: 24_900, stock: 22 },
    ],
  },
  {
    category: "libretas",
    description:
      "Kit de journaling con más de 50 stickers y plantillas imprimibles.",
    images: ["journal-kit"],
    name: "Kit Creativo de Journaling",
    variants: [
      { kind: "physical", name: "Kit físico", price: 42_900, stock: 15 },
      { kind: "digital", name: "Plantillas digitales", price: 15_000 },
    ],
  },
  {
    category: "libretas",
    description: "Papel kraft reciclado y costura expuesta.",
    images: ["journal-kit"],
    name: "Libreta Kraft Reciclada",
    variants: [{ kind: "physical", name: "A5", price: 18_900, stock: 60 }],
  },
  {
    category: "calendarios",
    description: "Tamaño A3 con acabado mate premium y gancho para colgar.",
    images: ["wall-calendar"],
    name: "Calendario de Pared Minimalista",
    variants: [{ kind: "physical", name: "A3", price: 24_000, stock: 28 }],
  },
  {
    category: "calendarios",
    description: "Calendario de escritorio con base de madera.",
    images: ["wall-calendar", "desk-organizer"],
    name: "Calendario de Escritorio",
    variants: [{ kind: "physical", name: "Único", price: 27_900, stock: 14 }],
  },
  {
    category: "calendarios",
    description: "Vistas mensual y semanal para imprimir o usar en tablet.",
    images: ["calendar-template"],
    name: "Calendario Minimalista 2027",
    variants: [{ kind: "digital", name: "PDF", price: 12_000 }],
  },
  {
    category: "planners-digitales",
    description:
      "PDF con hipervínculos y más de 500 plantillas. Compatible con GoodNotes y Notability.",
    images: ["digital-planner"],
    name: "Planner Digital 2027",
    variants: [{ kind: "digital", name: "PDF / GoodNotes", price: 19_000 }],
  },
  {
    category: "planners-digitales",
    description:
      "Compatible con el método GTD, con listas de proyectos y contextos.",
    images: ["task-manager"],
    name: "Gestor de Tareas Definitivo",
    variants: [{ kind: "digital", name: "Pro Pack", price: 18_000 }],
  },
  {
    category: "planners-digitales",
    description: "Construye mejores rutinas con seguimiento diario y mensual.",
    images: ["habit-tracker"],
    name: "Paquete Seguimiento de Hábitos",
    variants: [{ kind: "digital", name: "PDF", price: 8000 }],
  },
  {
    category: "planners-digitales",
    description: "Widgets interactivos para Notion y iPad.",
    images: ["habit-tracker-app"],
    name: "Habit Tracker Digital",
    variants: [{ kind: "digital", name: "Notion + iPad", price: 8000 }],
  },
  {
    category: "planners-digitales",
    description: "Presupuesto mensual, ahorro y control de gastos.",
    images: ["calendar-template"],
    name: "Planner de Finanzas Personales",
    variants: [{ kind: "digital", name: "PDF", price: 14_900 }],
  },
  {
    category: "planners-digitales",
    description: "Plantillas para planear clases, tareas y exámenes.",
    images: ["task-manager"],
    name: "Planner Estudiantil Digital",
    variants: [{ kind: "digital", name: "PDF / GoodNotes", price: 12_900 }],
  },
  {
    category: "planners-digitales",
    description: "Diario de gratitud con prompts para cada día del año.",
    images: ["journal-kit"],
    name: "Diario de Gratitud Digital",
    variants: [{ kind: "digital", name: "PDF", price: 9900 }],
  },
  {
    category: "washi-tapes",
    description: "Ocho diseños botánicos únicos.",
    images: ["washi-set"],
    name: "Set de Washi Tape Botánico",
    variants: [
      { kind: "physical", name: "8 rollos", price: 12_500, stock: 45 },
    ],
  },
  {
    category: "washi-tapes",
    description: "Rollo de 15 mm con hojas en tonos salvia.",
    images: ["washi-tape"],
    name: "Washi Tape Hojas",
    variants: [{ kind: "physical", name: "15 mm", price: 8990, stock: 70 }],
  },
  {
    category: "washi-tapes",
    description: "Tonos turquesa para combinar con tu agenda.",
    images: ["washi-tapes"],
    name: "Washi Tapes Turquesa",
    variants: [
      { kind: "physical", name: "Set de 3", price: 15_900, stock: 20 },
      { kind: "physical", name: "Set de 6", price: 27_900, stock: 8 },
    ],
  },
  {
    category: "plumas",
    description: "Doce plumas de punta pincel doble para caligrafía.",
    images: ["lettering-pens"],
    name: "Set de Plumas para Lettering",
    variants: [
      { kind: "physical", name: "12 piezas", price: 28_000, stock: 16 },
    ],
  },
  {
    category: "plumas",
    description: "Tinta de gel de secado rápido en colores pastel.",
    images: ["gel-pens"],
    name: "Set de Plumas de Gel",
    variants: [
      { kind: "physical", name: "10 colores", price: 12_500, stock: 38 },
    ],
  },
  {
    category: "plumas",
    description:
      "Plumas que se deslizan sobre la página, con detalles dorados.",
    images: ["fine-pens"],
    name: "Plumas Finas Doradas",
    variants: [
      { kind: "physical", name: "Pieza", price: 9900, stock: 50 },
      { kind: "physical", name: "Set de 5", price: 39_900, stock: 6 },
    ],
  },
  {
    category: "escritorio",
    description: "Notas adhesivas en tonos pastel, 4 blocks de 100 hojas.",
    images: ["sticky-notes"],
    name: "Notas Adhesivas Pastel",
    variants: [{ kind: "physical", name: "4 blocks", price: 6000, stock: 80 }],
  },
  {
    category: "escritorio",
    description:
      "Organizador de madera con compartimentos para libretas y plumas.",
    images: ["desk-organizer"],
    name: "Organizador de Escritorio de Madera",
    variants: [{ kind: "physical", name: "Único", price: 35_000, stock: 10 }],
  },
  {
    category: "escritorio",
    description: "Base de madera para tablet o agenda abierta.",
    images: ["desk-organizer"],
    name: "Atril de Madera",
    variants: [{ kind: "physical", name: "Único", price: 29_900, stock: 0 }],
  },
  {
    category: "escritorio",
    description: "Clips metálicos dorados en forma de hoja.",
    images: ["sticky-notes"],
    name: "Clips Dorados",
    variants: [
      { kind: "physical", name: "Caja de 30", price: 4900, stock: 100 },
    ],
  },
];

function unsplash(photo: string, width: number, height: number): string {
  return `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

function imageSource(
  key: DemoImageKey,
  photo: string,
  width: number,
  height: number
): DemoImageSource {
  return {
    fallbackUrl: `https://picsum.photos/seed/${key}/${width}/${height}.jpg`,
    primaryUrl: unsplash(photo, width, height),
  };
}

// Stationery photos verified to answer 200 image/jpeg; picsum is the fallback when one disappears.
export const demoImageSources: Readonly<Record<DemoImageKey, DemoImageSource>> =
  {
    "calendar-template": imageSource(
      "calendar-template",
      "1611224923853-80b023f02d71",
      800,
      800
    ),
    "canvas-planner": imageSource(
      "canvas-planner",
      "1531346878377-a5be20888e57",
      800,
      800
    ),
    "daily-journal": imageSource(
      "daily-journal",
      "1519682337058-a94d519337bc",
      800,
      800
    ),
    "daily-planner": imageSource(
      "daily-planner",
      "1506784983877-45594efa4cbe",
      800,
      800
    ),
    "desk-organizer": imageSource(
      "desk-organizer",
      "1499750310107-5fef28a66643",
      800,
      800
    ),
    "digital-planner": imageSource(
      "digital-planner",
      "1544256718-3bcf237f3974",
      800,
      800
    ),
    "fine-pens": imageSource(
      "fine-pens",
      "1585336261022-680e295ce3fe",
      800,
      800
    ),
    "gel-pens": imageSource("gel-pens", "1513542789411-b6a5d4f31634", 800, 800),
    "habit-tracker": imageSource(
      "habit-tracker",
      "1456735190827-d1262f71b8a3",
      800,
      800
    ),
    "habit-tracker-app": imageSource(
      "habit-tracker-app",
      "1512314889357-e157c22f938d",
      800,
      800
    ),
    hero: imageSource("hero", "1517842645767-c639042777db", 1200, 825),
    "journal-kit": imageSource(
      "journal-kit",
      "1501504905252-473c47e087f8",
      800,
      800
    ),
    "lettering-pens": imageSource(
      "lettering-pens",
      "1583485088034-697b5bc54ccd",
      800,
      800
    ),
    pens: imageSource("pens", "1455390582262-044cdead277a", 1200, 825),
    "planner-view-1": imageSource(
      "planner-view-1",
      "1484480974693-6ca0a78fb36b",
      800,
      800
    ),
    "planner-view-2": imageSource(
      "planner-view-2",
      "1544716278-ca5e3f4abd8c",
      800,
      800
    ),
    "planner-view-3": imageSource(
      "planner-view-3",
      "1517842645767-c639042777db",
      800,
      800
    ),
    "planner-view-4": imageSource(
      "planner-view-4",
      "1434030216411-0b793f4b4173",
      800,
      800
    ),
    "sticky-notes": imageSource(
      "sticky-notes",
      "1586281380117-5a60ae2050cc",
      800,
      800
    ),
    "task-manager": imageSource(
      "task-manager",
      "1488190211105-8b0e65b80b4e",
      800,
      800
    ),
    "wall-calendar": imageSource(
      "wall-calendar",
      "1506784365847-bbad939e9335",
      800,
      800
    ),
    washi: imageSource("washi", "1513519245088-0e12902e5a38", 1200, 825),
    "washi-set": imageSource(
      "washi-set",
      "1513519245088-0e12902e5a38",
      800,
      800
    ),
    "washi-tape": imageSource(
      "washi-tape",
      "1452860606245-08befc0ff44b",
      800,
      800
    ),
    "washi-tapes": imageSource(
      "washi-tapes",
      "1513364776144-60967b0f800f",
      800,
      800
    ),
  };

export function slugifyDemoProduct(name: string): string {
  return `demo-${name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")}`;
}

export function demoVariantSku(productSlug: string, index: number): string {
  return `DEMO-${productSlug.replace(/^demo-/u, "").toUpperCase()}-${index + 1}`;
}
