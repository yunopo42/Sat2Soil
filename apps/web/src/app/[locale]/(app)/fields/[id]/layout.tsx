import { Suspense } from "react";
import { Skeleton } from "@/components/ui/state-panel";
import { FieldShell } from "./field-shell";

// The field id is runtime data under cacheComponents: it is read inside <Suspense> so the
// rest of the page can still be prerendered as a static shell (Next.js dynamic-routes docs).
export default function FieldLayout({ children, params }: LayoutProps<"/[locale]/fields/[id]">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      {params.then(({ id }) => (
        <FieldShell fieldId={id}>{children}</FieldShell>
      ))}
    </Suspense>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh">
      <div className="h-16 border-b border-line" />
      <div className="flex gap-8 px-8 py-8">
        <Skeleton className="hidden h-96 w-60 lg:block" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  );
}
