import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { RotationPlanner } from "./rotation-planner";

export default function RotationPage({ params }: PageProps<"/[locale]/fields/[id]/planning/rotation">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <RotationPlanner fieldId={id} />
      ))}
    </Suspense>
  );
}
