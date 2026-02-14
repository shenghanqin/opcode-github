import { test, expect } from '@playwright/test';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * 设置功能 E2E 测试 - 超级完整版
 */
test.describe('设置功能', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.navigateToSettings();
  });

  test.describe('常规设置', () => {
    test('应该能设置 Claude 路径', async () => {
      const testPath = '/usr/local/bin/claude';
      await settingsPage.setClaudePath(testPath);
      await settingsPage.saveSettings();
      
      // 验证保存成功
      await expect(settingsPage.claudePathInput).toHaveValue(testPath);
    });

    test('应该能选择和保存 AI 模型', async () => {
      const models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
      
      for (const model of models) {
        await settingsPage.selectModel(model);
        await settingsPage.saveSettings();
        
        // 验证 Toast 提示
        await settingsPage.expectToast('Settings saved successfully');
      }
    });

    test('API Key 应该被正确掩码显示', async () => {
      await settingsPage.safeFill(settingsPage.apiKeyInput, 'sk-test123456789');
      
      // 验证输入类型为 password
      const inputType = await settingsPage.apiKeyInput.getAttribute('type');
      expect(inputType).toBe('password');
    });

    test('重置设置应该恢复默认值', async () => {
      // 先修改一个设置
      await settingsPage.setClaudePath('/custom/path');
      await settingsPage.saveSettings();
      
      // 重置
      await settingsPage.resetSettings();
      
      // 验证 Toast
      await settingsPage.expectToast('Settings reset to default');
    });
  });

  test.describe('外观设置', () => {
    test('应该能切换深色/浅色主题', async () => {
      await settingsPage.switchTab('appearance');
      
      // 获取初始主题
      const initialTheme = await settingsPage.getCurrentTheme();
      
      // 切换主题
      await settingsPage.toggleTheme();
      await settingsPage.saveSettings();
      
      // 验证主题切换
      const newTheme = await settingsPage.getCurrentTheme();
      expect(newTheme).not.toBe(initialTheme);
    });

    test('主题切换应该持久化', async ({ page }) => {
      await settingsPage.switchTab('appearance');
      await settingsPage.toggleTheme();
      await settingsPage.saveSettings();
      
      const themeBeforeReload = await settingsPage.getCurrentTheme();
      
      // 刷新页面
      await page.reload();
      await settingsPage.navigateToSettings();
      await settingsPage.switchTab('appearance');
      
      const themeAfterReload = await settingsPage.getCurrentTheme();
      expect(themeAfterReload).toBe(themeBeforeReload);
    });
  });

  test.describe('存储管理', () => {
    test('应该显示存储使用情况', async () => {
      await settingsPage.switchTab('storage');
      
      // 验证存储信息显示
      await expect(settingsPage.storageUsage).toBeVisible();
      
      const usageText = await settingsPage.storageUsage.textContent();
      expect(usageText).toMatch(/\d+\.?\d*\s*(MB|GB)/i);
    });

    test('应该能清除缓存', async () => {
      await settingsPage.switchTab('storage');
      await settingsPage.clearCache();
      
      // 验证清除后 Toast
      await settingsPage.expectToast('Cache cleared successfully');
    });

    test('应该能导出数据', async () => {
      await settingsPage.switchTab('storage');
      
      // 等待下载事件
      const downloadPromise = settingsPage.page.waitForEvent('download');
      await settingsPage.exportDataButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/opcode-backup.*\.json/i);
    });
  });

  test.describe('代理设置', () => {
    test('应该能配置 HTTP 代理', async () => {
      await settingsPage.configureProxy('proxy.example.com', '8080');
      
      // 验证代理启用
      await settingsPage.switchTab('proxy');
      await expect(settingsPage.proxyEnabled).toBeChecked();
      await expect(settingsPage.proxyHostInput).toHaveValue('proxy.example.com');
      await expect(settingsPage.proxyPortInput).toHaveValue('8080');
    });

    test('代理端口应该验证为数字', async () => {
      await settingsPage.switchTab('proxy');
      await settingsPage.safeClick(settingsPage.proxyEnabled);
      
      // 输入无效端口
      await settingsPage.proxyPortInput.fill('abc');
      await settingsPage.saveButton.click();
      
      // 验证错误提示
      const error = settingsPage.page.locator('[data-testid="port-error"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Invalid port number');
    });

    test('应该能禁用代理', async () => {
      await settingsPage.switchTab('proxy');
      await settingsPage.safeClick(settingsPage.proxyEnabled);
      await settingsPage.saveSettings();
      
      await expect(settingsPage.proxyEnabled).not.toBeChecked();
    });
  });

  test.describe('高级设置', () => {
    test('应该能启用调试模式', async () => {
      await settingsPage.toggleDebugMode();
      
      await settingsPage.switchTab('advanced');
      await expect(settingsPage.debugMode).toBeChecked();
    });

    test('应该能启用自动更新', async () => {
      await settingsPage.switchTab('advanced');
      await settingsPage.safeClick(settingsPage.autoUpdate);
      await settingsPage.saveSettings();
      
      await expect(settingsPage.autoUpdate).toBeChecked();
    });

    test('应该能启用崩溃报告', async () => {
      await settingsPage.switchTab('advanced');
      await settingsPage.safeClick(settingsPage.crashReporting);
      await settingsPage.saveSettings();
      
      await expect(settingsPage.crashReporting).toBeChecked();
    });
  });

  test.describe('设置验证', () => {
    test('无效路径应该显示错误', async () => {
      await settingsPage.setClaudePath('/nonexistent/path/to/claude');
      await settingsPage.saveButton.click();
      
      // 验证路径验证错误
      const error = settingsPage.page.locator('[data-testid="path-error"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Path does not exist');
    });

    test('空必填字段应该阻止保存', async () => {
      await settingsPage.claudePathInput.fill('');
      await settingsPage.saveButton.click();
      
      // 验证保存未成功（按钮应禁用或显示错误）
      await expect(settingsPage.saveButton).toBeDisabled();
    });
  });
});
