import { FullConfig } from '@playwright/test';

/**
 * 全局拆卸 - 在所有测试结束后运行
 */
async function globalTeardown(config: FullConfig) {
  console.log('🎭 Cleaning up E2E Test Suite...');
  
  // 清理测试产生的临时文件、关闭服务器等
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
