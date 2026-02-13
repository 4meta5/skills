# Triage Task Prompt

Use this prompt template when spawning triage tasks in Step 5.

## Template

```
You are a security finding triager for [LANGUAGE_CATEGORY].

## Input Files
[LIST OF JSON FILES TO TRIAGE]

## Output Directory
[OUTPUT_DIR]

## Task
For each finding:
1. Read the JSON finding (rule ID, file, line number)
2. Read source code context (at least 5 lines before/after)
3. Classify as TRUE_POSITIVE or FALSE_POSITIVE
4. Write a brief reason for the classification

## Decision Tree

Apply these checks in order. The first match determines the classification:

Finding
├── Is it in a test file? → FALSE_POSITIVE (add to .semgrepignore)
├── Is it in example/docs? → FALSE_POSITIVE
├── Does it have nosemgrep comment? → FALSE_POSITIVE (already acknowledged)
├── Is the input sanitized/validated upstream?
│   └── Check 10-20 lines before for validation → FALSE_POSITIVE if validated
├── Is the code path reachable?
│   └── Check if function is called/exported → FALSE_POSITIVE if dead code
└── None of the above → TRUE_POSITIVE

## Classification Guidelines

TRUE_POSITIVE indicators:
- User input flows to sensitive sink without sanitization
- Hardcoded credentials or API keys in source (not test) code
- Known-vulnerable function usage in production paths
- Missing security controls (no CSRF, no auth check)

FALSE_POSITIVE indicators:
- Test files with mock/fixture data
- Input is validated before reaching the flagged line
- Code is behind a feature flag or compile-time guard
- Dead code (unreachable function, commented-out caller)
- Documentation or example snippets

## Output Format
Create: [OUTPUT_DIR]/[lang]-triage.json

{
  "file": "[lang]-[ruleset].json",
  "total": 45,
  "true_positives": [
    {"rule": "rule.id.here", "file": "path/to/file.py", "line": 42, "reason": "User input in raw SQL without parameterization"}
  ],
  "false_positives": [
    {"rule": "rule.id.here", "file": "tests/test_file.py", "line": 15, "reason": "Test file with mock data"}
  ]
}

## Report
Return summary:
- Total findings examined
- True positives count
- False positives count with breakdown by reason category

## Important
- Read actual source code for every finding. Never classify based solely on the rule name or file path.
- When uncertain, classify as TRUE_POSITIVE. False negatives are worse than false positives in security triage.
- Process all input JSON files for the language category.
```

## Variable Substitutions

| Variable | Description | Example |
|----------|-------------|---------|
| `[LANGUAGE_CATEGORY]` | Language group being triaged | Python, JavaScript, Docker |
| `[OUTPUT_DIR]` | Results directory with run number | semgrep-results-001 |

## Example: Python Triage Task

```
You are a security finding triager for Python.

## Input Files
- semgrep-results-001/python-python.json
- semgrep-results-001/python-django.json
- semgrep-results-001/python-security-audit.json
- semgrep-results-001/python-secrets.json
- semgrep-results-001/python-trailofbits.json

## Output Directory
semgrep-results-001

## Task
For each finding:
1. Read the JSON finding
2. Read source code context (5 lines before/after)
3. Classify as TRUE_POSITIVE or FALSE_POSITIVE

## False Positive Criteria
- Test files (should add to .semgrepignore)
- Sanitized inputs (context shows validation)
- Dead code paths
- Example/documentation code
- Already has nosemgrep comment

## Output Format
Create: semgrep-results-001/python-triage.json

## Report
Return summary:
- Total findings: 45
- True positives: 12
- False positives: 33 (18 test files, 10 sanitized inputs, 5 dead code)
```
