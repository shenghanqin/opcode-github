import { test, expect } from '@playwright/test';
import { AgentsPage } from '../../pages/AgentsPage';

/**
 * Agent 功能 E2E 测试
 */
test.describe('Agent 管理', () => {
  let agentsPage: AgentsPage;

  test.beforeEach(async ({ page }) => {
    agentsPage = new AgentsPage(page);
    await agentsPage.goto();
    
    // 导航到 Agents 标签
    await page.click('[data-testid="agents-tab"]');
    await agentsPage.waitForPageLoad();
  });

  test('应该显示 Agent 列表', async () => {
    await expect(agentsPage.agentsList).toBeVisible();
  });

  test('应该能创建新 Agent', async () => {
    const agentName = 'Test Code Reviewer';
    const agentPrompt = 'You are a code review expert. Review the code for best practices.';
    
    // 创建 Agent
    await agentsPage.createAgent(agentName, agentPrompt);
    
    // 验证创建成功
    await agentsPage.expectAgentExists(agentName);
    await agentsPage.expectToast('Agent created successfully');
  });

  test('应该能创建带图标的 Agent', async () => {
    const agentName = 'Bug Finder';
    const agentPrompt = 'Find bugs in the code.';
    const icon = 'bug';
    
    await agentsPage.createAgent(agentName, agentPrompt, icon);
    
    // 验证创建成功
    await agentsPage.expectAgentExists(agentName);
  });

  test('创建 Agent 时验证必填字段', async () => {
    // 点击创建按钮
    await agentsPage.safeClick(agentsPage.createAgentButton);
    await expect(agentsPage.agentModal).toBeVisible();
    
    // 不填写任何内容直接保存
    await agentsPage.safeClick(agentsPage.saveAgentButton);
    
    // 验证表单验证错误
    await expect(agentsPage.page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(agentsPage.page.locator('[data-testid="prompt-error"]')).toBeVisible();
    
    // 模态框应保持打开
    await expect(agentsPage.agentModal).toBeVisible();
  });

  test('应该能运行 Agent', async () => {
    // 假设已有一个 Agent
    const agentName = 'Existing Agent';
    
    // 运行 Agent
    await agentsPage.runAgent(agentName);
    
    // 验证跳转到执行页面
    await expect(agentsPage.page).toHaveURL(/.*agent-execution.*/);
  });

  test('应该能删除 Agent', async () => {
    const agentName = 'Agent To Delete';
    
    // 先创建 Agent
    await agentsPage.createAgent(agentName, 'Temporary agent');
    const initialCount = await agentsPage.getAgentCount();
    
    // 删除 Agent
    await agentsPage.deleteAgent(agentName);
    
    // 验证删除成功
    await agentsPage.expectToast('Agent deleted successfully');
    const finalCount = await agentsPage.getAgentCount();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('Agent Prompt 应该支持多行文本', async () => {
    const agentName = 'Multi-line Agent';
    const multiLinePrompt = `Line 1: First instruction
Line 2: Second instruction
Line 3: Third instruction`;
    
    await agentsPage.createAgent(agentName, multiLinePrompt);
    await agentsPage.expectAgentExists(agentName);
  });
});
