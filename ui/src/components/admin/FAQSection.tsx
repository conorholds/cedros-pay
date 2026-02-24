/**
 * FAQ Management Section
 *
 * Admin interface for managing FAQ/Knowledge Base entries.
 * FAQs can be used by the AI chat assistant and/or displayed on a public FAQ page.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps, FAQ } from './types';

export function FAQSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywordsCsv: '',
    active: true,
    useInChat: true,
    displayOnPage: true,
  });

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      setFetchError(null);
      let data: { faqs: FAQ[] };
      const path = `/admin/faqs?limit=${pageSize}`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ faqs: FAQ[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch FAQs: ${res.status}`);
        data = await res.json();
      }

      setFaqs(data.faqs || []);
    } catch {
      setFaqs([]);
      setFetchError('Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    setIsSubmitting(true);
    try {
      const keywords = formData.keywordsCsv
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        keywords,
        active: formData.active,
        useInChat: formData.useInChat,
        displayOnPage: formData.displayOnPage,
      };

      if (editingFaq) {
        // Update existing FAQ
        const path = `/admin/faqs/${editingFaq.id}`;
        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth(path, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;
          const res = await fetch(`${serverUrl}${path}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(`Failed to update FAQ: ${res.status}`);
        }
      } else {
        // Create new FAQ
        if (authManager?.isAuthenticated()) {
          await authManager.fetchWithAuth('/admin/faqs', { method: 'POST', body: JSON.stringify(payload) });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['X-API-Key'] = apiKey;
          const res = await fetch(`${serverUrl}/admin/faqs`, { method: 'POST', headers, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(`Failed to create FAQ: ${res.status}`);
        }
      }

      resetForm();
      fetchFaqs();
    } catch {
      setFetchError(editingFaq ? 'Failed to update FAQ' : 'Failed to create FAQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const path = `/admin/faqs/${id}`;
      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'DELETE' });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error(`Failed to delete FAQ: ${res.status}`);
      }
      fetchFaqs();
    } catch {
      setFetchError('Failed to delete FAQ');
    }
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      const path = `/admin/faqs/${faq.id}`;
      const payload = { ...faq, active: !faq.active };
      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Failed to update FAQ: ${res.status}`);
      }
      fetchFaqs();
    } catch {
      setFetchError('Failed to update FAQ status');
    }
  };

  const resetForm = () => {
    setFormData({ question: '', answer: '', keywordsCsv: '', active: true, useInChat: true, displayOnPage: true });
    setEditingFaq(null);
    setShowForm(false);
  };

  const startEdit = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywordsCsv: faq.keywords.join(', '),
      active: faq.active,
      useInChat: faq.useInChat ?? true,
      displayOnPage: faq.displayOnPage ?? true,
    });
    setEditingFaq(faq);
    setShowForm(true);
  };

  // Stats
  const totalFaqs = faqs.length;
  const activeFaqs = faqs.filter((f) => f.active).length;
  const chatFaqs = faqs.filter((f) => f.active && f.useInChat).length;
  const pageFaqs = faqs.filter((f) => f.active && f.displayOnPage).length;

  // Filtered list
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (statusFilter === 'active' && !faq.active) return false;
      if (statusFilter === 'inactive' && faq.active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q) ||
          faq.keywords.some((k) => k.includes(q))
        );
      }
      return true;
    });
  }, [faqs, statusFilter, searchQuery]);

  return (
    <div className="cedros-admin__faqs">
      <ErrorBanner message={fetchError} onRetry={fetchFaqs} />
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Total FAQs', value: totalFaqs },
          { label: 'Active', value: activeFaqs, variant: 'success' },
          { label: 'In Chat', value: chatFaqs },
          { label: 'On Page', value: pageFaqs },
        ]}
      />

      {/* Actions Row */}
      <div className="cedros-admin__section">
        <div className="cedros-admin__section-header">
          <div className="cedros-admin__section-header-left">
            <h3 className="cedros-admin__section-title">Knowledge Base</h3>
            <p className="cedros-admin__section-subtitle">
              Manage FAQs for the AI chat assistant and public FAQ page.
            </p>
          </div>
          <div className="cedros-admin__section-header-right">
            <button
              className="cedros-admin__button cedros-admin__button--primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              {Icons.plus} Add FAQ
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="cedros-admin__filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cedros-admin__input"
            style={{ flex: 1, maxWidth: 300 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="cedros-admin__select"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <div className="cedros-admin__form-container" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleSubmit} className="cedros-admin__form">
              <div className="cedros-admin__form-header">
                <h4>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h4>
                <button type="button" className="cedros-admin__button--icon" onClick={resetForm}>
                  {Icons.close}
                </button>
              </div>

              <div className="cedros-admin__form-group">
                <label className="cedros-admin__label">Question *</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                  className="cedros-admin__input"
                  placeholder="What is your return policy?"
                  required
                />
              </div>

              <div className="cedros-admin__form-group">
                <label className="cedros-admin__label">Answer *</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                  className="cedros-admin__textarea"
                  placeholder="We accept returns within 30 days..."
                  rows={4}
                  required
                />
                <span className="cedros-admin__hint">Supports markdown formatting.</span>
              </div>

              <div className="cedros-admin__form-group">
                <label className="cedros-admin__label">Keywords</label>
                <input
                  type="text"
                  value={formData.keywordsCsv}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keywordsCsv: e.target.value }))}
                  className="cedros-admin__input"
                  placeholder="returns, refund, policy"
                />
                <span className="cedros-admin__hint">Comma-separated keywords to help AI find this FAQ.</span>
              </div>

              <div className="cedros-admin__form-group">
                <label className="cedros-admin__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  <span>Active</span>
                </label>
                <span className="cedros-admin__hint">Inactive FAQs won't appear anywhere.</span>
              </div>

              <div className="cedros-admin__form-group">
                <label className="cedros-admin__label">Visibility</label>
                <div className="cedros-admin__checkbox-group">
                  <label className="cedros-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.useInChat}
                      onChange={(e) => setFormData((prev) => ({ ...prev, useInChat: e.target.checked }))}
                    />
                    <span>Use in AI Chat</span>
                  </label>
                  <label className="cedros-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.displayOnPage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, displayOnPage: e.target.checked }))}
                    />
                    <span>Display on FAQ Page</span>
                  </label>
                </div>
                <span className="cedros-admin__hint">Choose where this FAQ should appear.</span>
              </div>

              <div className="cedros-admin__form-actions">
                <button type="button" className="cedros-admin__button" onClick={resetForm}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cedros-admin__button cedros-admin__button--primary"
                  disabled={isSubmitting || !formData.question.trim() || !formData.answer.trim()}
                >
                  {isSubmitting ? Icons.loading : editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FAQ List */}
        {isLoading ? (
          <div className="cedros-admin__loading">
            {Icons.loading}
            <span>Loading FAQs...</span>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="cedros-admin__empty">
            <p>{searchQuery || statusFilter !== 'all' ? 'No FAQs match your filters.' : 'No FAQs yet. Add one to get started.'}</p>
          </div>
        ) : (
          <div className="cedros-admin__faq-list">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`cedros-admin__faq-item ${!faq.active ? 'cedros-admin__faq-item--inactive' : ''}`}
              >
                <div className="cedros-admin__faq-content">
                  <div className="cedros-admin__faq-question">
                    <span className={`cedros-admin__status-dot ${faq.active ? 'cedros-admin__status-dot--active' : 'cedros-admin__status-dot--inactive'}`} />
                    {faq.question}
                  </div>
                  <div className="cedros-admin__faq-answer">{faq.answer}</div>
                  <div className="cedros-admin__faq-meta">
                    {faq.keywords.length > 0 && (
                      <div className="cedros-admin__faq-keywords">
                        {faq.keywords.map((k) => (
                          <span key={k} className="cedros-admin__tag">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="cedros-admin__faq-visibility">
                      {faq.useInChat && (
                        <span className="cedros-admin__badge cedros-admin__badge--chat" title="Used in AI Chat">
                          {Icons.chat} Chat
                        </span>
                      )}
                      {faq.displayOnPage && (
                        <span className="cedros-admin__badge cedros-admin__badge--page" title="Displayed on FAQ Page">
                          {Icons.globe} Page
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="cedros-admin__faq-actions">
                  <button
                    className="cedros-admin__button--icon"
                    onClick={() => handleToggleActive(faq)}
                    title={faq.active ? 'Deactivate' : 'Activate'}
                  >
                    {faq.active ? Icons.eyeOff : Icons.eye}
                  </button>
                  <button
                    className="cedros-admin__button--icon"
                    onClick={() => startEdit(faq)}
                    title="Edit"
                  >
                    {Icons.edit}
                  </button>
                  <button
                    className="cedros-admin__button--icon cedros-admin__btn--danger"
                    onClick={() => setDeleteConfirm(faq.id)}
                    title="Delete"
                  >
                    {Icons.trash}
                  </button>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === faq.id && (
                  <div className="cedros-admin__confirm-overlay">
                    <div className="cedros-admin__confirm-dialog">
                      <p>Delete this FAQ?</p>
                      <div className="cedros-admin__confirm-actions">
                        <button className="cedros-admin__button" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </button>
                        <button
                          className="cedros-admin__button cedros-admin__button--danger"
                          onClick={() => handleDelete(faq.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
