# DLMM Auto Scan Workflow

1. Operator wakes every SCAN_INTERVAL_MINUTES.
2. Operator checks paused state.
3. Operator calls Screening Agent.
4. Screening Agent fetches Meteora pools.
5. Screening Agent filters bad pools.
6. Screening Agent scores candidates locally.
7. Screening Agent returns top 3-5 pools.
8. Operator skips Claude when there are no candidates.
9. Operator calls Claude Analyst only for shortlisted pools.
10. Claude Analyst returns compact JSON.
11. Operator validates confidence threshold.
12. Operator sends Telegram alerts.
13. Operator saves scan and analysis to SQLite.
14. Operator creates paper positions if PAPER_TRADING=true.
15. Real deposits remain disabled in version 1.
