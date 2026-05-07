---
description: "Use when working on AI Surgical Voice Report backend/frontend, webhook flows, report prompt logic, KB updates, Retell integration, SMTP delivery, React UI, and PostgreSQL settings/KB versioning."
name: "AI Surgical Voice Report Project Rules"
applyTo: "**/*.{js,jsx,ts,tsx,sql,md,json}"
---
# AI Surgical Voice Report - Project Instructions

## Project Overview
This is a medical AI application that converts voice call transcripts into medico-legal operative reports.

## System Architecture
Retell AI (Voice Agent)
-> call ends
-> POST /webhook/call-ended (backend)
-> gptService.js (Perplexity API generates report)
-> emailService.js (sends report via SMTP)

## Tech Stack
- Backend: Node.js + Express
- Frontend: React (being added)
- Database: PostgreSQL (being added for KB storage, settings, versioning)
- AI: Perplexity API (`sonar-pro`) for report generation
- Voice: Retell AI
- Email: Nodemailer (SMTP)

## Key Files and Responsibilities

### routes/webhook.js
- Receives POST from Retell when call ends
- Extracts transcript from `req.body.call.transcript`
- Calls `gptService.generateReport(transcript)`
- Calls `emailService.sendEmail(report, callId)`
- Uses duplicate prevention via `processedCalls` map

### services/gptService.js
- `generateReport(transcript)` is the main export
- `buildSurgicalReportPrompt(transcript)` builds the full prompt
- Prompt is split into:
  - STATIC part (rules + format)
  - DYNAMIC KB part (technique content)
- Uses Perplexity `sonar-pro`

### services/emailService.js
- `sendEmail(report, callId)` is the main export
- Sends HTML email with inline preview
- Attaches report as `.txt`
- Must fail gracefully if SMTP is not configured

### backend/config/knowledge_base.txt (target)
- Stores surgical technique library
- Should be loaded dynamically by `gptService`
- Should be updatable via upload flow and/or DB

## Environment Variables
Required/expected:
- `PORT`
- `WEBHOOK_MAX_PAYLOAD`
- `SAVE_REPORTS_TO_DISK`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_TO`
- `WEBHOOK_SECRET`

Planned additions:
- `DATABASE_URL`
- `RETELL_API_KEY`
- `JWT_SECRET`

## Critical Prompt Rules
- Keep prompt split into STATIC + DYNAMIC KB content
- KB text must not be copied verbatim in generated reports; always use fresh language
- ICD-10 codes are mandatory
- Do not include OR start/end time
- Do not include postoperative plan
- `INDICATION FOR SURGERY` must be separate paragraph(s) per procedure
- Do not hardcode any specific surgeon name in shared/generalized implementations
- Surgeon identity must come from transcript, settings, or explicit config

## Knowledge Base Rules
- Two KBs exist and must stay in sync:
  - Retell KB (voice agent)
  - Report-generation KB (`gptService`/DB)
- Retell KB update flow (target): DELETE old -> POST new -> PATCH agent
- Report KB update flow (target): load current version from PostgreSQL at runtime

## Authentication and Security
- Web UI should be password protected (JWT or session)
- Retell API key must be encrypted at rest in DB
- Never expose secrets in frontend code or responses

## Code Style and Reliability Rules
- Use `async/await` (avoid callbacks)
- Use shared logger, not ad-hoc `console.log` (except intentional full report dumps)
- Webhook must not crash process on downstream failures
- Prefer returning success/ack patterns that avoid voice-platform retries for long processing
- Keep `gptService` and `emailService` as separate concerns

## Frontend Roadmap Constraints
Two pages:
1. Settings page
- Save/connect Retell API key
- Select agent from dropdown

2. Upload KB page
- Upload PDF/Word/TXT
- Update both Retell KB and report-generation KB
- Show KB version and upload history

Supported document parsing targets:
- PDF (`pdf-parse`)
- DOCX (`mammoth`)
- TXT (plain text)

## PostgreSQL Schema (Target)
- `settings`: encrypted API key, selected agent metadata, timestamps
- `knowledge_base`: versioned KB content, filename, agent_id, timestamps

## Implementation Guidance
- Prefer minimal, focused changes over broad refactors
- Keep webhook/report/email pipeline observable with clear logs
- Preserve backward compatibility where feasible during backend/frontend split
- When migrating from root to `/backend` and `/frontend`, keep imports and env handling explicit and testable
