import * as fs from 'node:fs';
import type { Page, Frame, Request } from '@playwright/test';
import type { TeamDomainPluginConfig, TrackingSignal } from './types.js';

export class SignalTracker {
  private signals: TrackingSignal[] = [];
  private cleanupFns: (() => void)[] = [];
  private pendingDetections: Promise<void>[] = [];

  async attach(page: Page, config: TeamDomainPluginConfig): Promise<void> {
    const allSelectors = config.teams.flatMap((t) => t.selectors ?? []);

    const onFrameNavigated = (frame: Frame) => {
      if (frame === page.mainFrame()) {
        this.record('url', frame.url());

        if (allSelectors.length > 0) {
          this.scheduleDetection(page, allSelectors);
        }
      }
    };
    page.on('framenavigated', onFrameNavigated);
    this.cleanupFns.push(() => page.off('framenavigated', onFrameNavigated));

    const onRequest = (request: Request) => {
      this.record('network', request.url());
    };
    page.on('request', onRequest);
    this.cleanupFns.push(() => page.off('request', onRequest));
  }

  extractPageObjectsFromFile(testFilePath: string, config: TeamDomainPluginConfig): void {
    const allPageObjects = config.teams.flatMap((t) => t.pageObjects ?? []);
    if (allPageObjects.length === 0) return;

    try {
      const content = fs.readFileSync(testFilePath, 'utf-8');
      for (const name of allPageObjects) {
        const importPattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
        if (importPattern.test(content)) {
          this.record('page-object', name);
        }
      }
    } catch {
      // File not readable — skip POM detection
    }
  }

  /** Wait for all pending async selector detections to complete. */
  async flush(): Promise<void> {
    await Promise.allSettled(this.pendingDetections);
  }

  getSignals(): TrackingSignal[] {
    return [...this.signals];
  }

  detach(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private record(type: TrackingSignal['type'], value: string): void {
    this.signals.push({ type, value, timestamp: Date.now() });
  }

  private scheduleDetection(page: Page, selectors: string[]): void {
    const detection = this.detectSelectors(page, selectors);
    this.pendingDetections.push(detection);
    void detection.finally(() => {
      this.pendingDetections = this.pendingDetections.filter((p) => p !== detection);
    });
  }

  private async detectSelectors(page: Page, selectors: string[]): Promise<void> {
    try {
      await page.waitForLoadState('domcontentloaded');
      const script = `(sels) => sels.filter((sel) => !!document.querySelector(sel))`;
      const fn = new Function(`return ${script}`)() as (sels: string[]) => string[];
      const found: string[] = await page.evaluate(fn, selectors);

      for (const selector of found) {
        this.record('selector', selector);
      }
    } catch {
      // Page may have navigated or been closed
    }
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
