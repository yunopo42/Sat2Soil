import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { WaterPlanner } from "./water-planner";

export default function WaterPage({ params }: PageProps<"/[locale]/fields/[id]/planning/water">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <WaterPlanner fieldId={id} />
      ))}
    </Suspense>
  );
}
