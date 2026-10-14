.DEFAULT_GOAL := help
.PHONY: help install build-ui build-native build-wasm test-ui test-native test-domain test-dependency-security check-autosave check-security

install:
	cd ui && npm ci
	cd ui/react-native && npm ci

build-ui:
	cd ui && npm run build

build-native:
	cd ui/react-native && npm run build

build-wasm:
	cargo build --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-guest --target wasm32-wasip2 --release --locked

test-ui:
	cd ui && npm test

test-native:
	cd ui/react-native && npm run ci:checks

test-domain:
	cargo test --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain --locked

test-dependency-security:
	node --test scripts/tests/dependency-security.test.mjs ui/scripts/formatter-security.test.mjs

check-autosave:
	node scripts/audit-autosave-standard.mjs

check-security:
	node scripts/check-rust-audit.mjs
	cd ui && npm audit
	cd ui/react-native && npm audit

help:
	@echo "Cedros Pay source commands (run builds and tests sequentially)"
	@echo "  install, build-ui, build-native, build-wasm"
	@echo "  test-ui, test-native, test-domain, test-dependency-security"
	@echo "  check-autosave, check-security"
