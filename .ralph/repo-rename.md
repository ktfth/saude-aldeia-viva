# Rename repository references

Update all project references from incorrect `ktfth/saude-aldia-viva` to the correct `ktfth/saude-aldeia-viva`.

## Goals

- Find all stale repository references.
- Replace them consistently.
- Verify no stale typo remains.
- Run project validation.

## Checklist

- [x] Search for stale repository strings
- [x] Update package metadata and docs/workflows if needed
- [x] Verify with search
- [x] Run checks/tests/build

## Verification

- `rg "saude-aldia-viva|ktfth/saude-aldeia-viva|github.com/ktfth/saude-aldeia-viva" -n . -g '!node_modules' -g '!dist' -g '!dist-test' -g '!*.tgz'` now reports only correct `ktfth/saude-aldeia-viva` references in `package.json` and `README.md`.
- `npm run check` passed.
- `npm test` passed: 17 tests, 17 pass, 0 fail.
- `npm run build` passed.
- `npx jsr publish --dry-run --allow-dirty` passed.
- `npm pack --dry-run` passed for `@aldeia-viva/saude@0.1.2`.

## Notes

- User confirmed correct repository is `ktfth/saude-aldeia-viva`.
- Updated stale typo in `package.json`, `.github/workflows/publish.yml`, and `README.md`.
