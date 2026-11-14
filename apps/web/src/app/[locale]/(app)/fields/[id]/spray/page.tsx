import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { AgriSprayView } from "./agrispray-view";

export default function SprayPage({ params }: PageProps<"/[locale]/fields/[id]/spray">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <AgriSprayView fieldId={id} />
      ))}
    </Suspense>
  );
}
