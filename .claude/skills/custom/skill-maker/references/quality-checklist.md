# Skill Quality Checklist

Use this checklist before finalizing any skill.

## Required Checks

### Frontmatter

- [ ] **name** is present and kebab-case
- [ ] **name** is unique (not duplicate of existing skill)
- [ ] **description** is present
- [ ] **description** > 50 characters
- [ ] **category** is valid (if specified)

### Description Quality

- [ ] First sentence explains what skill does
- [ ] Includes trigger conditions ("Use when...")
- [ ] Mentions specific symptoms/errors
- [ ] Framework/tool names included (if applicable)

### Content Quality

- [ ] SKILL.md has actionable guidance
- [ ] Examples are concrete, not theoretical
- [ ] Code snippets are complete and runnable
- [ ] No placeholder content ("TODO", "Lorem ipsum")
- [ ] No slop patterns (see below)

### File Structure

- [ ] SKILL.md exists
- [ ] Referenced files exist (references/, docs/)
- [ ] No orphaned files
- [ ] Directory name matches frontmatter name

## Slop Detection

These patterns indicate auto-generated or placeholder content:

| Pattern | Example | Action |
|---------|---------|--------|
| test-skill-* | `test-skill-1234567890` | Delete or rename |
| "NEW content" | "NEW content with improvements!" | Rewrite |
| "# Test Skill" | Generic header | Use descriptive name |
| Lorem ipsum | Placeholder text | Remove |
| [Insert X] | "[Insert description here]" | Fill in |

## Quality Tiers

### Minimum Viable Skill
- [ ] Name and description present
- [ ] No validation errors
- [ ] Basic actionable content

### Good Skill
- [ ] All minimum requirements
- [ ] Description includes triggers
- [ ] Concrete examples
- [ ] Clear problem/solution structure

### Excellent Skill
- [ ] All good requirements
- [ ] References for detailed docs
- [ ] Tested in real scenarios
- [ ] Changelog/version tracking
- [ ] Integration notes with other skills

## Validation Commands

```bash
# Validate single skill
skills validate <skill-name>

# Validate all skills
skills validate

# JSON output for CI
skills validate --json
```

## Common Issues

### "Description too short"
Add more context: trigger conditions, error messages, frameworks.

### "Missing required field: name"
Ensure frontmatter has `name:` field with kebab-case value.

### "Invalid category"
Use one of: testing, development, documentation, refactoring, security, performance.

### "Content contains slop pattern"
Replace placeholder content with real guidance.

### "references/ directory not found"
If SKILL.md links to `references/`, create the directory and files.

## Before Publishing

- [ ] Run `skills validate <name>` - passes
- [ ] Test skill in real scenario
- [ ] Review description for searchability
- [ ] Check all links work
- [ ] Remove any debug/test content
