---
description: Scaffold a new format parser in @metascrub/core
argument-hint: <format-name>
---

Invoke the `core-developer` agent to scaffold a new format parser for `$ARGUMENTS`.

The agent should:

1. Create `packages/core/src/formats/$ARGUMENTS.ts` with the standard `FormatParser` shape from ARCHITECTURE.md.
2. Add empty `parse()` and `scrub()` stubs that throw `MetaScrubError({ code: 'PARSE_ERROR', format: '$ARGUMENTS' })` for now.
3. Register the parser in `packages/core/src/formats/index.ts`.
4. Create fixture folder `packages/core/test/fixtures/$ARGUMENTS/` with a README explaining what fixture files are needed (don't generate binary fixtures — request them from Anton).
5. Create the test file `packages/core/test/$ARGUMENTS.test.ts` with skeleton tests.
6. Update `supportedFormats()` to include the new format.
7. Add the format to `FileFormat` union type in `types.ts`.

After scaffolding, report:
- Files created
- What Anton needs to provide (fixture files)
- What library is recommended for parsing this format (suggest MIT/Apache-licensed options)
