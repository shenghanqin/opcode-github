#!/bin/bash

# Tauri Rust 测试运行脚本
# 运行所有 Rust 后端测试

set -e

echo "🦀 Opcode Tauri 后端测试"
echo "=========================="

cd src-tauri

# 检查参数
TEST_TYPE=${1:-"all"}

case $TEST_TYPE in
    "unit"|"u")
        echo ""
        echo "🧪 运行单元测试..."
        cargo test --lib -- --test-threads=4
        ;;
    "integration"|"i")
        echo ""
        echo "🔗 运行集成测试..."
        cargo test --test '*' -- --test-threads=2
        ;;
    "doc"|"d")
        echo ""
        echo "📚 运行文档测试..."
        cargo test --doc
        ;;
    "all"|"a"|"")
        echo ""
        echo "🧪 运行单元测试..."
        cargo test --lib -- --test-threads=4
        
        echo ""
        echo "🔗 运行集成测试..."
        cargo test --test '*' -- --test-threads=2
        
        echo ""
        echo "📚 运行文档测试..."
        cargo test --doc
        ;;
    "checkpoints"|"c")
        echo ""
        echo "🎯 运行 Checkpoint 模块测试..."
        cargo test checkpoint -- --test-threads=4
        ;;
    *)
        echo "未知测试类型: $TEST_TYPE"
        echo "用法: $0 [unit|integration|doc|all|checkpoints]"
        exit 1
        ;;
esac

echo ""
echo "✅ 测试完成!"

# 可选：生成测试报告
if command -v cargo-tarpaulin &> /dev/null; then
    echo ""
    echo "📊 生成测试覆盖率报告..."
    cargo tarpaulin --out Html --output-dir ../coverage
    echo "覆盖率报告: coverage/tarpaulin-report.html"
fi
