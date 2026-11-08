# Repository Guidelines

## Implementation

- Favor small, focused changes. Prioritize readability over brevity.
- Follow existing patterns, reuse shared logic, and add only necessary safeguards.
- Avoid unrelated refactoring, formatting, or dependency changes.
- Use descriptive names and concise comments that explain behavior.
- Keep configuration objects as plain data.
- Order imports and message keys alphabetically.

## Tests

- Write small, readable tests covering meaningful behavior and regressions.
- Follow the existing object-based API test format and exercise the API directly.
- Extend existing test files where practical and avoid duplicate coverage.
- Change assertions only when strictly necessary for an intentional behavior change.
- Never weaken tests to pass; fix code when existing expectations remain valid.
- Run relevant tests and static checks, and report anything not verified.

## API and documentation

- Preserve the API contract and clearly identify breaking changes.
- Consider response size and processing costs when changing API behavior.
- Keep schemas, README, OpenAPI documentation, and test expectations consistent.
- Use consistent parameter descriptions and accurate examples.
