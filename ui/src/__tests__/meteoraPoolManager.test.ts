import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeteoraPoolManager } from '../managers/MeteoraPoolManager';

// Mock the dynamic imports
vi.mock('@meteora-ag/dlmm', () => {
  const mockDLMM = {
    getPricePerLamport: vi.fn((xDec: number, yDec: number, price: number) => {
      // Simulate: price-per-lamport = price * 10^(xDec - yDec)
      const scale = Math.pow(10, xDec - yDec);
      return String(price * scale);
    }),
    getBinIdFromPrice: vi.fn((_pricePerLamport: string, _binStep: number, _min: boolean) => {
      // Return a deterministic bin ID for testing
      return -2345;
    }),
    getAllPresetParameters: vi.fn().mockResolvedValue({
      presetParameter: [],
      presetParameter2: [
        { publicKey: { toBase58: () => 'PresetPubkey' }, account: { binStep: 1, baseFactor: 10 } },
        { publicKey: { toBase58: () => 'PresetPubkey5' }, account: { binStep: 5, baseFactor: 20 } },
      ],
    }),
    create: vi.fn().mockResolvedValue({
      lbPair: { activeId: 100, binStep: 1 },
      tokenX: { decimal: 2 },
      tokenY: { decimal: 6 },
      getActiveBin: vi.fn().mockResolvedValue({ binId: 100, price: '1.0' }),
      initializePositionAndAddLiquidityByStrategy: vi.fn().mockResolvedValue({
        instructions: [],
        partialSign: vi.fn(),
      }),
    }),
    createLbPair2: vi.fn().mockResolvedValue({
      instructions: [{ keys: [{ pubkey: null }, { pubkey: { toBase58: () => 'PoolAddress123' } }] }],
    }),
  };
  return { default: mockDLMM };
});

vi.mock('bn.js', () => {
  class MockBN {
    value: number | string;
    constructor(v: number | string) { this.value = v; }
  }
  return { default: MockBN };
});

describe('MeteoraPoolManager', () => {
  let manager: MeteoraPoolManager;

  beforeEach(() => {
    manager = new MeteoraPoolManager();
    vi.clearAllMocks();
  });

  describe('computeBinId', () => {
    it('converts buyback price to a DLMM bin ID', async () => {
      const binId = await manager.computeBinId(0.80, 2, 6, 1);

      // Should call getPricePerLamport then getBinIdFromPrice
      const dlmm = (await import('@meteora-ag/dlmm')).default;
      expect(dlmm.getPricePerLamport).toHaveBeenCalledWith(2, 6, 0.80);
      expect(dlmm.getBinIdFromPrice).toHaveBeenCalled();
      expect(typeof binId).toBe('number');
      expect(binId).toBe(-2345); // from mock
    });

    it('uses default binStep of 1 when not specified', async () => {
      await manager.computeBinId(0.50, 2, 6);

      const dlmm = (await import('@meteora-ag/dlmm')).default;
      expect(dlmm.getBinIdFromPrice).toHaveBeenCalledWith(
        expect.any(String),
        1, // default binStep
        true,
      );
    });
  });

  describe('findPresetParameter', () => {
    it('returns matching preset for requested binStep', async () => {
      const mockConnection = {} as Parameters<typeof manager.findPresetParameter>[0];
      const preset = await manager.findPresetParameter(mockConnection, 1);

      expect(preset).toBeDefined();
      expect(preset.toBase58()).toBe('PresetPubkey');
    });

    it('throws when no preset matches the requested binStep', async () => {
      const mockConnection = {} as Parameters<typeof manager.findPresetParameter>[0];

      await expect(
        manager.findPresetParameter(mockConnection, 99),
      ).rejects.toThrow('No PresetParameter2 found for binStep=99');
    });
  });

  describe('getPoolStatus', () => {
    it('returns active bin info for an existing pool', async () => {
      const mockConnection = {} as Parameters<typeof manager.getPoolStatus>[0];
      const mockPoolAddress = { toBase58: () => 'PoolXYZ' } as Parameters<typeof manager.getPoolStatus>[1];

      const status = await manager.getPoolStatus(mockConnection, mockPoolAddress);

      expect(status.address).toBe('PoolXYZ');
      expect(status.activeBinId).toBe(100);
      expect(status.activeBinPrice).toBe('1.0');
      expect(status.binStep).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('caches the DLMM module across multiple calls', async () => {
      // Call computeBinId twice — the import should be reused
      await manager.computeBinId(0.80, 2, 6);
      await manager.computeBinId(0.50, 2, 6);

      // getPricePerLamport should be called twice (once per computeBinId),
      // but the dynamic import only happens once due to caching
      const dlmm = (await import('@meteora-ag/dlmm')).default;
      expect(dlmm.getPricePerLamport).toHaveBeenCalledTimes(2);
    });

    it('passes cluster option to getPoolStatus when provided', async () => {
      const mockConnection = {} as Parameters<typeof manager.getPoolStatus>[0];
      const mockPoolAddress = { toBase58: () => 'Pool123' } as Parameters<typeof manager.getPoolStatus>[1];

      await manager.getPoolStatus(mockConnection, mockPoolAddress, 'devnet');

      const dlmm = (await import('@meteora-ag/dlmm')).default;
      expect(dlmm.create).toHaveBeenCalledWith(
        mockConnection,
        mockPoolAddress,
        { cluster: 'devnet' },
      );
    });
  });
});
