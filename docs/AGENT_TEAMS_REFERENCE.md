# Agent Teams Master Reference Guide

> Coordinate multiple Claude Code instances working together as a team, with shared tasks, inter-agent messaging, and centralized management.

**Requires:** Claude Code v2.1.32+. Check with `claude --version`.

---

## Table of Contents

1. [Enable Agent Teams](#1-enable-agent-teams)
2. [When to Use Agent Teams vs Subagents](#2-when-to-use-agent-teams-vs-subagents)
3. [Starting a Team](#3-starting-a-team)
4. [Architecture](#4-architecture)
5. [Controlling Your Team](#5-controlling-your-team)
6. [Display Modes](#6-display-modes)
7. [Task Management](#7-task-management)
8. [Communication Patterns](#8-communication-patterns)
9. [Quality Gates with Hooks](#9-quality-gates-with-hooks)
10. [Subagent Configuration](#10-subagent-configuration-for-teammates)
11. [Best Practices](#11-best-practices)
12. [Use Case Playbooks](#12-use-case-playbooks)
13. [Troubleshooting](#13-troubleshooting)
14. [Known Limitations](#14-known-limitations)

---

## 1. Enable Agent Teams

Agent teams are **experimental** and disabled by default. Enable via settings:

```json
// .claude/settings.local.json (per-project, gitignored)
// OR ~/.claude/settings.json (global)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or export in your shell:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## 2. When to Use Agent Teams vs Subagents

### Agent Teams Are Best For

- **Research and review**: multiple teammates investigate different aspects simultaneously, share and challenge findings
- **New modules or features**: teammates each own a separate piece without stepping on each other
- **Debugging with competing hypotheses**: test different theories in parallel, converge faster
- **Cross-layer coordination**: changes spanning frontend, backend, and tests, each owned by a different teammate

### Subagents Are Best For

- Focused tasks where only the result matters
- Quick research/verification within your session
- Tasks that don't need inter-agent communication
- Lower token cost (results summarized back to main context)

### Comparison Table

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| **Context** | Own context; results return to caller | Own context; fully independent |
| **Communication** | Report results back to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work requiring discussion |
| **Token cost** | Lower: results summarized back | Higher: each teammate is separate instance |
| **Nesting** | Cannot spawn other subagents | Cannot spawn nested teams |

**Rule of thumb:** Use subagents when workers report back. Use agent teams when workers need to talk to each other.

---

## 3. Starting a Team

Tell Claude to create a team in natural language. Describe the task and team structure:

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles:
one teammate on UX, one on technical architecture, one playing devil's advocate.
```

Claude will:
1. Create a team with a shared task list
2. Spawn teammates for each perspective
3. Have them explore the problem
4. Synthesize findings
5. Clean up when finished

### Specifying Teammates and Models

```text
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Requiring Plan Approval

For complex or risky tasks, require teammates to plan before implementing:

```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

When a teammate finishes planning, it sends a plan approval request to the lead. The lead reviews and either approves or rejects with feedback. Rejected teammates stay in plan mode, revise, and resubmit.

Influence the lead's judgment with criteria:
```text
Only approve plans that include test coverage.
Reject plans that modify the database schema.
```

---

## 4. Architecture

An agent team consists of four components:

| Component | Role |
|-----------|------|
| **Team Lead** | Main Claude Code session that creates the team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances that each work on assigned tasks |
| **Task List** | Shared list of work items that teammates claim and complete |
| **Mailbox** | Messaging system for communication between agents |

### Storage Locations

- **Team config:** `~/.claude/teams/{team-name}/config.json`
- **Task list:** `~/.claude/tasks/{team-name}/`

The team config contains a `members` array with each teammate's name, agent ID, and agent type. Teammates can read this file to discover other team members.

### Permissions

- Teammates start with the lead's permission settings
- If lead runs with `--dangerously-skip-permissions`, all teammates do too
- After spawning, individual teammate modes can be changed
- Cannot set per-teammate modes at spawn time

### Context and Communication

Each teammate:
- Has its own context window
- Loads the same project context as a regular session (CLAUDE.md, MCP servers, skills)
- Receives the spawn prompt from the lead
- Does NOT inherit the lead's conversation history

**Information sharing mechanisms:**
- **Automatic message delivery**: messages delivered automatically to recipients
- **Idle notifications**: teammates notify the lead when they finish
- **Shared task list**: all agents see task status and claim available work

**Messaging types:**
- `message`: send to one specific teammate
- `broadcast`: send to all teammates simultaneously (use sparingly -- costs scale with team size)

---

## 5. Controlling Your Team

All control is via natural language to the lead.

### Talk to Teammates Directly

**In-process mode:**
- `Shift+Down`: cycle through teammates
- Type to send them a message
- `Enter`: view a teammate's session
- `Escape`: interrupt their current turn
- `Ctrl+T`: toggle the task list

**Split-pane mode:**
- Click into a teammate's pane to interact directly

### Shut Down a Teammate

```text
Ask the researcher teammate to shut down
```

The lead sends a shutdown request. The teammate can approve (exits gracefully) or reject with explanation.

### Clean Up the Team

```text
Clean up the team
```

**Important:**
- Always use the lead to clean up (not teammates)
- Shut down all teammates first (cleanup fails if any are running)
- Teammates should not run cleanup (their team context may not resolve correctly)

---

## 6. Display Modes

| Mode | Description | Requirements |
|------|-------------|--------------|
| **in-process** (default) | All teammates run inside main terminal. Use `Shift+Down` to cycle. | Any terminal |
| **split panes** | Each teammate gets own pane. Click to interact. | tmux or iTerm2 |
| **auto** (default setting) | Uses split panes if in tmux, otherwise in-process | - |

### Configure Display Mode

In settings.json:
```json
{
  "teammateMode": "in-process"
}
```

Or per-session:
```bash
claude --teammate-mode in-process
```

### Split Pane Setup

- **tmux**: install via package manager. `tmux -CC` in iTerm2 is recommended.
- **iTerm2**: install `it2` CLI, enable Python API in Settings > General > Magic

**Note:** Split panes NOT supported in VS Code integrated terminal, Windows Terminal, or Ghostty.

---

## 7. Task Management

Tasks have three states: **pending**, **in progress**, **completed**.

Tasks can have dependencies: a pending task with unresolved dependencies cannot be claimed until those dependencies are completed.

### Assignment Models

- **Lead assigns**: tell the lead which task to give to which teammate
- **Self-claim**: after finishing a task, teammates pick up the next unassigned, unblocked task

Task claiming uses **file locking** to prevent race conditions.

### Dependency Resolution

When a teammate completes a task that other tasks depend on, blocked tasks unblock automatically without manual intervention.

### Sizing Tasks

- **Too small**: coordination overhead exceeds the benefit
- **Too large**: teammates work too long without check-ins
- **Just right**: self-contained units that produce a clear deliverable (a function, a test file, a review)
- **Target**: 5-6 tasks per teammate keeps everyone productive

---

## 8. Communication Patterns

### Lead-to-Teammate

The lead creates tasks, assigns work, approves plans, and synthesizes results.

### Teammate-to-Teammate

Teammates can message each other directly (unlike subagents which only report back to the caller).

### Broadcast

Send to all teammates simultaneously. Use sparingly as costs scale with team size.

### Idle Notifications

When a teammate finishes and stops, they automatically notify the lead.

---

## 9. Quality Gates with Hooks

Two hook events are specifically designed for agent teams:

### TeammateIdle Hook

Runs when a teammate is about to go idle after finishing its turn.

**Input (JSON via stdin):**
```json
{
  "session_id": "abc123",
  "hook_event_name": "TeammateIdle",
  "teammate_name": "researcher",
  "team_name": "my-project"
}
```

**Decision control:**
- **Exit code 2**: teammate receives stderr message as feedback and continues working
- **JSON `{"continue": false, "stopReason": "..."}`**: stops the teammate entirely

**Example -- require build artifact:**
```bash
#!/bin/bash
if [ ! -f "./dist/output.js" ]; then
  echo "Build artifact missing. Run the build before stopping." >&2
  exit 2
fi
exit 0
```

### TaskCompleted Hook

Runs when a task is being marked as completed (either explicitly via TaskUpdate tool, or when a teammate finishes its turn with in-progress tasks).

**Input (JSON via stdin):**
```json
{
  "session_id": "abc123",
  "hook_event_name": "TaskCompleted",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**Decision control:**
- **Exit code 2**: task NOT marked completed, stderr fed back as feedback
- **JSON `{"continue": false, "stopReason": "..."}`**: stops the teammate

**Example -- require passing tests:**
```bash
#!/bin/bash
INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

if ! npm test 2>&1; then
  echo "Tests not passing. Fix failing tests before completing: $TASK_SUBJECT" >&2
  exit 2
fi
exit 0
```

### Configure Hooks in settings.json

```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/check-quality-gate.sh"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/validate-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 10. Subagent Configuration (For Teammates)

Teammates are essentially specialized subagents. Understanding subagent configuration helps build better teams.

### Subagent File Format

Markdown files with YAML frontmatter, stored in:

| Location | Scope | Priority |
|----------|-------|----------|
| `--agents` CLI flag | Current session | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All projects | 3 |
| Plugin `agents/` dir | Where plugin enabled | 4 (lowest) |

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this agent |
| `tools` | No | Allowlist of tools (inherits all if omitted) |
| `disallowedTools` | No | Tools to deny (removed from inherited list) |
| `model` | No | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stopping |
| `skills` | No | Skills to preload into context |
| `mcpServers` | No | MCP servers for this agent |
| `hooks` | No | Lifecycle hooks scoped to this agent |
| `memory` | No | Persistent memory: `user`, `project`, `local` |
| `background` | No | `true` to always run as background task |
| `effort` | No | `low`, `medium`, `high`, `max` (Opus 4.6 only) |
| `isolation` | No | `worktree` for isolated git worktree |

### Example Subagent File

```markdown
---
name: code-reviewer
description: Expert code review specialist. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
---

You are a senior code reviewer ensuring high standards of code quality.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code clarity and readability
- Proper error handling
- No exposed secrets
- Good test coverage

Provide feedback by priority: Critical > Warnings > Suggestions
```

### Scoping MCP Servers to Subagents

```yaml
---
name: browser-tester
description: Tests features using Playwright
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github  # reuses already-configured server
---
```

### Persistent Memory

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Learnings apply across all projects |
| `project` | `.claude/agent-memory/<name>/` | Knowledge is project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not in VCS |

When enabled, the agent's system prompt includes instructions for reading/writing to the memory directory, and the first 200 lines of `MEMORY.md` are included.

---

## 11. Best Practices

### Give Teammates Enough Context

Teammates don't inherit the lead's conversation history. Include task-specific details in spawn prompts:

```text
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### Choose Appropriate Team Size

- **3-5 teammates** for most workflows
- **5-6 tasks per teammate** keeps everyone productive
- Token costs scale linearly with team size
- Three focused teammates often outperform five scattered ones
- Scale up only when work genuinely benefits from parallelism

### Avoid File Conflicts

Two teammates editing the same file leads to overwrites. Break work so each teammate owns different files.

### Monitor and Steer

Check in on progress, redirect approaches that aren't working, synthesize findings as they come in. Unattended teams risk wasted effort.

### Wait for Teammates

If the lead starts implementing tasks itself:
```text
Wait for your teammates to complete their tasks before proceeding
```

### Start with Research and Review

If new to agent teams, start with non-code tasks: reviewing a PR, researching a library, investigating a bug. These show parallel exploration value without coordination challenges.

---

## 12. Use Case Playbooks

### Parallel Code Review

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

**Why it works:** Each reviewer applies a different filter to the same PR. The lead synthesizes findings across all three.

### Competing Hypotheses Debugging

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk
to each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

**Why it works:** The debate structure fights anchoring bias. Multiple independent investigators trying to disprove each other means the surviving theory is more likely correct.

### Cross-Layer Feature Implementation

```text
Create an agent team to implement the user notification system:
- One teammate owns the database schema and API endpoints
- One teammate owns the frontend components and state management
- One teammate owns the test suite
They should coordinate on interfaces but work independently on implementation.
```

### Documentation Audit

```text
Create a team to audit our documentation:
- One teammate checks API docs against actual endpoints
- One teammate reviews README accuracy
- One teammate verifies code examples compile and run
Report inconsistencies with severity ratings.
```

---

## 13. Troubleshooting

### Teammates Not Appearing

- In in-process mode, press `Shift+Down` to cycle (they may be running but not visible)
- Check that the task was complex enough to warrant a team
- For split panes, verify tmux is installed: `which tmux`
- For iTerm2, verify `it2` CLI and Python API are enabled

### Too Many Permission Prompts

Pre-approve common operations in permission settings before spawning teammates:
```json
{
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(git:*)", "Read", "Glob", "Grep"]
  }
}
```

### Teammates Stopping on Errors

- Check output via `Shift+Down` (in-process) or click pane (split)
- Give additional instructions directly
- Spawn a replacement teammate

### Lead Shuts Down Early

```text
Wait for all teammates to finish before proceeding.
```

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

### Task Status Lag

Teammates sometimes fail to mark tasks completed, blocking dependent tasks. Manually update or tell the lead to nudge the teammate.

---

## 14. Known Limitations

| Limitation | Details |
|------------|---------|
| **No session resumption** | `/resume` and `/rewind` do not restore in-process teammates. Tell lead to spawn new ones after resuming. |
| **Task status lag** | Teammates may not mark tasks complete, blocking dependents. Manually nudge. |
| **Slow shutdown** | Teammates finish current request/tool call before shutting down. |
| **One team per session** | Clean up current team before starting a new one. |
| **No nested teams** | Teammates cannot spawn their own teams. Only lead manages. |
| **Fixed lead** | The creating session is lead for life. Cannot promote or transfer. |
| **Permissions at spawn** | All teammates start with lead's mode. Change individually after. |
| **Split panes limited** | Not supported in VS Code terminal, Windows Terminal, or Ghostty. |

**Note:** CLAUDE.md works normally -- teammates read it from their working directory.

---

## Quick Reference Card

```
Enable:     settings.json → env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"
Navigate:   Shift+Down (cycle teammates), Ctrl+T (task list)
Interrupt:  Enter (view session) → Escape (interrupt turn)
Clean up:   "Clean up the team" (via lead only, after shutting down teammates)

Hook events:  TeammateIdle, TaskCompleted
Exit code 2:  Reject and send feedback (teammate continues working)

Team size:    3-5 teammates, 5-6 tasks each
Token cost:   Scales linearly with teammates
Key rule:     Each teammate owns different files (no shared edits)
```
