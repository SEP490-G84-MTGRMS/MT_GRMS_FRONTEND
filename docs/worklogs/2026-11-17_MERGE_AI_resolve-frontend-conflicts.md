# Frontend merge conflict resolution — 2026-11-17

Resolved 13 conflicted files in the pending merge on `feature/audit-fe7-fe19-finance-tax-verified`.

Preserved UUIDv7 idempotency and session refresh, canonical owner guards, configurable customer debt, pending QR orders, responsive tables and cashbook end-of-day settlement. QR configuration requires the current tenant and branch, retains branch payment-account configuration and supports the connected finance account when no branch payment configuration exists.

Updated test fixtures for the merged master catalog interface, independent unit prices, router context, supplier return policy and persisted branch selection. Added an accessible name to the FEFO switch.

Validation:
- `npm run build`: passed; existing large bundle warnings remain.
- `npm test`: 55 test files and 443 tests passed.
- `git diff --cached --check`: passed.
- Browser visual inspection was not performed.

No push performed.
