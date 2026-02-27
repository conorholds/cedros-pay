/** Email provider types and SMTP configuration map */

export type EmailProvider = 'mailgun' | 'sendgrid' | 'postmark' | 'ses' | 'resend' | 'custom';

export interface ProviderConfig {
  label: string;
  host: string;
  /** Fixed SMTP username (empty = user must enter it) */
  username: string;
  /** Label for the password/credential field */
  credentialLabel: string;
  /** Show a separate SMTP username input (for providers where it varies per account) */
  showUsername: boolean;
  /** Credential value is copied to both smtp_username and smtp_password */
  usernameEqualsPassword: boolean;
}

export const EMAIL_PROVIDERS: Record<EmailProvider, ProviderConfig> = {
  mailgun:  { label: 'Mailgun',     host: 'smtp.mailgun.org',                   username: '',       credentialLabel: 'SMTP Password', showUsername: true,  usernameEqualsPassword: false },
  sendgrid: { label: 'SendGrid',    host: 'smtp.sendgrid.net',                  username: 'apikey', credentialLabel: 'API Key',       showUsername: false, usernameEqualsPassword: false },
  postmark: { label: 'Postmark',    host: 'smtp.postmarkapp.com',               username: '',       credentialLabel: 'Server API Token', showUsername: false, usernameEqualsPassword: true },
  ses:      { label: 'AWS SES',     host: 'email-smtp.us-east-1.amazonaws.com', username: '',       credentialLabel: 'SMTP Password', showUsername: true,  usernameEqualsPassword: false },
  resend:   { label: 'Resend',      host: 'smtp.resend.com',                    username: 'resend', credentialLabel: 'API Key',       showUsername: false, usernameEqualsPassword: false },
  custom:   { label: 'Custom SMTP', host: '',                                    username: '',       credentialLabel: 'SMTP Password', showUsername: true,  usernameEqualsPassword: false },
};

/** Infer provider from smtp_host, fallback to 'custom' */
export function inferProvider(host: string): EmailProvider {
  if (!host) return 'custom';
  for (const [key, cfg] of Object.entries(EMAIL_PROVIDERS)) {
    if (cfg.host && host === cfg.host) return key as EmailProvider;
  }
  return 'custom';
}
