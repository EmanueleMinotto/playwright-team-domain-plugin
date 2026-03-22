import { jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SignalTracker } from '../../src/tracker.js';
import type { TeamDomainPluginConfig } from '../../src/types.js';

const config: TeamDomainPluginConfig = {
  teams: [
    { name: 'Team A', urls: ['/register'], pageObjects: ['RegisterPage'] },
    { name: 'Team B', selectors: ['.credit-card-form'], pageObjects: ['PaymentPage'] },
    { name: 'Team C', networkPatterns: ['/api/**'] },
  ],
};

function createMockPage() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mainFrame = { url: () => 'https://example.com/' };

  return {
    on(event: string, fn: (...args: unknown[]) => void) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(fn);
    },
    off(event: string, fn: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
    },
    mainFrame: () => mainFrame,
    waitForLoadState: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    evaluate: jest.fn<(fn: unknown, arg: unknown) => Promise<string[]>>().mockResolvedValue([]),
    emit(event: string, ...args: unknown[]) {
      for (const fn of listeners[event] ?? []) {
        fn(...args);
      }
    },
    _listeners: listeners,
  };
}

describe('SignalTracker', () => {
  let tracker: SignalTracker;

  beforeEach(() => {
    tracker = new SignalTracker();
  });

  describe('URL tracking', () => {
    it('records URL signals on main frame navigation', async () => {
      const page = createMockPage();
      await tracker.attach(page as never, config);

      page.emit('framenavigated', page.mainFrame());

      const signals = tracker.getSignals();
      expect(signals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'url', value: 'https://example.com/' }),
        ]),
      );
    });

    it('ignores non-main frame navigations', async () => {
      const page = createMockPage();
      await tracker.attach(page as never, config);

      const otherFrame = { url: () => 'https://iframe.example.com/' };
      page.emit('framenavigated', otherFrame);

      const urlSignals = tracker.getSignals().filter((s) => s.type === 'url');
      expect(urlSignals).toHaveLength(0);
    });
  });

  describe('network tracking', () => {
    it('records network signals on request', async () => {
      const page = createMockPage();
      await tracker.attach(page as never, config);

      page.emit('request', { url: () => 'https://api.example.com/data' });

      const signals = tracker.getSignals().filter((s) => s.type === 'network');
      expect(signals).toEqual([
        expect.objectContaining({ type: 'network', value: 'https://api.example.com/data' }),
      ]);
    });
  });

  describe('selector detection', () => {
    it('records selector signals when selectors are found on page', async () => {
      const page = createMockPage();
      page.evaluate.mockResolvedValue(['.credit-card-form']);
      await tracker.attach(page as never, config);

      page.emit('framenavigated', page.mainFrame());

      await tracker.flush();

      const signals = tracker.getSignals().filter((s) => s.type === 'selector');
      expect(signals).toEqual([
        expect.objectContaining({ type: 'selector', value: '.credit-card-form' }),
      ]);
    });
  });

  describe('page object detection', () => {
    it('detects POM class names from test file imports', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pom-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `import { RegisterPage } from './pages/register';\nimport { PaymentPage } from './pages/payment';\n`,
      );

      tracker.extractPageObjectsFromFile(testFile, config);

      const signals = tracker.getSignals().filter((s) => s.type === 'page-object');
      expect(signals.map((s) => s.value).sort()).toEqual(['PaymentPage', 'RegisterPage']);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('returns no signals for unmatched imports', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pom-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      fs.writeFileSync(testFile, `import { SomethingElse } from './other';\n`);

      tracker.extractPageObjectsFromFile(testFile, config);

      const signals = tracker.getSignals().filter((s) => s.type === 'page-object');
      expect(signals).toHaveLength(0);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('detach', () => {
    it('removes all listeners on detach', async () => {
      const page = createMockPage();
      await tracker.attach(page as never, config);

      expect(page._listeners['framenavigated']?.length).toBeGreaterThan(0);
      expect(page._listeners['request']?.length).toBeGreaterThan(0);

      tracker.detach();

      expect(page._listeners['framenavigated']).toHaveLength(0);
      expect(page._listeners['request']).toHaveLength(0);
    });
  });

  describe('getSignals', () => {
    it('returns a copy of signals array', async () => {
      const page = createMockPage();
      await tracker.attach(page as never, config);

      page.emit('request', { url: () => 'https://example.com/api' });

      const signals1 = tracker.getSignals();
      const signals2 = tracker.getSignals();
      expect(signals1).not.toBe(signals2);
      expect(signals1).toEqual(signals2);
    });
  });

  describe('flush', () => {
    it('waits for pending selector detections', async () => {
      let resolveEvaluate!: (val: string[]) => void;
      const page = createMockPage();
      page.evaluate.mockReturnValue(new Promise<string[]>((resolve) => {
        resolveEvaluate = resolve;
      }));
      await tracker.attach(page as never, config);

      page.emit('framenavigated', page.mainFrame());

      // Selector detection is in flight
      expect(tracker.getSignals().filter((s) => s.type === 'selector')).toHaveLength(0);

      resolveEvaluate(['.credit-card-form']);
      await tracker.flush();

      expect(tracker.getSignals().filter((s) => s.type === 'selector')).toHaveLength(1);
    });
  });
});
