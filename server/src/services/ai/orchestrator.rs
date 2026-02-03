//! Chat Orchestrator for managing AI conversations with tool calling.
//!
//! Handles the conversation loop, tool execution, and message persistence.

use std::sync::Arc;

use futures_util::future::join_all;

use serde::{Deserialize, Serialize};

use crate::handlers::admin_ai::{AiModel, AiProvider};
use crate::handlers::admin_ai_assistant::ProductMatch;
use crate::models::{ChatMessage, Faq, Product};

use super::tool_executors::execute_tool;
use super::tools::{
    get_chat_tools, ConversationMessage, ToolCall, ToolCallingResponse, ToolDefinition,
};
use super::{AiError, AiService};

/// Maximum number of tool-calling rounds to prevent infinite loops
const MAX_TOOL_ROUNDS: usize = 3;

/// Maximum messages to include in conversation context
const MAX_CONTEXT_MESSAGES: usize = 20;

/// Default system prompt for chat
pub const DEFAULT_CHAT_SYSTEM_PROMPT: &str = r#"You are a helpful shopping assistant for an online store. Your role is to:

1. Help customers find products they're looking for
2. Answer questions about products, policies, shipping, returns, etc.
3. Provide helpful, friendly customer service

When customers ask about products, use the product_search tool to find relevant items.
When customers ask about policies, shipping, returns, store info, or other factual questions, use the fact_finder tool to search the FAQ.
Be conversational and helpful. If you can't find what they're looking for, suggest alternatives or ask clarifying questions.

Keep responses concise but friendly."#;

/// FAQ match result from fact_finder tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaqMatch {
    pub id: String,
    pub question: String,
    pub answer: String,
}

/// Configuration for AI-powered fact finder
#[derive(Debug, Clone)]
pub struct FactFinderConfig {
    pub provider: AiProvider,
    pub model: AiModel,
    pub api_key: String,
    pub prompt: String,
}

/// Result from a chat orchestration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResult {
    /// The assistant's text response
    pub message: String,
    /// Products found via tool calls (if any)
    pub products: Vec<ProductMatch>,
    /// FAQ entries found via fact_finder (if any)
    pub faqs: Vec<FaqMatch>,
    /// Actions taken (for future extensibility)
    pub actions: Vec<String>,
}

/// Chat orchestrator for managing AI conversations
pub struct ChatOrchestrator {
    ai_service: Arc<AiService>,
}

impl ChatOrchestrator {
    pub fn new(ai_service: Arc<AiService>) -> Self {
        Self { ai_service }
    }

    /// Process a user message and return the AI response
    ///
    /// Uses speculative execution: runs tool-decision AND direct-response in parallel.
    /// If no tools needed, returns speculative response immediately (lower latency).
    #[allow(clippy::too_many_arguments)]
    pub async fn process_message(
        &self,
        provider: AiProvider,
        model: AiModel,
        api_key: &str,
        system_prompt: Option<&str>,
        history: &[ChatMessage],
        user_message: &str,
        products: &[Product],
        faqs: &[Faq],
        fact_finder_config: Option<&FactFinderConfig>,
    ) -> Result<ChatResult, AiError> {
        // Build conversation from history
        let mut messages = self.build_conversation(system_prompt, history);

        // Add the new user message
        messages.push(ConversationMessage::user(user_message));

        let tools = get_chat_tools();

        // SPECULATIVE EXECUTION: Run tool-decision AND direct-response in parallel
        // This reduces latency when no tools are needed (common for greetings, simple questions)
        let tool_future = self
            .ai_service
            .complete_with_tools(provider, model, api_key, &messages, &tools);
        let speculative_future =
            self.ai_service
                .complete_with_tools(provider, model, api_key, &messages, &[]); // No tools = direct response

        let (tool_result, speculative_result) = tokio::join!(tool_future, speculative_future);

        let tool_response = tool_result?;

        // If no tools needed, return speculative response immediately
        if tool_response.is_complete {
            // Use speculative if available, otherwise use tool response
            let message = speculative_result
                .map(|r| r.content)
                .unwrap_or(tool_response.content);
            return Ok(ChatResult {
                message,
                products: vec![],
                faqs: vec![],
                actions: vec![],
            });
        }

        // Tools needed - get speculative response for enhancement (if available)
        let speculative_draft = speculative_result.ok().map(|r| r.content);

        // Execute tool calls
        self.execute_tool_loop(
            provider,
            model,
            api_key,
            messages,
            &tools,
            tool_response,
            products,
            faqs,
            fact_finder_config,
            speculative_draft,
        )
        .await
    }

    /// Execute tool calling loop and return final response
    #[allow(clippy::too_many_arguments)]
    async fn execute_tool_loop(
        &self,
        provider: AiProvider,
        model: AiModel,
        api_key: &str,
        mut messages: Vec<ConversationMessage>,
        tools: &[ToolDefinition],
        initial_response: ToolCallingResponse,
        products: &[Product],
        faqs: &[Faq],
        fact_finder_config: Option<&FactFinderConfig>,
        speculative_draft: Option<String>,
    ) -> Result<ChatResult, AiError> {
        let mut collected_products: Vec<ProductMatch> = vec![];
        let mut collected_faqs: Vec<FaqMatch> = vec![];
        let mut actions: Vec<String> = vec![];
        let mut rounds = 0;
        let mut current_response = initial_response;

        loop {
            // Process tool calls in parallel
            let tool_futures: Vec<_> = current_response
                .tool_calls
                .iter()
                .map(|tc| execute_tool(&self.ai_service, tc, products, faqs, fact_finder_config))
                .collect();

            let tool_results = join_all(tool_futures).await;

            // Add assistant message with all tool calls
            messages.push(ConversationMessage::assistant_with_tools(
                &current_response.content,
                current_response.tool_calls.clone(),
            ));

            // Collect results and add tool result messages
            for (tool_call, (result_str, found_products, found_faqs, action)) in
                current_response.tool_calls.iter().zip(tool_results)
            {
                messages.push(ConversationMessage::tool(&tool_call.id, result_str));
                collected_products.extend(found_products);
                collected_faqs.extend(found_faqs);
                if let Some(a) = action {
                    actions.push(a);
                }
            }

            rounds += 1;

            if rounds >= MAX_TOOL_ROUNDS {
                tracing::warn!("Max tool rounds reached, returning current response");
                break;
            }

            // On first round after tools, add speculative draft as enhancement hint
            if rounds == 1 {
                if let Some(ref draft) = speculative_draft {
                    if !draft.is_empty() {
                        messages.push(ConversationMessage::system(format!(
                            "Note: Before seeing these search results, you were going to respond with: \
                            \"{}\". Please enhance or adjust your response based on what was found. \
                            If the search results are helpful, incorporate them naturally. \
                            If they're not relevant, you can use your original response.",
                            draft
                        )));
                    }
                }
            }

            // Get next response
            let next_response = self
                .ai_service
                .complete_with_tools(provider, model, api_key, &messages, tools)
                .await?;

            if next_response.is_complete {
                return Ok(ChatResult {
                    message: next_response.content,
                    products: collected_products,
                    faqs: collected_faqs,
                    actions,
                });
            }

            current_response = next_response;
        }

        // If we hit max rounds, generate a summary response
        Ok(ChatResult {
            message: "I've found some information for you.".to_string(),
            products: collected_products,
            faqs: collected_faqs,
            actions,
        })
    }

    /// Build conversation messages from history
    fn build_conversation(
        &self,
        system_prompt: Option<&str>,
        history: &[ChatMessage],
    ) -> Vec<ConversationMessage> {
        let mut messages = vec![];

        // Add system prompt
        let prompt = system_prompt.unwrap_or(DEFAULT_CHAT_SYSTEM_PROMPT);
        messages.push(ConversationMessage::system(prompt));

        // Add recent history (limited to MAX_CONTEXT_MESSAGES)
        let start = if history.len() > MAX_CONTEXT_MESSAGES {
            history.len() - MAX_CONTEXT_MESSAGES
        } else {
            0
        };

        for msg in &history[start..] {
            match msg.role.as_str() {
                "user" => {
                    messages.push(ConversationMessage::user(&msg.content));
                }
                "assistant" => {
                    // Check if this message had tool calls
                    if let Some(ref tool_calls) = msg.tool_calls {
                        if let Ok(calls) =
                            serde_json::from_value::<Vec<ToolCall>>(tool_calls.clone())
                        {
                            messages.push(ConversationMessage::assistant_with_tools(
                                &msg.content,
                                calls,
                            ));
                        } else {
                            messages.push(ConversationMessage::assistant(&msg.content));
                        }
                    } else {
                        messages.push(ConversationMessage::assistant(&msg.content));
                    }
                }
                "tool" => {
                    // Tool messages should have tool_call_id in tool_results
                    if let Some(ref results) = msg.tool_results {
                        if let Some(id) = results.get("tool_call_id").and_then(|v| v.as_str()) {
                            messages.push(ConversationMessage::tool(id, &msg.content));
                        }
                    }
                }
                _ => {
                    // Skip unknown roles
                }
            }
        }

        messages
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_chat_system_prompt() {
        assert!(DEFAULT_CHAT_SYSTEM_PROMPT.contains("shopping assistant"));
        assert!(DEFAULT_CHAT_SYSTEM_PROMPT.contains("product_search"));
    }
}
