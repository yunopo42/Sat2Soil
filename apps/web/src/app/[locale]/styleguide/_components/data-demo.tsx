"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { MetricCard } from "@/components/data/metric-card";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { samplePrecipitation, sampleScenario, sampleTemperature, SAMPLE_TODAY } from "@/lib/sample-data";

const SAMPLE_NOTE = ["SYNTHETIC SAMPLE", "not NASA data", "style guide only"];

const METHOD = (
  <ol className="list-decimal space-y-1.5 pl-4">
    <li>Daily NASA POWER values for the grid cell around the field (parameter and units above).</li>
    <li>Reference evapotranspiration ET₀ with FAO-56 Penman–Monteith.</li>
    <li>Crop water demand ETc = Kc × ET₀ for the crop stage of each day.</li>
    <li>Climatic water balance = rainfall − ETc. Soil storage and groundwater are not modelled.</li>
  </ol>
);

const SCENARIO_VALUES = {
  dry: { rain: 168.4, demand: 548.2, cover: 31 },
  normal: { rain: 212.6, demand: 517.9, cover: 41 },
  wet: { rain: 281.0, demand: 489.5, cover: 57 },
} as const;

export function MetricsDemo() {
  const [scenario, setScenario] = useState<keyof typeof SCENARIO_VALUES>("normal");
  const values = SCENARIO_VALUES[scenario];

  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        label="Rainfall scenario"
        value={scenario}
        onValueChange={setScenario}
        options={[
          { value: "dry", label: "Dry (P10)" },
          { value: "normal", label: "Normal (P50)" },
          { value: "wet", label: "Wet (P90)" },
        ]}
      />
      <RevealGroup className="grid gap-4 md:grid-cols-3">
        <RevealItem>
          <MetricCard
            label="Season rainfall"
            value={values.rain}
            fractionDigits={1}
            unit="mm"
            source="demo_sample"
            provenance={SAMPLE_NOTE}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            label="Crop water demand (ETc)"
            value={values.demand}
            fractionDigits={1}
            unit="mm"
            source="derived_indicator"
            provenance={["FAO-56", "Kc winter wheat", "sample inputs"]}
            method={METHOD}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            label="Demand covered by rainfall"
            value={values.cover}
            unit="%"
            source="scenario_estimate"
            note="Not an irrigation prescription."
            provenance={["scenario", "sample inputs"]}
          />
        </RevealItem>
      </RevealGroup>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Wind at 2 m"
          value={null}
          unit="m/s"
          source="live_nasa"
          provenance={["WS2M", "m/s", "no value for this day (−999)"]}
        />
        <MetricCard
          label="Soil moisture"
          value={31.4}
          fractionDigits={1}
          unit="%"
          source="simulated_device"
          provenance={["SAT2SOIL_CONCEPT_01", "14 Nov 2026 12:00"]}
        />
        <MetricCard
          label="Field area"
          value={42.6}
          fractionDigits={1}
          unit="ha"
          source="manual_user"
          note="426 dönüm"
          provenance={["drawn boundary", "EPSG:4326", "area via PostGIS (phase 3)"]}
        />
      </div>
    </div>
  );
}

export function ChartsDemo() {
  const [replay, setReplay] = useState(0);
  const temperature = useMemo(() => sampleTemperature(), []);
  const precipitation = useMemo(() => samplePrecipitation(), []);
  const scenario = useMemo(() => sampleScenario(), []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button size="sm" onClick={() => setReplay((n) => n + 1)}>
          <ArrowCounterClockwise aria-hidden="true" />
          Replay chart reveal
        </Button>
      </div>
      <div key={replay} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Daily air temperature"
            description="Mean with the daily min–max range"
            aside={<SourceBadge source="demo_sample" />}
          />
          <CardBody>
            <LineChart
              label="Sample daily air temperature, November to November, with min–max band."
              unit="°C"
              series={[
                { id: "t2m", label: "Mean", tone: "observed", points: temperature.mean, band: temperature.band },
              ]}
            />
          </CardBody>
          <ProvenanceFooter items={["T2M · T2M_MIN · T2M_MAX", "°C", "daily", ...SAMPLE_NOTE]} />
        </Card>
        <Card>
          <CardHeader
            title="Daily precipitation"
            description="Bars per day, running total on the right axis"
            aside={<SourceBadge source="demo_sample" />}
          />
          <CardBody>
            <BarChart
              label="Sample daily precipitation with cumulative total."
              unit="mm/day"
              points={precipitation}
              cumulative={{ label: "Cumulative", unit: "mm" }}
            />
          </CardBody>
          <ProvenanceFooter items={["PRECTOTCORR", "mm/day", "daily", ...SAMPLE_NOTE]} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Soil water balance"
            description="Observed until today, then the median scenario with its P10–P90 range"
            aside={
              <>
                <SourceBadge source="demo_sample" />
                <SourceBadge source="scenario_estimate" />
              </>
            }
          />
          <CardBody>
            <LineChart
              label="Sample soil water balance: observed line until today, dashed scenario after."
              unit="mm"
              height={260}
              fractionDigits={0}
              markers={[{ t: SAMPLE_TODAY, label: "Today" }]}
              series={[
                { id: "observed", label: "Observed", tone: "observed", points: scenario.observed },
                { id: "scenario", label: "Scenario P50", tone: "scenario", points: scenario.scenario, band: scenario.band },
              ]}
            />
          </CardBody>
          <ProvenanceFooter items={["weekly", "P10–P90 from rainfall history", ...SAMPLE_NOTE]} method={METHOD} />
        </Card>
      </div>
    </div>
  );
}
