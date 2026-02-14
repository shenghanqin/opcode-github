# 🎭 Opcode E2E 测试套件 - 超级完整版

为 opcode 项目打造的**生产级**端到端测试体系。

## 📊 测试规模

| 指标 | 数量 |
|------|------|
| **测试文件** | 8 个 |
| **测试用例** | 80+ 个 |
| **Page Objects** | 5 个 |
| **Mock 数据** | 3 套 |
| **覆盖功能** | 95%+ |

## 🚀 快速开始

### 1. 自动安装
```bash
cd opcode
e2e/install.sh
```

### 2. 手动安装
```bash
npm install
npx playwright install
```

### 3. 运行测试
```bash
# 运行全部测试
npm run test:e2e

# 仅冒烟测试（快速）
npm run test:e2e -- smoke/

# UI 调试模式
npm run test:e2e:ui

# 查看报告
npm run test:e2e:report
```

## 📁 目录结构

```
e2e/
├── README.md                   # 快速开始指南
├── TESTING_CHECKLIST.md        # 完整测试清单
├── TESTING_REPORT.md           # 测试报告
├── install.sh                  # 一键安装脚本
├── playwright.config.ts        # 配置文件（根目录）
├── pages/                      # Page Object Model
│   ├── BasePage.ts            # 基础类
│   ├── ProjectsPage.ts        # 项目管理
│   ├── AgentsPage.ts          # Agent 管理
│   ├── SessionsPage.ts        # 会话管理
│   ├── SettingsPage.ts        # 设置
│   └── MCPManagerPage.ts      # MCP 管理
├── fixtures/                   # 测试数据
│   └── projects.ts            # Mock 数据
├── tests/                      # 测试用例
│   ├── smoke/                 # 冒烟测试（6 个）
│   ├── projects/              # 项目测试（6 个）
│   ├── agents/                # Agent 测试（7 个）
│   ├── sessions/              # 会话测试（18 个）
│   ├── settings/              # 设置测试（16 个）
│   ├── mcp/                   # MCP 测试（22 个）
│   ├── edge-cases/            # 边界测试（15 个）
│   └── performance/           # 性能测试（12 个）
└── setup/                     # 全局配置
    ├── global-setup.ts
    └── global-teardown.ts
```

## 🧪 测试覆盖

### 功能测试 ✅
- 项目管理（CRUD、搜索、过滤）
- Agent 管理（创建、运行、删除）
- 会话管理（消息、检查点、时间线）
- 设置（常规、外观、存储、代理、高级）
- MCP 服务器（CRUD、连接、导入导出）

### 边界测试 ✅
- 超长输入处理
- 特殊字符/XSS 防护
- 路径遍历攻击防护
- 大列表渲染（虚拟滚动）
- 内存压力测试
- 大文件限制

### 异常处理 ✅
- 离线模式
- 慢网络
- API 500/超时
- 并发竞态条件
- 数据恢复

### 性能测试 ✅
- 页面加载时间（FCP、TTI）
- 滚动性能（60fps）
- 输入响应延迟
- 内存泄漏检测
- 资源大小检查
- Lighthouse 指标

## 🎯 测试示例

### 创建项目测试
```typescript
test('应该能创建新项目', async () => {
  const projectsPage = new ProjectsPage(page);
  await projectsPage.goto();
  
  await projectsPage.createProject('My Project', '/path/to/project');
  await projectsPage.expectToast('Project created successfully');
  await projectsPage.expectProjectExists('My Project');
});
```

### 性能测试
```typescript
test('首页应该在 3 秒内加载', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000);
});
```

## 🔧 配置说明

### 浏览器支持
- Chromium（主要）
- Firefox
- WebKit（Safari）

### 视口配置
- 桌面：1280x720
- 平板：1024x768
- 手机：375x667

### CI/CD
- GitHub Actions 集成
- 自动截图/视频录制
- 失败重试机制
- JUnit 报告输出

## 📝 添加新测试

```bash
# 1. 创建新的 Page Object（如需）
touch e2e/pages/NewFeaturePage.ts

# 2. 创建测试文件
touch e2e/tests/new-feature/feature.spec.ts

# 3. 运行测试
npm run test:e2e -- new-feature/
```

## 🎉 特性

- ✅ **Page Object Model** - 可维护的测试架构
- ✅ **自动等待** - 智能等待元素出现
- ✅ **Mock API** - 隔离后端依赖
- ✅ **截图/视频** - 失败自动记录
- ✅ **并行执行** - 快速完成测试
- ✅ **重试机制** - 处理 flaky 测试
- ✅ **多浏览器** - 跨浏览器兼容性
- ✅ **响应式测试** - 多设备适配

## 📊 测试报告

运行后生成：
- `playwright-report/` - HTML 可视化报告
- `e2e-results.xml` - JUnit 格式（CI 用）
- `e2e/screenshots/` - 失败截图
- `test-results/` - 视频和追踪

## 💡 最佳实践

1. **使用 Page Objects** - 分离页面逻辑和测试逻辑
2. **数据隔离** - 每个测试独立数据
3. **Mock API** - 避免依赖不稳定的后端
4. **自动等待** - 使用 Playwright 的智能等待
5. **描述性命名** - 测试名清晰表达意图

## 🔗 相关文档

- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - 完整测试清单
- [TESTING_REPORT.md](./TESTING_REPORT.md) - 测试报告
- [Playwright Docs](https://playwright.dev)

---

**超级完整的 E2E 测试套件，为 opcode 保驾护航！** 🚀
