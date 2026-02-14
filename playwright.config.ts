import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Opcode
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  
  /* 测试文件匹配模式 */
  testMatch: '**/*.spec.ts',
  
  /* 完全并行运行测试 */
  fullyParallel: true,
  
  /* 失败时禁止并行 */
  forbidOnly: !!process.env.CI,
  
  /* 重试次数 */
  retries: process.env.CI ? 2 : 0,
  
  /* 测试超时 */
  timeout: 30000,
  
  /* 并发工作数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 全局设置 */
  globalSetup: require.resolve('./e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/setup/global-teardown.ts'),
  
  /* 报告器配置 */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'e2e-results.xml' }],
  ],
  
  /* 共享配置 */
  use: {
    /* 基础 URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:1420',
    
    /* 截图策略 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'retain-on-failure',
    
    /* 追踪 */
    trace: 'on-first-retry',
    
    /* 视口 */
    viewport: { width: 1280, height: 720 },
    
    /* 动作超时 */
    actionTimeout: 10000,
    
    /* 导航超时 */
    navigationTimeout: 15000,
    
    /* 测试隔离 */
    testIdAttribute: 'data-testid',
  },
  
  /* 项目配置 */
  projects: [
    /* 桌面端 Chrome */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
    
    /* 桌面端 Firefox */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    /* 桌面端 Safari */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* 移动端视图 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    /* 平板视图 */
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad (gen 7)'],
        viewport: { width: 1024, height: 768 },
      },
    },
  ],
  
  /* 本地开发服务器配置 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
