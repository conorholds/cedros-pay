.PHONY: install dev build lint type-check test clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies"
	@echo "  dev            - Start Vite dev server"
	@echo "  build          - Build library for production"
	@echo "  lint           - Run ESLint"
	@echo "  type-check     - Run TypeScript type checking"
	@echo "  test           - Run tests"
	@echo "  clean          - Remove build artifacts"

# Install dependencies
install:
	npm install

# Start Vite dev server
dev:
	npm run dev

# Build library
build:
	npm run build

# Lint code
lint:
	npm run lint

# Type check
type-check:
	npm run type-check

# Run tests
test:
	npm run test

# Clean build artifacts
clean:
	rm -rf dist node_modules/.cache
