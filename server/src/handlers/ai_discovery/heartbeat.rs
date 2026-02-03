//! Heartbeat health endpoints for AI discovery.

use axum::{response::IntoResponse, Json};
use chrono::Utc;

use super::content::{SERVICE_NAME, VERSION};
use super::types::{HeartbeatResponse, HeartbeatServices};

/// GET /heartbeat.json - Health status (JSON)
pub async fn heartbeat_json() -> impl IntoResponse {
    let response = HeartbeatResponse {
        status: "healthy".to_string(),
        version: VERSION.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        services: HeartbeatServices {
            api: true,
            database: true,
            cache: true,
            stripe: Some(true),
            rpc: Some(true),
        },
    };

    Json(response)
}

/// GET /heartbeat.md - Health status with YAML frontmatter
pub async fn heartbeat_md() -> impl IntoResponse {
    let timestamp = Utc::now().to_rfc3339();

    let content = format!(
        r#"---
status: healthy
version: "{version}"
timestamp: "{timestamp}"
services:
  api: true
  database: true
  cache: true
  stripe: true
  rpc: true
---

# {name} Health Status

**Status**: healthy
**Version**: {version}
**Timestamp**: {timestamp}

## Service Status

| Service | Status |
|---------|--------|
| API | [+] Online |
| Database | [+] Connected |
| Cache | [+] Connected |
| Stripe | [+] Connected |
| RPC (Solana) | [+] Connected |

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| /llms.txt | API summary |
| /skill.md | Skill index |
| /openapi.json | OpenAPI spec |
| /.well-known/ai-discovery.json | AI discovery |

## Quick Health Check

```bash
curl -s /heartbeat.json | jq .status
```

## Response Codes

| Status | HTTP Code | Description |
|--------|-----------|-------------|
| healthy | 200 | All systems operational |
| degraded | 200 | Some systems impaired |
| unhealthy | 503 | Critical systems down |
"#,
        name = SERVICE_NAME,
        version = VERSION,
        timestamp = timestamp
    );

    ([("Content-Type", "text/markdown; charset=utf-8")], content)
}
