.DEFAULT_GOAL := help
.PHONY: install check-unused check-cycles check-autosave check-file-size check-writer-inventory check-security quality cedros-package cedros-verify verify-wit vendor-wit publish-source test-publish-source test-dependency-security help

# Install JS dependencies (skips if node_modules is up to date)
install:
	@if [ ui/package.json -nt ui/node_modules/.package-lock.json ] 2>/dev/null; then \
		echo "Installing ui/ dependencies..."; \
		cd ui && npm ci; \
	else \
		echo "ui/ dependencies up to date"; \
	fi

check-unused:
	node scripts/check-unused.mjs

check-cycles:
	node scripts/check-cycles.mjs

check-autosave:
	node scripts/audit-autosave-standard.mjs

check-file-size:
	node scripts/check-file-size.mjs

check-writer-inventory:
	node scripts/check-guarded-writer-inventory.mjs

# Audit runtime and development dependencies, including the local host simulator.
check-security:
	node scripts/check-rust-audit.mjs
	cd ui && npm audit
	cd ui/react-native && npm audit

quality: check-unused check-cycles check-autosave check-file-size check-writer-inventory

CEDROS_PACKAGE_DIR ?= artifacts

# Fail fast if the vendored host/guest ABI WIT drifted from the cedros-data host
# it was vendored from (server-wasm/guest/wit-source.json records the pinned
# commit + sha256). Set CEDROS_DATA_DIR to a cedros-data checkout to also
# compare against the live host.
verify-wit:
	node scripts/verify-wit.mjs

# Re-vendor the WIT byte-for-byte from the host (needs CEDROS_DATA_DIR) and
# re-record its provenance. The only sanctioned way to change the vendored WIT.
vendor-wit:
	node scripts/verify-wit.mjs --update

# Build the self-contained Cedros admin runtime ZIP for Cedros platform intake.
# Source-validates before compilation, builds ui/ so workspace/react/dist/** is
# fresh, packages, then performs full archive validation. Cedros platform will not fetch npm,
# tarballs, workspaces, registries, or crates, so the compiled admin/web runtime
# closure and supply-chain evidence must already be inside the ZIP.
cedros-package: verify-wit
	node scripts/validate-extension.mjs --source-only
	node scripts/build-release-wasm.mjs
	cd ui && (test -d node_modules || npm ci) && CEDROS_BUNDLE_EXTENSION_RUNTIME=1 npm run build
	cd ui/react-native && (test -d node_modules || npm ci) && npm run build
	CEDROS_STRICT_RUNTIME_IMPORTS=1 CEDROS_REQUIRE_CLEAN_RELEASE_EVIDENCE=1 node scripts/package-extension.mjs $(CEDROS_PACKAGE_DIR)
	node scripts/validate-extension.mjs

# Build the wasm component and prove it loads + serves through a real Wasmtime
# component-model runtime (the hostsim harness mirrors the cedros-data host).
cedros-verify: verify-wit
	node scripts/build-release-wasm.mjs
	cargo test --manifest-path server-wasm/Cargo.toml

test-dependency-security:
	node --test scripts/tests/dependency-security.test.mjs

# Prepare the separate public source checkout without building the extension.
publish-source:
	./scripts/publish.sh $(VERSION) $(PUBLISH_ARGS)

test-publish-source:
	node --test scripts/tests/publish-source.test.mjs

help:
	@echo "Cedros Pay extension"
	@echo ""
	@echo "  make install          Install JS dependencies"
	@echo "  make check-unused     Run scoped knip unused-file/dependency checks"
	@echo "  make check-cycles     Run TS madge and Rust module cycle checks"
	@echo "  make check-autosave   Reject ad-hoc autosave timers and network loops"
	@echo "  make check-file-size  Reject new or growing production files above 500 lines"
	@echo "  make check-writer-inventory  Reject unconditional writers for guarded-only candidates"
	@echo "  make test-dependency-security  Exercise the resolved dependency security fixes"
	@echo "  make check-security   Audit Rust and npm runtime/development dependencies"
	@echo "  make quality          Run static quality guardrails"
	@echo "  make cedros-package   Build self-contained .cedros-extension.zip in $(CEDROS_PACKAGE_DIR)/"
	@echo "  make cedros-verify    Build the wasm component and run the load+serve harness"
	@echo "  make verify-wit       Fail if the vendored host ABI WIT drifted from the host"
	@echo "  make vendor-wit       Re-vendor the WIT from the host (needs CEDROS_DATA_DIR)"
	@echo "  make publish-source   Prepare the existing public source checkout"
	@echo "  make test-publish-source  Test source publication guards"
	@echo "  make help             Show this help"
