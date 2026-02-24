.PHONY: install dev build storybook build-storybook lint type-check test clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies"
	@echo "  dev            - Start Vite dev server"
	@echo "  build          - Build library for production"
	@echo "  storybook      - Start Storybook dev server (port 6006)"
	@echo "  build-storybook - Build static Storybook"
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

# Start Storybook
storybook:
	npm run storybook

# Build static Storybook
build-storybook:
	npm run build-storybook

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
