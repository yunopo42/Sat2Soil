import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "tr"],
  // English is the default (D-014) and is served without a prefix: `/` = English, `/tr` = Turkish.
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Keep `/` English on every browser (e.g. a Turkish-locale laptop during the jury demo).
  // Users switch language explicitly with the locale switcher.
  localeDetection: false,
});
