import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// The locale comes from the `[locale]` root segment via next/root-params (Next.js 16.3+),
// which keeps pages statically renderable under cacheComponents without setRequestLocale.
// An explicit `locale` (e.g. getTranslations({locale}) in a Route Handler) takes precedence.
export default getRequestConfig(async ({ locale }) => {
  let resolved = locale;

  if (!resolved) {
    const paramValue = await rootParams.locale();
    if (!hasLocale(routing.locales, paramValue)) notFound();
    resolved = paramValue;
  }

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
    // Fixed zone so server and browser format dates identically (no hydration mismatch).
    // The demo field is in Konya; daily NASA values are calendar days in this zone.
    timeZone: "Europe/Istanbul",
  };
});
