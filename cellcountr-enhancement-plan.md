# Cellcountr Enhancement Plan & Specification

## Current State

Cellcountr is a Django 3.2 web application for differential white blood cell counting during haematological blood film analysis. The frontend is jQuery 1.11 + D3 v3, server-rendered via Django templates. The counting logic is entirely client-side JavaScript; the server provides cell type definitions, keyboard config persistence, and session analytics.

The app is deployed at cellcountr.com and runs locally via `python manage.py runserver` with SQLite and in-memory caching.

---

## Enhancement 1: Monocytic Lineage Cell Types

### Goal

Add three new cell types to support the monocytic differentiation lineage, and rename the existing "monocyte" to "mature monocyte" for clarity.

### New Cell Types

| Cell Type | Machine-Readable Name | Abbreviation | Key | Display Colour | Notes |
|---|---|---|---|---|---|
| Monoblast | `monoblast` | monobl | J | TBD | Earliest monocytic precursor |
| Promonocyte | `promonocyte` | promono | H | TBD | Intermediate precursor |
| Immature monocyte | `immature_monocyte` | imm_mono | G | TBD | Late precursor |

### Rename

- Current: "Monocyte" (key F) → New: "Mature monocyte", abbreviation: "mono" (stays on key F)
- The `CellType` model's `machine_name` should change from `monocyte` to `mature_monocyte`
- All references in default keyboard layouts (`cc_kapi/defaults.py`) must be updated
- The API response for `/api/cell_types/` will reflect the new name

### Display Order

The new monocytic types should be grouped together in the display order, positioned near the existing mature monocyte. Suggested ordering within the monocytic block:

1. Monoblast
2. Promonocyte
3. Immature monocyte
4. Mature monocyte

### Keyboard Layout Changes

The following changes apply to the default desktop and mobile keyboard layouts in `cc_kapi/defaults.py`:

| Key | Current Assignment | New Assignment |
|---|---|---|
| Y | (unassigned) | Lymphoblast (moved from G) |
| F | Monocyte (ID 10) | Mature monocyte (renamed, same record) |
| G | Lymphoblast (ID 13) | Immature monocyte (new) |
| H | (unassigned) | Promonocyte (new) |
| J | (unassigned) | Monoblast (new) |

This groups the monocytic lineage on adjacent keys (F, G, H, J) for ergonomic access. Lymphoblast moves from G to Y to make room.

**Current full keyboard layout for reference:**

| Key | Cell Type (current) |
|---|---|
| Q | Neutrophils |
| W | Metamyelocytes |
| E | Myelocytes |
| R | Promyelocytes |
| T | Blasts |
| A | Erythroid |
| S | Lymphocytes |
| D | Plasma cells |
| F | Monocytes |
| G | Lymphoblasts |
| Z | Eosinophils |
| X | Basophils |
| C | Other |

### Implementation Notes

- New `CellType` records are added via a Django data migration, not fixtures, so existing deployments pick them up automatically on `migrate`.
- The rename of "monocyte" to "mature monocyte" should also be a data migration (update existing row, don't delete and recreate, to preserve foreign key references).
- Default keyboard layouts need to be reviewed: the three new types need default key assignments. This may require expanding the keyboard layout or making some less common types unassigned by default.
- The `SimilarLookingGroup` model should be reviewed to see if new cross-references are needed (monoblast vs myeloblast, promonocyte vs promyelocyte, etc.).
- Colours for the new types should be visually distinct from existing types and from each other, while remaining accessible. Suggest selecting from a monocytic colour family (e.g., purples/magentas) to provide visual lineage grouping in charts.

### Open Questions

- Should the `CellImage` gallery include reference images for the new types at launch, or can those be added later?
- Are there any other monocytic lineage stages to consider (e.g., promonocyte I vs II)?

---

## Enhancement 2: Preset Cell Type Groups

### Goal

Provide preset groupings that automatically sum individual cell counts into clinically meaningful aggregates. These appear alongside (not replacing) individual counts, addressing the common workflow where lab information systems only accept aggregate values.

### Preset Groups

#### Group 1: Myeloid Lineage (excl blasts)

This group sums all myeloid precursor cell types. The definition must be transparent to users so they understand exactly which cells are included.

| Included Cell Types |
|---|
| Promyelocyte |
| Myelocyte |
| Metamyelocyte |
| Neutrophils |
| Eosinophils |
| Basophils |
| Immature monocyte |
| Mature monocyte |

(Note: blasts, monoblasts, and promonocytes are excluded from this group as they belong to the Blast Equivalents group. No overlap between groups.)

#### Group 2: Blast Equivalents

Per the user's specification, this group captures the earliest precursor forms relevant to blast quantification.

| Included Cell Types |
|---|
| Myeloblast (existing, currently named "blast") |
| Monoblast (new) |
| Promonocyte (new) |

### UI Behaviour

- Group totals are displayed alongside individual cell counts in the results panel, clearly labelled and visually distinguished (e.g., in a separate section or with a different background).
- Group totals update live as the user counts, just like individual counts.
- Each group shows its name, the total count, the percentage of total cells counted, and a tooltip or expandable detail listing which cell types are included (transparency requirement).
- Groups do not have their own keyboard shortcuts; they are computed aggregates only.

### Data Model Consideration

Groups can be defined as a simple configuration object in the frontend (since they are preset and computed client-side). No new Django models are strictly required for preset groups. The configuration maps a group name to a list of `CellType` machine names:

```
PRESET_GROUPS = {
    "myeloid_lineage_excl_blasts": {
        "label": "Myeloid Lineage (excl blasts)",
        "members": ["promyelocytes", "myelocytes", "metamyelocytes", "neutrophils", "eosinophils", "basophils", "immature_monocyte", "mature_monocyte"]
    },
    "blast_equivalents": {
        "label": "Blast Equivalents",
        "members": ["blast", "monoblast", "promonocyte"]
    }
}
```

If this configuration is kept in the frontend JS, it can be updated without a deployment. If it needs to be server-managed (for future custom groups), it would require a new model.

### Future: Custom Groups (Separate Feature)

User-defined groups where the user picks which cell types roll up into a named group. This is out of scope for this phase but the preset group implementation should be designed so that custom groups can reuse the same rendering and computation logic. The main additions for custom groups would be:

- A UI for creating/editing group definitions
- Persistence (localStorage or server-side if the user has an account)
- Validation (a cell type can belong to multiple groups; groups can overlap)

---

## Enhancement 3: Stacked Bar Chart Option

### Goal

Give users a choice between the existing doughnut/pie chart and a vertical stacked bar/column chart for visualising their count distribution.

### Behaviour

- A toggle control (e.g., segmented button or icon toggle) lets the user switch between "Doughnut" and "Bar" views.
- The selected chart type persists across page refreshes (localStorage).
- Both chart types update live as the user counts (this is a key feature users value).
- The stacked bar chart uses the same colour mapping as the doughnut chart for consistency.

### Stacked Bar Chart Specification

- Single vertical bar representing the total count, segmented by cell type.
- Each segment's height is proportional to that cell type's count.
- Segments are coloured using the existing `CellType.colour` values.
- Labels appear on hover (tooltip) showing cell type name, count, and percentage.
- Cell types with zero count are omitted from the bar.
- The bar should have a clean, minimal design consistent with the existing UI.
- Consider whether preset group boundaries should be visually indicated on the bar (e.g., a subtle bracket or separator).

### Implementation Notes

- The current visualisation code is in `visualise.js` (103 lines, D3 v3). The chart type toggle would be added here.
- Given the architectural review recommendation to replace D3 v3 with Chart.js, this enhancement is a natural point to make that switch. Chart.js has built-in support for both doughnut and stacked bar charts with a simpler API.
- If D3 is retained, the stacked bar uses `d3.stack()` (D3 v7) or manual rectangle positioning (D3 v3).

---

## Phased Delivery Plan

### Phase 1: Data Foundation (Estimated: 1 week)

**Goal:** Add new cell types and rename existing monocyte. No UI changes beyond what the existing counter automatically picks up from the API.

Tasks:

- Write Django data migration to add monoblast, promonocyte, and immature monocyte `CellType` records with appropriate display order and colours.
- Write Django data migration to rename "monocyte" to "mature monocyte" (update `display_name` and `machine_name` on existing record).
- Update default keyboard layouts in `cc_kapi/defaults.py` to include key assignments for the three new types.
- Update `SimilarLookingGroup` entries if appropriate cross-references exist.
- Update any hardcoded cell type references in tests.
- Run full test suite (`python manage.py test` and `npm test`) to confirm nothing breaks.

**Deliverable:** The counter page shows the new cell types and the renamed monocyte. Counting works for all types. No other UI changes.

### Phase 2: Preset Groups (Estimated: 1-2 weeks)

**Goal:** Display live-updating aggregate counts for Total Myeloid Precursors and Blast Equivalents alongside individual counts.

Tasks:

- Define the preset group configuration (JS object mapping group names to member cell types).
- Extend the results display in `counter.js` / results module to compute and render group totals.
- Add a visually distinct section in the results panel for group totals.
- Add transparency UI: tooltip or expandable detail showing which cell types are in each group.
- Ensure group totals update live on each keystroke, matching the existing real-time count behaviour.
- Write JavaScript tests for group computation logic.
- Design the data structure so that future custom groups can plug into the same rendering pipeline.

**Deliverable:** Users see "Myeloid Lineage (excl blasts): X (Y%)" and "Blast Equivalents: X (Y%)" alongside their individual counts, updating live.

### Phase 3: Chart Enhancement (Estimated: 1-2 weeks)

**Goal:** Add stacked bar chart option alongside existing doughnut chart.

Tasks:

- Add chart type toggle UI to the visualisation area.
- Implement stacked bar chart (either by upgrading D3 to v7 and adding the bar chart, or by migrating to Chart.js which supports both chart types natively).
- Ensure live update behaviour works for both chart types.
- Persist chart type preference in localStorage.
- Ensure colour consistency between chart types.
- Test with various count distributions (all one type, evenly spread, many types with small counts, etc.).

**Deliverable:** Users can toggle between doughnut and stacked bar charts. Both update live. Preference is remembered.

### Phase 4: Quick Wins & Stabilisation (Estimated: 1 week)

**Goal:** Address the most impactful items from the architectural review without a full rewrite.

Tasks:

- Add localStorage persistence for counting session state (so a page refresh doesn't lose work).
- Add localStorage fallback for keyboard config (works without login).
- Remove r2d3.min.js (IE8/9 polyfill, no longer needed).
- If Chart.js was adopted in Phase 3, remove D3 v3 dependency entirely.
- Upgrade Django from 3.2 to latest LTS (currently 5.2).
- Run full regression testing.

**Deliverable:** More resilient user experience (counts survive refresh), reduced tech debt, current Django version.

### Phase 5 (Future): Offline & Standalone

**Goal:** Make the counter work without a server connection.

This phase builds on the architectural review findings that the counter is already functionally client-side. Scope includes:

- Extract the counter as a standalone Vite-built bundle.
- Bake cell type definitions and preset group configs into the bundle.
- Add a Service Worker for offline caching (PWA).
- Add Web App Manifest for "Add to Home Screen" on mobile.
- Keep the Django API as an optional backend for keyboard sync and the image gallery.

This phase is documented here for planning purposes but is not part of the immediate enhancement work.

---

## Dependencies Between Phases

- Phase 2 depends on Phase 1 (preset groups reference the new cell types).
- Phase 3 is independent of Phases 1 and 2 (chart changes don't depend on new cell types or groups, though groups may optionally be reflected in the chart).
- Phase 4 is independent but best done after Phases 1-3 to avoid merge conflicts.
- Phase 5 depends on all prior phases being stable.

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Renaming monocyte breaks existing user keyboard configs | Users with saved keyboards referencing old cell type ID lose that mapping | Data migration must update `KeyMap` entries that reference the old `CellType` record. Since we're updating the record in-place (not deleting), foreign keys remain valid. Only the display name changes. |
| D3 v3 to Chart.js migration introduces visual regressions | Chart looks different, users notice | Keep D3 v3 doughnut as fallback during development. Only remove after Chart.js version is validated. |
| New cell types crowd the keyboard layout | Not enough keys for all types on default keyboard | Audit current defaults. Some rarely-used types can be unassigned by default. Users can customise. |
| localStorage data gets out of sync with server | User sees stale keyboard config | localStorage is a fallback/cache, not source of truth. Server data wins when available. Clear strategy for conflict resolution needed in Phase 4. |

---

## Out of Scope (For Now)

- Custom user-defined groups (future feature, designed for but not built)
- Per-cell-type breakdown in statistics/analytics
- Full SPA rewrite (Svelte or otherwise)
- Tauri/Electron desktop packaging
- Mobile-specific UI redesign
- Image gallery enhancements
