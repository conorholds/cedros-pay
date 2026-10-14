import { describe, expect, it } from 'vitest';
import { CEDROS_PAY_REFUND_RETURNS_POLICY_ID } from '../../extension/constants';
import { cedrosPayPolicies } from '../../extension/starters';

describe('policy starters', () => {
  it('declares the Refund & Returns policy starter in the extension manifest', async () => {
    const registerModule = await import('../../admin/register');
    const bootstrap = registerModule.default();
    const policy = bootstrap.manifest.policies?.[0];

    expect(bootstrap.manifest.policies).toEqual(cedrosPayPolicies);
    expect(policy?.id).toBe(CEDROS_PAY_REFUND_RETURNS_POLICY_ID);
    expect(policy?.kind).toBe('refund-returns-policy');
    expect(policy?.routePath).toBe('/refund-returns');
    expect(policy?.footerLabel).toBe('Refund & Returns Policy');
    expect(policy?.category).toBe('legal');
    expect(policy?.tags).toEqual(['refunds', 'returns', 'payments']);
    expect(policy?.seo).toMatchObject({
      title: 'Refund & Returns Policy',
      noindex: true,
    });
    expect(policy?.seo).not.toHaveProperty('canonicalPath');
  });

  it('keeps starter copy owner-reviewed and placeholder-driven', () => {
    const bodyMarkdown = cedrosPayPolicies[0]?.bodyMarkdown ?? '';

    expect(bodyMarkdown).toContain('Owner review required');
    expect(bodyMarkdown).toContain('not legal advice');
    expect(bodyMarkdown).toContain('[REFUND WINDOW');
    expect(bodyMarkdown).toContain('[ELIGIBLE PURCHASE TYPES]');
    expect(bodyMarkdown).toContain('[INELIGIBLE PURCHASE TYPES]');
    expect(bodyMarkdown).toContain('[RETURN CONDITION');
    expect(bodyMarkdown).toContain('[DIGITAL GOODS TERMS');
    expect(bodyMarkdown).toContain('[SUBSCRIPTION REFUND TERMS]');
    expect(bodyMarkdown).toContain('[PROCESSING TIME');
    expect(bodyMarkdown).toContain('[RESTOCKING FEE]');
    expect(bodyMarkdown).toContain('[SUPPORT CONTACT EMAIL OR FORM URL]');
    expect(bodyMarkdown).not.toMatch(/<script|<style|<iframe|legal advice tailored/iu);
  });
});
