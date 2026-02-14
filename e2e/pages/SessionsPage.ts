import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 会话管理页面对象
 */
export class SessionsPage extends BasePage {
  // 会话列表
  readonly sessionsList: Locator;
  readonly sessionCards: Locator;
  readonly createSessionButton: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  
  // 会话详情
  readonly sessionContainer: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  
  // 工具栏
  readonly checkpointButton: Locator;
  readonly timelineButton: Locator;
  readonly settingsButton: Locator;
  readonly closeButton: Locator;
  
  // 检查点
  readonly checkpointModal: Locator;
  readonly checkpointNameInput: Locator;
  readonly saveCheckpointButton: Locator;
  readonly checkpointList: Locator;
  
  // 时间线
  readonly timelineModal: Locator;
  readonly timelineBranches: Locator;
  readonly restoreButton: Locator;
  
  // 加载状态
  readonly loadingIndicator: Locator;
  readonly streamingIndicator: Locator;
  
  // 错误状态
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    // 列表
    this.sessionsList = page.locator('[data-testid="sessions-list"]');
    this.sessionCards = page.locator('[data-testid="session-card"]');
    this.createSessionButton = page.locator('[data-testid="create-session-button"]');
    this.searchInput = page.locator('[data-testid="session-search"]');
    this.filterDropdown = page.locator('[data-testid="session-filter"]');
    
    // 详情
    this.sessionContainer = page.locator('[data-testid="session-container"]');
    this.messageInput = page.locator('[data-testid="message-input"]');
    this.sendButton = page.locator('[data-testid="send-message-button"]');
    this.messageList = page.locator('[data-testid="message-list"]');
    this.userMessages = page.locator('[data-testid="user-message"]');
    this.assistantMessages = page.locator('[data-testid="assistant-message"]');
    
    // 工具栏
    this.checkpointButton = page.locator('[data-testid="checkpoint-button"]');
    this.timelineButton = page.locator('[data-testid="timeline-button"]');
    this.settingsButton = page.locator('[data-testid="session-settings-button"]');
    this.closeButton = page.locator('[data-testid="close-session-button"]');
    
    // 检查点
    this.checkpointModal = page.locator('[data-testid="checkpoint-modal"]');
    this.checkpointNameInput = page.locator('[data-testid="checkpoint-name-input"]');
    this.saveCheckpointButton = page.locator('[data-testid="save-checkpoint-button"]');
    this.checkpointList = page.locator('[data-testid="checkpoint-list"]');
    
    // 时间线
    this.timelineModal = page.locator('[data-testid="timeline-modal"]');
    this.timelineBranches = page.locator('[data-testid="timeline-branch"]');
    this.restoreButton = page.locator('[data-testid="restore-checkpoint-button"]');
    
    // 状态
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.streamingIndicator = page.locator('[data-testid="streaming-indicator"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.retryButton = page.locator('[data-testid="retry-button"]');
  }

  async waitForPageLoad(): Promise<void> {
    await expect(this.sessionsList).toBeVisible({ timeout: 10000 });
  }

  /**
   * 创建新会话
   */
  async createSession(initialMessage?: string): Promise<void> {
    await this.safeClick(this.createSessionButton);
    
    if (initialMessage) {
      await this.sendMessage(initialMessage);
    }
  }

  /**
   * 打开指定会话
   */
  async openSession(sessionName: string): Promise<void> {
    const session = this.sessionCards.filter({ hasText: sessionName });
    await this.safeClick(session);
    await expect(this.sessionContainer).toBeVisible();
  }

  /**
   * 发送消息
   */
  async sendMessage(text: string): Promise<void> {
    await this.safeFill(this.messageInput, text);
    await this.safeClick(this.sendButton);
    
    // 等待消息发送
    await expect(this.userMessages.last()).toContainText(text);
  }

  /**
   * 等待 AI 回复
   */
  async waitForAssistantResponse(timeout: number = 30000): Promise<void> {
    // 等待流式输出结束
    await expect(this.streamingIndicator).not.toBeVisible({ timeout });
    // 确保有助手消息
    await expect(this.assistantMessages.first()).toBeVisible();
  }

  /**
   * 获取最后一条 AI 回复
   */
  async getLastAssistantMessage(): Promise<string> {
    const lastMessage = this.assistantMessages.last();
    return await lastMessage.textContent() || '';
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(name: string): Promise<void> {
    await this.safeClick(this.checkpointButton);
    await expect(this.checkpointModal).toBeVisible();
    await this.safeFill(this.checkpointNameInput, name);
    await this.safeClick(this.saveCheckpointButton);
    await this.expectToast('Checkpoint saved');
  }

  /**
   * 从时间线恢复
   */
  async restoreFromTimeline(checkpointName: string): Promise<void> {
    await this.safeClick(this.timelineButton);
    await expect(this.timelineModal).toBeVisible();
    
    const checkpoint = this.timelineBranches.filter({ hasText: checkpointName });
    await this.safeClick(checkpoint);
    await this.safeClick(this.restoreButton);
    
    await this.expectToast('Restored to checkpoint');
  }

  /**
   * 搜索会话
   */
  async searchSessions(query: string): Promise<void> {
    await this.safeFill(this.searchInput, query);
    await this.page.waitForTimeout(300);
  }

  /**
   * 过滤会话
   */
  async filterSessions(filter: 'all' | 'active' | 'completed' | 'archived'): Promise<void> {
    await this.filterDropdown.click();
    await this.page.locator(`[data-testid="filter-option-${filter}"]`).click();
  }

  /**
   * 关闭会话
   */
  async closeSession(): Promise<void> {
    await this.safeClick(this.closeButton);
  }

  /**
   * 重试失败的消息
   */
  async retryFailedMessage(): Promise<void> {
    await this.safeClick(this.retryButton);
    await this.waitForAssistantResponse();
  }

  /**
   * 等待加载完成
   */
  async waitForLoading(): Promise<void> {
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 15000 });
  }

  /**
   * 验证消息数量
   */
  async expectMessageCount(count: number): Promise<void> {
    await expect(this.messageList.locator('> *')).toHaveCount(count);
  }
}
