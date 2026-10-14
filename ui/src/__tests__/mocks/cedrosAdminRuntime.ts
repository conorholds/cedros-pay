import { vi } from 'vitest';

const message = vi.fn(() => 'test-toast');

export const toast = Object.assign(message, {
  success: vi.fn(() => 'test-toast'),
  error: vi.fn(() => 'test-toast'),
  info: vi.fn(() => 'test-toast'),
  warning: vi.fn(() => 'test-toast'),
  message,
  dismiss: vi.fn(),
});
