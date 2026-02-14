import { test, expect } from '@playwright/test';
import { ProjectsPage } from '../pages/ProjectsPage';
import { setupProjectMocks, mockProjects, newProjectData } from '../fixtures/projects';

/**
 * 项目功能 E2E 测试
 */
test.describe('项目管理', () => {
  let projectsPage: ProjectsPage;

  test.beforeEach(async ({ page }) => {
    // 设置 API Mock
    await setupProjectMocks(page);
    
    // 初始化页面对象
    projectsPage = new ProjectsPage(page);
    await projectsPage.goto();
  });

  test('应该显示项目列表', async () => {
    // 验证页面加载
    await expect(projectsPage.projectList).toBeVisible();
    
    // 验证项目卡片显示
    const projectCount = await projectsPage.getProjectCount();
    expect(projectCount).toBeGreaterThan(0);
    
    // 验证特定项目存在
    await projectsPage.expectProjectExists(mockProjects[0].name);
  });

  test('应该能搜索项目', async () => {
    // 搜索特定项目
    await projectsPage.searchProject('Alpha');
    
    // 验证搜索结果
    const projectCount = await projectsPage.getProjectCount();
    expect(projectCount).toBe(1);
    
    // 验证搜索到的项目
    await projectsPage.expectProjectExists('Test Project Alpha');
  });

  test('应该能创建新项目', async () => {
    // 记录当前项目数
    const initialCount = await projectsPage.getProjectCount();
    
    // 创建新项目
    await projectsPage.createProject(
      newProjectData.name,
      newProjectData.path
    );
    
    // 验证创建成功提示
    await projectsPage.expectToast('Project created successfully');
    
    // 验证项目列表更新
    await projectsPage.expectProjectExists(newProjectData.name);
  });

  test('应该能打开项目详情', async () => {
    // 点击第一个项目
    await projectsPage.openProject(mockProjects[0].name);
    
    // 验证导航到项目详情页
    await expect(projectsPage.page).toHaveURL(/.*project.*/);
  });

  test('搜索无结果时显示空状态', async () => {
    // 搜索不存在的项目
    await projectsPage.searchProject('NonExistentProject12345');
    
    // 验证空状态显示
    await projectsPage.expectEmptyState();
  });

  test('创建项目时取消操作', async () => {
    // 点击创建按钮
    await projectsPage.safeClick(projectsPage.createProjectButton);
    await expect(projectsPage.projectModal).toBeVisible();
    
    // 填写部分信息
    await projectsPage.safeFill(projectsPage.projectNameInput, 'Test');
    
    // 点击取消
    await projectsPage.safeClick(projectsPage.cancelButton);
    
    // 验证模态框关闭，项目未创建
    await expect(projectsPage.projectModal).not.toBeVisible();
    await expect(projectsPage.projectCards.filter({ hasText: 'Test' })).not.toBeVisible();
  });
});
