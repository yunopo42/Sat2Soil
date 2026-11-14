import { ArrowLeft, HourglassMedium } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/state-panel";
import { Link } from "@/i18n/navigation";
import type { NavKey } from "./app-sidebar";

/** Placeholder for sections whose phase has not started, so no sidebar item leads to a 404. */
export function ComingSoon({ params, section, phase }: { params: Promise<{ id: string }>; section: NavKey; phase: number }) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-64 w-full" />}>
      {params.then(({ id }) => (
        <ComingSoonBody fieldId={id} section={section} phase={phase} />
      ))}
    </Suspense>
  );
}

function ComingSoonBody({ fieldId, section, phase }: { fieldId: string; section: NavKey; phase: number }) {
  const tNav = useTranslations("nav");
  const t = useTranslations("comingSoon");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={tNav(section)} />
      <Card className="max-w-2xl">
        <div className="flex items-start gap-4 p-6">
          <HourglassMedium aria-hidden="true" weight="duotone" className="size-8 shrink-0 text-green-600" />
          <div>
            <p className="text-base text-ink">{t("body", { phase })}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href={`/fields/${fieldId}`}>
                <ArrowLeft aria-hidden="true" />
                {t("back")}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
