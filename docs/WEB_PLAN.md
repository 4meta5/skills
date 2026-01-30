# Skills Platform: Web + SaaS Plan

## Quick Summary

Build a website and optional cloud services for the Claude Code Skills Platform.

**Core Question**: Open source the CLI/library, monetize through hosted services?

---

## Part 1: Open Source Decision

### The Case FOR Open Sourcing (Strong)

| Factor | Why It Matters |
|--------|----------------|
| **Trust** | A CLI with hooks into Claude responses needs transparency. Devs want to audit it. |
| **Adoption** | Lower barrier. `npm i -g @4meta5/skills-cli` beats "sign up first" |
| **Network effects** | Skills are community-driven. Open source = more contributors = more skills |
| **Target audience** | Claude Code users are developers. They prefer open source tooling. |
| **Precedent** | Prettier, ESLint, Husky, Git are all open source. Money comes from services. |
| **Competition defense** | If Anthropic builds similar, open source = you've already won mindshare |

### The Case AGAINST (Weak)

| Factor | Counter-argument |
|--------|------------------|
| Harder to monetize | False. Open core works. GitLab, Hashicorp, Elastic all do it. |
| Competitors can fork | They can, but community follows the original. |
| Loss of control | Semantic versioning + governance solves this. |

### Recommended: Open Core Model

```
OPEN SOURCE (MIT)              PAID SERVICES
─────────────────              ─────────────
skills-cli                     Cloud dashboard
skills-library                 Team sync
Skill format spec              Analytics
Bundled skills                 Enterprise SSO
Website/docs                   Premium support
Community skills (GitHub)      Hosted semantic search
```

**Where the money comes from:**
- Individual devs: Free forever (CLI + community skills)
- Power users: $9/mo for dashboard + analytics
- Teams: $29/user/mo for sync + collaboration
- Enterprise: Custom pricing for SSO, audit, support

This is exactly how Git/GitHub, Terraform/Terraform Cloud, and VS Code/Copilot work.

### If Open Source: What Changes?

1. **Repository**: Keep everything in one monorepo (skills-cli, skills-library, skills-web)
2. **Skills**: Community skills live in GitHub repos, not a proprietary registry
3. **Marketplace**: Becomes a discovery layer over GitHub, not a walled garden
4. **Monetization**: Shifts from "pay for tool" to "pay for convenience at scale"

---

## Part 2: What We're Building

### Already Built (skills-library + skills-cli)

| Component | Status | Description |
|-----------|--------|-------------|
| Skill loading | Done | YAML frontmatter parsing, multi-location discovery |
| CLI commands | Done | scan, add, list, show, remove, init, source, update, hook |
| Project analysis | Done | Detects languages, frameworks, DBs, testing tools |
| Skill matching | Done | Maps tech stack to relevant skills |
| Semantic routing | Partial | Keyword + embedding similarity scoring |

### To Build (Website + Services)

| Component | Priority | Description |
|-----------|----------|-------------|
| Landing page | P0 | Marketing, waitlist signup |
| Documentation | P0 | CLI reference, skill format spec, tutorials |
| Skill browser | P1 | Search/filter skills, view details |
| Cloud dashboard | P2 | Project tracking, installed skills |
| Team sync | P3 | Shared skills across team projects |
| Analytics | P3 | Skill usage statistics |
| Payments | P3 | Subscription management |

---

## Part 3: Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | SvelteKit 5 | Runes, SSR, dogfooding our own skills |
| UI | shadcn-svelte | Tailwind v4, copy-paste components |
| Database | Turso | Edge SQLite, simple, fast |
| Auth | Lucia | Self-hosted, session-based |
| Payments | Lemon Squeezy | Tax compliance, Merchant of Record |
| Hosting | Cloudflare Pages | Edge deployment, free tier |
| Docs | MDX or Markdoc | Markdown with components |

---

## Part 4: Site Structure

```
/                     Landing page
/docs                 Documentation
  /getting-started    Quick start guide
  /cli                CLI command reference
  /skills             SKILL.md format spec
  /routing            Semantic routing explained
/skills               Skill browser/marketplace
  /[name]             Individual skill page
/pricing              Pricing tiers (if monetizing)
/blog                 Updates and tutorials
/dashboard            Authenticated area (P2)
  /projects           User's projects
  /settings           Account settings
```

---

## Part 5: Implementation Phases

### Phase 1: Marketing + Docs (Week 1-2)

**Goal**: Get the project visible, collect interest

- [ ] Create SvelteKit 5 project in `packages/skills-web`
- [ ] Landing page with hero, features, value props
- [ ] Waitlist form (Turso or just a Google Form)
- [ ] Getting started documentation
- [ ] CLI command reference
- [ ] SKILL.md format specification
- [ ] Deploy to Cloudflare Pages

### Phase 2: Skill Browser (Week 3-4)

**Goal**: Make skills discoverable

- [ ] List all bundled skills
- [ ] Category filtering
- [ ] Search (keyword, later semantic)
- [ ] Individual skill pages with content
- [ ] Link to GitHub for community skills

### Phase 3: Cloud Features (Week 5-8)

**Goal**: Add value beyond CLI (optional, for monetization)

- [ ] Authentication with Lucia
- [ ] Project tracking dashboard
- [ ] Installed skills management
- [ ] Basic analytics
- [ ] Team features (shared skills)

### Phase 4: Monetization (Week 9-12)

**Goal**: Revenue (if going paid route)

- [ ] Lemon Squeezy integration
- [ ] Subscription tiers
- [ ] Billing management
- [ ] Usage tracking

---

## Part 6: Pricing (If Monetizing)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | CLI, all open source skills, local only |
| Pro | $9/mo | Cloud dashboard, analytics, 5 projects |
| Team | $29/user/mo | Team sync, shared skills, unlimited projects |
| Enterprise | Custom | SSO, audit logs, support SLA |

**Key insight**: Free tier is fully functional. Paid tiers add convenience, not core functionality.

---

## Part 7: Open Questions

1. ~~**Open source or not?**~~ Decided: Yes, MIT license.
2. ~~**Separate repo or monorepo?**~~ Decided: Monorepo.
3. **When to launch?** After docs are solid, dashboard not required for MVP.
4. **Pricing from day 1?** Or free first, paid later? (Recommend free first)

---

## Part 8: Success Metrics

### If Open Source
- GitHub stars
- npm downloads
- Community skill contributions
- Discord/community engagement

### If Monetizing
- Waitlist signups
- Free to paid conversion (target: 5%)
- MRR growth
- Churn rate

---

## Part 9: Risks

| Risk | Mitigation |
|------|------------|
| Anthropic builds similar | Open source = community loyalty |
| No one contributes skills | Seed with quality bundled skills |
| Low conversion to paid | Keep free tier genuinely useful |
| Support burden | Good docs, community forum |

---

## Decision Log

| Decision | Choice | Date | Rationale |
|----------|--------|------|-----------|
| Open source? | **Yes (MIT)** | 2025-01-30 | Trust, adoption, network effects, precedent |
| Repo structure | Monorepo | 2025-01-30 | Keep CLI, library, and web together |
| MVP scope | Docs + landing | - | Build audience first |
| Monetization | Open core | 2025-01-30 | CLI free, hosted services paid |

---

## Resources

- [Svelte 5 Runes](https://svelte.dev/docs/svelte/v5-migration-guide)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Lucia Auth](https://lucia-auth.com/)
- [Turso](https://turso.tech/)
- [Lemon Squeezy](https://www.lemonsqueezy.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)

---

## Part 10: Publishing to npm

Publish when ready for others to install via `npm install`.

### Prerequisites

1. npm account (you have: `4meta5`)
2. Logged in: `npm whoami` returns your username
3. Build passes: `npm run build`
4. Tests pass: `npm test`

### Publish Order

Library first, then CLI. The CLI depends on the library.

```bash
# 1. Build everything
npm run build

# 2. Publish library
cd packages/skills-library
npm publish --access public

# 3. Update CLI dependency (change * to actual version)
cd ../skills-cli
# Edit package.json: "@4meta5/skills": "^1.0.0"

# 4. Publish CLI
npm publish --access public
```

### Why `--access public`?

Scoped packages (`@4meta5/...`) default to private. Private packages require a paid npm plan. `--access public` makes them free.

### Version Bumping

Before each publish, bump the version:

```bash
npm version patch  # 1.0.0 → 1.0.1 (bug fixes)
npm version minor  # 1.0.0 → 1.1.0 (new features)
npm version major  # 1.0.0 → 2.0.0 (breaking changes)
```

### Verify Publication

```bash
# Check it exists
npm view @4meta5/skills
npm view @4meta5/skills-cli

# Test install
npx @4meta5/skills-cli --version
```

### Unpublish (Emergency Only)

You have 72 hours to unpublish. After that, the version is permanent.

```bash
npm unpublish @4meta5/skills@1.0.0
```

### Automate Later

Add GitHub Actions for CI/CD:

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public -w @4meta5/skills
      - run: npm publish --access public -w @4meta5/skills-cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Store `NPM_TOKEN` in GitHub repo secrets. Generate it at npmjs.com > Access Tokens.
