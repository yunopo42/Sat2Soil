"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppSidebar, AppTabs } from "@/components/shell/app-sidebar";
import { DemoTour } from "@/components/shell/demo-tour";
import { FieldSelector } from "@/components/shell/field-selector";
import { NasaStatusPill } from "@/components/shell/nasa-status-pill";
import { TopBar } from "@/components/shell/top-bar";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/state-panel";
import { Link } from "@/i18n/navigation";
import { ApiError, fetchField, fetchFieldPower } from "@/lib/api";

export const fieldQuery = (id: string) => ({ queryKey: ["field", id], queryFn: () => fetchField(id) });
export const powerQuery = (id: string) => ({ queryKey: ["power", id, "365d"], queryFn: () => fetchFieldPower(id) });

/** App shell for one field: top bar (field, NASA status), sidebar, content. */
export function FieldShell({ fieldId, children }: { fieldId: string; children: ReactNode }) {
  const t = useTranslations("field");
  const tStates = useTranslations("states");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const field = useQuery({ ...fieldQuery(fieldId), retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1 });
  const power = useQuery({ ...powerQuery(fieldId), enabled: field.isSuccess });
  const base = `/fields/${fieldId}`;

  const fetched = power.data ? new Date(power.data.provenance.fetched_at) : null;
  const status = power.data ? (power.data.source_type === "live_nasa" ? "live" : "cached") : "never";

  return (
    <div className="min-h-dvh">
      <TopBar
        field={
          field.data ? (
            <FieldSelector
              name={field.data.name}
              detail={`${format.number(field.data.area_ha, { maximumFractionDigits: 1 })} ha`}
              sample={field.data.is_sample}
            />
          ) : field.isPending ? (
            <Skeleton className="h-10 w-56 rounded-full" />
          ) : null
        }
        nasaStatus={
          <NasaStatusPill
            state={status}
            time={fetched ? format.dateTime(fetched, { hour: "2-digit", minute: "2-digit" }) : undefined}
          />
        }
        summaryHref={`${base}/summary`}
      />
      <div className="mx-auto flex max-w-[1520px]">
        <AppSidebar fieldBase={base} className="sticky top-16 hidden h-[calc(100dvh-4rem)] overflow-y-auto lg:flex print:hidden" />
        <main className="min-w-0 flex-1 px-4 pb-14 lg:px-8">
          <div className="pt-4 lg:hidden print:hidden">
            <AppTabs fieldBase={base} />
          </div>
          {field.isError ? (
            <div className="mx-auto max-w-xl py-20">
              <Banner
                variant={field.error instanceof ApiError && field.error.status === 404 ? "info" : "error"}
                title={
                  field.error instanceof ApiError && field.error.status === 404 ? t("notFound") : tStates("apiErrorTitle")
                }
                action={
                  <Button asChild size="sm">
                    <Link href="/demo">{tCommon("backHome")}</Link>
                  </Button>
                }
              >
                {field.error instanceof ApiError && field.error.status === 404 ? null : tStates("apiErrorBody")}
              </Banner>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <DemoTour fieldBase={base} />
    </div>
  );
}
