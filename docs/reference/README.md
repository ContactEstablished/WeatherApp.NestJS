# Source-app reference materials

Vendored, read-only snapshots from the original **Nimbus Weather** app (the Vue/.NET app being
cloned onto Angular + NestJS + PostgreSQL). These are the canonical sources the rewrite lifts from.
Do not edit them to "improve" them — they are a fixed reference; if the source app changes, re-snapshot.

## `weather.ts`
Byte-for-byte copy of the source app's `src/WeatherApp.Client/src/types/weather.ts`
(from `C:\Projects\ContactEstablished\WeatherApp.VUE`), snapshotted 2026-06-20.

This is the **canonical, byte-for-byte source for Phase 1 / Task 1-1** (lift the nine §0.3 response
interfaces into `libs/shared-types`). Use this file, not the §0.3 code block in `docs/RoadMap.md`.

> **Note — it differs from RoadMap §0.3 in two non-semantic ways.** §0.3 claims to be "byte-for-byte
> from weather.ts," but it is not quite: (1) §0.3 adds inline doc comments (e.g. `// "F" | "C"`,
> `// ISO date`) that the real file does **not** have; (2) §0.3 hoists `UnitSystem` to the top, whereas
> the real file declares it near the end (after `LocationSuggestion`). Field names, types, and
> optionality (including `id?: number | null`) are identical. The lift should follow this real file.
