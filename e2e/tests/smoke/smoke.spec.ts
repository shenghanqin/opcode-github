import { test, expect } from '@playwright/test';
import { ProjectsPage } from '../pages/ProjectsPage';

/**
 * 冒烟测试 - 快速验证核心功能可用
 * 应在每次部署前运行
 */
test.describe('冒烟测试', () => {
  test('应用能正常加载', async ({ page }) => {
    await page.goto('/');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/opcode/i);
    
    // 验证核心组件加载
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).toBeVisible();
  });

  test('导航菜单正常工作', async ({ page }) => {
    await page.goto('/');
    
    // 测试各个导航标签
    const tabs = ['projects', 'agents', 'usage', 'settings', 'mcp'];
    
    for (const tab of tabs) {
      const tabButton = page.locator(`[data-testid="${tab}-tab"]`);
      if (await tabButton.isVisible().catch(() => false)) {
        await tabButton.click();
        await expect(page).toHaveURL(new RegExp(`.*${tab}.*`));
      }
    }
  });

  test('项目列表页能加载', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();
    
    // 验证关键元素存在
    await expect(projectsPage.projectList).toBeVisible();
    await expect(projectsPage.createProjectButton).toBeVisible();
  });

  test('创建项目模态框能打开', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();
    
    await projectsPage.safeClick(projectsPage.createProjectButton);
    await expect(projectsPage.projectModal).toBeVisible();
    await expect(projectsPage.projectNameInput).toBeVisible();
    await expect(projectsPage.saveProjectButton).toBeVisible();
  });

  test('设置页能加载', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="settings-tab"]');
    
    // 验证设置表单存在
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();
  });

  test('响应式布局适配', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // 测试手机视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('黑暗模式切换', async ({ page }) => {
    await page.goto('/');
    
    // 获取主题切换按钮
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible().catch(() => false)) {
      // 切换主题
      await themeToggle.click();
      
      // 验证主题类变化
      const html = page.locator('html');
      const hasDarkClass = await html.evaluate(el => el.classList.contains('dark'));
      expect(hasDarkClass).toBeTruthy();
    }
  });
});
