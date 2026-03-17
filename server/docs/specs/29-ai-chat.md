# Cedros Pay Server - AI Services & Chat

Specification for AI-powered storefront chat, product search, SEO generation, and knowledge base
tools. Covers data models, the chat orchestrator, public and admin endpoints, configuration, and
storage API.

---

## Overview

The AI module supports multiple providers (Gemini, OpenAI) with per-task model assignment. Tasks
include storefront chat, product search, related product discovery, product detail assistance, and
fact/FAQ lookup. API keys and prompt overrides are stored encrypted in the `app_config` table under
the `ai` category and are managed via admin endpoints.

---

## Data Models

### AiProvider

```
Gemini
Openai
```

### AiModel

| Variant | Wire value |
|---------|------------|
| `NotSet` | — |
| `Gemini25Flash` | `"gemini-2.5-flash-preview-05-20"` |
| `Gemini25Pro` | `"gemini-2.5-pro-preview-05-06"` |
| `OpenAi4o` | `"gpt-4o"` |
| `OpenAi51` | `"o1"` |
| `OpenAi52` | `"o3"` |

### AiTask

```
SiteChat
ProductSearcher
RelatedProductFinder
ProductDetailAssistant
FactFinder
```

### ChatSession

```
id:               String
tenant_id:        String
customer_id:      Option<String>
customer_email:   Option<String>
status:           String
message_count:    i32
last_message_at:  DateTime
created_at:       DateTime
```

### ChatMessage

```
id:          String
session_id:  String
role:        String             — "user" | "assistant"
content:     String
products:    Option<Vec<ProductSearchMatch>>
actions:     Option<Vec<String>>
created_at:  DateTime
```

### Result Types

#### SeoResult / TagsResult / CategoriesResult

Structured wrappers returned by the corresponding product content generation tools. Each contains a
single generated text field.

#### ProductSearchResult

```
matches: Vec<ProductSearchMatch>
```

#### ProductSearchMatch

```
product_id:       String
title:            String
relevance_score:  f32
```

#### RelatedProductsResult

```
products: Vec<ProductSearchMatch>
```

#### FactFinderResult

```
matches: Vec<FactFinderMatch>
```

#### FactFinderMatch

```
question:         String
answer:           String
relevance_score:  f32
```

#### ChatResult

```
message:   String
products:  Vec<ProductSearchMatch>
faqs:      Vec<FaqMatch>
actions:   Vec<String>
```

#### FaqMatch

```
question:         String
answer:           String
relevance_score:  f32
```

---

## Tool Calling

Structures used when the AI provider supports function / tool calling.

### ToolDefinition

```
name:         String
description:  String
parameters:   serde_json::Value   — JSON Schema of the tool's arguments
```

### ToolCall

```
id:         String
name:       String
arguments:  String   — JSON-encoded argument string
```

### ToolCallingResponse

```
message:     Option<String>
tool_calls:  Vec<ToolCall>
```

### ToolResult

```
tool_call_id:  String
content:       String
```

### ProductSearchArgs

```
query:     String
category:  Option<String>
limit:     Option<u32>
```

---

## Default Prompts

The following constants define the system prompts used when no tenant-level override is configured.
One constant exists per `AiTask` plus supporting generation tasks:

```
DEFAULT_CHAT_SYSTEM_PROMPT
DEFAULT_SEO_PROMPT
DEFAULT_TAGS_PROMPT
DEFAULT_CATEGORIES_PROMPT
DEFAULT_SHORT_DESC_PROMPT
DEFAULT_RELATED_PRODUCTS_PROMPT
DEFAULT_PRODUCT_SEARCH_PROMPT
DEFAULT_FACT_FINDER_PROMPT
```

Custom prompts stored in `app_config` override the corresponding constant at runtime.

---

## Chat Orchestrator

The chat orchestrator handles multi-turn storefront conversations with tool calling. It is invoked
by the public `POST /chat` endpoint.

### Conversation Loop

1. Load the last 20 messages from the chat session.
2. Send the conversation history, system prompt, and tool definitions to the assigned AI provider.
3. If the provider returns `tool_calls`:
   a. Execute each tool (product search via `ProductSearcher`, FAQ lookup via `FactFinder`).
   b. Append tool results and send the updated conversation back to the provider.
4. Return the final `ChatResult` containing the assistant message plus any matched products, FAQs,
   and action hints.

The effective system prompt is the tenant-scoped `prompt_site_chat` config value when set, falling
back to `DEFAULT_CHAT_SYSTEM_PROMPT`.

---

## Public Endpoints

### POST /chat

Sends a user message to a storefront chat session.

Request:
```json
{
  "sessionId": "sess_abc123",
  "message": "I'm looking for gold jewelry"
}
```

`sessionId` is optional. If omitted, a new `ChatSession` is created and its `id` is returned.

Response:
```json
{
  "sessionId": "sess_abc123",
  "message": "Here are some options that might interest you...",
  "products": [
    { "productId": "prod_xyz", "title": "Gold Hoop Earrings", "relevanceScore": 0.95 }
  ],
  "faqs": [],
  "actions": ["view_product:prod_xyz"]
}
```

Behaviour:

- Rate-limited per tenant via `AiRateLimiter`. Excess requests return `429 Too Many Requests`.
- The incoming user message and the assistant response are each persisted as `ChatMessage` records.
- `message_count` and `last_message_at` on the session are updated after each round trip.

---

## Admin Endpoints

All admin endpoints require admin authentication.

### AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/config/ai` | Get all AI configuration for the tenant |
| PUT | `/admin/config/ai/api-key` | Save a provider API key (stored encrypted) |
| DELETE | `/admin/config/ai/api-key/:provider` | Delete the API key for a provider |
| PUT | `/admin/config/ai/assignment` | Assign a model to a task |
| PUT | `/admin/config/ai/prompt` | Save a custom system prompt for a task |

#### PUT /admin/config/ai/api-key

Request:
```json
{
  "provider": "gemini",
  "apiKey": "AIza..."
}
```

API keys are encrypted before being written to `app_config`. They are never returned in GET
responses.

#### PUT /admin/config/ai/assignment

Request:
```json
{
  "task": "site_chat",
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

Stored as `assignment_site_chat` in the `ai` config category.

#### PUT /admin/config/ai/prompt

Request:
```json
{
  "task": "site_chat",
  "prompt": "You are a helpful assistant for our jewellery store..."
}
```

Stored as `prompt_site_chat` in the `ai` config category.

---

### Chat CRM

Admin view of customer chat sessions and messages.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/chats` | List chat sessions (query: `limit`, `offset`, `status`) |
| GET | `/admin/chats/:sessionId` | Get a session with its full message history |
| GET | `/admin/users/:userId/chats` | List chat sessions for a specific user |

---

### AI Assistant (Admin-Facing Product Tools)

Admin endpoints expose the same AI capabilities used by the chat orchestrator as standalone tools
for product management workflows:

- **Product detail assistant** — generate or improve product copy.
- **Product search** — semantic search across the product catalogue.
- **Related products** — find products related to a given product.

These endpoints are rate-limited separately from the public chat endpoint.

---

### AI Discovery

Machine-readable endpoints for AI agent interoperability:

- **Agent manifests** — describe available AI capabilities.
- **Skills** — enumerate callable skills.
- **Heartbeat** — liveness probe for AI integrations.
- **llms.txt** — convention-based metadata file for LLM consumers.

---

## Configuration

Stored in the `app_config` table under `category = "ai"`.

| Key | Description |
|-----|-------------|
| `gemini_api_key` | Gemini API key — encrypted at rest |
| `openai_api_key` | OpenAI API key — encrypted at rest |
| `assignment_{task}` | JSON object `{ "provider": "...", "model": "..." }` for the given task |
| `prompt_{task}` | Custom system prompt string for the given task |

Examples of `assignment_*` keys: `assignment_site_chat`, `assignment_product_searcher`,
`assignment_fact_finder`.

API keys are never returned via GET endpoints; they are write-only from the admin perspective.

---

## Storage API

All methods are scoped to `tenant_id`.

```
store.list_chat_sessions(tenant_id, query)         -> Vec<ChatSession>
store.get_chat_session(tenant_id, session_id)      -> Option<ChatSession>
store.create_chat_session(session)                 -> ChatSession
store.save_chat_message(message)                   -> ChatMessage
store.list_chat_messages(tenant_id, session_id)    -> Vec<ChatMessage>
store.update_chat_session_message_count(
    tenant_id, session_id, count, last_message_at) -> Result<()>

config_repo.get(category="ai", key)                -> Option<String>
config_repo.set(category="ai", key, value)         -> Result<()>
```
