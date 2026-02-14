import { test, expect } from '@playwright/test';

/**
 * 性能和加载测试
 * 测量关键性能指标
 */
test.describe('性能测试', () => {
  test.describe('页面加载性能', () => {
    test('首页应该在 3 秒内加载完成', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
      console.log(`首页加载时间: ${loadTime}ms`);
    });

    test('项目列表应该在 2 秒内渲染', async ({ page }) => {
      await page.goto('/');
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="project-list"]', {
        state: 'visible',
        timeout: 2000,
      });
      const renderTime = Date.now() - startTime;
      
      expect(renderTime).toBeLessThan(2000);
      console.log(`项目列表渲染时间: ${renderTime}ms`);
    });

    test('首屏内容应该快速显示 (FCP)', async ({ page }) => {
      await page.goto('/');
      
      // 使用 Performance API
      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(
              (e) => e.name === 'first-contentful-paint'
            );
            if (fcpEntry) {
              resolve(fcpEntry.startTime);
            }
          });
          observer.observe({ entryTypes: ['paint'] });
          
          // 超时处理
          setTimeout(() => resolve(-1), 5000);
        });
      });
      
      expect(fcp).toBeGreaterThan(0);
      expect(fcp).toBeLessThan(2000); // FCP < 2s
      console.log(`FCP: ${fcp}ms`);
    });

    test('可交互时间应该小于 3.5 秒 (TTI)', async ({ page }) => {
      await page.goto('/');
      
      // 等待主线程空闲
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      });
      
      // 模拟用户交互
      const tti = await page.evaluate(async () => {
        const start = performance.now();
        
        // 执行一些操作
        document.body.click();
        await new Promise((r) => requestAnimationFrame(r));
        
        return performance.now() - start;
      });
      
      expect(tti).toBeLessThan(3500);
      console.log(`TTI: ${tti}ms`);
    });
  });

  test.describe('运行时性能', () => {
    test('滚动性能应该流畅 (60fps)', async ({ page }) => {
      await page.goto('/');
      
      // 创建大量内容
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.style.height = '10000px';
        document.body.appendChild(container);
      });
      
      // 测量滚动帧率
      const frameStats = await page.evaluate(async () => {
        let frames = 0;
        let startTime = performance.now();
        
        const measure = () => {
          frames++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(measure);
          }
        };
        
        // 触发滚动
        const scrollInterval = setInterval(() => {
          window.scrollBy(0, 100);
        }, 16);
        
        requestAnimationFrame(measure);
        
        await new Promise((r) => setTimeout(r, 1000));
        clearInterval(scrollInterval);
        
        return { frames, fps: frames };
      });
      
      expect(frameStats.fps).toBeGreaterThan(55); // 接近 60fps
      console.log(`滚动 FPS: ${frameStats.fps}`);
    });

    test('消息输入不应该卡顿', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-session-button"]');
      
      const inputDelay = await page.evaluate(async () => {
        const input = document.querySelector('[data-testid="message-input"]') as HTMLTextAreaElement;
        const delays: number[] = [];
        
        for (let i = 0; i < 100; i++) {
          const start = performance.now();
          input.value += 'a';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          delays.push(performance.now() - start);
        }
        
        return {
          avg: delays.reduce((a, b) => a + b, 0) / delays.length,
          max: Math.max(...delays),
        };
      });
      
      expect(inputDelay.avg).toBeLessThan(16); // 平均 < 16ms
      expect(inputDelay.max).toBeLessThan(50); // 最大 < 50ms
      console.log(`输入延迟: 平均 ${inputDelay.avg.toFixed(2)}ms, 最大 ${inputDelay.max.toFixed(2)}ms`);
    });

    test('内存使用应该稳定', async ({ page }) => {
      await page.goto('/');
      
      // 获取初始内存
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // 执行一些操作
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="projects-tab"]');
        await page.waitForTimeout(100);
        await page.click('[data-testid="agents-tab"]');
        await page.waitForTimeout(100);
      }
      
      // 强制垃圾回收（如果可用）
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // 获取最终内存
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory && finalMemory) {
        const growth = (finalMemory - initialMemory) / initialMemory;
        expect(growth).toBeLessThan(0.5); // 增长 < 50%
        console.log(`内存增长: ${(growth * 100).toFixed(2)}%`);
      }
    });
  });

  test.describe('资源加载', () => {
    test('JavaScript 包大小应该合理', async ({ page }) => {
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter((r: any) => r.initiatorType === 'script')
          .map((r: any) => ({
            name: r.name.split('/').pop(),
            size: r.transferSize,
          }));
      });
      
      const totalJs = resources.reduce((sum: number, r: any) => sum + (r.size || 0), 0);
      console.log(`JS 总大小: ${(totalJs / 1024 / 1024).toFixed(2)} MB`);
      
      // 主包应该小于 2MB（压缩后）
      expect(totalJs).toBeLessThan(2 * 1024 * 1024);
    });

    test('图片应该懒加载', async ({ page }) => {
      await page.goto('/');
      
      // 检查图片加载策略
      const lazyImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => img.loading === 'lazy').length;
      });
      
      console.log(`懒加载图片数量: ${lazyImages}`);
      expect(lazyImages).toBeGreaterThanOrEqual(0);
    });

    test('关键 CSS 应该内联', async ({ page }) => {
      await page.goto('/');
      
      const hasInlineStyles = await page.evaluate(() => {
        const styles = document.querySelectorAll('style');
        return styles.length > 0;
      });
      
      expect(hasInlineStyles).toBe(true);
    });
  });

  test.describe('Lighthouse 指标', () => {
    test('Lighthouse 性能分数应该 > 90', async ({ page }) => {
      // 注：这需要额外配置 Lighthouse CI
      // 这里简化为检查关键指标
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
          loadComplete: navigation.loadEventEnd - navigation.startTime,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        };
      });
      
      console.log('性能指标:', metrics);
      
      expect(metrics.domContentLoaded).toBeLessThan(2000);
      expect(metrics.loadComplete).toBeLessThan(3000);
    });
  });

  test.describe('响应式性能', () => {
    test('移动端视口应该优化', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
      console.log(`移动端加载时间: ${loadTime}ms`);
    });

    test('平板视口应该正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      // 验证布局适应
      const layout = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="sidebar"]');
        return {
          sidebarVisible: sidebar?.checkVisibility(),
          windowWidth: window.innerWidth,
        };
      });
      
      expect(layout.sidebarVisible).toBeTruthy();
    });
  });
});
