# BA Chatbot API contract

The browser talks only to Express (`/api`). Express owns MySQL persistence and is the only service that calls n8n. `requirements_state` is server-owned, never returned to or accepted from the browser.

## Shared enums

Stages observed from WF02: `BUSINESS_GOAL`, `STAKEHOLDER`. The UI also has display labels for the workflow stages previously specified (`SCOPE`, `FUNCTIONAL`, `NON_FUNCTIONAL`, `DONE`); keep raw values unchanged when forwarding to n8n.

Requirement statuses used for display: `CONFIRMED`, `PENDING_CONFIRMATION`, `CONFLICT`. Sources: `USER_CONFIRMED`, `DOCUMENT_CONFIRMED`, `INFERRED`.

## Frontend ↔ Backend

| Route                                       | Request                               | Response                                                                                         |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /api/sessions`                        | empty                                 | `{ session_id, project_id, progress }`                                                           |
| `GET /api/sessions/:sessionId`              | —                                     | `{ session_id, project_id, progress, messages[] }`                                               |
| `GET /api/sessions/:sessionId/requirements` | —                                     | `{ requirements: [{ code, category, content, source, status, confidence }] }`                    |
| `POST /api/chat`                            | `{ session_id, message }`             | `{ message: { role, content, created_at }, suggestions[], progress, new_requirements[], error }` |
| `POST /api/documents`                       | multipart fields `file`, `project_id` | `{ document_id, document_name, success, message }`                                               |
| `POST /api/sessions/:sessionId/report`      | `{ format: "pdf"                      | "docx" }`                                                                                        | `{ report_id, format, download_url, warning }` |
| `GET /api/reports/:reportId/download`       | —                                     | Report file bytes                                                                                |

The chat endpoint fetches MySQL state and the latest 20 messages. It commits the user and assistant messages, new requirements, and session state in one transaction only when n8n returns both `success: true` and `persist: true`. A failed n8n result is mapped to a safe DTO and does not update stored state. Session writes include the current `version` in the update predicate.

## Backend ↔ n8n

Base URL comes from `N8N_BASE_URL`; the configured value includes `/webhook` (or `/webhook-test` while testing). Calls are `POST` requests to `ba-chat` and `ba-ingest`.

Chat payload:

```json
{
  "action": "chat",
  "session_id": "uuid",
  "project_id": "default",
  "message": "...",
  "requirements_state": null,
  "history": [{ "role": "user", "content": "..." }]
}
```

The captured WF02 response has `next_question` as `{ question, suggestions[] }`; the validator also tolerates a string or `null` for compatibility. Required chat fields are `success`, `persist`, `response`, `suggestions`, `next_question`, `new_requirements`, `requirements_state`, `completion`, and `ready_for_report`; `stage` is present at the top level in the captured response. The backend rejects a chat response that does not match these fields. Requirement rows accept `code` or `requirement_code`, plus `category`, `content`, `source`, `status`, `confidence`, `actor`, and `evidence`.

WF01 receives the binary file as multipart field `data` (the exact `binaryPropertyName` configured on its Webhook node), plus `project_id`, `document_id`, and `document_name`. The exported WF01 parser only accepts TXT/MD text with fenced lowercase ```json blocks containing `question_id` and `question_text_vi`; Express validates this and injects the three metadata fields into every chunk so WF02's `metadata.project_id` filter can find the rows. PDF/DOCX/CSV extraction is not present in the supplied workflow export.

Report payload: `{ "action": "report", "session_id", "project_id", "requirements_state" }`. The captured WF02 report response has `success: true`, `action`, `session_id`, `completion`, `html`, and `markdown`. Express passes that content to the PHP export worker: mPDF creates Vietnamese-capable PDF, and PhpWord converts the HTML body to DOCX. Files are stored in `backend/storage/reports/`, recorded in `ba_report`, and downloaded through the API. Direct HTML/Markdown formats remain available to API clients.

## Change procedure

Update this file and `frontend/src/types.ts` together when changing frontend DTOs. Change n8n mapping only in `backend/src/services/n8nClient.js` and `backend/src/services/chatService.js` / controllers. Never add the n8n URL to Vite environment variables.
