import {
  ArrowRight,
  ArrowsClockwise,
  Drop,
  GlobeHemisphereEast,
  PlayCircle,
  RocketLaunch,
  SprayBottle,
  Stack,
} from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/brand/wordmark";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import cardDecide from "../../../../public/images/card-field-decisions.webp";
import cardMonitor from "../../../../public/images/card-satellite-monitoring.webp";
import cardTwin from "../../../../public/images/card-digital-twin.webp";
import hero from "../../../../public/images/hero-satellite-to-soil.webp";
import spaceApps from "../../../../public/images/space-apps-konya.jpg";

// Static landing in the approved visual direction (P01). The cinematic 3D landing replaces the
// hero in phase 8 (D-004, D-017). No NASA insignia anywhere (CLAUDE.md rule 6).

const FEATURES = [
  { key: "nasa", icon: GlobeHemisphereEast, tone: "bg-navy-800 text-white" },
  { key: "water", icon: Drop, tone: "bg-sky-200/60 text-sky-600" },
  { key: "rotation", icon: ArrowsClockwise, tone: "bg-green-100 text-green-600" },
  { key: "twin", icon: Stack, tone: "bg-navy-50 text-navy-700" },
  { key: "spray", icon: SprayBottle, tone: "bg-green-100 text-green-700" },
] as const;

const CARDS = [
  { key: "monitor", image: cardMonitor },
  { key: "decide", image: cardDecide },
  { key: "twin", image: cardTwin },
] as const;

const SOURCES = [
  { key: "power", name: "NASA POWER", status: "live" },
  { key: "gibs", name: "NASA GIBS · HLS", status: "live" },
  { key: "gpm", name: "GPM IMERG", status: "planned" },
  { key: "landsat", name: "Landsat / HLS NDVI", status: "planned" },
  { key: "smap", name: "SMAP", status: "planned" },
  { key: "device", name: null, status: "simulated" },
] as const;

const STATUS_STYLE = {
  live: "bg-green-100 text-green-800",
  planned: "bg-surface-2 text-ink-muted",
  simulated: "hatch-amber border border-amber-600/50 text-amber-700",
} as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 hidden w-[66%] lg:block [mask-image:linear-gradient(to_right,transparent,black_26%)]"
          >
            <Image src={hero} alt="" fill priority sizes="66vw" className="object-cover object-[55%_40%]" />
          </div>
          <div className="mx-auto max-w-7xl px-4 pt-14 pb-24 sm:px-8 lg:pt-20 lg:pb-36">
            <Eyebrow />
            <h1 className="mt-7 max-w-[42rem] text-[2.6rem] leading-[1.06] font-extrabold tracking-tight text-ink sm:text-[3.4rem]">
              {t("titleLine1")}
              <br />
              <em className="text-green-700">{t("titleLine2")}</em>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink/85">
              {t.rich("lead", { b: (chunks) => <strong className="font-extrabold text-ink">{chunks}</strong> })}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button asChild variant="primary" size="lg">
                <Link href="/demo">
                  <RocketLaunch aria-hidden="true" weight="fill" />
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden="true" weight="bold" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">
                  <PlayCircle aria-hidden="true" />
                  {t("ctaSecondary")}
                </a>
              </Button>
            </div>
            <p className="mt-9 inline-flex items-center gap-3 rounded-full border border-line bg-surface/90 py-1.5 pr-4 pl-1.5 text-xs font-semibold text-ink shadow-card">
              <Image
                src={spaceApps}
                alt={t("spaceAppsAlt")}
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
              />
              {t("builtAt")}
            </p>
            <LocaleSwitcher className="mt-6 w-fit sm:hidden" />
          </div>
          <div className="relative mx-4 mb-10 aspect-[16/9] overflow-hidden rounded-xl lg:hidden">
            <Image src={hero} alt="" fill sizes="100vw" className="object-cover" />
          </div>
        </section>

        {/* Feature strip */}
        <div id="solutions" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-8 lg:-mt-20">
          <ul className="grid grid-cols-2 gap-y-6 rounded-xl border border-line bg-surface px-6 py-6 shadow-float sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-line lg:px-2">
            {FEATURES.map(({ key, icon: FeatureIcon, tone }) => (
              <li key={key} className="flex items-center justify-center gap-3 px-4">
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", tone)}>
                  <FeatureIcon aria-hidden="true" weight="duotone" className="size-6" />
                </span>
                <span className="text-sm font-extrabold text-ink sm:text-base">{t(`features.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Intelligence from space */}
        <section aria-labelledby="intel-title" className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-8">
          <div className="flex items-center justify-center gap-6">
            <span aria-hidden="true" className="hidden h-px w-24 bg-green-600 sm:block" />
            <h2 id="intel-title" className="text-center text-xl font-extrabold tracking-tight text-ink sm:text-[2.1rem]">
              {t("intelTitle")}
            </h2>
            <span aria-hidden="true" className="hidden h-px w-24 bg-green-600 sm:block" />
          </div>
          <p className="mt-3 text-center text-base text-ink-muted">{t("intelLead")}</p>

          <RevealGroup as="ul" className="mt-10 grid gap-6 lg:grid-cols-3">
            {CARDS.map(({ key, image }) => (
              <RevealItem as="li" key={key}>
                <Link
                  href="/demo"
                  className="group flex h-full gap-4 rounded-xl border border-line bg-surface p-3 shadow-card transition-shadow duration-200 hover:shadow-float"
                >
                  <span className="relative block aspect-[3/2] w-[46%] shrink-0 overflow-hidden rounded-lg">
                    <Image src={image} alt="" fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
                  </span>
                  <span className="flex flex-col py-2 pr-1">
                    <span className="text-base font-extrabold leading-snug text-ink">{t(`cards.${key}.title`)}</span>
                    <span className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`cards.${key}.body`)}</span>
                    <span className="mt-auto ml-auto grid size-8 place-items-center rounded-full bg-green-100 text-green-700 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
                    </span>
                  </span>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-24 border-t border-line bg-surface/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
            <Eyebrow />
            <h2 id="how-title" className="mt-4 text-xl font-extrabold tracking-tight">
              {t("howTitle")}
            </h2>
            <RevealGroup as="ol" className="mt-8 grid gap-5 md:grid-cols-3">
              {(["field", "data", "decide"] as const).map((step, index) => (
                <RevealItem as="li" key={step} className="rounded-xl border border-line bg-surface p-6 shadow-card">
                  <span className="grid size-9 place-items-center rounded-full bg-green-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">{t(`steps.${step}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`steps.${step}.body`)}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Data sources, honest status */}
        <section id="data" aria-labelledby="data-title" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Eyebrow />
              <h2 id="data-title" className="mt-4 text-xl font-extrabold tracking-tight">
                {t("dataTitle")}
              </h2>
              <p className="mt-3 text-base text-ink-muted">{t("dataLead")}</p>
              <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted shadow-card">
                {t("gridNote")}
              </p>
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
              {SOURCES.map(({ key, name, status }) => (
                <li key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span>
                    <span className="block text-sm font-extrabold text-ink">{name ?? t("deviceName")}</span>
                    <span className="block text-sm text-ink-muted">{t(`sources.${key}`)}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold", STATUS_STYLE[status])}>
                    {t(`status.${status}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer id="about" className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <Wordmark size="sm" />
            <span aria-hidden="true" className="h-10 w-px bg-line" />
            <Image
              src={spaceApps}
              alt={t("spaceAppsAlt")}
              width={56}
              height={56}
              className="size-14 rounded-lg object-cover"
            />
          </div>
          <div className="max-w-xl text-sm text-ink-muted md:text-right">
            <p className="font-semibold text-ink">{t("footerChallenge")}</p>
            <p className="mt-1">{t("footerData")}</p>
            <p className="mt-1">{t("footerTeam")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
