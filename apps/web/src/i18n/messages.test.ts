import { describe, expect, it } from "vitest";
import { DATA_SOURCES } from "@sat2soil/contracts";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";
import { routing } from "./routing";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafValues(value: unknown): unknown[] {
  if (value === null || typeof value !== "object") return [value];
  return Object.values(value as Record<string, unknown>).flatMap(leafValues);
}

describe("message catalogues", () => {
  it("covers exactly the configured locales, English first", () => {
    expect(routing.locales).toEqual(["en", "tr"]);
    expect(routing.defaultLocale).toBe("en");
  });

  it("defines the same keys in en and tr", () => {
    expect(leafPaths(tr).sort()).toEqual(leafPaths(en).sort());
  });

  it("has no empty strings", () => {
    for (const catalogue of [en, tr]) {
      for (const text of leafValues(catalogue)) {
        expect(typeof text === "string" && text.trim().length > 0).toBe(true);
      }
    }
  });

  it("labels every data source in every locale (D-001)", () => {
    for (const source of DATA_SOURCES) {
      expect(en.dataSource[source]).toBeTruthy();
      expect(tr.dataSource[source]).toBeTruthy();
    }
    expect(Object.keys(en.dataSource).sort()).toEqual([...DATA_SOURCES].sort());
  });
});
