# README Quality Checklist

## Pre-Publish Checklist

Run through this checklist before publishing or releasing.

### Essential (Must Have)

- [ ] **Title and tagline** are clear and under 120 characters
- [ ] **Hero example** works with copy-paste (tested)
- [ ] **What it does** is explained in 3-5 bullets
- [ ] **Quick start** gets users running in under 10 minutes
- [ ] **License** is specified
- [ ] **All code examples** have been tested
- [ ] **No broken links** (run link checker)

### High Priority

- [ ] **Badges** show build status, version, license
- [ ] **Installation** covers npm/yarn/pnpm
- [ ] **Usage examples** show common use cases
- [ ] **Expected output** is shown for code examples
- [ ] **Contributing** section or link exists
- [ ] **Table of Contents** exists (if over 200 lines)

### Medium Priority

- [ ] **Configuration** options are documented
- [ ] **API reference** exists (for libraries)
- [ ] **Command reference** exists (for CLIs)
- [ ] **Troubleshooting/FAQ** addresses common issues
- [ ] **Screenshots or GIFs** demonstrate the product
- [ ] **Prerequisites** (Node version, etc.) are listed

### Polish

- [ ] **Formatting** is consistent throughout
- [ ] **Headers** follow a logical hierarchy
- [ ] **Code blocks** have language identifiers
- [ ] **Long sections** are collapsed with `<details>`
- [ ] **Links** open to relevant sections, not just pages
- [ ] **Alt text** exists for all images

## The 10-Minute Test

**Can a new user get from README to running code in 10 minutes?**

Test this by:
1. Creating a fresh directory
2. Following only the README instructions
3. Timing yourself
4. Noting any confusion points

If it takes longer than 10 minutes, simplify the Quick Start.

## Common Issues

### Code Examples Don't Work

- Test all examples in a fresh environment
- Include all necessary imports
- Show expected output
- Note version requirements

### Too Much Information

- Move detailed docs to `/docs/`
- Use `<details>` tags for long sections
- Link to external resources instead of duplicating
- Focus on 80% use case, not edge cases

### Missing Context

- Explain what the project does, not just how
- Include "Why would I use this?"
- Show real-world use cases
- Compare to alternatives (briefly)

### Outdated Information

- Set up CI to test README code blocks
- Include "Last updated" date
- Link to changelog
- Use badges that update automatically

## Link Checking

Run a link checker before publishing:

```bash
# With markdown-link-check
npx markdown-link-check README.md

# With lychee (faster)
lychee README.md
```

## Accessibility Considerations

- **Alt text**: All images have descriptive alt text
- **Heading hierarchy**: Don't skip levels (h1 → h3)
- **Link text**: Descriptive (not "click here")
- **Color**: Don't rely on color alone for meaning
- **Code blocks**: Use language identifiers for syntax highlighting

## README Linting

Use tools to catch issues:

```bash
# Markdown linting
npx markdownlint README.md

# Prose linting
npx write-good README.md

# Link checking
npx markdown-link-check README.md
```

## Before Major Releases

- [ ] Update version numbers in examples
- [ ] Update screenshots/GIFs
- [ ] Review and update FAQ
- [ ] Test Quick Start on multiple platforms
- [ ] Update badges if CI/coverage changed
- [ ] Review for outdated information

## Versioning README Changes

Consider versioning README alongside code:
- Major version: Rewrite Quick Start
- Minor version: Add new sections
- Patch version: Fix typos, broken links

## Feedback Loop

After publishing:
1. Monitor issues for confusion patterns
2. Check which questions repeat
3. Update README to preempt common questions
4. Add troubleshooting for reported issues
