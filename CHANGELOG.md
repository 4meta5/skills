# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-03

### Added

- **Modular package architecture**: Split monolith into 7 focused packages
  - `@4meta5/skill-loader`: Parse and load SKILL.md files
  - `@4meta5/project-detector`: Detect project tech stack
  - `@4meta5/semantic-matcher`: Hybrid keyword + embedding semantic matching
  - `@4meta5/workflow-enforcer`: State machine for workflow enforcement
  - `@4meta5/skills`: Main library for skill management
  - `@4meta5/chain`: Declarative skill chaining for workflows
  - `@4meta5/skills-cli`: CLI for managing skills
- **Chain system**: Declarative skill chaining with DAG-based execution
  - RouteDecision type and ChainActivator for router integration
  - Enforcement tiers (hard/soft/none) for skills
  - Unified session state and usage tracking
  - Pre-tool-use hooks for corrective guidance
- **Test discovery**: Polyglot test runner discovery system
- **New skills**: engram-generate, engram-recall, repo-conventions-check
- **Intent mapping**: Smart intent detection for skill activation

### Changed

- Restructured project from monolith to npm workspaces monorepo
- Skills now load from `@4meta5/skill-loader` package
- CLI integrates ChainActivator with corrective loop middleware

### Fixed

- CLI bin/skills.js entry point now properly exposed

## [0.1.0] - 2026-02-02

### Added

- Initial public release
- Project analysis system (detects languages, frameworks, databases, testing tools)
- Skill matching engine with confidence levels
- CLI commands: scan, add, list, show, remove, source, stats
- Bundled skills: tdd, no-workarounds, code-review, security-analysis, and more
- Curated skill sources for common tech stacks
- Semantic routing with keyword and embedding matching
