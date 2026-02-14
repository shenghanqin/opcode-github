import { test, expect } from '@playwright/test';

/**
 * API 契约测试
 * 验证前后端接口一致性
 */
test.describe('API 契约测试', () => {
  const API_BASE = '/api';

  test.describe('项目 API', () => {
    test('GET /api/projects 应该返回正确结构', async ({ request }) => {
      const response = await request.get(`${API_BASE}/projects`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // 验证数组结构
      expect(Array.isArray(data)).toBeTruthy();
      
      if (data.length > 0) {
        const project = data[0];
        
        // 验证必需字段
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('path');
        expect(project).toHaveProperty('createdAt');
        expect(project).toHaveProperty('updatedAt');
        
        // 验证字段类型
        expect(typeof project.id).toBe('string');
        expect(typeof project.name).toBe('string');
        expect(typeof project.path).toBe('string');
      }
    });

    test('POST /api/projects 应该接受正确结构', async ({ request }) => {
      const newProject = {
        name: 'API Test Project',
        path: '/tmp/api-test-project',
        description: 'Testing API contract',
      };
      
      const response = await request.post(`${API_BASE}/projects`, {
        data: newProject,
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // 验证返回包含创建的项目
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(newProject.name);
      expect(data.path).toBe(newProject.path);
    });

    test('POST /api/projects 应该验证必填字段', async ({ request }) => {
      const invalidProject = {
        description: 'Missing name and path',
      };
      
      const response = await request.post(`${API_BASE}/projects`, {
        data: invalidProject,
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
    });

    test('GET /api/projects/:id 应该返回单个项目', async ({ request }) => {
      // 先创建一个项目
      const createRes = await request.post(`${API_BASE}/projects`, {
        data: {
          name: 'Single Project Test',
          path: '/tmp/single-project',
        },
      });
      
      const created = await createRes.json();
      
      // 查询单个项目
      const response = await request.get(`${API_BASE}/projects/${created.id}`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBe(created.id);
      expect(data.name).toBe(created.name);
    });

    test('GET /api/projects/:id 应该返回 404 对于不存在的项目', async ({ request }) => {
      const response = await request.get(`${API_BASE}/projects/non-existent-id`);
      
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('not found');
    });
  });

  test.describe('Agent API', () => {
    test('GET /api/agents 应该返回 Agent 列表', async ({ request }) => {
      const response = await request.get(`${API_BASE}/agents`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      if (data.length > 0) {
        const agent = data[0];
        
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('systemPrompt');
        expect(agent).toHaveProperty('icon');
        expect(agent).toHaveProperty('createdAt');
        
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.systemPrompt).toBe('string');
      }
    });

    test('POST /api/agents 应该创建 Agent', async ({ request }) => {
      const newAgent = {
        name: 'API Test Agent',
        systemPrompt: 'You are a test agent.',
        icon: 'bot',
      };
      
      const response = await request.post(`${API_BASE}/agents`, {
        data: newAgent,
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.name).toBe(newAgent.name);
      expect(data.systemPrompt).toBe(newAgent.systemPrompt);
      expect(data.icon).toBe(newAgent.icon);
    });

    test('POST /api/agents/:id/run 应该运行 Agent', async ({ request }) => {
      // 先创建 Agent
      const createRes = await request.post(`${API_BASE}/agents`, {
        data: {
          name: 'Runnable Agent',
          systemPrompt: 'Run me.',
        },
      });
      
      const agent = await createRes.json();
      
      // 运行 Agent
      const response = await request.post(`${API_BASE}/agents/${agent.id}/run`, {
        data: {
          input: 'Test input',
          context: {},
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('executionId');
      expect(data).toHaveProperty('status');
    });

    test('DELETE /api/agents/:id 应该删除 Agent', async ({ request }) => {
      // 创建 Agent
      const createRes = await request.post(`${API_BASE}/agents`, {
        data: {
          name: 'Deletable Agent',
          systemPrompt: 'Delete me.',
        },
      });
      
      const agent = await createRes.json();
      
      // 删除
      const deleteRes = await request.delete(`${API_BASE}/agents/${agent.id}`);
      expect(deleteRes.ok()).toBeTruthy();
      
      // 验证已删除
      const getRes = await request.get(`${API_BASE}/agents/${agent.id}`);
      expect(getRes.status()).toBe(404);
    });
  });

  test.describe('会话 API', () => {
    test('GET /api/sessions 应该支持过滤', async ({ request }) => {
      const response = await request.get(`${API_BASE}/sessions?projectId=test-project`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      // 验证过滤有效
      for (const session of data) {
        expect(session.projectId).toBe('test-project');
      }
    });

    test('POST /api/sessions 应该创建会话', async ({ request }) => {
      const newSession = {
        projectId: 'test-project',
        name: 'API Test Session',
      };
      
      const response = await request.post(`${API_BASE}/sessions`, {
        data: newSession,
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.projectId).toBe(newSession.projectId);
      expect(data.name).toBe(newSession.name);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('createdAt');
    });

    test('POST /api/sessions/:id/messages 应该发送消息', async ({ request }) => {
      // 创建会话
      const sessionRes = await request.post(`${API_BASE}/sessions`, {
        data: { projectId: 'test', name: 'Message Test' },
      });
      const session = await sessionRes.json();
      
      // 发送消息
      const response = await request.post(`${API_BASE}/sessions/${session.id}/messages`, {
        data: {
          content: 'Hello, API!',
          role: 'user',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.content).toBe('Hello, API!');
      expect(data.role).toBe('user');
      expect(data).toHaveProperty('timestamp');
    });

    test('POST /api/sessions/:id/checkpoints 应该创建检查点', async ({ request }) => {
      // 创建会话
      const sessionRes = await request.post(`${API_BASE}/sessions`, {
        data: { projectId: 'test', name: 'Checkpoint Test' },
      });
      const session = await sessionRes.json();
      
      // 创建检查点
      const response = await request.post(`${API_BASE}/sessions/${session.id}/checkpoints`, {
        data: {
          description: 'API Test Checkpoint',
          messageIndex: 0,
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.description).toBe('API Test Checkpoint');
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('timestamp');
    });
  });

  test.describe('MCP API', () => {
    test('GET /api/mcp/servers 应该返回服务器列表', async ({ request }) => {
      const response = await request.get(`${API_BASE}/mcp/servers`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      if (data.length > 0) {
        const server = data[0];
        expect(server).toHaveProperty('id');
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('url');
        expect(server).toHaveProperty('enabled');
        expect(typeof server.enabled).toBe('boolean');
      }
    });

    test('POST /api/mcp/servers 应该添加服务器', async ({ request }) => {
      const newServer = {
        name: 'API Test Server',
        url: 'http://localhost:3000/mcp',
        type: 'http',
      };
      
      const response = await request.post(`${API_BASE}/mcp/servers`, {
        data: newServer,
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.name).toBe(newServer.name);
      expect(data.url).toBe(newServer.url);
      expect(data.type).toBe(newServer.type);
      expect(data.enabled).toBe(true);
    });

    test('POST /api/mcp/servers/:id/test 应该测试连接', async ({ request }) => {
      // 添加服务器
      const createRes = await request.post(`${API_BASE}/mcp/servers`, {
        data: {
          name: 'Testable Server',
          url: 'http://localhost:3000',
          type: 'http',
        },
      });
      const server = await createRes.json();
      
      // 测试连接
      const response = await request.post(`${API_BASE}/mcp/servers/${server.id}/test`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('latency');
      expect(typeof data.latency).toBe('number');
    });
  });

  test.describe('错误处理', () => {
    test('应该返回正确的错误格式', async ({ request }) => {
      const response = await request.get(`${API_BASE}/non-existent-endpoint`);
      
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('statusCode');
      expect(data.statusCode).toBe(404);
    });

    test('应该处理无效的 JSON', async ({ request }) => {
      const response = await request.post(`${API_BASE}/projects`, {
        data: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    test('应该处理超时', async ({ request }) => {
      // 模拟慢响应
      const response = await request.get(`${API_BASE}/slow-endpoint`, {
        timeout: 100,
      });
      
      // 可能超时或返回错误
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('响应头验证', () => {
    test('应该包含正确的 Content-Type', async ({ request }) => {
      const response = await request.get(`${API_BASE}/projects`);
      
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('应该包含 CORS 头', async ({ request }) => {
      const response = await request.get(`${API_BASE}/projects`, {
        headers: {
          'Origin': 'http://localhost:1420',
        },
      });
      
      const corsHeader = response.headers()['access-control-allow-origin'];
      expect(corsHeader).toBeTruthy();
    });
  });
});
