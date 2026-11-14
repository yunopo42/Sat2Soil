import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { ClimateCenter } from "./climate-center";

export default function ClimatePage({ params }: PageProps<"/[locale]/fields/[id]/climate">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <ClimateCenter fieldId={id} />
      ))}
    </Suspense>
  );
}
