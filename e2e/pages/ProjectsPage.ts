import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 项目列表页面对象
 */
export class ProjectsPage extends BasePage {
  // 元素定位器
  readonly projectList: Locator;
  readonly createProjectButton: Locator;
  readonly projectSearch: Locator;
  readonly projectCards: Locator;
  readonly emptyState: Locator;
  readonly projectModal: Locator;
  readonly projectNameInput: Locator;
  readonly projectPathInput: Locator;
  readonly saveProjectButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    this.projectList = page.locator('[data-testid="project-list"]');
    this.createProjectButton = page.locator('[data-testid="create-project-button"]');
    this.projectSearch = page.locator('[data-testid="project-search"]');
    this.projectCards = page.locator('[data-testid="project-card"]');
    this.emptyState = page.locator('[data-testid="empty-projects"]');
    this.projectModal = page.locator('[data-testid="project-modal"]');
    this.projectNameInput = page.locator('[data-testid="project-name-input"]');
    this.projectPathInput = page.locator('[data-testid="project-path-input"]');
    this.saveProjectButton = page.locator('[data-testid="save-project-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
  }

  async waitForPageLoad(): Promise<void> {
    await expect(this.projectList).toBeVisible({ timeout: 10000 });
  }

  /**
   * 创建新项目
   */
  async createProject(name: string, path: string): Promise<void> {
    await this.safeClick(this.createProjectButton);
    await expect(this.projectModal).toBeVisible();
    
    await this.safeFill(this.projectNameInput, name);
    await this.safeFill(this.projectPathInput, path);
    
    await this.safeClick(this.saveProjectButton);
    await expect(this.projectModal).not.toBeVisible();
  }

  /**
   * 搜索项目
   */
  async searchProject(query: string): Promise<void> {
    await this.safeFill(this.projectSearch, query);
    await this.page.waitForTimeout(300); // 等待防抖
  }

  /**
   * 获取项目卡片数量
   */
  async getProjectCount(): Promise<number> {
    return await this.projectCards.count();
  }

  /**
   * 点击项目卡片
   */
  async openProject(projectName: string): Promise<void> {
    const project = this.projectCards.filter({ hasText: projectName });
    await this.safeClick(project);
  }

  /**
   * 验证空状态显示
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.projectCards).toHaveCount(0);
  }

  /**
   * 验证项目存在
   */
  async expectProjectExists(name: string): Promise<void> {
    const project = this.projectCards.filter({ hasText: name });
    await expect(project).toBeVisible();
  }
}
