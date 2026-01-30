# Skills Website: Landing Page + Docs

A static website for the open source Claude Code skills tooling.

**Repo**: [4meta5/skills](https://github.com/4meta5/skills)
**Stack**: SvelteKit 5 + mdsvex + Cloudflare Pages
**Scope**: Landing page and documentation only

No backend. No auth. No payments. No database.

---

## What We're Building

| Page | Purpose |
|------|---------|
| `/` | Landing page with value prop, features, installation |
| `/docs` | Documentation for CLI, skill format, getting started |
| `/skills` | Static list of bundled skills (read from filesystem at build) |

That's it. Three routes.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | SvelteKit 5 | Runes, static prerender, modern DX |
| Markdown | mdsvex | Write docs in markdown, use Svelte components |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| Hosting | Cloudflare Pages | Free, fast, zero config deploys |
| Adapter | @sveltejs/adapter-static | Pure static output, no server |

No shadcn. No component library. Keep it simple.

---

## Site Structure

```
packages/skills-web/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Landing page
│   │   ├── +layout.svelte        # Nav, footer
│   │   ├── docs/
│   │   │   ├── +page.svelte      # Docs index
│   │   │   └── [slug]/
│   │   │       └── +page.svelte  # Individual doc pages
│   │   └── skills/
│   │       └── +page.svelte      # Skills list
│   ├── content/
│   │   └── docs/                 # Markdown files
│   │       ├── getting-started.md
│   │       ├── cli-reference.md
│   │       ├── skill-format.md
│   │       └── writing-skills.md
│   └── lib/
│       └── components/           # Shared components
├── static/                       # Favicon, images
├── svelte.config.js
├── tailwind.config.js
└── package.json
```

---

## Landing Page Content

### Hero Section
- Headline: "Skills for Claude Code"
- Subhead: One sentence explaining value
- Install command: `npm i -g @4meta5/skills-cli`
- GitHub link

### Features Section (3 max)
1. **Discover skills** - Scan your project, get recommendations
2. **Install instantly** - One command to add skills
3. **Open source** - MIT licensed, community driven

### Quick Start
```bash
npx @4meta5/skills-cli scan
npx @4meta5/skills-cli add tdd
```

### Footer
- GitHub link
- License (MIT)

---

## Documentation Pages

| Page | Content |
|------|---------|
| Getting Started | Install, first scan, add a skill |
| CLI Reference | All commands with examples |
| Skill Format | SKILL.md spec, frontmatter fields |
| Writing Skills | How to create your own skills |

Write docs in markdown. mdsvex converts them to pages at build time.

---

## Skills Page

Static list of bundled skills from `packages/skills-library/skills/`.

For each skill, show:
- Name
- Description (from frontmatter)
- Category

Link to GitHub for the full SKILL.md content. No skill detail pages needed for MVP.

---

## Build and Deploy

### Local Development
```bash
cd packages/skills-web
npm install
npm run dev
```

### Build
```bash
npm run build
# Output: .svelte-kit/cloudflare/
```

### Deploy to Cloudflare Pages

Option 1: Connect GitHub repo in Cloudflare dashboard
- Build command: `npm run build`
- Build output: `.svelte-kit/cloudflare`
- Root directory: `packages/skills-web`

Option 2: Manual deploy with Wrangler
```bash
npx wrangler pages deploy .svelte-kit/cloudflare
```

---

## Configuration

### svelte.config.js
```javascript
import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';

export default {
  extensions: ['.svelte', '.md'],
  preprocess: [mdsvex({ extensions: ['.md'] })],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false,
      strict: true
    })
  }
};
```

### +layout.js (prerender all)
```javascript
export const prerender = true;
```

---

## Implementation Steps

1. Create `packages/skills-web` with SvelteKit 5
2. Add mdsvex and Tailwind CSS
3. Build landing page
4. Add docs markdown files
5. Create docs routing
6. Add skills list page (read skills at build time)
7. Deploy to Cloudflare Pages

---

## Out of Scope (Explicitly Cut)

- Authentication
- Database
- Payments
- User accounts
- Dashboard
- Analytics
- Team features
- Skill browser with search
- Individual skill detail pages
- Blog
- Waitlist form
- API endpoints

These can be added later. Start with static content.

---

## Success Criteria

- Site loads fast (< 1s)
- All pages prerendered (no JS required for content)
- Docs are easy to update (just edit markdown)
- Deploys automatically on push to main

---

## Resources

- [SvelteKit Static Adapter](https://svelte.dev/docs/kit/adapter-static)
- [Cloudflare Pages + SvelteKit](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/)
- [mdsvex](https://github.com/pngwn/MDsveX)
- [Svelte 5 Docs Starter](https://github.com/code-gio/svelte-docs-starter)
