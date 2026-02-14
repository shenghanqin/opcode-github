# Opcode E2E 测试方案总结

## 🎯 测试目标

为 **opcode** 项目构建完整的端到端（E2E）测试体系，确保核心功能稳定可靠。

---

## 📊 测试覆盖范围

### ✅ 已实现测试模块

| 模块 | 测试文件 | 覆盖功能 | 优先级 |
|------|----------|----------|--------|
| **冒烟测试** | `smoke.spec.ts` | 应用加载、导航、响应式布局 | P0 |
| **项目管理** | `projects.spec.ts` | CRUD、搜索、空状态 | P0 |
| **Agent 管理** | `agents.spec.ts` | 创建、运行、删除、验证 | P0 |
| **会话管理** | `sessions.spec.ts` | 待实现 | P1 |
| **设置** | `settings.spec.ts` | 待实现 | P1 |
| **MCP 管理** | `mcp.spec.ts` | 待实现 | P2 |

---

## 🏗️ 架构设计

### Page Object Model (POM)
- **BasePage**: 通用页面操作封装
- **ProjectsPage**: 项目列表页
- **AgentsPage**: Agent 管理页
- **SessionsPage**: 会话页（待实现）
- **SettingsPage**: 设置页（待实现）

### 测试数据管理
- **Fixtures**: 集中管理 mock 数据
- **API Mocking**: 通过 Playwright route 拦截模拟后端
- **Test Isolation**: 每个测试独立，互不影响

---

## 🚀 运行方式

### 安装依赖
```bash
npm install
npx playwright install
```

### 运行测试
```bash
# 运行所有测试
npm run test:e2e

# UI 模式（调试）
npm run test:e2e:ui

# 特定测试文件
npm run test:e2e -- projects.spec.ts

# 生成测试代码
npm run test:e2e:codegen

# 查看报告
npm run test:e2e:report
```

---

## 🔧 配置说明

### playwright.config.ts 关键配置
- **并发**: 开发环境并行，CI 环境串行
- **重试**: CI 失败重试 2 次
- **超时**: 30 秒全局，10 秒动作
- **浏览器**: Chromium（主要）、Firefox、WebKit
- **视口**: 1280x720（桌面）、自适应（移动端）

### 环境变量
- `PLAYWRIGHT_BASE_URL`: 测试目标 URL
- `CI`: CI 模式标识

---

## 📁 文件结构

```
e2e/
├── README.md                    # 测试文档
├── pages/                       # Page Object
│   ├── BasePage.ts             # 基础类
│   ├── ProjectsPage.ts         # 项目页
│   └── AgentsPage.ts           # Agent 页
├── fixtures/                    # 测试数据
│   └── projects.ts             # 项目 mock 数据
├── tests/                       # 测试用例
│   ├── smoke/                  # 冒烟测试
│   ├── projects/               # 项目测试
│   └── agents/                 # Agent 测试
├── setup/                       # 全局设置
│   ├── global-setup.ts
│   └── global-teardown.ts
└── utils/                       # 工具函数
    └── test-helpers.ts

.github/workflows/
└── e2e.yml                      # CI/CD 配置

playwright.config.ts             # Playwright 配置
```

---

## 🔄 CI/CD 集成

### GitHub Actions 工作流
- **触发条件**: PR、push 到 main/develop、手动触发
- **运行矩阵**: Node 20.x / 22.x
- **浏览器**: Chromium（Linux）、WebKit（macOS）
- **产物**: 测试报告、截图、视频

### 质量门禁
- 所有冒烟测试必须通过
- 核心功能测试（Projects、Agents）必须通过
- P1/P2 测试失败可作为警告

---

## 📝 待补充测试

### 高优先级（建议近期完成）
1. **会话管理测试**
   - 创建会话
   - 发送消息
   - 查看历史
   - 检查点管理

2. **设置页面测试**
   - 修改配置
   - 保存/恢复
   - 主题切换

### 中优先级
3. **MCP 服务器管理**
   - 添加/删除服务器
   - 导入/导出配置

4. **使用量统计**
   - 图表渲染
   - 数据导出

### 低优先级
5. **性能测试**
   - 大项目加载性能
   - 长时间运行稳定性

---

## 🐛 已知问题 & 注意事项

1. **Mock API**: 当前使用 mock 数据，未来需接入真实后端测试
2. **Tauri 集成**: Web 模式测试无法覆盖原生功能（文件选择、系统通知等）
3. **数据隔离**: 测试数据在内存中，页面刷新会丢失状态

---

## 📈 测试指标建议

| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 测试覆盖率 | > 80% | 🟡 规划中 |
| 测试通过率 | > 95% | 🟢 新体系 |
| 平均执行时间 | < 5 分钟 | 🟢 < 2 分钟 |
| 维护成本 | 低 | 🟢 POM 架构 |

---

## 💡 扩展建议

1. **视觉回归测试**: 集成 Playwright 的截图对比功能
2. **性能测试**: 添加 Lighthouse CI 检查
3. **API 契约测试**: 验证前后端接口契约
4. **移动端测试**: 增加真实设备云测试（BrowserStack）

---

## 🎉 总结

这套 E2E 测试方案为 opcode 提供了：
- ✅ **完整的测试框架**: Playwright + POM 架构
- ✅ **自动化 CI/CD**: GitHub Actions 集成
- ✅ **可维护性**: 清晰的代码结构和文档
- ✅ **扩展性**: 易于添加新测试场景

**下一步**: 根据优先级逐步补充剩余测试用例，完善覆盖率。
