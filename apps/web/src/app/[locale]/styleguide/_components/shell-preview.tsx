"use client";

import { useState } from "react";
import { SourceBadge } from "@/components/data/source-badge";
import { AppSidebar, type NavKey } from "@/components/shell/app-sidebar";
import { FieldSelector } from "@/components/shell/field-selector";
import { NasaStatusPill } from "@/components/shell/nasa-status-pill";
import { TopBar } from "@/components/shell/top-bar";
import { Skeleton } from "@/components/ui/state-panel";

/** Desktop app shell in a frame. Clicking the sidebar moves the indicator without navigating. */
export function ShellPreview() {
  const [active, setActive] = useState<NavKey>("water");

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-bg">
      <TopBar
        field={<FieldSelector name="Konya Ovası · Örnek Parsel" detail="5,0 ha" sample />}
        nasaStatus={<NasaStatusPill state="live" time="14:02" />}
      />
      <div className="flex h-[560px]">
        <AppSidebar fieldBase="/fields/sample" active={active} onSelect={setActive} />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-56" />
            <SourceBadge source="demo_sample" />
          </div>
          <div className="grid flex-1 grid-cols-3 gap-4">
            <Skeleton className="h-full rounded-lg" />
            <Skeleton className="h-full rounded-lg" />
            <Skeleton className="h-full rounded-lg" />
          </div>
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
