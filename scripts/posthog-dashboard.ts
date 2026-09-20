/**
 * Creates (or updates) the "Isar Things Shop" PostHog dashboard via the PostHog REST API.
 *
 * Requires in .env:
 *   POSTHOG_PERSONAL_API_KEY=phx_...   → https://eu.posthog.com/settings/user-api-keys
 *
 * Run: bun scripts/posthog-dashboard.ts
 *
 * Safe to re-run: reuses an existing dashboard with the same name and skips
 * insights that already exist on it.
 */

const HOST = "https://eu.i.posthog.com";
const DASHBOARD_NAME = "Isar Things Shop";

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
if (!apiKey) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY in .env");
  process.exit(1);
}

type Params = Record<string, unknown>;

async function api<T = Params>(path: string, options?: { method?: string; body?: Params }) {
  const response = await fetch(`${HOST}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await response.json()) as Params & { id?: number; results?: T[] };
  if (!response.ok) {
    throw new Error(`POSTHOG API ${response.status} ${path}: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
}

// ── 1. Resolve project ──────────────────────────────────────────────────────
const project = await api<{ id: number; name: string }>("/api/projects/@current/");
const projectId = project.id!;
console.log(`Project: ${project.name} (id ${projectId})`);

// ── 2. Find or create the dashboard ─────────────────────────────────────────
const dashboards = await api<{ id: number; name: string }>(
  `/api/projects/${projectId}/dashboards/?limit=100`,
);
const existing = dashboards.results?.find((d) => d.name === DASHBOARD_NAME);
let dashboardId = existing?.id;
if (dashboardId) {
  console.log(`Reusing dashboard "${DASHBOARD_NAME}" (id ${dashboardId})`);
} else {
  const created = await api<{ id: number }>(`/api/projects/${projectId}/dashboards/`, {
    method: "POST",
    body: {
      name: DASHBOARD_NAME,
      description: "Vetrina isarthingshop.com: traffico, click Vinted/Instagram, waiting list.",
    },
  });
  dashboardId = created.id!;
  console.log(`Created dashboard (id ${dashboardId})`);
}

// ── 3. Insight definitions (modern `query` format) ──────────────────────────
type Event = { kind: "EventsNode"; event: string; math?: string };
type InsightDef = { name: string; description?: string; query: Params };

const trend = (
  series: Event[],
  display: string,
  extra?: { breakdown?: string; properties?: Params[]; formula?: string },
): Params => ({
  kind: "TrendsQuery",
  dateRange: { date_from: "-30d" },
  series,
  trendsFilter: { display, ...(extra?.formula ? { formula: extra.formula } : {}) },
  ...(extra?.breakdown
    ? { breakdownFilter: { breakdown: extra.breakdown, breakdown_type: "event" } }
    : {}),
  ...(extra?.properties ? { properties: extra.properties } : {}),
});

const insights: InsightDef[] = [
  {
    name: "Visitatori",
    description: "Visitatori unici di isarthingshop.com",
    query: trend(
      [{ kind: "EventsNode", event: "$pageview", math: "dau" }],
      "ActionsLineGraph",
    ),
  },
  {
    name: "Click Vinted",
    description: "Click verso Vinted per punto di accesso (hero, carousel, card, footer)",
    query: trend(
      [
        { kind: "EventsNode", event: "vinted_item_clicked", },
        { kind: "EventsNode", event: "vinted_link_clicked", },
      ],
      "ActionsTable",
      { breakdown: "placement" },
    ),
  },
  {
    name: "% visitatori → Vinted",
    description: "a + b = click Vinted, c = visitatori unici",
    query: trend(
      [
        { kind: "EventsNode", event: "vinted_item_clicked", math: "dau", },
        { kind: "EventsNode", event: "vinted_link_clicked", math: "dau", },
        { kind: "EventsNode", event: "$pageview", math: "dau", },
      ],
      "ActionsLineGraph",
      { formula: "((a + b) / c) * 100" },
    ),
  },
  {
    name: "Iscrizioni waiting list",
    description: "Iscrizioni per dominio email",
    query: trend([{ kind: "EventsNode", event: "waitlist_joined" }], "ActionsBarValue", {
      breakdown: "email_domain",
    }),
  },
  {
    name: "Funnel waiting list",
    description: "Viste form → invii → iscrizioni effettive",
    query: {
      kind: "FunnelsQuery",
      dateRange: { date_from: "-30d" },
      interval: "day",
      series: [
        { kind: "EventsNode", event: "waitlist_form_viewed", },
        { kind: "EventsNode", event: "waitlist_submit_clicked", },
        { kind: "EventsNode", event: "waitlist_joined", },
      ],
    },
  },
  {
    name: "Click Instagram",
    description: "Click verso Instagram per punto di accesso",
    query: trend(
      [
        { kind: "EventsNode", event: "instagram_link_clicked", },
        { kind: "EventsNode", event: "instagram_post_clicked", },
      ],
      "ActionsTable",
      { breakdown: "placement" },
    ),
  },
  {
    name: "Click Vinted per prodotto",
    description: "Quale capo del carosello viene cliccato",
    query: trend(
      [{ kind: "EventsNode", event: "vinted_item_clicked" }],
      "ActionsBarValue",
      { breakdown: "product" },
    ),
  },
  {
    name: "Traffico da Instagram",
    description: "Visitatori unici con utm_source = instagram",
    query: trend(
      [{ kind: "EventsNode", event: "$pageview", math: "dau" }],
      "ActionsLineGraph",
      {
        properties: [
          { key: "utm_source", type: "event", value: ["instagram"], operator: "exact" },
        ],
      },
    ),
  },
];

// ── 4. Create missing insights ──────────────────────────────────────────────
const dashboardInsights = await api<{ id: number; name: string }>(
  `/api/projects/${projectId}/insights/?dashboard=${dashboardId}&limit=100`,
);
const existingNames = new Set(dashboardInsights.results?.map((i) => i.name));

for (const insight of insights) {
  if (existingNames.has(insight.name)) {
    console.log(`= skipped (exists): ${insight.name}`);
    continue;
  }
  await api(`/api/projects/${projectId}/insights/`, {
    method: "POST",
    body: {
      name: insight.name,
      description: insight.description ?? "",
      query: insight.query,
      dashboards: [dashboardId],
    },
  });
  console.log(`+ created: ${insight.name}`);
}

console.log(`\nDone → ${HOST}/project/${projectId}/dashboard/${dashboardId}`);
