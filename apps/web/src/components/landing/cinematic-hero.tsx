"use client";

import { ArrowDown, ArrowRight, Cpu, GlobeHemisphereEast, PlayCircle, RocketLaunch, Stack } from "@phosphor-icons/react/ssr";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LANDING_FRAMES, frameSrc } from "@/lib/landing-frames";
import { cn } from "@/lib/cn";
import previewEn from "../../../public/images/app-preview-twin.webp";
import previewTr from "../../../public/images/app-preview-twin-tr.webp";
import spaceApps from "../../../public/images/space-apps-konya.jpg";

type FrameSet = "wide" | "tall";

/** Sample field boundary (seed), projected for the one-time outline draw at the end (D-004 rule 5). */
const FIELD = [
  [32.853842, 37.622118],
  [32.856503, 37.620554],
  [32.855558, 37.61933],
  [32.852554, 37.62103],
] as const;
const FIELD_PATH = (() => {
  const cos = Math.cos((37.62 * Math.PI) / 180);
  const xs = FIELD.map(([lon]) => lon * cos);
  const ys = FIELD.map(([, lat]) => -lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = 88 / Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  return (
    FIELD.map((_, i) => `${i ? "L" : "M"}${(6 + (xs[i] - minX) * scale).toFixed(1)} ${(6 + (ys[i] - minY) * scale).toFixed(1)}`).join(" ") +
    " Z"
  );
})();

const subscribeNever = () => () => {};
function readDevice(): "wide" | "tall" | "static" {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) return "static";
  return window.innerHeight > window.innerWidth ? "tall" : "wide";
}

/** Progressive load order: every 16th frame first, then halve the gap, so scrubbing works early. */
function loadOrder(count: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  for (let step = 16; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  if (!seen.has(count - 1)) order.push(count - 1);
  return order;
}

/**
 * Cinematic landing hero (Faz 8, D-004, D-028): a frame sequence from the team's concept video,
 * scrubbed by native scroll inside a sticky section. No scroll hijack, no idle loop: a frame is
 * drawn only when the scroll position changes. Reduced motion or Save-Data → static poster.
 */
export function CinematicHero() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const target = useRef(0);
  const pending = useRef(0);
  // Server and first paint: the static poster. On the client: portrait phones get the 9:16 crop,
  // reduced motion and Save-Data keep the poster only.
  const device = useSyncExternalStore(subscribeNever, readDevice, () => "server");
  const set: FrameSet = device === "tall" ? "tall" : "wide";
  const animated = device !== "server" && device !== "static" && !reduce;
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });

  const draw = () => {
    pending.current = 0;
    const el = canvas.current;
    const list = frames.current;
    if (!el || !list.length) return;
    // Nearest loaded frame to the scroll position.
    let image: HTMLImageElement | null = null;
    for (let d = 0; d < list.length && !image; d += 1) {
      image = list[target.current - d] ?? list[target.current + d] ?? null;
    }
    if (!image) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = el.clientWidth * dpr;
    const h = el.clientHeight * dpr;
    if (el.width !== w || el.height !== h) {
      el.width = w;
      el.height = h;
    }
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight); // object-fit: cover
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };
  const schedule = () => {
    if (!pending.current) pending.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (!animated) return;
    const count = LANDING_FRAMES.count;
    frames.current = new Array(count).fill(null);
    let cancelled = false;
    const queue = loadOrder(count);
    let next = 0;
    const loadNext = () => {
      if (cancelled || next >= queue.length) return;
      const index = queue[next++];
      const image = new window.Image();
      image.decoding = "async";
      image.src = frameSrc(set, index);
      image.onload = () => {
        if (cancelled) return;
        frames.current[index] = image;
        schedule();
        loadNext();
      };
      image.onerror = loadNext;
    };
    // Four parallel lanes keep the network busy without flooding it.
    for (let lane = 0; lane < 4; lane += 1) loadNext();
    const onResize = () => schedule();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (pending.current) cancelAnimationFrame(pending.current);
      pending.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, set]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!animated) return;
    target.current = Math.round(Math.min(1, Math.max(0, p)) * (LANDING_FRAMES.count - 1));
    schedule();
  });

  // Acts follow the video: orbit 0–2.3 s, atmosphere → fields 2.3–3.9 s, soil + device 3.9–6.9 s.
  const act1 = useTransform(scrollYProgress, [0, 0.12, 0.2], [1, 1, 0]);
  const act1y = useTransform(scrollYProgress, [0, 0.2], [0, -24]);
  const act2 = useTransform(scrollYProgress, [0.24, 0.31, 0.47, 0.54], [0, 1, 1, 0]);
  const act3 = useTransform(scrollYProgress, [0.58, 0.65, 0.78, 0.84], [0, 1, 1, 0]);
  const act4 = useTransform(scrollYProgress, [0.86, 0.94], [0, 1]);
  const act4y = useTransform(scrollYProgress, [0.86, 0.94], [32, 0]);
  const hint = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const preview: StaticImageData = locale === "tr" ? previewTr : previewEn;

  return (
    <section
      ref={section}
      aria-labelledby="hero-title"
      className={cn("relative bg-navy-900", animated ? "h-[460vh]" : "h-auto")}
    >
      <div className={cn("relative overflow-hidden", animated ? "sticky top-0 h-dvh" : "min-h-[92dvh]")}>
        {/* Poster: first frame, server-rendered (also the reduced-motion / Save-Data view). */}
        <picture>
          <source media="(orientation: portrait)" srcSet={frameSrc("tall", 0)} />
          <img src={frameSrc("wide", 0)} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-navy-900/85 via-navy-900/35 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-navy-900/70 to-transparent" />

        <div className="relative mx-auto flex h-full min-h-[92dvh] max-w-7xl flex-col justify-center px-4 pt-24 pb-16 sm:px-8">
          {/* Act 1: title and CTA are in the first frame (D-004 rule 1). */}
          <motion.div style={animated ? { opacity: act1, y: act1y } : undefined} className="max-w-[40rem] text-white">
            <p className="text-xs font-bold tracking-[0.42em] text-white/75">SAT2SOIL</p>
            <h1 id="hero-title" className="mt-5 text-[2.5rem] leading-[1.06] font-extrabold tracking-tight sm:text-[3.4rem]">
              {t("titleLine1")}
              <br />
              <em className="text-[#b9e07a]">{t("titleLine2")}</em>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">
              {t.rich("lead", { b: (chunks) => <strong className="font-extrabold text-white">{chunks}</strong> })}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild variant="inverse" size="lg">
                <Link href="/demo">
                  <RocketLaunch aria-hidden="true" weight="fill" />
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden="true" weight="bold" />
                </Link>
              </Button>
              <Button asChild variant="outline-inverse" size="lg">
                <a href="#how">
                  <PlayCircle aria-hidden="true" />
                  {t("ctaSecondary")}
                </a>
              </Button>
            </div>
            <p className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/95 py-1.5 pr-4 pl-1.5 text-xs font-semibold text-ink">
              <Image src={spaceApps} alt={t("spaceAppsAlt")} width={32} height={32} className="size-8 rounded-full object-cover" />
              {t("builtAt")}
            </p>
          </motion.div>
        </div>

        {animated ? (
          <>
            <Act value={act2} icon={<GlobeHemisphereEast weight="duotone" />} step="01" label={t("hero.orbitLabel")} title={t("hero.orbitTitle")} body={t("hero.orbitBody")} />
            <Act value={act3} icon={<Cpu weight="duotone" />} step="02" label={t("hero.soilLabel")} title={t("hero.soilTitle")} body={t("hero.soilBody")} concept={t("hero.conceptDevice")} />

            {/* Act 4: the last frame turns into the real product (D-004 rule 5). */}
            <motion.div aria-hidden="true" style={{ opacity: act4 }} className="absolute inset-0 bg-navy-900/70" />
            <motion.div style={{ opacity: act4, y: act4y }} className="absolute inset-0 flex items-center justify-center px-4 sm:px-8">
              <div className="w-full max-w-[min(64rem,calc((100dvh-15rem)*1.41))]">
                <div className="mb-4 flex items-end justify-between gap-4 text-white">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-white/70">
                      <Stack aria-hidden="true" className="size-4" /> 03 · {t("hero.decideLabel")}
                    </p>
                    <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">{t("hero.decideTitle")}</h2>
                  </div>
                  <FieldOutline progress={scrollYProgress} label={t("hero.fieldOutline")} />
                </div>
                <div className="overflow-hidden rounded-xl border border-white/20 bg-bg shadow-float">
                  <Image src={preview} alt={t("hero.previewAlt")} sizes="(min-width: 1024px) 1024px, 100vw" className="h-auto w-full" />
                </div>
                <p className="mt-3 text-xs text-white/75">{t("hero.previewNote")}</p>
              </div>
            </motion.div>

            <motion.div style={{ opacity: hint }} aria-hidden="true" className="absolute inset-x-0 bottom-6 flex justify-center text-white/80">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <ArrowDown className="size-4" />
                {t("hero.scrollHint")}
              </span>
            </motion.div>
          </>
        ) : null}

        <p className="absolute top-[84px] right-4 rounded-full bg-black/45 px-3 py-1 text-2xs font-semibold text-white/85 sm:right-8">
          {t("hero.videoLabel")}
        </p>
      </div>
    </section>
  );
}

function Act({
  value,
  icon,
  step,
  label,
  title,
  body,
  concept,
}: {
  value: MotionValue<number>;
  icon: ReactNode;
  step: string;
  label: string;
  title: string;
  body: string;
  concept?: string;
}) {
  const y = useTransform(value, [0, 1], [16, 0]);
  return (
    <motion.div style={{ opacity: value, y }} className="pointer-events-none absolute inset-x-0 bottom-20 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-md rounded-xl border border-white/15 bg-navy-900/70 p-5 text-white backdrop-blur-md">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-white/70 [&_svg]:size-4">
            {icon} {step} · {label}
          </p>
          <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{body}</p>
          {concept ? (
            <p className="hatch-amber mt-3 inline-block rounded-full border border-amber-600/60 bg-white/90 px-3 py-1 text-2xs font-bold text-amber-700">
              {concept}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/** The sample field's real outline, drawn once (700 ms) when the final act appears. */
function FieldOutline({ progress, label }: { progress: MotionValue<number>; label: string }) {
  const [drawn, setDrawn] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    if (p > 0.92 && !drawn) setDrawn(true);
  });
  return (
    <figure className="hidden shrink-0 items-center gap-3 sm:flex">
      <svg viewBox="0 0 100 100" className="size-16" role="img" aria-label={label}>
        <motion.path
          d={FIELD_PATH}
          fill="rgba(185,224,122,0.18)"
          stroke="#b9e07a"
          strokeWidth={3}
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: drawn ? 1 : 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <figcaption className="max-w-[9rem] text-2xs text-white/75">{label}</figcaption>
    </figure>
  );
}
