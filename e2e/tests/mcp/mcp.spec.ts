import { test, expect } from '@playwright/test';
import { MCPManagerPage } from '../../pages/MCPManagerPage';

/**
 * MCP 服务器管理 E2E 测试 - 超级完整版
 */
test.describe('MCP 服务器管理', () => {
  let mcpPage: MCPManagerPage;

  test.beforeEach(async ({ page }) => {
    mcpPage = new MCPManagerPage(page);
    await mcpPage.goto();
    await mcpPage.navigateToMCP();
  });

  test.describe('服务器 CRUD', () => {
    test('应该能添加新的 MCP 服务器', async () => {
      const serverName = 'Test MCP Server';
      const serverUrl = 'http://localhost:3000/mcp';
      
      await mcpPage.addServer(serverName, 'http', serverUrl);
      await mcpPage.expectServerExists(serverName);
    });

    test('应该能添加不同类型的服务器', async () => {
      const servers = [
        { name: 'HTTP Server', type: 'http', url: 'http://localhost:3000' },
        { name: 'WebSocket Server', type: 'websocket', url: 'ws://localhost:3001' },
        { name: 'SSE Server', type: 'sse', url: 'http://localhost:3002/events' },
      ];
      
      for (const server of servers) {
        await mcpPage.addServer(server.name, server.type, server.url);
        await mcpPage.expectServerExists(server.name);
      }
    });

    test('应该能编辑服务器配置', async () => {
      const originalName = 'Server To Edit';
      const newUrl = 'http://new-host:4000/mcp';
      
      await mcpPage.addServer(originalName, 'http', 'http://old-host:3000');
      await mcpPage.editServer(originalName, newUrl);
      
      // 验证更新成功
      const server = mcpPage.serverCards.filter({ hasText: originalName });
      await expect(server).toContainText(newUrl);
    });

    test('应该能删除服务器', async () => {
      const serverName = 'Server To Delete';
      await mcpPage.addServer(serverName, 'http', 'http://localhost:3000');
      
      const initialCount = await mcpPage.serverCards.count();
      await mcpPage.deleteServer(serverName);
      
      const finalCount = await mcpPage.serverCards.count();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('删除服务器前应该要求确认', async () => {
      const serverName = 'Confirm Delete Test';
      await mcpPage.addServer(serverName, 'http', 'http://localhost:3000');
      
      const server = mcpPage.serverCards.filter({ hasText: serverName });
      await mcpPage.safeClick(
        server.locator('[data-testid="delete-server-button"]')
      );
      
      // 验证确认对话框
      const confirmModal = mcpPage.page.locator('[data-testid="confirm-delete-modal"]');
      await expect(confirmModal).toBeVisible();
    });
  });

  test.describe('连接测试', () => {
    test('成功连接应该显示绿色状态', async () => {
      // Mock 成功响应
      await mcpPage.page.route('**/api/mcp/test', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ status: 'connected', latency: 50 }),
        });
      });
      
      await mcpPage.addServer('Working Server', 'http', 'http://working-server:3000');
      
      // 测试连接
      const isConnected = await mcpPage.testConnection();
      expect(isConnected).toBe(true);
      
      // 验证状态显示
      const status = await mcpPage.getServerStatus('Working Server');
      expect(status).toBe('connected');
    });

    test('连接失败应该显示错误状态', async () => {
      // Mock 失败响应
      await mcpPage.page.route('**/api/mcp/test', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Connection refused' }),
        });
      });
      
      await mcpPage.addServer('Failing Server', 'http', 'http://failing-server:3000');
      
      const status = await mcpPage.getServerStatus('Failing Server');
      expect(status).toBe('error');
    });

    test('超时应该显示超时错误', async () => {
      await mcpPage.page.route('**/api/mcp/test', async (route) => {
        await new Promise((r) => setTimeout(r, 10000)); // 10秒超时
        route.fulfill({ status: 200, body: '{}' });
      });
      
      await mcpPage.addServer('Slow Server', 'http', 'http://slow-server:3000');
      
      // 应该显示超时错误
      await expect(mcpPage.page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });
  });

  test.describe('启用/禁用', () => {
    test('应该能启用服务器', async () => {
      const serverName = 'Toggle Test Server';
      await mcpPage.addServer(serverName, 'http', 'http://localhost:3000');
      
      // 禁用
      await mcpPage.toggleServer(serverName);
      
      // 验证状态变化
      const server = mcpPage.serverCards.filter({ hasText: serverName });
      const status = await server.locator('[data-testid="server-status"]').textContent();
      expect(status?.toLowerCase()).toContain('disabled');
    });

    test('应该能重新启用服务器', async () => {
      const serverName = 'Re-enable Test';
      await mcpPage.addServer(serverName, 'http', 'http://localhost:3000');
      
      // 先禁用
      await mcpPage.toggleServer(serverName);
      // 再启用
      await mcpPage.toggleServer(serverName);
      
      const status = await mcpPage.getServerStatus(serverName);
      expect(status).not.toBe('disconnected');
    });
  });

  test.describe('导入导出', () => {
    test('应该能从 Claude Desktop 导入', async () => {
      // Mock 导入成功
      await mcpPage.page.route('**/api/mcp/import/claude', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ imported: 3, servers: ['Server 1', 'Server 2', 'Server 3'] }),
        });
      });
      
      await mcpPage.importFromClaudeDesktop();
      await mcpPage.expectToast('Imported 3 servers from Claude Desktop');
    });

    test('应该能导出配置', async () => {
      await mcpPage.addServer('Export Test', 'http', 'http://localhost:3000');
      
      const downloadPromise = mcpPage.page.waitForEvent('download');
      await mcpPage.exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/mcp-config.*\.json/i);
    });

    test('应该能从文件导入', async () => {
      // 准备测试文件
      const configContent = JSON.stringify({
        servers: [
          { name: 'Imported 1', type: 'http', url: 'http://import1:3000' },
          { name: 'Imported 2', type: 'http', url: 'http://import2:3000' },
        ],
      });
      
      // 文件上传测试
      await mcpPage.importButton.click();
      await expect(mcpPage.importModal).toBeVisible();
      
      // 上传文件
      await mcpPage.importFileInput.setInputFiles([
        {
          name: 'mcp-config.json',
          mimeType: 'application/json',
          buffer: Buffer.from(configContent),
        },
      ]);
      
      await mcpPage.confirmImportButton.click();
      await mcpPage.expectToast('Configuration imported successfully');
    });
  });

  test.describe('配置验证', () => {
    test('无效 URL 应该显示错误', async () => {
      await mcpPage.addServerButton.click();
      await expect(mcpPage.serverModal).toBeVisible();
      
      await mcpPage.serverNameInput.fill('Invalid URL Test');
      await mcpPage.serverUrlInput.fill('not-a-valid-url');
      await mcpPage.saveServerButton.click();
      
      await expect(mcpPage.validationError).toBeVisible();
      await expect(mcpPage.validationError).toContainText('Invalid URL');
    });

    test('空名称应该阻止保存', async () => {
      await mcpPage.addServerButton.click();
      await mcpPage.serverUrlInput.fill('http://localhost:3000');
      await mcpPage.saveServerButton.click();
      
      // 验证保存按钮被禁用或有错误提示
      await expect(mcpPage.saveServerButton).toBeDisabled();
    });

    test('重复名称应该显示警告', async () => {
      const serverName = 'Duplicate Name';
      await mcpPage.addServer(serverName, 'http', 'http://localhost:3000');
      
      // 尝试添加同名服务器
      await mcpPage.addServerButton.click();
      await mcpPage.serverNameInput.fill(serverName);
      await mcpPage.serverUrlInput.fill('http://localhost:3001');
      await mcpPage.saveServerButton.click();
      
      await expect(mcpPage.page.locator('[data-testid="duplicate-name-warning"]')).toBeVisible();
    });
  });

  test.describe('批量操作', () => {
    test('应该能批量启用/禁用', async () => {
      // 添加多个服务器
      for (let i = 0; i < 3; i++) {
        await mcpPage.addServer(`Batch Server ${i}`, 'http', `http://localhost:${3000 + i}`);
      }
      
      // 选择全部
      await mcpPage.page.click('[data-testid="select-all-servers"]');
      await mcpPage.page.click('[data-testid="batch-disable-button"]');
      
      // 验证所有服务器已禁用
      const servers = await mcpPage.serverCards.count();
      for (let i = 0; i < servers; i++) {
        const status = await mcpPage.serverCards.nth(i)
          .locator('[data-testid="server-status"]')
          .textContent();
        expect(status?.toLowerCase()).toContain('disabled');
      }
    });

    test('应该能批量删除', async () => {
      // 添加测试服务器
      for (let i = 0; i < 3; i++) {
        await mcpPage.addServer(`Delete Batch ${i}`, 'http', `http://localhost:${3000 + i}`);
      }
      
      const initialCount = await mcpPage.serverCards.count();
      
      // 选择并删除
      await mcpPage.page.click('[data-testid="select-all-servers"]');
      await mcpPage.page.click('[data-testid="batch-delete-button"]');
      await mcpPage.page.click('[data-testid="confirm-batch-delete"]');
      
      const finalCount = await mcpPage.serverCards.count();
      expect(finalCount).toBe(initialCount - 3);
    });
  });
});
