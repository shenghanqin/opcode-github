import { test, expect } from '@playwright/test';
import { SessionsPage } from '../../pages/SessionsPage';
import { setupProjectMocks, setupSessionMocks } from '../../fixtures/projects';

/**
 * 会话管理 E2E 测试 - 超级完整版
 */
test.describe('会话管理', () => {
  let sessionsPage: SessionsPage;

  test.beforeEach(async ({ page }) => {
    await setupProjectMocks(page);
    await setupSessionMocks(page);
    
    sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();
  });

  test.describe('会话列表', () => {
    test('应该显示会话列表', async () => {
      await sessionsPage.waitForPageLoad();
      await expect(sessionsPage.sessionsList).toBeVisible();
      
      const sessionCount = await sessionsPage.sessionCards.count();
      expect(sessionCount).toBeGreaterThan(0);
    });

    test('应该能搜索会话', async () => {
      await sessionsPage.waitForPageLoad();
      await sessionsPage.searchSessions('Initial');
      
      // 验证搜索结果
      const filteredCards = sessionsPage.sessionCards.filter({ hasText: 'Initial' });
      await expect(filteredCards).toHaveCount(1);
    });

    test('应该能过滤会话状态', async () => {
      await sessionsPage.waitForPageLoad();
      
      // 测试各种过滤器
      const filters = ['all', 'active', 'completed', 'archived'];
      for (const filter of filters) {
        await sessionsPage.filterSessions(filter as any);
        await sessionsPage.page.waitForTimeout(300);
        
        // 验证列表已更新
        await expect(sessionsPage.sessionsList).toBeVisible();
      }
    });

    test('空搜索结果应该显示空状态', async () => {
      await sessionsPage.waitForPageLoad();
      await sessionsPage.searchSessions('NonExistentSession12345');
      
      // 验证空状态
      const emptyState = sessionsPage.page.locator('[data-testid="empty-sessions"]');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('创建和发送消息', () => {
    test('应该能创建新会话', async () => {
      const initialMessage = 'Hello, this is a test message';
      await sessionsPage.createSession(initialMessage);
      
      // 验证会话容器显示
      await expect(sessionsPage.sessionContainer).toBeVisible();
      
      // 验证消息已发送
      await expect(sessionsPage.userMessages.last()).toContainText(initialMessage);
    });

    test('应该能发送多轮对话', async () => {
      await sessionsPage.createSession();
      
      const messages = [
        'First message',
        'Second message',
        'Third message',
      ];
      
      for (const msg of messages) {
        await sessionsPage.sendMessage(msg);
      }
      
      // 验证所有消息都在列表中
      await sessionsPage.expectMessageCount(messages.length * 2); // 用户消息 + AI 回复
    });

    test('应该能处理长文本消息', async () => {
      await sessionsPage.createSession();
      
      const longMessage = 'A'.repeat(1000);
      await sessionsPage.sendMessage(longMessage);
      
      // 验证消息被正确截断或显示
      const lastMessage = sessionsPage.userMessages.last();
      await expect(lastMessage).toBeVisible();
    });

    test('应该能处理特殊字符', async () => {
      await sessionsPage.createSession();
      
      const specialMessage = 'Hello! @#$%^&*()_+{}|:<>?~`[]\\;\'",./';
      await sessionsPage.sendMessage(specialMessage);
      
      await expect(sessionsPage.userMessages.last()).toContainText(specialMessage);
    });

    test('应该能处理多行消息', async () => {
      await sessionsPage.createSession();
      
      const multiLineMessage = `Line 1
Line 2
Line 3`;
      await sessionsPage.sendMessage(multiLineMessage);
      
      const lastMessage = await sessionsPage.userMessages.last().textContent();
      expect(lastMessage).toContain('Line 1');
      expect(lastMessage).toContain('Line 2');
      expect(lastMessage).toContain('Line 3');
    });

    test('空消息不应该被发送', async () => {
      await sessionsPage.createSession();
      
      // 尝试发送空消息
      await sessionsPage.messageInput.fill('');
      await expect(sessionsPage.sendButton).toBeDisabled();
    });
  });

  test.describe('检查点管理', () => {
    test('应该能创建检查点', async () => {
      await sessionsPage.createSession('Test message');
      await sessionsPage.createCheckpoint('Initial state');
      
      // 验证检查点创建成功
      await sessionsPage.expectToast('Checkpoint saved');
    });

    test('应该能从检查点恢复', async () => {
      await sessionsPage.createSession('First message');
      await sessionsPage.createCheckpoint('Checkpoint 1');
      
      await sessionsPage.sendMessage('Second message');
      await sessionsPage.createCheckpoint('Checkpoint 2');
      
      // 恢复到第一个检查点
      await sessionsPage.restoreFromTimeline('Checkpoint 1');
      
      // 验证恢复成功
      await sessionsPage.expectToast('Restored to checkpoint');
    });

    test('应该显示时间线分支', async () => {
      await sessionsPage.createSession('Message 1');
      await sessionsPage.createCheckpoint('Branch A');
      await sessionsPage.sendMessage('Message 2');
      await sessionsPage.createCheckpoint('Branch B');
      
      // 打开时间线
      await sessionsPage.safeClick(sessionsPage.timelineButton);
      await expect(sessionsPage.timelineModal).toBeVisible();
      
      // 验证分支显示
      const branches = await sessionsPage.timelineBranches.count();
      expect(branches).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('错误处理', () => {
    test('网络错误应该显示错误信息', async () => {
      // 模拟网络错误
      await sessionsPage.page.route('**/api/chat', (route) => {
        route.abort('failed');
      });
      
      await sessionsPage.createSession();
      await sessionsPage.sendMessage('Test');
      
      // 验证错误显示
      await expect(sessionsPage.errorMessage).toBeVisible();
      await expect(sessionsPage.retryButton).toBeVisible();
    });

    test('应该能重试失败的消息', async () => {
      let failCount = 0;
      await sessionsPage.page.route('**/api/chat', (route) => {
        if (failCount < 1) {
          failCount++;
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ response: 'Success after retry' }),
          });
        }
      });
      
      await sessionsPage.createSession();
      await sessionsPage.sendMessage('Test');
      
      // 重试
      await sessionsPage.retryFailedMessage();
      
      // 验证成功
      const lastMessage = await sessionsPage.getLastAssistantMessage();
      expect(lastMessage).toContain('Success after retry');
    });

    test('加载状态应该正确显示', async () => {
      // 延迟响应以观察加载状态
      await sessionsPage.page.route('**/api/chat', async (route) => {
        await new Promise((r) => setTimeout(r, 2000));
        route.fulfill({
          status: 200,
          body: JSON.stringify({ response: 'Delayed response' }),
        });
      });
      
      await sessionsPage.createSession();
      await sessionsPage.sendMessage('Test');
      
      // 验证加载指示器
      await expect(sessionsPage.loadingIndicator).toBeVisible();
      
      // 等待完成
      await sessionsPage.waitForLoading();
      await expect(sessionsPage.loadingIndicator).not.toBeVisible();
    });
  });

  test.describe('会话操作', () => {
    test('应该能关闭会话', async () => {
      await sessionsPage.createSession('Test');
      await sessionsPage.closeSession();
      
      // 验证返回列表页
      await expect(sessionsPage.sessionsList).toBeVisible();
    });

    test('应该能重新打开已有会话', async () => {
      await sessionsPage.waitForPageLoad();
      
      // 打开第一个会话
      const firstSession = sessionsPage.sessionCards.first();
      const sessionName = await firstSession.textContent() || '';
      await sessionsPage.openSession(sessionName);
      
      // 验证会话加载
      await expect(sessionsPage.sessionContainer).toBeVisible();
      await expect(sessionsPage.messageList).toBeVisible();
    });
  });
});
