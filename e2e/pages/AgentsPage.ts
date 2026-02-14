import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Agent 管理页面对象
 */
export class AgentsPage extends BasePage {
  readonly agentsList: Locator;
  readonly createAgentButton: Locator;
  readonly agentCards: Locator;
  readonly agentModal: Locator;
  readonly agentNameInput: Locator;
  readonly agentPromptInput: Locator;
  readonly agentIconPicker: Locator;
  readonly saveAgentButton: Locator;
  readonly runAgentButton: Locator;
  readonly deleteAgentButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    this.agentsList = page.locator('[data-testid="agents-list"]');
    this.createAgentButton = page.locator('[data-testid="create-agent-button"]');
    this.agentCards = page.locator('[data-testid="agent-card"]');
    this.agentModal = page.locator('[data-testid="agent-modal"]');
    this.agentNameInput = page.locator('[data-testid="agent-name-input"]');
    this.agentPromptInput = page.locator('[data-testid="agent-prompt-input"]');
    this.agentIconPicker = page.locator('[data-testid="agent-icon-picker"]');
    this.saveAgentButton = page.locator('[data-testid="save-agent-button"]');
    this.runAgentButton = page.locator('[data-testid="run-agent-button"]');
    this.deleteAgentButton = page.locator('[data-testid="delete-agent-button"]');
    this.confirmDeleteButton = page.locator('[data-testid="confirm-delete-button"]');
  }

  async waitForPageLoad(): Promise<void> {
    await expect(this.agentsList).toBeVisible({ timeout: 10000 });
  }

  /**
   * 创建新 Agent
   */
  async createAgent(name: string, prompt: string, icon?: string): Promise<void> {
    await this.safeClick(this.createAgentButton);
    await expect(this.agentModal).toBeVisible();
    
    await this.safeFill(this.agentNameInput, name);
    await this.safeFill(this.agentPromptInput, prompt);
    
    if (icon) {
      await this.selectIcon(icon);
    }
    
    await this.safeClick(this.saveAgentButton);
    await expect(this.agentModal).not.toBeVisible();
  }

  /**
   * 选择 Agent 图标
   */
  async selectIcon(iconName: string): Promise<void> {
    await this.safeClick(this.agentIconPicker);
    const icon = this.page.locator(`[data-testid="icon-${iconName}"]`);
    await this.safeClick(icon);
  }

  /**
   * 运行 Agent
   */
  async runAgent(agentName: string): Promise<void> {
    const agent = this.agentCards.filter({ hasText: agentName });
    const runButton = agent.locator('[data-testid="run-agent-button"]');
    await this.safeClick(runButton);
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentName: string): Promise<void> {
    const agent = this.agentCards.filter({ hasText: agentName });
    const deleteBtn = agent.locator('[data-testid="delete-agent-button"]');
    await this.safeClick(deleteBtn);
    
    await expect(this.confirmDeleteButton).toBeVisible();
    await this.safeClick(this.confirmDeleteButton);
  }

  /**
   * 验证 Agent 存在
   */
  async expectAgentExists(name: string): Promise<void> {
    const agent = this.agentCards.filter({ hasText: name });
    await expect(agent).toBeVisible();
  }

  /**
   * 获取 Agent 数量
   */
  async getAgentCount(): Promise<number> {
    return await this.agentCards.count();
  }
}
