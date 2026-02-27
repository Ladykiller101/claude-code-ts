# AIFred

Turn n8n workflows into production web apps. First product: viral video reverse engineering tool.

## Commands

```bash
npm run dev     # Start dev server at localhost:3000
npm run build   # Production build
npm run lint    # Run ESLint
```

## Architecture

```
User → Next.js Frontend → n8n Webhook → Analysis → Video Gen → Callback → Frontend
```

**Stack:**
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind v4
- **Backend:** n8n Cloud (`teamdialloai.app.n8n.cloud`)
- **Database:** Supabase (Postgres + Auth + Realtime)
- **AI Pipeline:** Gemini 2.5 Pro (analysis) → GPT-5-mini (prompt) → Kling 2.6 (video)

## n8n Integration

**Primary Workflow:** `reverse engineering V3`

**Webhook:**
```
POST https://teamdialloai.app.n8n.cloud/webhook/5ce4d7c8-65f7-455a-a630-d4758bb1a231
Content-Type: application/json

{
  "Instagram Ad Link": "https://instagram.com/p/...",
  "language": "English",
  "personalisation": "",
  "email": "user@example.com",
  "callback_url": "https://your-app.com/webhook" // optional
}
```

**Flow:**
1. Scrape video via Apify (Instagram/TikTok)
2. Download video file
3. Extract key frame at 1-second mark (ffmpeg)
4. Upload frame to Cloudinary (get public URL)
5. Analyze with Gemini 2.5 Pro (forensic video deconstruction)
6. Generate optimized prompt with GPT-5-mini (social media expert agent)
7. Create video with Kling 2.6 **image-to-video** API (frame + prompt)
8. Poll for completion (10s intervals)
9. Send results via Gmail (video link + analysis report)
10. Optional callback with video URL

**Email includes:**
- Download link to generated video
- Complete analysis report from Gemini
- Optimized prompt used for generation

**Callback payload (if callback_url provided):**
```json
{
  "job_id": "task_kling-2.6_...",
  "status": "completed",
  "progress_message": "Your video is ready!",
  "video_url": "https://output.kie.ai/video.mp4"
}
```

## Project Structure

```
src/
├── app/              # App Router pages and layouts
├── components/       # React components
├── lib/              # API clients, utilities
└── types/            # TypeScript interfaces

workflows/            # n8n workflow JSON exports
.planning/            # PROJECT.md, research docs
```

## Deployment

```
Local → GitHub → Vercel (auto-deploy)
```

**Setup Steps:**
1. Create GitHub repo
2. Connect Vercel to repo
3. Add environment variables in Vercel dashboard

**Required Env Vars:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
N8N_WEBHOOK_URL=https://teamdialloai.app.n8n.cloud/webhook/5ce4d7c8-65f7-455a-a630-d4758bb1a231
```

## Available Tools

**MCPs (configured in .mcp.json):**
- `teamdialloai` - Direct n8n Cloud instance access (workflows, executions, credentials)
- `github` - Commits, PRs, repo management

**Skills:**
- **n8n Skills:**
  - `/n8n-workflow-patterns` - Proven workflow architectures
  - `/n8n-code-javascript` - Code node patterns
  - `/n8n-code-python` - Python code patterns
  - `/n8n-expression-syntax` - Expression validation
  - `/n8n-validation-expert` - Debug validation errors
  - `/n8n-node-configuration` - Node configuration guidance
  - `/n8n-mcp-tools-expert` - MCP tools usage
- **Base44 Skills:**
  - `/base44-sdk` - Base44 application development
  - `/base44-cli` - Base44 CLI operations
- **Design:**
  - `/frontend-design` - Production-grade UI design
- **GSD (Get Shit Done):**
  - `/gsd:help` - Show all GSD commands
  - `/gsd:new-project` - Initialize new project with context
  - `/gsd:create-roadmap` - Create phase-based roadmap
  - `/gsd:plan-phase` - Plan detailed execution for a phase
  - `/gsd:execute-phase` - Execute phase plans
  - `/gsd:progress` - Check project progress

## Key Files

| File | Purpose |
|------|---------|
| `workflows/reverse-engineering-v3-fixed.json` | **✅ FIXED** - Use this version |
| `workflows/reverse-engineering-v3.json` | Original (broken) |
| `fix_workflow.py` | Python script used to fix workflow |
| `.planning/PROJECT.md` | Feature requirements & scope |
| `.mcp.json` | MCP server configuration |

## Workflow Setup Requirements

Before using the workflow, configure these in n8n:

**Required Credentials:**
1. **Apify API** - For video scraping (Instagram/TikTok)
2. **Google Gemini API** - For video analysis
3. **OpenAI API** - GPT-5-mini for prompt optimization
4. **KIE AI API** - Kling 2.6 video generation
5. **Cloudinary API** - Frame storage (free tier: 25GB)
6. **Gmail OAuth** - Email delivery

**Setup Steps:**
1. Import `workflows/reverse-engineering-v3-fixed.json` into n8n
2. Configure all credentials listed above
3. Update credential IDs in workflow:
   - `CLOUDINARY_CRED_ID` → your Cloudinary credential ID
   - `GMAIL_CRED_ID` → your Gmail credential ID
4. Test with test Instagram URL

## Workflow Optimization Checklist

Before connecting a workflow to the frontend:
- [ ] Webhook trigger accepts required input fields
- [ ] Input validation handles missing/malformed data
- [ ] Callback URL parameter for async response
- [ ] Error handling returns structured error JSON
- [ ] CORS headers configured for frontend domain
