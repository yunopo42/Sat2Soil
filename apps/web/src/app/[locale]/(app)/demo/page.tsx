import { getTranslations } from "next-intl/server";
import { NasaSourcesStrip } from "@/components/data/nasa-sources-strip";
import { TopBar } from "@/components/shell/top-bar";
import { PageHeader } from "@/components/ui/page-header";
import { FieldPicker } from "./field-picker";

/** Field selection / map (approved design P02, UI_UX_DESIGN S-02/S-03). No login. */
export default async function DemoPage() {
  const t = await getTranslations("demo");

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pb-10 lg:px-8">
        <PageHeader title={t("title")} description={t("description")} banner />
        <FieldPicker />
        <NasaSourcesStrip />
      </main>
    </div>
  );
}
