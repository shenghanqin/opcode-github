import { test, expect } from '@playwright/test';
import { ProjectsPage } from '../pages/ProjectsPage';
import { SessionsPage } from '../pages/SessionsPage';
import { AgentsPage } from '../pages/AgentsPage';

/**
 * 边界情况和异常处理测试
 * 测试极端输入、错误场景和恢复能力
 */
test.describe('边界情况和异常处理', () => {
  test.describe('输入边界', () => {
    test('超长项目名称应该被截断或拒绝', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      const longName = 'A'.repeat(500);
      await projectsPage.createProjectButton.click();
      await projectsPage.projectNameInput.fill(longName);
      
      // 验证输入被限制
      const value = await projectsPage.projectNameInput.inputValue();
      expect(value.length).toBeLessThan(500);
    });

    test('特殊字符在项目名称中应该被正确处理', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      const specialNames = [
        'Project <script>alert(1)</script>',  // XSS 测试
        'Project "quoted"',
        "Project 'single'",
        'Project `backtick`',
        'Project \n newline',
        'Project \t tab',
        'Project 🔥 emoji',
        'Project 中文测试',
        'Project العربية',
      ];
      
      for (const name of specialNames) {
        await projectsPage.createProject(name, `/tmp/${Date.now()}`);
        await projectsPage.expectToast('Project created successfully');
      }
    });

    test('空路径应该显示验证错误', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      await projectsPage.createProjectButton.click();
      await projectsPage.projectNameInput.fill('Valid Name');
      await projectsPage.projectPathInput.fill('');
      await projectsPage.saveProjectButton.click();
      
      // 验证错误提示
      await expect(page.locator('[data-testid="path-required-error"]')).toBeVisible();
    });

    test('路径遍历攻击应该被阻止', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/shadow',
        'C:\\Windows\\System32',
      ];
      
      for (const path of maliciousPaths) {
        await projectsPage.createProjectButton.click();
        await projectsPage.projectNameInput.fill('Test');
        await projectsPage.projectPathInput.fill(path);
        await projectsPage.saveProjectButton.click();
        
        // 验证安全错误
        await expect(page.locator('[data-testid="security-error"]')).toBeVisible();
        
        // 关闭模态框
        await page.click('[data-testid="cancel-button"]');
      }
    });
  });

  test.describe('内存和压力测试', () => {
    test('大量项目列表应该能正确渲染', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 模拟大量项目
      await page.evaluate(() => {
        const mockProjects = Array.from({ length: 1000 }, (_, i) => ({
          id: `proj-${i}`,
          name: `Project ${i}`,
          path: `/tmp/project-${i}`,
        }));
        window.__MOCK_PROJECTS__ = mockProjects;
      });
      
      // 验证页面不崩溃
      await expect(projectsPage.projectList).toBeVisible();
      
      // 验证虚拟滚动
      const initialCount = await projectsPage.projectCards.count();
      expect(initialCount).toBeLessThan(100); // 应该使用虚拟滚动
    });

    test('大量消息会话应该能流畅滚动', async ({ page }) => {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.goto();
      await sessionsPage.createSession();
      
      // 发送大量消息
      for (let i = 0; i < 100; i++) {
        await sessionsPage.sendMessage(`Message ${i}: ${'A'.repeat(100)}`);
      }
      
      // 验证滚动性能
      const start = Date.now();
      await sessionsPage.messageList.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // 应该很快
    });

    test('大文件上传应该被限制', async ({ page }) => {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.goto();
      await sessionsPage.createSession();
      
      // 尝试上传大文件
      const bigFile = {
        name: 'big-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.alloc(100 * 1024 * 1024), // 100MB
      };
      
      await sessionsPage.page.setInputFiles('[data-testid="file-upload"]', bigFile);
      
      // 验证大小限制错误
      await expect(page.locator('[data-testid="file-too-large-error"]')).toBeVisible();
    });
  });

  test.describe('网络异常', () => {
    test('离线模式应该显示离线提示', async ({ page }) => {
      // 模拟离线
      await page.context().setOffline(true);
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证离线提示
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // 恢复网络
      await page.context().setOffline(false);
    });

    test('慢网络应该显示加载状态', async ({ page }) => {
      // 模拟慢网络
      await page.route('**/*', async (route) => {
        await new Promise((r) => setTimeout(r, 5000));
        await route.continue();
      });
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证加载状态
      await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    });

    test('API 500 错误应该优雅处理', async ({ page }) => {
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证错误提示
      await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('API 超时应该可重试', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await new Promise((r) => setTimeout(r, 30000)); // 30秒超时
        route.fulfill({ status: 200, body: '{}' });
      });
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证超时提示
      await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
      
      // 点击重试
      await page.click('[data-testid="retry-button"]');
    });
  });

  test.describe('并发和竞态条件', () => {
    test('快速连续点击应该只执行一次', async ({ page }) => {
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      let requestCount = 0;
      await page.route('**/api/projects', (route) => {
        requestCount++;
        route.continue();
      });
      
      // 快速点击创建按钮 10 次
      await projectsPage.createProjectButton.click();
      for (let i = 0; i < 9; i++) {
        await projectsPage.createProjectButton.click({ force: true });
      }
      
      // 验证只发送了一次请求
      expect(requestCount).toBe(1);
    });

    test('同时发送多条消息应该排队处理', async ({ page }) => {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.goto();
      await sessionsPage.createSession();
      
      // 快速发送多条消息
      const messages = ['Msg 1', 'Msg 2', 'Msg 3'];
      for (const msg of messages) {
        await sessionsPage.messageInput.fill(msg);
        await sessionsPage.sendButton.click();
      }
      
      // 验证消息顺序正确
      const userMessages = await sessionsPage.userMessages.allTextContents();
      expect(userMessages).toEqual(messages);
    });
  });

  test.describe('数据恢复', () => {
    test('页面崩溃后应该能恢复状态', async ({ page }) => {
      const sessionsPage = new SessionsPage(page);
      await sessionsPage.goto();
      await sessionsPage.createSession();
      await sessionsPage.sendMessage('Test message');
      
      // 模拟崩溃（刷新页面）
      await page.reload();
      
      // 验证状态恢复
      await expect(sessionsPage.sessionContainer).toBeVisible();
      await expect(sessionsPage.messageList).toBeVisible();
    });

    test('自动保存应该防止数据丢失', async ({ page }) => {
      const agentsPage = new AgentsPage(page);
      await agentsPage.goto();
      await agentsPage.navigateToSettings?.() || page.click('[data-testid="agents-tab"]');
      
      // 填写表单但不保存
      await agentsPage.createAgentButton.click();
      await agentsPage.agentNameInput.fill('Auto Save Test');
      await agentsPage.agentPromptInput.fill('This should be auto-saved');
      
      // 等待自动保存
      await page.waitForTimeout(5000);
      
      // 刷新页面
      await page.reload();
      
      // 验证数据已恢复
      await agentsPage.createAgentButton.click();
      const nameValue = await agentsPage.agentNameInput.inputValue();
      expect(nameValue).toBe('Auto Save Test');
    });
  });

  test.describe('浏览器兼容性', () => {
    test('应该处理 localStorage 不可用的情况', async ({ page }) => {
      // 禁用 localStorage
      await page.evaluate(() => {
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
        });
      });
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证应用不崩溃
      await expect(projectsPage.projectList).toBeVisible();
    });

    test('应该处理 IndexedDB 错误', async ({ page }) => {
      // 模拟 IndexedDB 错误
      await page.evaluate(() => {
        window.indexedDB.open = () => {
          throw new Error('IndexedDB not available');
        };
      });
      
      const projectsPage = new ProjectsPage(page);
      await projectsPage.goto();
      
      // 验证降级到内存存储
      await expect(projectsPage.projectList).toBeVisible();
    });
  });
});
