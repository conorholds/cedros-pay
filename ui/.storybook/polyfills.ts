// Polyfill Buffer for Solana libraries in browser environment
// This file must be imported before any Solana dependencies
import { Buffer } from 'buffer';

// Make Buffer available globally
(globalThis as any).Buffer = Buffer;
(window as any).Buffer = Buffer;
