# README Badges

## Badge Ordering Convention

Place badges in this order (left to right):
1. Build/CI status
2. Test coverage
3. npm version
4. License
5. Downloads (optional)
6. Custom badges

## shields.io Patterns

All badges use [shields.io](https://shields.io/) format.

### npm Package

```markdown
[![npm version](https://img.shields.io/npm/v/PACKAGE_NAME)](https://npmjs.com/package/PACKAGE_NAME)
[![npm downloads](https://img.shields.io/npm/dm/PACKAGE_NAME)](https://npmjs.com/package/PACKAGE_NAME)
```

### GitHub Actions

```markdown
[![CI](https://github.com/USER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/REPO/actions/workflows/ci.yml)
```

### License

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
```

### Test Coverage

```markdown
[![codecov](https://codecov.io/gh/USER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USER/REPO)
[![Coverage Status](https://coveralls.io/repos/github/USER/REPO/badge.svg?branch=main)](https://coveralls.io/github/USER/REPO?branch=main)
```

### TypeScript

```markdown
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
```

### Node.js Version

```markdown
[![Node.js](https://img.shields.io/node/v/PACKAGE_NAME)](https://nodejs.org/)
```

## Custom Badges

Create custom badges with shields.io:

```
https://img.shields.io/badge/LABEL-MESSAGE-COLOR
```

**Examples**:
```markdown
![Made with Claude](https://img.shields.io/badge/Made%20with-Claude-blueviolet)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Maintained](https://img.shields.io/badge/Maintained-yes-green)
```

## Badge Colors

| Color | Hex | Use For |
|-------|-----|---------|
| brightgreen | #4c1 | Passing, success |
| green | #97ca00 | Good status |
| yellow | #dfb317 | Warning, caution |
| orange | #fe7d37 | Deprecated |
| red | #e05d44 | Failing, error |
| blue | #007ec6 | Information |
| lightgrey | #9f9f9f | Neutral |
| blueviolet | #8a2be2 | Custom branding |

## Badge Grouping

For many badges, group them logically:

```markdown
<!-- Build Status -->
[![CI](...)][ci] [![Coverage](...)][coverage]

<!-- Package Info -->
[![npm](...)][npm] [![License](...)][license]

[ci]: https://github.com/user/repo/actions
[coverage]: https://codecov.io/gh/user/repo
[npm]: https://npmjs.com/package/name
[license]: ./LICENSE
```

## When to Skip Badges

Skip badges when:
- Project is internal/private
- Badge would show embarrassing status (fix the issue instead)
- Too many badges (max 6-8)
- Badge service is unreliable

## Dynamic Badges

For real-time data from your API:

```
https://img.shields.io/badge/dynamic/json?url=URL&query=JSONPATH&label=LABEL
```

## Accessibility

Badges should:
- Have alt text describing their meaning
- Link to relevant pages (not just decorative)
- Use sufficient color contrast
