# Context Handoff

This reference documents patterns for passing context between agents.

## Why Context Handoff?

Agents operate independently. They cannot:
- Read each other's memory
- Access conversation history
- Share state directly

Context handoff via documentation ensures:
- All agents have needed information
- Future sessions have context
- Decisions are traceable

## Handoff Mechanisms

### 1. AGENTS.md (Primary)

The main handoff document. Contains:
- What each agent discovered
- What the next agent should know
- Explicit next steps

**Format:**

```markdown
## Context Handoff

### From a1 to a4

**Discovered:** Summary of findings

**Key files:**
- src/auth/middleware.ts (extension point)
- src/auth/providers/ (provider pattern)

**Next steps:**
1. Follow existing provider pattern
2. Add OAuth config to middleware
```

### 2. RESEARCH.md (For Research Findings)

Long-form research context. Contains:
- Detailed SOTA findings
- Decision rationale
- References and sources

**Use when:**
- Research agent completed investigation
- Implementation agent needs background
- Future sessions need context

### 3. PLAN.md (For Task Context)

Task-specific context. Contains:
- Task requirements
- Acceptance criteria
- Dependencies

**Use when:**
- Handing off implementation tasks
- Documenting blockers
- Tracking progress

### 4. Code Comments (For Implementation Details)

Inline context. Use when:
- Implementation has non-obvious decisions
- Future maintenance needs explanation
- Pattern should be followed elsewhere

**Format:**

```typescript
// OAuth implementation follows existing provider pattern.
// See src/auth/providers/local.ts for reference.
// Decision rationale in RESEARCH.md#oauth-decision
```

## Handoff Patterns

### Pattern 1: Research → Implementation

Research agent completes, implementation agent starts.

**Handoff content:**
- Key findings summary
- Recommended approach
- Libraries and versions
- Security considerations

**Example:**

```markdown
### From research-agent to implement-agent

**Discovered:**
Auth.js v5 is recommended. Use PKCE for all flows.
Google OAuth has best documentation.

**Configuration:**
- Install: @auth/core @auth/sveltekit
- Callback: /api/auth/callback/google

**Security:**
- Enable PKCE
- Use httpOnly cookies
- Set SameSite=Lax

**Next steps:**
1. npm install @auth/core @auth/sveltekit
2. Create src/hooks.server.ts with Auth.js config
3. Add Google provider configuration
```

### Pattern 2: Exploration → Design

Exploration agent completes, design decision needed.

**Handoff content:**
- Code structure findings
- Existing patterns
- Extension points
- Constraints discovered

**Example:**

```markdown
### From explore-agent to design-agent

**Discovered:**
Existing auth uses session-based pattern.
Middleware at src/auth/middleware.ts.
Providers export authenticate() and getUser().

**Patterns found:**
- Provider interface in src/auth/types.ts
- Config in src/auth/config.ts
- Tests in tests/auth/

**Constraints:**
- Must maintain backward compatibility
- Session table has user_id foreign key

**Decision needed:**
How to integrate OAuth without breaking existing sessions?
```

### Pattern 3: Parallel → Synthesis

Multiple agents complete, results need combining.

**Handoff content:**
- Each agent's findings
- Conflicts or overlaps
- Synthesis needed

**Example:**

```markdown
### From a1, a2, a3 to synthesis-agent

**Agent a1 (Frontend):**
- Uses React Query for data
- Has useAuth hook
- Needs provider wrapper

**Agent a2 (Backend):**
- Express with JWT middleware
- Redis session store
- Rate limiting on /auth routes

**Agent a3 (Infrastructure):**
- Deployed on Vercel
- Edge functions for API
- Need environment variables

**Conflicts:**
- a1 expects cookies, a2 uses JWT headers
- Need to align token handling

**Synthesis needed:**
Design unified auth flow across frontend/backend.
```

## Context Checklist

Before handoff, ensure:

- [ ] Summary is self-contained (no implicit knowledge)
- [ ] File paths are specific
- [ ] Decisions include rationale
- [ ] Next steps are actionable
- [ ] Questions are explicit

## Anti-Patterns

### Bad: Implicit Context

```markdown
**Discovered:** Use the usual pattern.
**Next steps:** You know what to do.
```

### Good: Explicit Context

```markdown
**Discovered:** Use provider pattern in src/auth/providers/.
Each provider exports authenticate(req) and getUser(session).
See local.ts for reference implementation.

**Next steps:**
1. Create src/auth/providers/google.ts
2. Export authenticate and getUser functions
3. Add provider to config in src/auth/config.ts
```

### Bad: Missing Rationale

```markdown
**Decision:** Use Auth.js
```

### Good: With Rationale

```markdown
**Decision:** Use Auth.js v5

**Rationale:**
- Well-maintained (1M+ weekly downloads)
- SvelteKit adapter available
- Built-in PKCE support
- Active security updates

**Alternatives considered:**
- Lucia: Simpler but less features
- Custom: More work, more risk
```

## Notes

- Prefer explicit over implicit
- Include file paths when relevant
- Document decisions with rationale
- Make next steps actionable
- Update AGENTS.md as work progresses
