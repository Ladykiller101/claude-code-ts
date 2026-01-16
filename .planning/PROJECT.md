# AIFred

## What This Is

AIFred is an AI-powered tool that reverse-engineers Instagram video ads and generates improved versions using AI video generation. Users paste an Instagram URL, receive detailed analysis of what makes the ad work, then get an AI-generated improved video. Target users are small business owners and marketing agencies.

## Core Value

Paste an Instagram video URL → Get actionable analysis + an AI-generated improved video. The analysis-to-generation pipeline must work end-to-end.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User authentication (email/password + Google OAuth via Supabase)
- [ ] Analysis form: Instagram URL input, language dropdown, optional personalization field
- [ ] Job submission triggers n8n workflow via HTTP webhook
- [ ] Real-time job status updates via Supabase Realtime
- [ ] Job detail view showing: original video metadata, analysis result (markdown), generated video
- [ ] Dashboard showing job history with status badges
- [ ] In-app notification popup when video generation completes
- [ ] Email notification via Resend when video is ready
- [ ] n8n webhook endpoint to receive status updates from workflow
- [ ] Download button for generated videos

### Out of Scope

- TikTok support — n8n workflow has it but not exposing in MVP UI
- Payment/credits system — post-MVP
- Multiple video variations — post-MVP
- Team/agency features — post-MVP
- Video editor for prompt tweaking — post-MVP
- Rate limiting — not needed for MVP
- Browser extension — future enhancement

## Context

**Existing Assets:**
- Next.js 15 project (App Router) already initialized with TypeScript and Tailwind CSS v4
- n8n workflow exists (`reverse engineering V2.json`) handling Instagram scraping, Gemini analysis, GPT prompt optimization, KIE AI video generation
- n8n hosted on n8n Cloud with existing credentials for Apify, Gemini, OpenAI, KIE AI
- Resend account ready with API key

**Tech Stack:**
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Database: Supabase (Postgres) — needs setup
- Auth: Supabase Auth (email/password + Google OAuth)
- Realtime: Supabase Realtime for job status updates
- Email: Resend
- Business Logic: n8n Cloud (workflow exists)
- AI: Gemini 2.5 Pro (analysis), GPT-5-mini (prompt optimization), KIE AI/Sora 2 Pro (video generation)
- Scraping: Apify (Instagram)

**UI Components:**
- User will provide Base44 components during implementation
- Fallback to shadcn/ui if needed

## Constraints

- **Database**: Must use Supabase with Row Level Security policies
- **Auth**: Supabase Auth only (no custom auth)
- **n8n Integration**: HTTP webhooks (not MCP), workflow already exists
- **Video Storage**: KIE AI URLs may expire; MVP accepts this limitation (future: store in Supabase Storage)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + database + realtime | Single provider for all data needs, built-in RLS | — Pending |
| HTTP webhooks for n8n (not MCP) | User preference, simpler architecture | — Pending |
| Skip TikTok in MVP | Focus on Instagram first, reduce scope | — Pending |
| Base44 components with shadcn/ui fallback | User has Base44 components, but flexible if needed | — Pending |

---
*Last updated: 2025-01-16 after initialization*
