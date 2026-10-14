# Cedros Pay Command Map

Run commands from the listed directory. Only the extension archive is released.
Release-readiness, provenance, and packaging checks require the original
development Git history referenced by the release records; that history is not
part of the public source snapshot. Other source checks and domain tests can run
against this checkout.

| Area | Command | Workdir | Purpose | Runtime | Services/env |
| --- | --- | --- | --- | --- | --- |
| Root | `make publish-source` | repo root | Prepare committed source in the existing public Git checkout; `PUBLISH_ARGS=--dry-run` previews | fast | Git, Node, tar; optional `PUBLISH_REPO` checkout root |
| Root | `make test-publish-source` | repo root | Test source preparation and destination safety guards | fast | Git, Node, tar |
| Root | `make help` | repo root | List extension targets | fast | none |
| Root | `make install` | repo root | Install UI dependencies | medium | network |
| Root | `make check-unused` | repo root | Scoped knip unused-file/dependency/import checks for UI and RN | medium | network on first run; caches in `.context/npm-cache` |
| Root | `make check-cycles` | repo root | Madge TypeScript cycle checks plus Rust crate-module SCC scan | medium | network on first run; caches in `.context/npm-cache` |
| Root | `make check-autosave` | repo root | Reject ad-hoc autosave timers and network loops outside the shared primitive | fast | Node |
| Root | `make check-file-size` | repo root | Reject new production files above 500 lines, stale resolved debt, and any growth above the latest oversized-file count | fast | Node |
| Root | `make check-writer-inventory` | repo root | Reject runtime/inventory model-set or digest drift, new unconditional writers, and unclassified plain batches for guarded-only models using `docs/guarded-only-writer-inventory.json` | fast | Node |
| Root | `make check-security` | repo root | Audit Rust and npm runtime/development dependencies | fast | cargo-audit, network/advisory databases |
| Root | `make quality` | repo root | Run static cleanup guardrails (`check-unused`, `check-cycles`, `check-autosave`, `check-file-size`, `check-writer-inventory`) | medium | network on first run; caches in `.context/npm-cache` |
| UI | `npm run type-check` | `ui` | TypeScript check | fast | `node_modules` |
| UI | `npm run lint` | `ui` | ESLint | fast | `node_modules` |
| UI | `npm test` | `ui` | Vitest unit/e2e-style suites | medium | `node_modules` |
| UI | `npm run check:sibling-deps` | `ui` | Forbid unwanted sibling package dependencies | fast | `node_modules` |
| UI | `npm run build` | `ui` | Build package into `dist` | medium | `node_modules` |
| UI | `npm run verify:exports` | `ui` | Validate admin/web runtime closure | fast | run after `npm run build` |
| UI | `npm run ci:checks` | `ui` | Lint, typecheck, tests, sibling dependencies | medium | `node_modules` |
| UI | `npm audit --audit-level=high --omit=dev` | `ui` | Production high-severity audit | fast | network/audit registry |
| React Native | `npm ci` | `ui/react-native` | Install locked RN package deps | medium | network |
| React Native | `npm run type-check` | `ui/react-native` | TypeScript check | fast | RN deps |
| React Native | `npm run lint` | `ui/react-native` | ESLint | fast | RN deps |
| React Native | `npm run test` | `ui/react-native` | Build CommonJS then Node tests | medium | RN deps |
| React Native | `npm run build` | `ui/react-native` | Build native registration | medium | RN deps |
| React Native | `npm run verify:exports` | `ui/react-native` | Validate native registration runtime closure | fast | run after `npm run build` |
| React Native | `npm run ci:checks` | `ui/react-native` | Lint, typecheck, tests, build, and verify registration | medium | RN deps |
| React Native | `npm audit --audit-level=high --omit=dev` | `ui/react-native` | Production high-severity audit | fast | network/audit registry |
| Wasm extension | `node scripts/build-release-wasm.mjs` | repo root | Build the component in the pinned Linux/amd64 Rust container with deterministic source paths, then reject local paths or credential material | medium | Node, Docker |
| Wasm domain | `cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain` | repo root | Run domain tests without a built component or live host | medium | Rust toolchain |
| Wasm extension | `cargo test` | `server-wasm` | Domain plus hostsim tests; hostsim fails if the built component is absent | medium | Rust toolchain, built component required for e2e |
| Wasm extension | `make cedros-verify` | repo root | Verify WIT, build the Wasm component, then run domain and real Wasmtime hostsim tests | medium | Node, Docker, Rust/Wasmtime test toolchain |
| Extension | `node scripts/validate-route-honesty.mjs` | repo root | Reject advertised scheduling and callable/success metadata for known Wasm placeholder routes | fast | Node |
| Extension | `node scripts/validate-conditional-mutations.mjs` | repo root | Validate adopted schema-v1 database.compare-and-set calls, required storage-CAS capability, and exact marker/policy inventory | fast | Node |
| Extension | `node --test --test-concurrency=1 scripts/tests/*.test.mjs` | repo root | Exercise conditional-mutation, route-honesty, Rust-audit, release-evidence, archive-integrity, and file-size fixtures | fast | Node, Git |
| Extension | `CEDROS_DATA_DIR=/path/to/cedros-data make verify-wit` | repo root | Verify byte identity and provenance against the live Cedros Data host checkout | fast | clean Cedros Data checkout |
| Extension | `node scripts/validate-extension.mjs` | repo root | Extension manifest/readiness validation | fast | Node |
| Extension | `node scripts/validate-extension.mjs --source-only` | repo root | Run complete extension/source validation in a clean clone while skipping only ready archive filesystem/hash checks; packaging uses this before creating the ignored ZIP | fast | Node, Git; archive may be absent |
| Extension | `node scripts/validate-release-readiness.mjs --source-only` | repo root | Validate all release/source schema, launch gates, packaged-input evidence, and provenance metadata while intentionally skipping only ready archive filesystem/hash checks | fast | Node, Git; clean-clone metadata mode |
| Extension | `node scripts/validate-release-readiness.mjs` | repo root | Full release validation, including deterministic packaged-input evidence, provenance metadata, and ready archive filesystem/hash integrity | fast | Node, Git, locally built archive |
| Extension | `node scripts/validate-release-readiness.mjs --print-packaged-input-digest` | repo root | Print the deterministic packaged tracked-input digest recorded in `cedros-extension.release-inputs.json` | fast | Node, Git |
| Extension | `make cedros-package` | repo root | Run source-only prevalidation, build the strict self-contained `.cedros-extension.zip` with Wasm/admin/web/supply-chain evidence, then run full archive validation | medium | clean tracked worktree, current release-input evidence, Node, Docker, UI deps |

Release-input evidence must be refreshed after committing reviewed package inputs.
`make cedros-package` requires a clean tracked worktree and builds Wasm and UI
sequentially. Host installation and provider smoke tests require matching host
capabilities and separate staging evidence.
