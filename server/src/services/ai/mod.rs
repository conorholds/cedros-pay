//! AI service for making completion requests to OpenAI and Gemini.
//!
//! Provides a unified interface for AI completions with provider-specific API handling.

pub mod orchestrator;
pub mod tool_executors;
pub mod tools;

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

use crate::handlers::admin_ai::{AiModel, AiProvider};
use crate::observability::record_ai_call;

pub use orchestrator::{
    ChatOrchestrator, ChatResult, FactFinderConfig, FaqMatch, DEFAULT_CHAT_SYSTEM_PROMPT,
};
pub use tools::{
    get_chat_tools, to_gemini_tools, to_openai_tools, ConversationMessage, ProductSearchArgs,
    ToolCall, ToolCallingResponse, ToolDefinition, ToolResult,
};

/// Default timeout for AI API requests
const AI_API_TIMEOUT: Duration = Duration::from_secs(30);

/// AI service error types
#[derive(Debug, Error)]
pub enum AiError {
    #[error("AI not configured: {0}")]
    NotConfigured(String),
    #[error("API key not set for provider: {0}")]
    ApiKeyMissing(String),
    #[error("AI service error: {0}")]
    ServiceError(String),
    #[error("Failed to parse AI response: {0}")]
    ParseError(String),
    #[error("HTTP error: {0}")]
    HttpError(String),
}

/// AI service for making completion requests
pub struct AiService {
    http_client: reqwest::Client,
}

impl Default for AiService {
    fn default() -> Self {
        Self::new()
    }
}

impl AiService {
    pub fn new() -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(AI_API_TIMEOUT)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self { http_client }
    }

    /// Make a completion request to the configured AI provider
    pub async fn complete(
        &self,
        provider: AiProvider,
        model: AiModel,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, AiError> {
        match provider {
            AiProvider::Openai => {
                self.openai_complete(model, api_key, system_prompt, user_prompt)
                    .await
            }
            AiProvider::Gemini => {
                self.gemini_complete(model, api_key, system_prompt, user_prompt)
                    .await
            }
        }
    }

    /// Make a completion request with metrics tracking
    ///
    /// # Arguments
    /// * `task` - The task name for metrics (e.g., "seo", "tags", "categories", "short_desc")
    pub async fn complete_with_metrics(
        &self,
        provider: AiProvider,
        model: AiModel,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
        task: &str,
    ) -> Result<String, AiError> {
        let start = Instant::now();
        let result = self
            .complete(provider, model, api_key, system_prompt, user_prompt)
            .await;
        let duration = start.elapsed().as_secs_f64();

        let provider_str = match provider {
            AiProvider::Openai => "openai",
            AiProvider::Gemini => "gemini",
        };
        let model_str = model_to_string(model);

        record_ai_call(provider_str, model_str, task, result.is_ok(), duration);

        result
    }

    /// OpenAI Chat Completions API
    async fn openai_complete(
        &self,
        model: AiModel,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, AiError> {
        let model_id = model_to_openai_id(model);

        let request_body = serde_json::json!({
            "model": model_id,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7
        });

        let response = self
            .http_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AiError::HttpError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::ServiceError(format!(
                "OpenAI API error ({}): {}",
                status, error_text
            )));
        }

        let body: OpenAiResponse = response
            .json()
            .await
            .map_err(|e| AiError::ParseError(format!("Failed to parse OpenAI response: {}", e)))?;

        body.choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| AiError::ParseError("No completion returned".to_string()))
    }

    /// Gemini GenerateContent API
    async fn gemini_complete(
        &self,
        model: AiModel,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, AiError> {
        let model_id = model_to_gemini_id(model);
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_id, api_key
        );

        let request_body = serde_json::json!({
            "contents": [{"parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "temperature": 0.7
            }
        });

        let response = self
            .http_client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AiError::HttpError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::ServiceError(format!(
                "Gemini API error ({}): {}",
                status, error_text
            )));
        }

        let body: GeminiResponse = response
            .json()
            .await
            .map_err(|e| AiError::ParseError(format!("Failed to parse Gemini response: {}", e)))?;

        body.candidates
            .into_iter()
            .next()
            .and_then(|c| c.content.parts.into_iter().next())
            .map(|p| p.text)
            .ok_or_else(|| AiError::ParseError("No completion returned".to_string()))
    }

    /// Make a completion request with tool calling support
    ///
    /// Returns a ToolCallingResponse that may contain tool calls the AI wants to make.
    pub async fn complete_with_tools(
        &self,
        provider: AiProvider,
        model: AiModel,
        api_key: &str,
        messages: &[ConversationMessage],
        tools: &[ToolDefinition],
    ) -> Result<ToolCallingResponse, AiError> {
        match provider {
            AiProvider::Openai => {
                self.openai_complete_with_tools(model, api_key, messages, tools)
                    .await
            }
            AiProvider::Gemini => {
                self.gemini_complete_with_tools(model, api_key, messages, tools)
                    .await
            }
        }
    }

    /// OpenAI Chat Completions with tool calling
    async fn openai_complete_with_tools(
        &self,
        model: AiModel,
        api_key: &str,
        messages: &[ConversationMessage],
        tools: &[ToolDefinition],
    ) -> Result<ToolCallingResponse, AiError> {
        let model_id = model_to_openai_id(model);

        // Convert messages to OpenAI format
        let openai_messages: Vec<Value> = messages
            .iter()
            .map(|m| match m {
                ConversationMessage::System { content } => {
                    serde_json::json!({"role": "system", "content": content})
                }
                ConversationMessage::User { content } => {
                    serde_json::json!({"role": "user", "content": content})
                }
                ConversationMessage::Assistant {
                    content,
                    tool_calls,
                } => {
                    let mut msg = serde_json::json!({"role": "assistant", "content": content});
                    if let Some(calls) = tool_calls {
                        let openai_calls: Vec<Value> = calls
                            .iter()
                            .map(|tc| {
                                serde_json::json!({
                                    "id": tc.id,
                                    "type": "function",
                                    "function": {
                                        "name": tc.name,
                                        "arguments": tc.arguments.to_string()
                                    }
                                })
                            })
                            .collect();
                        msg["tool_calls"] = serde_json::json!(openai_calls);
                    }
                    msg
                }
                ConversationMessage::Tool {
                    tool_call_id,
                    content,
                } => {
                    serde_json::json!({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": content
                    })
                }
            })
            .collect();

        let mut request_body = serde_json::json!({
            "model": model_id,
            "messages": openai_messages,
            "temperature": 0.7
        });

        if !tools.is_empty() {
            request_body["tools"] = to_openai_tools(tools);
        }

        let response = self
            .http_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AiError::HttpError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::ServiceError(format!(
                "OpenAI API error ({}): {}",
                status, error_text
            )));
        }

        let body: OpenAiToolResponse = response.json().await.map_err(|e| {
            AiError::ParseError(format!("Failed to parse OpenAI tool response: {}", e))
        })?;

        let choice = body
            .choices
            .into_iter()
            .next()
            .ok_or_else(|| AiError::ParseError("No completion returned".to_string()))?;

        let content = choice.message.content.unwrap_or_default();
        let tool_calls: Vec<ToolCall> = choice
            .message
            .tool_calls
            .unwrap_or_default()
            .into_iter()
            .map(|tc| ToolCall {
                id: tc.id,
                name: tc.function.name,
                arguments: serde_json::from_str(&tc.function.arguments).unwrap_or(Value::Null),
            })
            .collect();

        Ok(ToolCallingResponse::with_tools(content, tool_calls))
    }

    /// Gemini GenerateContent with tool calling
    async fn gemini_complete_with_tools(
        &self,
        model: AiModel,
        api_key: &str,
        messages: &[ConversationMessage],
        tools: &[ToolDefinition],
    ) -> Result<ToolCallingResponse, AiError> {
        let model_id = model_to_gemini_id(model);
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_id, api_key
        );

        // Extract system instruction from messages
        let system_content: String = messages
            .iter()
            .filter_map(|m| match m {
                ConversationMessage::System { content } => Some(content.clone()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        // Convert other messages to Gemini format
        let gemini_contents: Vec<Value> = messages
            .iter()
            .filter_map(|m| match m {
                ConversationMessage::User { content } => Some(serde_json::json!({
                    "role": "user",
                    "parts": [{"text": content}]
                })),
                ConversationMessage::Assistant { content, tool_calls } => {
                    let mut parts: Vec<Value> = vec![];
                    if !content.is_empty() {
                        parts.push(serde_json::json!({"text": content}));
                    }
                    if let Some(calls) = tool_calls {
                        for tc in calls {
                            parts.push(serde_json::json!({
                                "functionCall": {
                                    "name": tc.name,
                                    "args": tc.arguments
                                }
                            }));
                        }
                    }
                    if parts.is_empty() {
                        None
                    } else {
                        Some(serde_json::json!({
                            "role": "model",
                            "parts": parts
                        }))
                    }
                }
                ConversationMessage::Tool {
                    tool_call_id: _,
                    content,
                } => {
                    // Gemini uses functionResponse in parts
                    // Parse the content as JSON to get the name and response
                    if let Ok(parsed) = serde_json::from_str::<Value>(content) {
                        Some(serde_json::json!({
                            "role": "user",
                            "parts": [{
                                "functionResponse": {
                                    "name": parsed.get("name").and_then(|n| n.as_str()).unwrap_or("unknown"),
                                    "response": parsed.get("response").unwrap_or(&Value::Null)
                                }
                            }]
                        }))
                    } else {
                        None
                    }
                }
                ConversationMessage::System { .. } => None,
            })
            .collect();

        let mut request_body = serde_json::json!({
            "contents": gemini_contents,
            "generationConfig": {
                "temperature": 0.7
            }
        });

        if !system_content.is_empty() {
            request_body["systemInstruction"] =
                serde_json::json!({"parts": [{"text": system_content}]});
        }

        if !tools.is_empty() {
            request_body["tools"] = to_gemini_tools(tools);
        }

        let response = self
            .http_client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AiError::HttpError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::ServiceError(format!(
                "Gemini API error ({}): {}",
                status, error_text
            )));
        }

        let body: GeminiToolResponse = response.json().await.map_err(|e| {
            AiError::ParseError(format!("Failed to parse Gemini tool response: {}", e))
        })?;

        let candidate = body
            .candidates
            .into_iter()
            .next()
            .ok_or_else(|| AiError::ParseError("No completion returned".to_string()))?;

        let mut content = String::new();
        let mut tool_calls: Vec<ToolCall> = vec![];

        for part in candidate.content.parts {
            if let Some(text) = part.text {
                content.push_str(&text);
            }
            if let Some(fc) = part.function_call {
                tool_calls.push(ToolCall {
                    id: format!("gemini_{}", tool_calls.len()),
                    name: fc.name,
                    arguments: fc.args,
                });
            }
        }

        Ok(ToolCallingResponse::with_tools(content, tool_calls))
    }
}

// ============================================================================
// OpenAI Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiMessage {
    content: String,
}

// ============================================================================
// Gemini Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}

#[derive(Debug, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Deserialize)]
struct GeminiPart {
    text: String,
}

// ============================================================================
// OpenAI Tool Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct OpenAiToolResponse {
    choices: Vec<OpenAiToolChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiToolChoice {
    message: OpenAiToolMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiToolMessage {
    content: Option<String>,
    #[serde(default)]
    tool_calls: Option<Vec<OpenAiToolCall>>,
}

#[derive(Debug, Deserialize)]
struct OpenAiToolCall {
    id: String,
    function: OpenAiFunctionCall,
}

#[derive(Debug, Deserialize)]
struct OpenAiFunctionCall {
    name: String,
    arguments: String,
}

// ============================================================================
// Gemini Tool Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct GeminiToolResponse {
    candidates: Vec<GeminiToolCandidate>,
}

#[derive(Debug, Deserialize)]
struct GeminiToolCandidate {
    content: GeminiToolContent,
}

#[derive(Debug, Deserialize)]
struct GeminiToolContent {
    parts: Vec<GeminiToolPart>,
}

#[derive(Debug, Deserialize)]
struct GeminiToolPart {
    #[serde(default)]
    text: Option<String>,
    #[serde(rename = "functionCall")]
    function_call: Option<GeminiFunctionCall>,
}

#[derive(Debug, Deserialize)]
struct GeminiFunctionCall {
    name: String,
    args: Value,
}

// ============================================================================
// Model ID Mapping
// ============================================================================

fn model_to_openai_id(model: AiModel) -> &'static str {
    match model {
        AiModel::OpenAi4o => "gpt-4o",
        AiModel::OpenAi51 => "o1",
        AiModel::OpenAi52 => "o3",
        // Fallback for non-OpenAI models
        _ => "gpt-4o",
    }
}

fn model_to_gemini_id(model: AiModel) -> &'static str {
    match model {
        AiModel::Gemini25Flash => "gemini-2.5-flash-preview-05-20",
        AiModel::Gemini25Pro => "gemini-2.5-pro-preview-05-06",
        // Fallback for non-Gemini models
        _ => "gemini-2.5-flash-preview-05-20",
    }
}

fn model_to_string(model: AiModel) -> &'static str {
    match model {
        AiModel::NotSet => "not_set",
        AiModel::Gemini25Flash => "gemini-2.5-flash",
        AiModel::Gemini25Pro => "gemini-2.5-pro",
        AiModel::OpenAi4o => "gpt-4o",
        AiModel::OpenAi51 => "o1",
        AiModel::OpenAi52 => "o3",
    }
}

// ============================================================================
// Product Assistant Types
// ============================================================================

/// SEO generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeoResult {
    pub seo_title: String,
    pub seo_description: String,
}

/// Tags generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagsResult {
    pub tags: Vec<String>,
}

/// Category suggestion result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoriesResult {
    pub category_ids: Vec<String>,
}

/// Related products result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedProductsResult {
    pub related_product_ids: Vec<String>,
    #[serde(default)]
    pub reasoning: String,
}

/// Product search match from AI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSearchMatch {
    pub product_id: String,
    #[serde(default)]
    pub relevance: String,
}

/// Product search result from AI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSearchResult {
    pub matches: Vec<ProductSearchMatch>,
    #[serde(default)]
    pub reasoning: String,
}

/// Match from AI fact finder search
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FactFinderMatch {
    pub faq_id: String,
    #[serde(default)]
    pub relevance: String,
}

/// Result from AI fact finder search
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FactFinderResult {
    pub matches: Vec<FactFinderMatch>,
    #[serde(default)]
    pub reasoning: String,
}

// ============================================================================
// Default Prompts
// ============================================================================

pub const DEFAULT_SEO_PROMPT: &str = r#"You are an SEO expert. Given a product name and description, generate:
1. seoTitle: 50-60 chars, include key product terms, compelling for search results
2. seoDescription: 150-160 chars, compelling meta description for search engines

Respond ONLY with valid JSON in this exact format: {"seoTitle": "...", "seoDescription": "..."}"#;

pub const DEFAULT_TAGS_PROMPT: &str = r#"You are a product categorization expert. Generate 5-8 relevant tags for this product.
Tags should be lowercase, single words or short hyphenated phrases.
Focus on product type, materials, use cases, and key features.

Respond ONLY with valid JSON in this exact format: {"tags": ["tag1", "tag2", ...]}"#;

pub const DEFAULT_CATEGORIES_PROMPT: &str = r#"You are a product categorization expert. Given a product and a list of available categories, suggest the most relevant category IDs (maximum 3).
Only suggest categories from the provided list. If no categories fit well, return an empty array.

Available categories:
{categories}

Respond ONLY with valid JSON in this exact format: {"categoryIds": ["id1", "id2"]}"#;

pub const DEFAULT_SHORT_DESC_PROMPT: &str = r#"You are a copywriter. Write a concise 1-2 sentence product summary (max 150 characters) highlighting the key selling point.
Be compelling and focus on customer benefits.

Respond with ONLY the text, no JSON, no quotes, no extra formatting."#;

pub const DEFAULT_RELATED_PRODUCTS_PROMPT: &str = r#"You are a product recommendation expert. Given a product and a catalog of available products, identify 3-5 related products that customers might also be interested in.

Consider:
- Shared tags and categories
- Similar materials, style, or use cases
- Complementary products (accessories, bundles)
- Price range similarity

IMPORTANT: Only return product IDs that exist in the Available Products list below.

Respond ONLY with valid JSON in this exact format: {"relatedProductIds": ["id1", "id2", "id3"], "reasoning": "Brief explanation..."}"#;

pub const DEFAULT_PRODUCT_SEARCH_PROMPT: &str = r#"You are a helpful shopping assistant. A customer is looking for products. Based on their query, find the most relevant products from the catalog.

Consider:
- Product names and descriptions that match the query
- Tags and categories that relate to what they're looking for
- Color, size, material, or style preferences mentioned
- Price range if specified

Return up to 3 of the MOST relevant products. Only return products that genuinely match what the customer is looking for.

IMPORTANT: Only return product IDs that exist in the Available Products list below.

Respond ONLY with valid JSON in this exact format: {"matches": [{"productId": "id1", "relevance": "Why this matches"}, ...], "reasoning": "Brief summary of search results"}"#;

pub const DEFAULT_FACT_FINDER_PROMPT: &str = r#"You are a knowledgeable customer service assistant. A customer has asked a question. Search through the FAQ entries below to find the most relevant answers.

Consider:
- Questions that directly address what the customer is asking
- Related topics that might help answer their question
- Policies, procedures, or information that applies to their situation

Return up to 3 of the MOST relevant FAQ entries. Only return entries that genuinely help answer the customer's question.

IMPORTANT: Only return FAQ IDs that exist in the Available FAQs list below.

Respond ONLY with valid JSON in this exact format: {"matches": [{"faqId": "id1", "relevance": "Why this FAQ helps answer the question"}, ...], "reasoning": "Brief explanation of what was found"}"#;

// ============================================================================
// Utility Functions
// ============================================================================

/// Generate a URL-friendly slug from text
pub fn slugify(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c
            } else if c.is_whitespace() || c == '-' || c == '_' {
                '-'
            } else {
                ' ' // will be removed
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("")
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Parse JSON from AI response, handling markdown code blocks
pub fn parse_json_response<T: serde::de::DeserializeOwned>(response: &str) -> Result<T, AiError> {
    // Try direct parse first
    if let Ok(parsed) = serde_json::from_str(response) {
        return Ok(parsed);
    }

    // Try extracting from markdown code block
    let cleaned = response
        .trim()
        .strip_prefix("```json")
        .or_else(|| response.trim().strip_prefix("```"))
        .unwrap_or(response)
        .strip_suffix("```")
        .unwrap_or(response)
        .trim();

    serde_json::from_str(cleaned)
        .map_err(|e| AiError::ParseError(format!("Invalid JSON: {} - Response: {}", e, response)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("Product Name!"), "product-name");
        assert_eq!(slugify("  Multiple   Spaces  "), "multiple-spaces");
        assert_eq!(slugify("Already-slugified"), "already-slugified");
        assert_eq!(slugify("Special@#$Characters"), "specialcharacters");
    }

    #[test]
    fn test_parse_json_response() {
        // Direct JSON
        let result: SeoResult =
            parse_json_response(r#"{"seoTitle": "Test", "seoDescription": "Desc"}"#).unwrap();
        assert_eq!(result.seo_title, "Test");

        // With markdown code block
        let result: TagsResult =
            parse_json_response("```json\n{\"tags\": [\"a\", \"b\"]}\n```").unwrap();
        assert_eq!(result.tags, vec!["a", "b"]);
    }
}
