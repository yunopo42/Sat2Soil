import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { TwinView } from "./twin-view";

export default function TwinPage({ params }: PageProps<"/[locale]/fields/[id]/twin">) {
  return (
    <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
      {params.then(({ id }) => (
        <TwinView fieldId={id} />
      ))}
    </Suspense>
  );
}
