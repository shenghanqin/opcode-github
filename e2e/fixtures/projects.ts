import { Page } from '@playwright/test';

/**
 * 模拟项目数据
 */
export const mockProjects = [
  {
    id: 'proj-1',
    name: 'Test Project Alpha',
    path: '/home/user/projects/alpha',
    description: 'A test project for E2E testing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Test Project Beta',
    path: '/home/user/projects/beta',
    description: 'Another test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 新创项目数据
 */
export const newProjectData = {
  name: 'E2E Test Project',
  path: '/home/user/projects/e2e-test',
};

/**
 * 模拟会话数据
 */
export const mockSessions = [
  {
    id: 'session-1',
    projectId: 'proj-1',
    name: 'Initial Setup',
    firstMessage: 'Let me set up the project',
    timestamp: new Date().toISOString(),
    status: 'completed',
  },
  {
    id: 'session-2',
    projectId: 'proj-1',
    name: 'Feature Implementation',
    firstMessage: 'Implementing the main feature',
    timestamp: new Date().toISOString(),
    status: 'active',
  },
];

/**
 * 设置项目的 Mock API 响应
 */
export async function setupProjectMocks(page: Page): Promise<void> {
  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProjects),
    });
  });

  await page.route('**/api/projects/*', async (route) => {
    const url = route.request().url();
    const projectId = url.split('/').pop();
    const project = mockProjects.find(p => p.id === projectId);
    
    await route.fulfill({
      status: project ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(project || { error: 'Not found' }),
    });
  });
}

/**
 * 设置会话的 Mock API 响应
 */
export async function setupSessionMocks(page: Page): Promise<void> {
  await page.route('**/api/sessions**', async (route) => {
    const url = new URL(route.request().url());
    const projectId = url.searchParams.get('projectId');
    
    const sessions = projectId 
      ? mockSessions.filter(s => s.projectId === projectId)
      : mockSessions;
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessions),
    });
  });
}
