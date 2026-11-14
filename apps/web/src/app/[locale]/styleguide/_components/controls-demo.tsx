"use client";

import { ArrowClockwise, DownloadSimple, Info, Plus, Trash } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";

export function ButtonsDemo() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Open sample field</Button>
        <Button>Sync NASA data</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">
          <Trash aria-hidden="true" />
          Delete field
        </Button>
        <Button disabled>Saving</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg">
          Start demo
        </Button>
        <Button size="md">
          <ArrowClockwise aria-hidden="true" />
          Refresh
        </Button>
        <Button size="sm">
          <DownloadSimple aria-hidden="true" />
          Export
        </Button>
        <Tooltip content="Add a measurement pin">
          <Button size="sm" variant="ghost" aria-label="Add a measurement pin">
            <Plus aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

export function SelectionDemo() {
  const [planning, setPlanning] = useState<"water" | "rotation">("water");
  const [rain, setRain] = useState<"dry" | "normal" | "wet">("normal");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-6">
        <SegmentedControl
          label="Planning view"
          value={planning}
          onValueChange={setPlanning}
          options={[
            { value: "water", label: "Water" },
            { value: "rotation", label: "Rotation" },
          ]}
        />
        <SegmentedControl
          label="Rainfall scenario"
          value={rain}
          onValueChange={setRain}
          options={[
            { value: "dry", label: "Dry year (P10)" },
            { value: "normal", label: "Normal (P50)" },
            { value: "wet", label: "Wet year (P90)" },
          ]}
        />
      </div>
      <Tabs
        label="AgriSpray views"
        defaultValue="card"
        items={[
          { value: "soil", label: "Soil measurement", content: <TabCopy text="Soil moisture, temperature and EC from the concept device." /> },
          { value: "card", label: "Spray card", content: <TabCopy text="Card photo, segmentation mask and coverage." /> },
          { value: "plant", label: "Plant tracking", content: <TabCopy text="Before / after visual comparison. Not a diagnosis." /> },
        ]}
      />
    </div>
  );
}

function TabCopy({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <Info aria-hidden="true" className="size-4" />
      {text}
    </p>
  );
}

export function FieldsDemo() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Field label="Field name" htmlFor="sg-name" hint="Shown in the field selector.">
        <Input id="sg-name" defaultValue="Çumra sample field" aria-describedby="sg-name-hint" />
      </Field>
      <Field label="Irrigation type" htmlFor="sg-irrigation">
        <Select id="sg-irrigation" defaultValue="rainfed">
          <option value="rainfed">Rainfed</option>
          <option value="drip">Drip</option>
          <option value="sprinkler">Sprinkler</option>
          <option value="pivot">Center pivot</option>
        </Select>
      </Field>
      <Field
        label="Sowing date"
        htmlFor="sg-sowing"
        error="Pick a date inside the 2025–2026 season."
      >
        <Input id="sg-sowing" defaultValue="2027-03-01" aria-invalid="true" aria-describedby="sg-sowing-error" />
      </Field>
    </div>
  );
}
