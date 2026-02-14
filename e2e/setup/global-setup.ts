import { chromium, FullConfig } from '@playwright/test';

/**
 * 全局设置 - 在所有测试开始前运行
 */
async function globalSetup(config: FullConfig) {
  console.log('🎭 Starting E2E Test Suite...');
  
  // 可以在这里启动测试服务器或准备测试数据
  // 例如：清理测试数据库、创建测试目录等
  
  console.log('✅ Global setup complete');
}

export default globalSetup;
