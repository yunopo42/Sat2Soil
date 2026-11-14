import { CloudSlash, Database } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { DATA_SOURCES } from "@sat2soil/contracts";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton, StatePanel } from "@/components/ui/state-panel";
import { duration } from "@/lib/motion/tokens";
import { ButtonsDemo, FieldsDemo, SelectionDemo } from "./_components/controls-demo";
import { ChartsDemo, MetricsDemo } from "./_components/data-demo";
import { ShellPreview } from "./_components/shell-preview";

/*
 * Internal design-system reference for the G0 review (D-005, D-018). English-only by design:
 * it documents components, it is not product UI. Component labels inside still come from messages.
 */

export const metadata: Metadata = {
  title: "Sat2Soil — Design system",
  robots: { index: false, follow: false },
};

const COLORS: { group: string; tokens: { name: string; hex: string; role: string; dark?: boolean }[] }[] = [
  {
    group: "Surfaces and text",
    tokens: [
      { name: "bg", hex: "#F7F9F5", role: "Page background" },
      { name: "surface", hex: "#FFFFFF", role: "Cards, panels" },
      { name: "surface-2", hex: "#EFF2EE", role: "Wells, hover, skeleton" },
      { name: "line", hex: "#E6ECE8", role: "Borders, gridlines" },
      { name: "ink", hex: "#173B32", role: "Primary text", dark: true },
      { name: "ink-muted", hex: "#5A6B64", role: "Secondary text, axes", dark: true },
    ],
  },
  {
    group: "Soil — field and decisions",
    tokens: [
      { name: "green-50", hex: "#E6F2EA", role: "Derived badge" },
      { name: "green-200", hex: "#A9D7A9", role: "Scenario band" },
      { name: "green-600", hex: "#2D7A53", role: "Primary action, field outline", dark: true },
      { name: "green-800", hex: "#1F5A3C", role: "Text on green tints", dark: true },
    ],
  },
  {
    group: "Satellite — NASA-sourced data",
    tokens: [
      { name: "navy-50", hex: "#E3E9F2", role: "NASA badge" },
      { name: "navy-200", hex: "#B7C6DC", role: "Observed range band" },
      { name: "navy-600", hex: "#2B4C7E", role: "Observed series", dark: true },
      { name: "navy-900", hex: "#0E2240", role: "Space, NASA text", dark: true },
    ],
  },
  {
    group: "Attention — simulated and warnings",
    tokens: [
      { name: "amber-50", hex: "#F8EEE3", role: "Warning tint, hatch" },
      { name: "amber-600", hex: "#B66A28", role: "Fills and borders only" },
      { name: "amber-700", hex: "#8F5119", role: "Amber text (AA)", dark: true },
      { name: "red-700", hex: "#8E3426", role: "Destructive actions only", dark: true },
    ],
  },
];

const TYPE = [
  { token: "3xl", size: "60", className: "text-3xl font-semibold tracking-tight", sample: "From Satellite to Soil", use: "Landing headline" },
  { token: "2xl", size: "44", className: "text-2xl font-semibold tracking-tight", sample: "Water balance", use: "Page hero" },
  { token: "xl", size: "28", className: "text-xl font-semibold tracking-tight", sample: "NASA data", use: "Page title" },
  { token: "lg", size: "20", className: "text-lg font-medium", sample: "Current plan vs alternative", use: "Section title" },
  { token: "base", size: "16", className: "text-base", sample: "Rainfall covered about 41% of the crop's water demand.", use: "Body, plain-language results" },
  { token: "sm", size: "14", className: "text-sm", sample: "Card titles, controls, tables", use: "UI text" },
  { token: "xs", size: "12", className: "text-xs text-ink-muted", sample: "Helper text and captions", use: "Hints" },
  { token: "2xs mono", size: "11", className: "font-mono text-2xs text-ink-muted", sample: "NASA POWER · T2M · °C · daily · fetched 14:02", use: "Provenance, axes" },
];

const MOTION_TOKENS = [
  { name: "fast", value: duration.fast, use: "Hover, focus, chevrons" },
  { name: "normal", value: duration.normal, use: "Content enter, cross-fades" },
  { name: "panel", value: 0.22, use: "Drawers and disclosures" },
  { name: "emphasis", value: duration.emphasis, use: "Card stagger items, scenario swaps" },
  { name: "slow", value: duration.slow, use: "Chart reveal, polygon outline" },
];

function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line py-14">
      <div className="mb-8 max-w-2xl">
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{lead}</p>
      </div>
      {children}
    </section>
  );
}

const NAV = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["provenance", "Provenance"],
  ["controls", "Controls"],
  ["feedback", "States"],
  ["data", "Data"],
  ["charts", "Charts"],
  ["shell", "Shell"],
  ["motion", "Motion"],
] as const;

export default function StyleguidePage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-8">
          <Wordmark />
          <nav aria-label="Style guide sections" className="hidden flex-1 gap-4 overflow-x-auto lg:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-xs text-ink-muted transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="py-16">
          <p className="font-mono text-2xs text-navy-600">Internal reference · G0 review · v0.1</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Design system</h1>
          <p className="mt-4 max-w-2xl text-base text-ink-muted">
            Calm, scientific and honest about where every number comes from. Navy means it came from a satellite,
            green means it belongs to the field and the farmer&apos;s decision, amber means simulated or needs attention.
            Switch the language at the top right to check Turkish labels.
          </p>
          <Banner variant="warning" title="Every chart and number on this page is synthetic sample data" className="mt-8 max-w-2xl">
            It exists to review the design. Nothing here is a NASA measurement.
          </Banner>
        </div>

        <Section id="colour" title="Colour" lead="Tailwind's default palette is switched off; only these tokens exist. Text on any tint uses the darkest step of the same family. Colour is never the only cue.">
          <div className="grid gap-8 lg:grid-cols-2">
            {COLORS.map((group) => (
              <div key={group.group}>
                <h3 className="mb-3 text-sm font-medium">{group.group}</h3>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.tokens.map((token) => (
                    <li key={token.name} className="overflow-hidden rounded-md border border-line bg-surface">
                      <div className="h-14 border-b border-line" style={{ background: token.hex }} />
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium">{token.name}</p>
                        <p className="font-mono text-2xs text-ink-muted">{token.hex}</p>
                        <p className="mt-1 text-2xs text-ink-muted">{token.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typography" lead="Geist for the interface, Geist Mono for every number, unit, coordinate and data caption. Scale: 11 · 12 · 14 · 16 · 20 · 28 · 44 · 60 px.">
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {TYPE.map((row) => (
              <li key={row.token} className="grid items-baseline gap-2 px-5 py-4 sm:grid-cols-[120px_1fr_200px]">
                <span className="font-mono text-2xs text-ink-muted">
                  {row.token} · {row.size}px
                </span>
                <span className={`${row.className} truncate`}>{row.sample}</span>
                <span className="text-xs text-ink-muted sm:text-right">{row.use}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-sm">
            Turkish check: Uydudan tarlana · ğ ş ı İ ö ü ç · 37,58° K · 1.180 mm
          </p>
        </Section>

        <Section id="provenance" title="Data provenance" lead="Every value carries its source. Each badge differs by colour and by a second cue (dot, icon, hatch, dashed border) so it survives colour blindness and greyscale print.">
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((source) => (
              <SourceBadge key={source} source={source} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SourceBadge source="live_nasa" detail="POWER" />
            <SourceBadge source="cached_nasa" detail="14:02" />
            <SourceBadge source="live_nasa" detail="GIBS · HLS" />
          </div>
          <Card className="mt-8 max-w-2xl">
            <CardHeader title="Provenance footer" description="The figure caption at the bottom of every data card." aside={<SourceBadge source="live_nasa" detail="POWER" />} />
            <CardBody>
              <p className="text-sm text-ink-muted">
                Open the disclosure: technical detail lives there, not in the main text.
              </p>
            </CardBody>
            <ProvenanceFooter
              items={["NASA POWER", "PRECTOTCORR", "mm/day", "grid ≈0.5° × 0.625°", "1 Nov 2025 – 13 Nov 2026", "fetched 14:02"]}
              method={
                <p>
                  NASA POWER daily point data for the grid cell around the field centroid. Values describe the grid cell,
                  not a point inside the field. Days reported as −999 are shown as gaps, never as zero.
                </p>
              }
            />
          </Card>
        </Section>

        <Section id="controls" title="Controls" lead="One primary button per view. Selections slide; nothing jumps. Errors explain how to fix the input in amber text, never red alarm.">
          <div className="flex flex-col gap-12">
            <ButtonsDemo />
            <SelectionDemo />
            <FieldsDemo />
          </div>
        </Section>

        <Section id="feedback" title="States and banners" lead="Loading, cached, error and empty are designed states, not afterthoughts. A failed NASA request is calm and explains that the user's data is safe.">
          <div className="flex flex-col gap-3">
            <Banner variant="cached" title="Showing cached NASA data">Fetched 14 Nov 2026 14:02. The live service is not responding right now.</Banner>
            <Banner variant="simulated" title="Concept device · Simulated data">No physical device is connected. Every reading here is an example.</Banner>
            <Banner variant="warning" title="2 days are missing in this period">They are shown as gaps and excluded from totals.</Banner>
            <Banner variant="error" title="NASA POWER did not respond" action={<Button size="sm">Try again</Button>}>
              Your field data is safe. Try again in a moment.
            </Banner>
            <Banner variant="success" title="Field saved">42.6 ha · boundary stored.</Banner>
            <Banner variant="info" title="Values describe a grid cell">NASA POWER data covers roughly 50 km; it is not a point measurement inside your field.</Banner>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader title="Loading" aside={<Skeleton className="h-6 w-20 rounded-full" />} />
              <CardBody className="flex flex-col gap-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-28 w-full" />
              </CardBody>
              <div className="border-t border-line bg-bg px-5 py-3">
                <Skeleton className="h-3 w-48" />
              </div>
            </Card>
            <Card>
              <StatePanel
                icon={<CloudSlash />}
                title="NASA POWER did not respond"
                body="Your field data is safe. Try again in a moment."
                action={<Button size="sm">Try again</Button>}
              />
            </Card>
            <Card>
              <StatePanel
                icon={<Database />}
                title="No data for this period yet"
                body="Choose another date range or sync your field."
                action={<Button size="sm" variant="primary">Sync NASA data</Button>}
              />
            </Card>
          </div>
        </Section>

        <Section id="data" title="Data cards" lead="Headline values in mono with the unit beside them. A missing value shows a dash and a No data badge, never a zero. Switch the scenario to see values count to their new number (300 ms).">
          <MetricsDemo />
        </Section>

        <Section id="charts" title="Charts" lead="Scientific figures: straight segments, gaps for missing days, units on the axis, direct labels. Observed = solid navy, scenario = dashed green with its range. Point at a chart or focus it and use ← → to read values.">
          <ChartsDemo />
        </Section>

        <Section id="shell" title="App shell" lead="Top bar 56 px, left rail 224 px with at most five entries; water and rotation sit under Planning. Click the rail: the active background slides.">
          <ShellPreview />
        </Section>

        <Section id="motion" title="Motion" lead="Motion explains a change and never decorates. All timings come from one token file; with reduced motion, movement turns off and content still appears. Full storyboard: docs/MOTION_STORYBOARD.md.">
          <ul className="grid gap-3 sm:grid-cols-5">
            {MOTION_TOKENS.map((token) => (
              <li key={token.name} className="rounded-lg border border-line bg-surface p-4">
                <p className="font-mono text-2xs text-ink-muted">{token.name}</p>
                <p className="mt-1 font-mono text-lg">{Math.round(token.value * 1000)} ms</p>
                <p className="mt-2 text-xs text-ink-muted">{token.use}</p>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
