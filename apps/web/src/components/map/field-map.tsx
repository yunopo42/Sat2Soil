"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Polygon } from "@sat2soil/contracts";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { useFormatter } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TerraDraw } from "terra-draw";
import { boundsToPolygon, polygonBounds, powerGridCell } from "@/lib/geo";
import { BASEMAP_LAYERS, MAP_STYLE, SAMPLE_VIEW, type Basemap } from "@/lib/map-config";
import { cn } from "@/lib/cn";

export type DrawTool = "none" | "select" | "polygon" | "rectangle";
export type MapField = { id: string; boundary: Polygon };
/** Map label; pass the top-centre of a field (see labelAnchor) so the pill sits above it. */
export type MapLabel = { id: string; lngLat: [number, number]; title: string; value?: string };

export function labelAnchor(polygon: Polygon): [number, number] {
  const b = polygonBounds(polygon);
  return [(b.west + b.east) / 2, b.north];
}
export type MapFocus = { polygon?: Polygon; center?: [number, number]; zoom?: number; token: number };

const EMPTY = { type: "FeatureCollection" as const, features: [] };
const LIME = "#9be15d";

/**
 * Satellite map for fields (UI_UX_DESIGN S-03). MapLibre owns camera motion; nothing auto-pans.
 * Drawing (terra-draw) keeps one shape at a time and refuses self-intersecting outlines up front;
 * PostGIS validates again on save.
 */
export function FieldMap({
  fields = [],
  labels = [],
  basemap = "nasa",
  gridCellFor = null,
  tool = "none",
  clearToken = 0,
  focus = null,
  fillColor = null,
  onShapeChange,
  ariaLabel,
  className,
  children,
}: {
  fields?: MapField[];
  labels?: MapLabel[];
  basemap?: Basemap;
  gridCellFor?: { lat: number; lon: number } | null;
  tool?: DrawTool;
  clearToken?: number;
  focus?: MapFocus | null;
  /** Tints saved fields uniformly (digital twin). MapLibre fades the paint change itself. */
  fillColor?: string | null;
  onShapeChange?: (polygon: Polygon | null) => void;
  ariaLabel: string;
  className?: string;
  children?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const markerClass = useRef<typeof Marker | null>(null);
  const onShapeRef = useRef(onShapeChange);
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  const format = useFormatter();

  useEffect(() => {
    onShapeRef.current = onShapeChange;
  }, [onShapeChange]);

  // Create the map and the drawing engine once.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      const td = await import("terra-draw");
      const { TerraDrawMapLibreGLAdapter } = await import("terra-draw-maplibre-gl-adapter");
      if (disposed || !container.current) return;

      markerClass.current = maplibre.Marker;
      // Served from /vendor by scripts/copy-maplibre-worker.mjs; the version query busts caches.
      maplibre.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibre.getVersion()}`);
      const map = new maplibre.Map({
        container: container.current,
        style: MAP_STYLE,
        center: SAMPLE_VIEW.center,
        zoom: SAMPLE_VIEW.zoom,
        maxZoom: 17,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");
      map.on("mousemove", (event) => setCursor({ lat: event.lngLat.lat, lon: event.lngLat.lng }));
      map.on("mouseout", () => setCursor(null));
      mapRef.current = map;

      map.on("load", () => {
        if (disposed) return;
        map.addSource("grid", { type: "geojson", data: EMPTY });
        map.addLayer({ id: "grid-fill", type: "fill", source: "grid", paint: { "fill-color": "#ffffff", "fill-opacity": 0.05 } });
        map.addLayer({
          id: "grid-line",
          type: "line",
          source: "grid",
          paint: { "line-color": "#ffffff", "line-width": 1.6, "line-dasharray": [3, 2] },
        });
        map.addSource("fields", { type: "geojson", data: EMPTY });
        map.addLayer({ id: "fields-fill", type: "fill", source: "fields", paint: { "fill-color": "#4b7a22", "fill-opacity": 0.28 } });
        map.addLayer({ id: "fields-line", type: "line", source: "fields", paint: { "line-color": LIME, "line-width": 2.5 } });

        const shapeStyles = {
          fillColor: "#4b7a22",
          fillOpacity: 0.3,
          outlineColor: LIME,
          outlineWidth: 3,
        } as const;
        const draw = new td.TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map }),
          modes: [
            new td.TerraDrawPolygonMode({
              styles: { ...shapeStyles, closingPointColor: "#ffffff", closingPointOutlineColor: "#2f5216", closingPointWidth: 6 },
              validation: (feature) => td.ValidateNotSelfIntersecting(feature),
            }),
            new td.TerraDrawRectangleMode({ styles: shapeStyles }),
            new td.TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    coordinates: { draggable: true, midpoints: true, deletable: true },
                    validation: (feature) => td.ValidateNotSelfIntersecting(feature),
                  },
                },
                rectangle: { feature: { draggable: true, coordinates: { draggable: true } } },
              },
              styles: {
                selectedPolygonColor: "#4b7a22",
                selectedPolygonFillOpacity: 0.32,
                selectedPolygonOutlineColor: LIME,
                selectedPolygonOutlineWidth: 3,
                selectionPointColor: "#ffffff",
                selectionPointOutlineColor: "#2f5216",
                selectionPointWidth: 5,
                midPointColor: LIME,
              },
            }),
          ],
        });
        draw.start();

        const emit = () => {
          const shape = draw.getSnapshot().find((f) => f.geometry.type === "Polygon");
          onShapeRef.current?.(shape ? (shape.geometry as Polygon) : null);
        };
        draw.on("finish", (id) => {
          // Keep exactly one field: the shape that was just finished.
          const others = draw.getSnapshot().filter((f) => f.id !== id).map((f) => f.id as string);
          if (others.length) draw.removeFeatures(others);
          emit();
        });
        draw.on("change", (_ids, type) => {
          // While a polygon is being drawn, every click is an "update" of an unfinished shape:
          // only edits in select mode (moving corners, deleting) count as a changed field.
          if (draw.getMode() === "select" && (type === "update" || type === "delete")) emit();
        });
        drawRef.current = draw;
        setReady(true);
      });
    })();

    return () => {
      disposed = true;
      drawRef.current?.stop();
      drawRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const [key, layers] of Object.entries(BASEMAP_LAYERS)) {
      for (const layer of layers) map.setLayoutProperty(layer, "visibility", key === basemap ? "visible" : "none");
    }
  }, [basemap, ready]);

  // Saved fields
  useEffect(() => {
    const source = mapRef.current?.getSource("fields") as GeoJSONSource | undefined;
    if (!ready || !source) return;
    source.setData({
      type: "FeatureCollection",
      features: fields.map((f) => ({ type: "Feature", id: f.id, properties: {}, geometry: f.boundary })),
    });
  }, [fields, ready]);

  // Uniform tint (one value for the whole field, never a fake within-field pattern)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty("fields-fill", "fill-color", fillColor ?? "#4b7a22");
    map.setPaintProperty("fields-fill", "fill-opacity", fillColor ? 0.62 : 0.28);
  }, [fillColor, ready]);

  // NASA POWER grid cell around a point
  useEffect(() => {
    const source = mapRef.current?.getSource("grid") as GeoJSONSource | undefined;
    if (!ready || !source) return;
    source.setData(
      gridCellFor
        ? { type: "Feature", properties: {}, geometry: boundsToPolygon(powerGridCell(gridCellFor.lat, gridCellFor.lon)) }
        : EMPTY,
    );
  }, [gridCellFor, ready]);

  // Drawing tool
  useEffect(() => {
    const draw = drawRef.current;
    if (!ready || !draw) return;
    draw.setMode(tool === "none" ? "static" : tool);
  }, [tool, ready]);

  useEffect(() => {
    if (!ready || clearToken === 0) return;
    drawRef.current?.clear();
    onShapeRef.current?.(null);
  }, [clearToken, ready]);

  // Labels as HTML markers (no glyph server needed)
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClass.current;
    if (!ready || !map || !MarkerClass) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = labels.map((label) => {
      const element = document.createElement("div");
      element.className =
        "pointer-events-none rounded-md bg-navy-900/85 px-2.5 py-1.5 text-center text-white shadow-float backdrop-blur-sm";
      const title = document.createElement("p");
      title.className = "text-[11px] font-semibold leading-tight";
      title.textContent = label.title;
      element.append(title);
      if (label.value) {
        const value = document.createElement("p");
        value.className = "font-mono text-[13px] font-bold leading-tight";
        value.textContent = label.value;
        element.append(value);
      }
      // Anchored by its bottom edge just above the given point, so small fields stay visible.
      return new MarkerClass({ element, anchor: "bottom", offset: [0, -10] }).setLngLat(label.lngLat).addTo(map);
    });
  }, [labels, ready]);

  // Camera requests
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    if (focus.polygon) {
      const b = polygonBounds(focus.polygon);
      map.fitBounds(
        [
          [b.west, b.south],
          [b.east, b.north],
        ],
        { padding: 64, maxZoom: 16, duration: 900 },
      );
    } else if (focus.center) {
      map.flyTo({ center: focus.center, zoom: focus.zoom ?? 14, duration: 900 });
    }
  }, [focus, ready]);

  return (
    <div className={cn("relative isolate overflow-hidden rounded-xl bg-navy-900", className)}>
      {/* MapLibre sets position: relative on this element, so size it explicitly (not inset-0). */}
      <div ref={container} role="region" aria-label={ariaLabel} className="h-full w-full" />
      {children}
      {cursor ? (
        <p className="pointer-events-none absolute bottom-9 left-2.5 rounded-sm bg-surface/90 px-2 py-0.5 font-mono text-2xs text-ink shadow-card">
          {format.number(cursor.lat, { maximumFractionDigits: 5, minimumFractionDigits: 5 })}°,{" "}
          {format.number(cursor.lon, { maximumFractionDigits: 5, minimumFractionDigits: 5 })}°
        </p>
      ) : null}
    </div>
  );
}
