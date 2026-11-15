import { ArrowRight, CheckCircle, GlobeHemisphereEast, Scan } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SAMPLE_FIELD_ID } from "@/lib/sample-field";
import device from "../../../public/images/agrispray-device.webp";

/**
 * The AgriSpray prototype as the second half of "from satellite to soil" (D-030): NASA data
 * describes a ~55 km cell, the handheld probe adds the field itself. Values in the demo stay simulated.
 */
export async function DeviceSection() {
  const t = await getTranslations("landing.device");
  const rows = [
    { label: t("rowScale"), nasa: t("nasaScale"), device: t("deviceScale") },
    { label: t("rowTime"), nasa: t("nasaTime"), device: t("deviceTime") },
    { label: t("rowWhat"), nasa: t("nasaWhat"), device: t("deviceWhat") },
  ];
  return (
    <section id="agrispray" aria-labelledby="device-title" className="scroll-mt-24 border-y border-line bg-linear-to-br from-green-50 via-bg to-orange-200/20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative flex justify-center">
          <span aria-hidden="true" className="absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-100/70 blur-2xl" />
          <Image
            src={device}
            alt={t("alt")}
            sizes="200px"
            className="relative h-[26rem] w-auto drop-shadow-[0_28px_28px_rgba(15,27,45,0.25)]"
          />
          <span className="absolute top-4 left-4 rounded-full border border-orange-500/40 bg-surface px-3 py-1 text-xs font-bold text-amber-700 shadow-card sm:left-10">
            {t("eyebrow")}
          </span>
        </div>

        <div>
          <h2 id="device-title" className="text-xl leading-tight font-extrabold tracking-tight text-ink sm:text-[2.4rem]">
            {t("title")}
            <br />
            <em className="text-green-700">{t("emphasis")}</em>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">{t("lead")}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {(["b1", "b2", "b3"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3 text-base text-ink">
                <CheckCircle aria-hidden="true" weight="fill" className="mt-0.5 size-5 shrink-0 text-green-600" />
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-8 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <caption className="border-b border-line px-4 py-3 text-left text-sm font-extrabold text-ink">{t("compareTitle")}</caption>
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th scope="col" className="px-4 py-2 font-semibold" />
                  <th scope="col" className="px-4 py-2 font-semibold">
                    <span className="flex items-center gap-1.5 text-navy-800">
                      <GlobeHemisphereEast aria-hidden="true" weight="duotone" className="size-4" />
                      NASA POWER
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    <span className="flex items-center gap-1.5 text-green-800">
                      <Scan aria-hidden="true" weight="duotone" className="size-4" />
                      AgriSpray
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-ink-muted">{row.label}</th>
                    <td className="px-4 py-2.5 text-ink">{row.nasa}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink">{row.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="primary" size="lg">
              <Link href={`/fields/${SAMPLE_FIELD_ID}/spray`}>
                {t("cta")}
                <ArrowRight aria-hidden="true" weight="bold" />
              </Link>
            </Button>
            <p className="flex max-w-sm items-center gap-2 text-xs font-semibold text-amber-700">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-600" />
              {t("status")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
