import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { SummaryView } from "./summary-view";

export default function SummaryPage({ params }: PageProps<"/[locale]/fields/[id]/summary">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <SummaryView fieldId={id} />
      ))}
    </Suspense>
  );
}
