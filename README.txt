AMS Dashboard V2.11.13 — Reports & Analytics Drill-down (STAGING)

Base: V2.11.12. Frontend-only change. Worker unchanged.
- Clickable KPI cards on Analysis and Error History
- History date range 7/30/90/all, search and filters
- Top 10 recurring stations, station timeline, CSV export
- Historical data uses existing embedded ERROR_HISTORY only. This is NOT live event history.
- No backfill, no counting refreshes as events. Date filtering by error START.
- Browser Daily Record remains localStorage; no central persistence added.
- No change to network API, contract, alarm, authentication, or Station Tools.

Test on staging first. Historical data completeness/freshness depends on the source ERROR_HISTORY embedded in the existing HTML. For central real-time history, a backend event-store is needed.
