# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately.

**Do not open a public issue.**

Email security concerns to: [security email or GitHub security advisories]

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Resolution**: Depends on severity, typically 2-4 weeks

## Scope

This policy covers:

- The skills-cli package
- The skills-library package
- Bundled skills
- Documentation that could lead to insecure usage

## Out of Scope

- Third-party dependencies (report to their maintainers)
- Community-contributed skills not in this repo
- Issues requiring physical access to a machine

## Security Considerations

This CLI:

- Reads and writes files to `.claude/skills/` directories
- Fetches skills from remote git repositories
- Does not transmit telemetry or user data

Skills are plain Markdown files. They contain instructions for Claude, not executable code. However, malicious skills could attempt to manipulate Claude's behavior in unintended ways.

When installing skills from untrusted sources, review the SKILL.md content before use.
