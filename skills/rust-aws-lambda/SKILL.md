---
name: rust-aws-lambda
description: |
  Deploy Rust AWS Lambda functions (often with Function URLs). Use when
  configuring CORS, environment variables, and Rust lambda_http/lambda_runtime
  dependencies.
category: deployment
---

# Rust AWS Lambda

## Required Inputs

- Lambda function name and AWS region
- Environment variables for the function
- Function URL (if applicable)

## Workflow (High Level)

1. Confirm the Rust Lambda uses `lambda_http` or `lambda_runtime`.
2. Update function environment variables safely (preserve existing keys).
3. Configure Function URL CORS to match the current frontend origin.
4. Validate the endpoint with a lightweight request.

## Guardrails

- Do not include `OPTIONS` in CORS allowMethods for Lambda Function URLs.
- Keep CORS origins explicit and up to date.

## References

- AWS Lambda Function URL CORS behavior:
  https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html?utm_source=openai
- Lambda CORS API reference (allowed methods/headers):
  https://docs.aws.amazon.com/lambda/latest/api/API_Cors.html?utm_source=openai
