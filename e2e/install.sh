#!/bin/bash

# Opcode E2E 测试环境安装脚本
# 一键安装 Playwright 和浏览器

set -e

echo "🎭 Opcode E2E 测试环境安装"
echo "============================"

# 检查 Node.js 版本
echo "📦 检查 Node.js 版本..."
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+"
    exit 1
fi
echo "✅ Node.js 版本: $(node --version)"

# 安装 Playwright
echo ""
echo "📦 安装 Playwright..."
npm install -D @playwright/test@latest

# 安装浏览器
echo ""
echo "🌐 安装浏览器..."
npx playwright install chromium firefox webkit

# 安装系统依赖（Linux）
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    echo "🔧 安装 Linux 系统依赖..."
    npx playwright install-deps chromium
fi

# 验证安装
echo ""
echo "✅ 验证安装..."
npx playwright --version

# 运行示例测试
echo ""
echo "🧪 运行示例测试..."
npx playwright test --project=chromium --reporter=line

echo ""
echo "🎉 安装完成！"
echo ""
echo "可用命令:"
echo "  npm run test:e2e          # 运行所有测试"
echo "  npm run test:e2e:ui       # UI 调试模式"
echo "  npm run test:e2e:report   # 查看报告"
echo ""
