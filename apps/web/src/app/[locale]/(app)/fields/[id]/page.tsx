import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { FieldOverview } from "./field-overview";

export default function FieldPage({ params }: PageProps<"/[locale]/fields/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <FieldOverview fieldId={id} />
      ))}
    </Suspense>
  );
}
