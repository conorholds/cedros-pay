//! Skill system endpoints - skill.md, skill.json, individual skill files.

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Json};

use super::content::{get_skill_content, get_skills, SERVICE_DESCRIPTION, SERVICE_NAME, VERSION};
use super::types::{Capabilities, DownloadableBundles, RateLimits, SkillAuth, SkillMetadata};

/// GET /skill.md - Skill index with YAML frontmatter
pub async fn skill_md() -> impl IntoResponse {
    let skills = get_skills();
    let skills_yaml: Vec<String> = skills
        .iter()
        .map(|s| {
            let mut yaml = format!(
                "  - id: {}\n    path: {}\n    requiresAuth: {}",
                s.id,
                s.path,
                s.requires_auth.unwrap_or(false)
            );
            if let Some(true) = s.requires_admin {
                yaml.push_str("\n    requiresAdmin: true");
            }
            yaml
        })
        .collect();

    let skills_table: Vec<String> = skills
        .iter()
        .map(|s| {
            let auth = if s.requires_admin == Some(true) {
                "Yes (Admin)"
            } else if s.requires_auth == Some(true) {
                "Yes"
            } else {
                "No"
            };
            format!(
                "| [{}]({}) | {} | {} |",
                s.name, s.path, s.description, auth
            )
        })
        .collect();

    let content = format!(
        r#"---
name: {name}
version: "{version}"
description: {description}
category: e-commerce
apiBase: "/"
capabilities:
  products: true
  cart: true
  checkout: true
  subscriptions: true
  giftCards: true
  coupons: true
  chat: true
  faq: true
  aiAssistant: true
  stripePayments: true
  cryptoPayments: true
  creditsPayments: true
authentication:
  methods: [api-key, jwt, x402]
  recommended: api-key
  apiKeyPrefix: "sk_"
  header: "Authorization: Bearer <api-key>"
rateLimits:
  auth: "10 req/min per IP"
  api: "100 req/min per IP"
  admin: "60 req/min per key"
skills:
{skills_yaml}
---

# {name} Skills

{description}

## Available Skills

| Skill | Description | Auth Required |
|-------|-------------|---------------|
{skills_table}

## Quick Start for Agents

1. **Explore products**: `GET /products` - No authentication needed
2. **Create cart**: `POST /cart` with product items
3. **Get quote**: `POST /cart/:cartId/quote` with payment method
4. **Checkout**: `POST /cart/:cartId/checkout/stripe`

For AI-assisted shopping, use `POST /chat` with natural language queries.

## Discovery Endpoints

| Endpoint | Format | Purpose |
|----------|--------|---------|
| /llms.txt | text | Brief API summary |
| /llms-full.txt | text | Complete documentation |
| /llms-admin.txt | text | Admin operations |
| /skill.json | json | Machine-readable skills |
| /agent.md | markdown | Integration guide |
| /openapi.json | json | OpenAPI specification |

## Authentication Methods

### API Key (Recommended for Agents)

Include in Authorization header:
```
Authorization: Bearer sk_your_api_key
```

API keys provide simple authentication for admin operations.

### JWT (cedros-login)

For user-specific operations like subscriptions:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### x402 (Crypto)

Payment protocol for USDC on Solana. No pre-authentication needed.

## Rate Limits

| Category | Limit |
|----------|-------|
| Public endpoints | 100 req/min per IP |
| Admin endpoints | 60 req/min per key |
| Chat endpoint | 20 req/min per session |

## Error Format

```json
{{
  "code": "error_code",
  "message": "Human-readable description",
  "details": {{}}
}}
```
"#,
        name = SERVICE_NAME,
        version = VERSION,
        description = SERVICE_DESCRIPTION,
        skills_yaml = skills_yaml.join("\n"),
        skills_table = skills_table.join("\n")
    );

    ([("Content-Type", "text/markdown; charset=utf-8")], content)
}

/// GET /skill.json - Machine-readable skill metadata
pub async fn skill_json() -> impl IntoResponse {
    let metadata = SkillMetadata {
        name: SERVICE_NAME.to_string(),
        version: VERSION.to_string(),
        description: SERVICE_DESCRIPTION.to_string(),
        homepage: "https://cedros.io".to_string(),
        api_base: "/".to_string(),
        category: "e-commerce".to_string(),
        capabilities: Capabilities::default(),
        skills: get_skills(),
        authentication: SkillAuth {
            methods: vec!["api-key".to_string(), "jwt".to_string(), "x402".to_string()],
            recommended: "api-key".to_string(),
            api_key_prefix: Some("sk_".to_string()),
            header: "Authorization".to_string(),
        },
        rate_limits: RateLimits {
            auth_endpoints: "10 req/min per IP".to_string(),
            api_endpoints: "100 req/min per IP".to_string(),
            admin_endpoints: "60 req/min per key".to_string(),
        },
        downloadable_bundles: Some(DownloadableBundles {
            claude_code: "/.well-known/skills.zip".to_string(),
            codex: "/.well-known/skills.zip".to_string(),
        }),
    };

    Json(metadata)
}

/// GET /skills/:skill_id.md - Individual skill file
pub async fn skill_file(Path(skill_id): Path<String>) -> impl IntoResponse {
    // Strip .md extension if present
    let skill_id = skill_id.trim_end_matches(".md");

    match get_skill_content(skill_id) {
        Some(content) => (
            StatusCode::OK,
            [("Content-Type", "text/markdown; charset=utf-8")],
            content,
        )
            .into_response(),
        None => {
            let available: Vec<String> = get_skills().iter().map(|s| s.id.clone()).collect();
            let body = format!(
                "Skill '{}' not found. Available skills: {}",
                skill_id,
                available.join(", ")
            );
            (
                StatusCode::NOT_FOUND,
                [("Content-Type", "text/plain; charset=utf-8")],
                body,
            )
                .into_response()
        }
    }
}

/// Build skills.zip content dynamically
/// Returns the raw bytes for the ZIP file
pub fn build_skills_zip() -> Vec<u8> {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    let mut buffer = std::io::Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(&mut buffer);

    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Add README
    let readme = format!(
        r#"# {} Skills Bundle

This bundle contains skill definitions for use with Claude Code, OpenAI Codex,
or other AI agent frameworks.

## Installation

### Claude Code
```bash
unzip skills.zip -d ~/.claude/skills/{}/
```

### OpenAI Codex
```bash
unzip skills.zip -d ~/.codex/skills/{}/
```

## Available Skills

See individual SKILL.md files in each directory.

## API Base URL

Configure your agent to use: `https://your-store.cedros.io`
"#,
        SERVICE_NAME, SERVICE_NAME, SERVICE_NAME
    );

    let _ = zip.start_file("README.md", options);
    let _ = zip.write_all(readme.as_bytes());

    // Add each skill as a directory with SKILL.md
    for skill in get_skills() {
        if let Some(content) = get_skill_content(&skill.id) {
            let path = format!("{}/SKILL.md", skill.id);
            let _ = zip.start_file(&path, options);
            let _ = zip.write_all(content.as_bytes());
        }
    }

    let _ = zip.finish();
    buffer.into_inner()
}

/// GET /.well-known/skills.zip - Downloadable skills bundle
pub async fn skills_zip() -> impl IntoResponse {
    let zip_bytes = build_skills_zip();

    (
        StatusCode::OK,
        [
            ("Content-Type", "application/zip"),
            ("Content-Disposition", "attachment; filename=\"skills.zip\""),
        ],
        zip_bytes,
    )
}
