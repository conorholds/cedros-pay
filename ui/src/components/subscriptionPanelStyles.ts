import type { CSSProperties } from 'react';

/**
 * Color tokens for light and dark modes
 */
const lightColors = {
  bg: '#fff',
  bgMuted: '#f9fafb',
  bgHighlight: '#eff6ff',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  primary: '#3b82f6',
  error: '#ef4444',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  warningBg: '#fef3c7',
  warningBorder: '#fcd34d',
  warningText: '#92400e',
  buttonBg: '#f3f4f6',
  buttonBorder: '#d1d5db',
  buttonText: '#374151',
};

const darkColors = {
  bg: '#1e293b',
  bgMuted: '#334155',
  bgHighlight: 'rgba(59, 130, 246, 0.15)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  border: '#475569',
  borderLight: '#334155',
  primary: '#3b82f6',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  warningText: '#fbbf24',
  buttonBg: '#334155',
  buttonBorder: '#475569',
  buttonText: '#e2e8f0',
};

/**
 * Get subscription panel styles for the given theme mode
 */
export function getSubscriptionPanelStyles(isDark: boolean): Record<string, CSSProperties> {
  const c = isDark ? darkColors : lightColors;

  return {
    container: {
      padding: '24px',
      backgroundColor: c.bg,
      borderRadius: '8px',
      border: `1px solid ${c.border}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: c.text,
    },
    error: {
      padding: '12px 16px',
      backgroundColor: c.errorBg,
      border: `1px solid ${c.errorBorder}`,
      borderRadius: '6px',
      color: c.error,
      marginBottom: '16px',
    },
    loading: {
      padding: '24px',
      textAlign: 'center',
      color: c.textMuted,
    },
    details: {
      marginBottom: '24px',
    },
    title: {
      margin: '0 0 16px 0',
      fontSize: '18px',
      fontWeight: 600,
      color: c.text,
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${c.borderLight}`,
    },
    label: {
      color: c.textMuted,
      fontSize: '14px',
    },
    value: {
      color: c.text,
      fontSize: '14px',
      fontWeight: 500,
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 500,
      textTransform: 'capitalize',
    },
    cancelNotice: {
      marginTop: '12px',
      padding: '8px 12px',
      backgroundColor: c.warningBg,
      border: `1px solid ${c.warningBorder}`,
      borderRadius: '6px',
      color: c.warningText,
      fontSize: '13px',
    },
    prorationPreview: {
      padding: '16px',
      backgroundColor: c.bgMuted,
      borderRadius: '8px',
      marginBottom: '24px',
    },
    previewTitle: {
      margin: '0 0 12px 0',
      fontSize: '16px',
      fontWeight: 600,
      color: c.text,
    },
    previewDetails: {
      marginBottom: '16px',
    },
    previewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '14px',
      color: c.textMuted,
    },
    previewTotal: {
      borderTop: `1px solid ${c.border}`,
      marginTop: '8px',
      paddingTop: '12px',
      fontWeight: 600,
      color: c.text,
    },
    previewActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      padding: '8px 16px',
      backgroundColor: c.bg,
      border: `1px solid ${c.buttonBorder}`,
      borderRadius: '6px',
      color: c.buttonText,
      cursor: 'pointer',
      fontSize: '14px',
    },
    confirmButton: {
      padding: '8px 16px',
      backgroundColor: c.primary,
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    plansSection: {
      marginBottom: '24px',
    },
    plansTitle: {
      margin: '0 0 12px 0',
      fontSize: '16px',
      fontWeight: 600,
      color: c.text,
    },
    plansList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
    },
    planCard: {
      padding: '16px',
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      textAlign: 'center',
    },
    currentPlan: {
      borderColor: c.primary,
      backgroundColor: c.bgHighlight,
    },
    planName: {
      fontSize: '16px',
      fontWeight: 600,
      color: c.text,
      marginBottom: '4px',
    },
    planPrice: {
      fontSize: '14px',
      color: c.textMuted,
      marginBottom: '8px',
    },
    planDescription: {
      fontSize: '12px',
      color: c.textFaint,
      marginBottom: '12px',
    },
    currentBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: c.primary,
      color: '#fff',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    },
    changePlanButton: {
      padding: '8px 16px',
      backgroundColor: c.buttonBg,
      border: `1px solid ${c.buttonBorder}`,
      borderRadius: '6px',
      color: c.buttonText,
      cursor: 'pointer',
      fontSize: '14px',
      width: '100%',
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      paddingTop: '16px',
      borderTop: `1px solid ${c.border}`,
    },
    portalButton: {
      padding: '10px 20px',
      backgroundColor: c.primary,
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    cancelSubscriptionButton: {
      padding: '10px 20px',
      backgroundColor: c.bg,
      border: `1px solid ${c.error}`,
      borderRadius: '6px',
      color: c.error,
      cursor: 'pointer',
      fontSize: '14px',
    },
  };
}

/** Format currency amount */
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/** Format date */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get status badge color */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#22c55e';
    case 'trialing':
      return '#3b82f6';
    case 'past_due':
      return '#f59e0b';
    case 'canceled':
    case 'expired':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}
