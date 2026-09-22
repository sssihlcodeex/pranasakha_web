# PRANASAKHA Mobile UI Refresh

This package preserves the existing server/API and application routes. The refresh is UI-only and adds a phone-first responsive layer at widths up to 820px.

## What changed
- Converted authenticated role dashboards into an app-like mobile shell with a sticky top app bar, touch-friendly controls, rounded cards, and persistent bottom navigation.
- Kept the existing sidebar as a mobile bottom-sheet for secondary/overflow destinations.
- Made dense tables horizontally scrollable instead of crushing columns.
- Converted dashboard grids and toolbars to a single-column mobile rhythm.
- Increased mobile form controls to comfortable touch sizes and 16px text to avoid browser zoom behavior on inputs.
- Added a lightweight `manifest.webmanifest` so the web UI can be installed as a standalone portrait app on supported devices.
- Kept all API calls, authentication, database files, server routes, and existing role functionality untouched.

## Visual direction
The mobile layer uses soft white cards, restrained shadows, pill/rounded controls, an emerald/teal service accent, and a bottom navigation pattern tailored to healthcare/service workflows.
