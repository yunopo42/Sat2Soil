import type { routing } from "@/i18n/routing";
import type messages from "../messages/en.json";

// English is the reference catalogue; tr.json must mirror its keys (enforced by messages.test.ts).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
