/**
 * Types and helpers for the Compliance admin section.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TokenHolder {
  id: string;
  collectionId: string;
  mintAddress: string;
  walletAddress: string;
  userId?: string;
  amountMinted: number;
  status: string;
  frozenAt?: string;
  freezeTx?: string;
  thawTx?: string;
  createdAt: string;
}

export interface ComplianceAction {
  id: string;
  actionType: string;
  walletAddress: string;
  mintAddress: string;
  holderId?: string;
  reason: string;
  actor: string;
  txSignature?: string;
  reportReference?: string;
  createdAt: string;
}

export interface ComplianceReport {
  generatedAt: string;
  from?: string;
  to?: string;
  totalHolders: number;
  totalFrozen: number;
  actionsInPeriod: number;
  freezeCount: number;
  thawCount: number;
  sweepFreezeCount: number;
  actions: ComplianceAction[];
}

export interface SanctionsSweepSettings {
  enabled: boolean;
  batchSize: number;
}

export interface SanctionsApiSettings {
  apiUrl: string;
  refreshIntervalSecs: number;
  enabled: boolean;
}

export interface ComplianceRequirements {
  requireSanctionsClear: boolean;
  requireKyc: boolean;
  requireAccreditedInvestor: boolean;
}

export type ComplianceTab = 'holders' | 'actions' | 'reports' | 'sweep-settings' | 'sanctions-api';

// ─── Helpers ────────────────────────────────────────────────────────────────

export const truncateAddress = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

export const statusBadge = (status: string): string => {
  switch (status) {
    case 'active': return 'success';
    case 'frozen': return 'failed';
    case 'thawed': return 'pending';
    default: return 'muted';
  }
};

export const actionBadge = (type: string): string => {
  switch (type) {
    case 'freeze': return 'failed';
    case 'thaw': return 'success';
    case 'sweep_freeze': return 'failed';
    case 'report_generated': return 'muted';
    default: return 'muted';
  }
};

export const SOLANA_EXPLORER = 'https://explorer.solana.com/tx/';
