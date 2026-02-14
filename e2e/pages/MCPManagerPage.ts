import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * MCP 服务器管理页面对象
 */
export class MCPManagerPage extends BasePage {
  // 服务器列表
  readonly serversList: Locator;
  readonly serverCards: Locator;
  readonly addServerButton: Locator;
  readonly importButton: Locator;
  readonly exportButton: Locator;
  
  // 添加服务器模态框
  readonly serverModal: Locator;
  readonly serverNameInput: Locator;
  readonly serverTypeSelect: Locator;
  readonly serverUrlInput: Locator;
  readonly serverConfigInput: Locator;
  readonly testConnectionButton: Locator;
  readonly saveServerButton: Locator;
  
  // 服务器详情
  readonly serverStatus: Locator;
  readonly serverHealth: Locator;
  readonly toggleServerButton: Locator;
  readonly editServerButton: Locator;
  readonly deleteServerButton: Locator;
  
  // 导入/导出
  readonly importModal: Locator;
  readonly importFileInput: Locator;
  readonly confirmImportButton: Locator;
  readonly importFromClaudeButton: Locator;
  
  // 错误和验证
  readonly connectionStatus: Locator;
  readonly validationError: Locator;
  readonly serverError: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    // 列表
    this.serversList = page.locator('[data-testid="mcp-servers-list"]');
    this.serverCards = page.locator('[data-testid="mcp-server-card"]');
    this.addServerButton = page.locator('[data-testid="add-mcp-server-button"]');
    this.importButton = page.locator('[data-testid="import-mcp-button"]');
    this.exportButton = page.locator('[data-testid="export-mcp-button"]');
    
    // 添加模态框
    this.serverModal = page.locator('[data-testid="mcp-server-modal"]');
    this.serverNameInput = page.locator('[data-testid="server-name-input"]');
    this.serverTypeSelect = page.locator('[data-testid="server-type-select"]');
    this.serverUrlInput = page.locator('[data-testid="server-url-input"]');
    this.serverConfigInput = page.locator('[data-testid="server-config-input"]');
    this.testConnectionButton = page.locator('[data-testid="test-connection-button"]');
    this.saveServerButton = page.locator('[data-testid="save-server-button"]');
    
    // 服务器操作
    this.serverStatus = page.locator('[data-testid="server-status"]');
    this.serverHealth = page.locator('[data-testid="server-health"]');
    this.toggleServerButton = page.locator('[data-testid="toggle-server-button"]');
    this.editServerButton = page.locator('[data-testid="edit-server-button"]');
    this.deleteServerButton = page.locator('[data-testid="delete-server-button"]');
    
    // 导入
    this.importModal = page.locator('[data-testid="import-mcp-modal"]');
    this.importFileInput = page.locator('[data-testid="import-file-input"]');
    this.confirmImportButton = page.locator('[data-testid="confirm-import-button"]');
    this.importFromClaudeButton = page.locator('[data-testid="import-from-claude-button"]');
    
    // 错误
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.validationError = page.locator('[data-testid="validation-error"]');
    this.serverError = page.locator('[data-testid="server-error"]');
  }

  async waitForPageLoad(): Promise<void> {
    await expect(this.serversList).toBeVisible({ timeout: 10000 });
  }

  /**
   * 导航到 MCP 管理页
   */
  async navigateToMCP(): Promise<void> {
    await this.page.click('[data-testid="mcp-tab"]');
    await this.waitForPageLoad();
  }

  /**
   * 添加 MCP 服务器
   */
  async addServer(
    name: string,
    type: string,
    url: string,
    config?: string
  ): Promise<void> {
    await this.safeClick(this.addServerButton);
    await expect(this.serverModal).toBeVisible();
    
    await this.safeFill(this.serverNameInput, name);
    await this.serverTypeSelect.click();
    await this.page.locator(`[data-testid="server-type-${type}"]`).click();
    await this.safeFill(this.serverUrlInput, url);
    
    if (config) {
      await this.safeFill(this.serverConfigInput, config);
    }
    
    await this.safeClick(this.saveServerButton);
    await this.expectToast('Server added successfully');
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    await this.safeClick(this.testConnectionButton);
    await this.page.waitForTimeout(2000);
    
    const status = await this.connectionStatus.textContent();
    return status?.toLowerCase().includes('success') || false;
  }

  /**
   * 启用/禁用服务器
   */
  async toggleServer(serverName: string): Promise<void> {
    const server = this.serverCards.filter({ hasText: serverName });
    const toggle = server.locator('[data-testid="toggle-server-button"]');
    await this.safeClick(toggle);
  }

  /**
   * 编辑服务器
   */
  async editServer(serverName: string, newUrl: string): Promise<void> {
    const server = this.serverCards.filter({ hasText: serverName });
    const editBtn = server.locator('[data-testid="edit-server-button"]');
    await this.safeClick(editBtn);
    
    await expect(this.serverModal).toBeVisible();
    await this.serverUrlInput.fill(newUrl);
    await this.safeClick(this.saveServerButton);
    
    await this.expectToast('Server updated successfully');
  }

  /**
   * 删除服务器
   */
  async deleteServer(serverName: string): Promise<void> {
    const server = this.serverCards.filter({ hasText: serverName });
    const deleteBtn = server.locator('[data-testid="delete-server-button"]');
    await this.safeClick(deleteBtn);
    
    // 确认删除
    const confirmBtn = this.page.locator('[data-testid="confirm-delete-button"]');
    await this.safeClick(confirmBtn);
    
    await this.expectToast('Server deleted successfully');
  }

  /**
   * 从 Claude Desktop 导入
   */
  async importFromClaudeDesktop(): Promise<void> {
    await this.safeClick(this.importButton);
    await expect(this.importModal).toBeVisible();
    await this.safeClick(this.importFromClaudeButton);
    await this.expectToast('Imported from Claude Desktop');
  }

  /**
   * 导出配置
   */
  async exportConfiguration(): Promise<void> {
    await this.safeClick(this.exportButton);
    await this.page.waitForEvent('download');
  }

  /**
   * 获取服务器状态
   */
  async getServerStatus(serverName: string): Promise<'connected' | 'disconnected' | 'error'> {
    const server = this.serverCards.filter({ hasText: serverName });
    const status = await server.locator('[data-testid="server-status"]').textContent();
    
    if (status?.toLowerCase().includes('connected')) return 'connected';
    if (status?.toLowerCase().includes('error')) return 'error';
    return 'disconnected';
  }

  /**
   * 验证服务器存在
   */
  async expectServerExists(name: string): Promise<void> {
    const server = this.serverCards.filter({ hasText: name });
    await expect(server).toBeVisible();
  }
}
