"use client";

import { CaretLeft, CaretRight, X } from "@phosphor-icons/react/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { transition } from "@/lib/motion/tokens";
import { NAV_ITEMS, activeNavKey } from "./app-sidebar";

const KEY = "sat2soil.demoTour";
const EVENT = "sat2soil:demo-tour";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Turns the guided demo flow on or off for this browser tab (UI_UX_DESIGN S-08). */
export function setDemoTour(active: boolean) {
  try {
    if (active) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the pill simply does not persist across pages.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Guided demo flow for the jury (S-08): a small pill at the bottom centre that steps through the
 * field pages in presentation order. The step is the page you are on, so browser back/forward and
 * the sidebar keep it in sync. Nothing plays by itself.
 */
export function DemoTour({ fieldBase }: { fieldBase: string }) {
  const t = useTranslations("tour");
  const tNav = useTranslations("nav");
  const active = useSyncExternalStore(subscribe, read, () => false);
  const pathname = usePathname();
  const key = activeNavKey(pathname, fieldBase);
  const index = NAV_ITEMS.findIndex((item) => item.key === key);
  const show = active && index >= 0;
  const previous = NAV_ITEMS[index - 1];
  const next = NAV_ITEMS[index + 1];
  const step = "grid size-9 place-items-center rounded-full text-white transition-colors hover:bg-white/15 [&_svg]:size-4";

  return (
    <AnimatePresence>
      {show ? (
        <motion.nav
          aria-label={t("label")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={transition.normal}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-navy-900 p-1.5 text-white shadow-float print:hidden"
        >
          {previous ? (
            <Link href={`${fieldBase}${previous.path}`} className={step} aria-label={t("previous")}>
              <CaretLeft weight="bold" />
            </Link>
          ) : (
            <span className={`${step} opacity-30`} aria-hidden="true">
              <CaretLeft weight="bold" />
            </span>
          )}
          <span className="px-2 text-sm whitespace-nowrap" aria-live="polite">
            <span className="font-mono text-xs text-white/70">{t("step", { current: index + 1, total: NAV_ITEMS.length })}</span>
            <span className="mx-2 text-white/40">·</span>
            <span className="font-bold">{tNav(NAV_ITEMS[index].key)}</span>
          </span>
          {next ? (
            <Link href={`${fieldBase}${next.path}`} className={step} aria-label={t("next")}>
              <CaretRight weight="bold" />
            </Link>
          ) : (
            <span className={`${step} opacity-30`} aria-hidden="true">
              <CaretRight weight="bold" />
            </span>
          )}
          <button type="button" onClick={() => setDemoTour(false)} className={step} aria-label={t("end")}>
            <X weight="bold" />
          </button>
        </motion.nav>
      ) : null}
    </AnimatePresence>
  );
}
