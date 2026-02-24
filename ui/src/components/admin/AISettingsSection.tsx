/**
 * AI Settings Section - Manage API keys and model assignments
 *
 * Two sub-sections:
 * 1. API Keys - Configure Google Gemini and OpenAI API keys
 * 2. Model Assignments - Assign models to AI tasks
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { FormDropdown } from './Dropdown';
import { type AutosaveStatus } from './useAutosave';
import { AutosaveIndicator } from './AutosaveIndicator';
import type {
  SectionProps,
  AIProvider,
  AIModel,
  AIModelInfo,
  AITask,
  AISettings,
} from './types';

/** Available AI models with display info */
const AI_MODELS: AIModelInfo[] = [
  { id: 'not_set', label: 'Disabled', provider: null },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'openai-4o', label: 'OpenAI 4o', provider: 'openai' },
  { id: 'openai-5.1', label: 'OpenAI 5.1', provider: 'openai' },
  { id: 'openai-5.2', label: 'OpenAI 5.2', provider: 'openai' },
];

/** AI tasks that can be configured */
const AI_TASKS: { task: AITask; label: string; description: string; defaultPrompt: string }[] = [
  {
    task: 'site_chat',
    label: 'Site Chat',
    description: 'The conversational model that crafts responses to customer messages',
    defaultPrompt: `You are a friendly and helpful shopping assistant for our store. Your role is to:

- Help customers find products that match their needs
- Answer questions about products, shipping, returns, and store policies
- Provide personalized recommendations based on customer preferences
- Use the Product Searcher tool when customers are looking for specific items

Guidelines:
- Be warm, conversational, and concise
- Stay focused on helping with shopping-related questions
- If you don't know something specific about a product, say so honestly
- Never make up product details, prices, or availability
- For complex issues (order problems, refunds), direct customers to contact support`,
  },
  {
    task: 'product_searcher',
    label: 'Product Searcher',
    description: 'Tool used by Site Chat to find products based on customer queries',
    defaultPrompt: `You are a product search assistant. Given a customer's query, extract relevant search parameters to find matching products.

Extract the following when present:
- Keywords: Main search terms
- Category: Product category or type
- Price range: Min/max price if mentioned
- Attributes: Color, size, material, brand, or other specifications
- Sort preference: Price, popularity, newest, etc.

Return structured search parameters. Be liberal in interpretation - if a customer says "something for my mom's birthday under $50" extract: keywords=gift, price_max=50, occasion=birthday.

Do not make assumptions about specific products. Focus only on extracting search intent.`,
  },
  {
    task: 'related_product_finder',
    label: 'Related Product Finder',
    description: 'AI-powered recommendations for related products on product pages',
    defaultPrompt: `You are a product recommendation engine. Given a product, suggest related items that customers might also be interested in.

Consider these recommendation types:
- Complementary items: Products that go well together (e.g., phone case for a phone)
- Similar alternatives: Products in the same category with different features or price points
- Frequently bought together: Items commonly purchased as a set
- Upsells: Premium versions or upgrades

Guidelines:
- Prioritize relevance over variety
- Consider the product's category, price range, and use case
- Return product IDs or search criteria for related items
- Aim for 4-8 recommendations with a mix of types`,
  },
  {
    task: 'product_detail_assistant',
    label: 'Product Detail Assistant',
    description: 'Admin tool to generate product descriptions, suggest tags, and fill out product details',
    defaultPrompt: `You are a product copywriting assistant helping store administrators create compelling product listings.

You can help with:
- Writing engaging product descriptions that highlight key features and benefits
- Suggesting relevant tags and categories for better discoverability
- Creating SEO-friendly titles and meta descriptions
- Generating bullet points for key features
- Writing size guides or care instructions when applicable

Guidelines:
- Match the store's brand voice (ask if unclear)
- Focus on benefits, not just features
- Use sensory language when appropriate
- Keep descriptions scannable with short paragraphs
- Avoid superlatives and unverifiable claims
- Include relevant keywords naturally for SEO`,
  },
];

/** Provider display info */
const PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: 'gemini', label: 'Google Gemini API', placeholder: 'AIza...' },
  { id: 'openai', label: 'OpenAI API', placeholder: 'sk-...' },
];

type TabId = 'api-keys' | 'assignments' | 'prompts';

const DEFAULT_SETTINGS: AISettings = {
  apiKeys: [
    { provider: 'gemini', isConfigured: false },
    { provider: 'openai', isConfigured: false },
  ],
  taskAssignments: AI_TASKS.map((t) => ({
    task: t.task,
    label: t.label,
    description: t.description,
    assignedModel: 'not_set',
    systemPrompt: t.defaultPrompt,
  })),
};

export function AISettingsSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Timeout refs for cleanup
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API key input state (separate from saved state for security)
  const [keyInputs, setKeyInputs] = useState<Record<AIProvider, string>>({
    gemini: '',
    openai: '',
  });
  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    openai: false,
  });

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      let data: { settings: AISettings };

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ settings: AISettings }>('/admin/config/ai');
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}/admin/config/ai`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        data = await res.json();
      }

      if (data.settings) {
        setSettings(data.settings);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setFetchError('Could not load saved AI settings. Showing defaults.');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save API key
  const handleSaveApiKey = useCallback(
    async (provider: AIProvider) => {
      const key = keyInputs[provider];
      if (!key.trim()) return;

      setIsSaving(true);
      setError(null);

      try {
        const payload = { provider, apiKey: key };

        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth('/admin/config/ai/api-key', {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;

          const res = await fetch(`${serverUrl}/admin/config/ai/api-key`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
        }

        // Update local state
        setSettings((prev) => ({
          ...prev,
          apiKeys: prev.apiKeys.map((k) =>
            k.provider === provider
              ? {
                  ...k,
                  isConfigured: true,
                  maskedKey: `${key.slice(0, 4)}...${key.slice(-4)}`,
                  updatedAt: new Date().toISOString(),
                }
              : k
          ),
        }));

        // Clear input
        setKeyInputs((prev) => ({ ...prev, [provider]: '' }));
        setSaveSuccess(true);
        if (saveSuccessTimeoutRef.current) clearTimeout(saveSuccessTimeoutRef.current);
        saveSuccessTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save API key');
      } finally {
        setIsSaving(false);
      }
    },
    [keyInputs, serverUrl, apiKey, authManager]
  );

  // Delete API key
  const handleDeleteApiKey = useCallback(
    async (provider: AIProvider) => {
      if (!confirm(`Are you sure you want to delete the ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} API key?`)) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth(`/admin/config/ai/api-key/${provider}`, {
            method: 'DELETE',
          });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;

          const res = await fetch(`${serverUrl}/admin/config/ai/api-key/${provider}`, {
            method: 'DELETE',
            headers,
          });
          if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
        }

        // Update local state
        setSettings((prev) => ({
          ...prev,
          apiKeys: prev.apiKeys.map((k) =>
            k.provider === provider
              ? { provider, isConfigured: false }
              : k
          ),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete API key');
      } finally {
        setIsSaving(false);
      }
    },
    [serverUrl, apiKey, authManager]
  );

  // Save model assignment
  const handleAssignModel = useCallback(
    async (task: AITask, model: AIModel) => {
      setIsSaving(true);
      setError(null);

      try {
        const payload = { task, model };

        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth('/admin/config/ai/assignment', {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;

          const res = await fetch(`${serverUrl}/admin/config/ai/assignment`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
        }

        // Update local state
        setSettings((prev) => ({
          ...prev,
          taskAssignments: prev.taskAssignments.map((t) =>
            t.task === task ? { ...t, assignedModel: model } : t
          ),
        }));

        setSaveSuccess(true);
        if (saveSuccessTimeoutRef.current) clearTimeout(saveSuccessTimeoutRef.current);
        saveSuccessTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save assignment');
      } finally {
        setIsSaving(false);
      }
    },
    [serverUrl, apiKey, authManager]
  );

  // Check if a model's provider has an API key configured
  const isModelAvailable = useCallback(
    (model: AIModel): boolean => {
      if (model === 'not_set') return true;
      const modelInfo = AI_MODELS.find((m) => m.id === model);
      if (!modelInfo?.provider) return true;
      const keyConfig = settings.apiKeys.find((k) => k.provider === modelInfo.provider);
      return keyConfig?.isConfigured ?? false;
    },
    [settings.apiKeys]
  );

  // Compute model options for dropdown
  const modelOptions = useMemo(() => {
    return AI_MODELS.map((model) => {
      const available = isModelAvailable(model.id);
      return {
        value: model.id,
        label: available ? model.label : `${model.label} (API key required)`,
        disabled: !available,
      };
    });
  }, [isModelAvailable]);

  // Save system prompt
  const handleSavePrompt = useCallback(
    async (task: AITask, prompt: string) => {
      setIsSaving(true);
      setError(null);

      try {
        const payload = { task, systemPrompt: prompt };

        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth('/admin/config/ai/prompt', {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;

          const res = await fetch(`${serverUrl}/admin/config/ai/prompt`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
        }

        // Update local state
        setSettings((prev) => ({
          ...prev,
          taskAssignments: prev.taskAssignments.map((t) =>
            t.task === task ? { ...t, systemPrompt: prompt } : t
          ),
        }));

        setSaveSuccess(true);
        if (saveSuccessTimeoutRef.current) clearTimeout(saveSuccessTimeoutRef.current);
        saveSuccessTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save prompt');
      } finally {
        setIsSaving(false);
      }
    },
    [serverUrl, apiKey, authManager]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current) clearTimeout(saveSuccessTimeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="cedros-admin__section">
        <div className="cedros-admin__loading">{Icons.loading} Loading AI settings...</div>
      </div>
    );
  }

  return (
    <div className="cedros-admin__ai-settings">
      {/* Page Header */}
      <div className="cedros-admin__page-header">
        <h2 className="cedros-admin__page-title">Store AI</h2>
        <p className="cedros-admin__page-description">
          Configure AI providers, model assignments, and system prompts.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="cedros-admin__tabs cedros-admin__tabs--line">
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'api-keys' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          API Keys
        </button>
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'assignments' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Model Assignments
        </button>
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'prompts' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('prompts')}
        >
          Prompts
        </button>
      </div>

      {error && (
        <div className="cedros-admin__error-banner" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <ErrorBanner message={fetchError} onRetry={fetchSettings} />

      {saveSuccess && (
        <div className="cedros-admin__success-banner" style={{ marginTop: '1rem' }}>
          {Icons.check} Settings saved successfully
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">API Keys</h3>
          </div>
          <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: 14 }}>
            Configure API keys for AI providers. Keys are stored securely and never exposed.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {PROVIDERS.map((provider) => {
              const config = settings.apiKeys.find((k) => k.provider === provider.id);
              const isConfigured = config?.isConfigured ?? false;

              return (
                <div
                  key={provider.id}
                  className="cedros-admin__api-key-card"
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--cedros-admin-border)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{provider.label}</div>
                      {isConfigured && config?.maskedKey && (
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                          Current key: {config.maskedKey}
                          {config.updatedAt && (
                            <span> (updated {new Date(config.updatedAt).toLocaleDateString()})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`cedros-admin__badge ${isConfigured ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}
                    >
                      {isConfigured ? 'Configured' : 'Not Set'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        className="cedros-admin__input"
                        placeholder={isConfigured ? 'Enter new key to replace' : provider.placeholder}
                        value={keyInputs[provider.id]}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                        }
                        onBlur={() => {
                          // Autosave on blur if there's input
                          if (keyInputs[provider.id].trim()) {
                            handleSaveApiKey(provider.id);
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost"
                        onClick={() =>
                          setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                        }
                        title={showKeys[provider.id] ? 'Hide key' : 'Show key'}
                        style={{ padding: '0.5rem' }}
                      >
                        {showKeys[provider.id] ? Icons.eyeOff : Icons.eye}
                      </button>
                      {isConfigured && (
                        <button
                          type="button"
                          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger"
                          onClick={() => handleDeleteApiKey(provider.id)}
                          disabled={isSaving}
                          title="Remove API key"
                          style={{ padding: '0.5rem' }}
                        >
                          {Icons.trash}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Model Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">Model Assignments</h3>
          </div>
          <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: 14 }}>
            Assign AI models to specific tasks. Models require their provider's API key to be configured.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {settings.taskAssignments.map((taskConfig) => {
              const taskInfo = AI_TASKS.find((t) => t.task === taskConfig.task);
              const currentModel = AI_MODELS.find((m) => m.id === taskConfig.assignedModel);

              return (
                <div
                  key={taskConfig.task}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--cedros-admin-border)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{taskInfo?.label ?? taskConfig.task}</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>
                      {taskInfo?.description}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FormDropdown
                      value={taskConfig.assignedModel}
                      onChange={(val) => handleAssignModel(taskConfig.task, val as AIModel)}
                      options={modelOptions}
                      label=""
                      disabled={isSaving}
                      style={{ flex: 1, maxWidth: 280 }}
                    />

                    {currentModel && currentModel.provider && (
                      <span
                        className={`cedros-admin__badge ${
                          isModelAvailable(currentModel.id)
                            ? 'cedros-admin__badge--success'
                            : 'cedros-admin__badge--warning'
                        }`}
                      >
                        {isModelAvailable(currentModel.id) ? 'Ready' : 'Missing API Key'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <div className="cedros-admin__section" style={{ marginTop: '1rem' }}>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">System Prompts</h3>
          </div>
          <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: 14 }}>
            Configure the default system prompts for each AI task. These prompts guide the AI's behavior and responses.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {settings.taskAssignments.map((taskConfig) => {
              const taskInfo = AI_TASKS.find((t) => t.task === taskConfig.task);

              return (
                <PromptEditor
                  key={taskConfig.task}
                  task={taskConfig.task}
                  label={taskInfo?.label ?? taskConfig.task}
                  description={taskInfo?.description ?? ''}
                  initialPrompt={taskConfig.systemPrompt ?? ''}
                  onSave={handleSavePrompt}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual prompt editor with autosave */
function PromptEditor({
  task,
  label,
  description,
  initialPrompt,
  onSave,
}: {
  task: AITask;
  label: string;
  description: string;
  initialPrompt: string;
  onSave: (task: AITask, prompt: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Debounced autosave
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear existing timeouts
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);

    setStatus('pending');

    debounceRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave(task, prompt);
        setStatus('saved');
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [prompt, task, onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid var(--cedros-admin-border)',
        borderRadius: 8,
      }}
    >
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{description}</div>
        </div>
        <AutosaveIndicator status={status} />
      </div>

      <textarea
        className="cedros-admin__input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter system prompt..."
        rows={4}
        style={{
          width: '100%',
          resize: 'vertical',
          fontFamily: 'inherit',
          minHeight: 100,
        }}
      />
    </div>
  );
}

