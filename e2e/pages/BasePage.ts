import { Page, Locator, expect } from '@playwright/test';

/**
 * 基础页面类 - 所有 Page Object 的基类
 * 封装通用的页面操作和等待逻辑
 */
export abstract class BasePage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page, url: string = '/') {
    this.page = page;
    this.url = url;
  }

  /**
   * 导航到页面
   */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * 等待页面加载完成
   */
  abstract waitForPageLoad(): Promise<void>;

  /**
   * 等待元素可见
   */
  async waitForVisible(locator: Locator, timeout: number = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * 安全点击（等待元素可用后点击）
   */
  async safeClick(locator: Locator, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
  }

  /**
   * 安全输入（清空后输入）
   */
  async safeFill(locator: Locator, text: string, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(text);
  }

  /**
   * 获取 Toast 消息并验证
   */
  async expectToast(message: string, type: 'success' | 'error' | 'info' = 'success'): Promise<void> {
    const toast = this.page.locator(`[data-testid="toast-${type}"]`);
    await expect(toast).toContainText(message, { timeout: 5000 });
  }

  /**
   * 等待加载状态消失
   */
  async waitForLoadingToFinish(): Promise<void> {
    const loading = this.page.locator('[data-testid="loading"]');
    await expect(loading).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * 截图保存
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `./e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 模拟 Tauri API（用于 Web 模式测试）
   */
  async mockTauriAPI(mockData: Record<string, unknown>): Promise<void> {
    await this.page.evaluate((data) => {
      window.__TAURI__ = {
        invoke: async (cmd: string, args?: unknown) => {
          console.log(`[Mock] Tauri invoke: ${cmd}`, args);
          return data[cmd] || null;
        },
      } as typeof window.__TAURI__;
    }, mockData);
  }
}
