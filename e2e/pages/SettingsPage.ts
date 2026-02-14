import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 设置页面对象
 */
export class SettingsPage extends BasePage {
  // 表单元素
  readonly settingsForm: Locator;
  readonly claudePathInput: Locator;
  readonly apiKeyInput: Locator;
  readonly modelSelect: Locator;
  readonly themeToggle: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  
  // 标签页
  readonly generalTab: Locator;
  readonly appearanceTab: Locator;
  readonly storageTab: Locator;
  readonly proxyTab: Locator;
  readonly advancedTab: Locator;
  
  // 存储管理
  readonly clearCacheButton: Locator;
  readonly exportDataButton: Locator;
  readonly importDataButton: Locator;
  readonly storageUsage: Locator;
  
  // 代理设置
  readonly proxyEnabled: Locator;
  readonly proxyHostInput: Locator;
  readonly proxyPortInput: Locator;
  
  // 高级设置
  readonly debugMode: Locator;
  readonly autoUpdate: Locator;
  readonly crashReporting: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    // 表单
    this.settingsForm = page.locator('[data-testid="settings-form"]');
    this.claudePathInput = page.locator('[data-testid="claude-path-input"]');
    this.apiKeyInput = page.locator('[data-testid="api-key-input"]');
    this.modelSelect = page.locator('[data-testid="model-select"]');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    this.saveButton = page.locator('[data-testid="save-settings-button"]');
    this.resetButton = page.locator('[data-testid="reset-settings-button"]');
    
    // 标签页
    this.generalTab = page.locator('[data-testid="general-tab"]');
    this.appearanceTab = page.locator('[data-testid="appearance-tab"]');
    this.storageTab = page.locator('[data-testid="storage-tab"]');
    this.proxyTab = page.locator('[data-testid="proxy-tab"]');
    this.advancedTab = page.locator('[data-testid="advanced-tab"]');
    
    // 存储管理
    this.clearCacheButton = page.locator('[data-testid="clear-cache-button"]');
    this.exportDataButton = page.locator('[data-testid="export-data-button"]');
    this.importDataButton = page.locator('[data-testid="import-data-button"]');
    this.storageUsage = page.locator('[data-testid="storage-usage"]');
    
    // 代理
    this.proxyEnabled = page.locator('[data-testid="proxy-enabled"]');
    this.proxyHostInput = page.locator('[data-testid="proxy-host-input"]');
    this.proxyPortInput = page.locator('[data-testid="proxy-port-input"]');
    
    // 高级
    this.debugMode = page.locator('[data-testid="debug-mode-toggle"]');
    this.autoUpdate = page.locator('[data-testid="auto-update-toggle"]');
    this.crashReporting = page.locator('[data-testid="crash-reporting-toggle"]');
  }

  async waitForPageLoad(): Promise<void> {
    await expect(this.settingsForm).toBeVisible({ timeout: 10000 });
  }

  /**
   * 导航到设置页
   */
  async navigateToSettings(): Promise<void> {
    await this.page.click('[data-testid="settings-tab"]');
    await this.waitForPageLoad();
  }

  /**
   * 设置 Claude 路径
   */
  async setClaudePath(path: string): Promise<void> {
    await this.safeFill(this.claudePathInput, path);
  }

  /**
   * 选择 AI 模型
   */
  async selectModel(model: string): Promise<void> {
    await this.modelSelect.click();
    await this.page.locator(`[data-testid="model-option-${model}"]`).click();
  }

  /**
   * 切换主题
   */
  async toggleTheme(): Promise<void> {
    await this.safeClick(this.themeToggle);
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.safeClick(this.saveButton);
    await this.expectToast('Settings saved successfully');
  }

  /**
   * 重置设置
   */
  async resetSettings(): Promise<void> {
    await this.safeClick(this.resetButton);
    // 确认对话框
    const confirmButton = this.page.locator('[data-testid="confirm-reset-button"]');
    await this.safeClick(confirmButton);
  }

  /**
   * 切换到指定标签页
   */
  async switchTab(tabName: 'general' | 'appearance' | 'storage' | 'proxy' | 'advanced'): Promise<void> {
    const tabMap = {
      general: this.generalTab,
      appearance: this.appearanceTab,
      storage: this.storageTab,
      proxy: this.proxyTab,
      advanced: this.advancedTab,
    };
    await this.safeClick(tabMap[tabName]);
  }

  /**
   * 配置代理
   */
  async configureProxy(host: string, port: string): Promise<void> {
    await this.switchTab('proxy');
    await this.safeClick(this.proxyEnabled);
    await this.safeFill(this.proxyHostInput, host);
    await this.safeFill(this.proxyPortInput, port);
    await this.saveSettings();
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await this.switchTab('storage');
    await this.safeClick(this.clearCacheButton);
    const confirmButton = this.page.locator('[data-testid="confirm-clear-button"]');
    await this.safeClick(confirmButton);
    await this.expectToast('Cache cleared successfully');
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<void> {
    await this.switchTab('storage');
    await this.safeClick(this.exportDataButton);
    // 等待下载完成（需要额外配置）
    await this.page.waitForEvent('download');
  }

  /**
   * 启用/禁用调试模式
   */
  async toggleDebugMode(): Promise<void> {
    await this.switchTab('advanced');
    await this.safeClick(this.debugMode);
    await this.saveSettings();
  }

  /**
   * 获取当前主题
   */
  async getCurrentTheme(): Promise<'light' | 'dark'> {
    const html = this.page.locator('html');
    const hasDark = await html.evaluate(el => el.classList.contains('dark'));
    return hasDark ? 'dark' : 'light';
  }
}
