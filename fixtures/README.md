# WF02 response fixtures

These files were captured from the real production webhook on 2026-10-10:

- `chat_turn1.json`, `chat_turn2.json`: sequential chat calls for the same session; turn 2 receives turn 1's `requirements_state`.
- `report.json`: report action using the state from turn 2.
- `invalid_request.json`: chat action without `session_id`.
- `response-statuses.json`: observed HTTP status for each response.
- `production_not_active.json`: earlier response from before WF02 was activated.

`backend/test/fixtures.test.js` checks the response contract, state merge, requirement-code uniqueness, invalid request behavior, and PDF/DOCX export using the captured report.
