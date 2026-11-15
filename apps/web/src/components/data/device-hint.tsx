import { ArrowRight } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import device from "../../../public/images/agrispray-device.webp";

/**
 * Where a page states a limit of satellite data, this points to the field measurement that will
 * close it (D-030). It promises a future measurement, never shows one.
 */
export function DeviceHint({ kind, href }: { kind: "soil" | "wind"; href: string }) {
  const t = useTranslations("deviceHint");
  return (
    <aside className="flex items-center gap-4 rounded-xl border border-orange-500/30 bg-orange-200/20 p-4">
      <Image src={device} alt="" sizes="28px" className="h-16 w-auto shrink-0" />
      <p className="flex-1 text-sm text-ink">{t(kind)}</p>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-green-700 hover:underline">
        {t("cta")}
        <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
      </Link>
    </aside>
  );
}
