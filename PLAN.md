# Plan

## Current Sprint

### Workflow Skill Bundle
- [x] Create workflow orchestrator skill
- [x] Create project-init skill for scaffolding
- [x] Create doc-maintenance skill for auto-updates
- [x] Create gitignore-hygiene skill
- [x] Create agent-orchestration skill
- [x] Create research-to-plan skill
- [x] Create templates (CLAUDE.md, README.md, PLAN.md, RESEARCH.md, AGENTS.md)
- [x] Create reference documentation

### Documentation Updates
- [x] Update README.md with complete skill list
- [x] Add web package documentation
- [x] Document Svelte/SvelteKit skills

## Backlog

### Skills CLI Enhancements
- [ ] Add skill validation command
- [ ] Add skill update command for version bumps
- [ ] Improve semantic matching accuracy
- [ ] Add skill dependency resolution
- [x] Support skill bundles (multiple skills in one package) - Fixed nested skill discovery

### Website Improvements
- [ ] Add skill search functionality
- [ ] Create skill detail pages
- [ ] Add skill submission flow
- [ ] Improve mobile responsiveness

### Skill Library Expansion
- [ ] Add more language-specific skills (Python, Rust, Go)
- [ ] Add CI/CD skills (GitHub Actions, CircleCI)
- [ ] Add database skills (Postgres, MongoDB patterns)
- [ ] Add API design skills (REST, GraphQL)

### Infrastructure
- [ ] Set up automated skill testing
- [ ] Create skill quality metrics
- [ ] Add skill usage analytics dashboard

## Completed

- [x] Initial skills-cli implementation
- [x] Project analysis and tech stack detection
- [x] Skill scanning and recommendations
- [x] Skill installation from sources
- [x] Bundled skill library (tdd, no-workarounds, etc.)
- [x] Svelte/SvelteKit skill collection
- [x] Accessibility and UI quality skills
- [x] Frontend design skills
- [x] Workflow skill bundle (2026-01-30)
  - workflow orchestrator
  - project-init
  - doc-maintenance
  - gitignore-hygiene
  - agent-orchestration
  - research-to-plan
  - templates and references
- [x] Fixed nested skill discovery in loadSkillsFromDirectory (2026-01-30)
  - Skills can now be nested up to 4 levels deep
  - Skill bundles with sub-skills are fully supported
  - Vector store regenerated with all 68 skills

## Blocked

None currently.

## Notes

- Test skills (test-skill-*) are for CLI testing and can be cleaned up
- Some skills are marked _temp_ pending proper naming
