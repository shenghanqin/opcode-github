# 🦀 Tauri 后端测试文档

Opcode Tauri (Rust) 后端的完整测试套件。

## 📊 测试统计

| 测试类型 | 文件数 | 测试函数 | 说明 |
|----------|--------|----------|------|
| 单元测试 | 1 | 20+ | 内联在 src/tests.rs |
| 集成测试 | 2 | 15+ | tests/ 目录下 |
| 总计 | 3 | 35+ | |

## 🚀 快速开始

### 运行所有测试
```bash
# 使用脚本
./scripts/test-rust.sh

# 或使用 cargo
cd src-tauri
cargo test
```

### 运行特定测试
```bash
# 仅单元测试
./scripts/test-rust.sh unit

# 仅集成测试
./scripts/test-rust.sh integration

# 仅 Checkpoint 测试
./scripts/test-rust.sh checkpoints

# 文档测试
./scripts/test-rust.sh doc
```

## 📁 测试结构

```
src-tauri/
├── src/
│   ├── tests.rs              # 单元测试（内联）
│   ├── lib.rs               # 导出测试模块
│   └── checkpoint/
│       ├── mod.rs           # Checkpoint 数据结构
│       ├── manager.rs       # Checkpoint 管理器
│       ├── state.rs         # 状态管理
│       └── storage.rs       # 存储层
├── tests/
│   ├── command_tests.rs     # Tauri 命令测试
│   └── integration_tests.rs # 集成测试
├── Cargo.toml              # 测试依赖配置
└── ...
```

## 🧪 单元测试（src/tests.rs）

### Checkpoint 模块测试
```rust
#[test]
fn test_checkpoint_creation() {
    let checkpoint = Checkpoint { ... };
    assert_eq!(checkpoint.id, "chk-001");
}

#[test]
fn test_session_timeline_creation() {
    let timeline = SessionTimeline::new("session-001".to_string());
    assert!(timeline.root_node.is_none());
}

#[test]
fn test_checkpoint_strategy_default() {
    let strategy: CheckpointStrategy = Default::default();
    matches!(strategy, CheckpointStrategy::Smart);
}
```

### Checkpoint State 测试
```rust
#[tokio::test]
async fn test_checkpoint_state_creation() {
    let state = CheckpointState::new();
    assert!(state.get_manager("non-existent").await.is_none());
}

#[tokio::test]
async fn test_set_claude_dir() {
    let state = CheckpointState::new();
    state.set_claude_dir(PathBuf::from("/tmp/test")).await;
}
```

### 序列化测试
```rust
#[test]
fn test_checkpoint_serialization() {
    let checkpoint = Checkpoint { ... };
    let json = serde_json::to_string(&checkpoint).unwrap();
    let deserialized: Checkpoint = serde_json::from_str(&json).unwrap();
    assert_eq!(checkpoint.id, deserialized.id);
}
```

## 🔗 集成测试（tests/）

### 命令测试（command_tests.rs）
- Agent 命令测试
- MCP 服务器命令测试
- 存储命令测试
- Usage 命令测试
- 代理命令测试

### 集成测试（integration_tests.rs）
- Checkpoint Manager 生命周期测试
- State 管理测试
- 存储持久化测试
- 序列化往返测试
- Timeline 树测试

## 📋 测试清单

### Checkpoint 核心功能
- [x] Checkpoint 创建
- [x] SessionTimeline 创建
- [x] Checkpoint 策略默认值
- [x] Timeline 查找节点
- [x] CheckpointPaths 生成
- [x] FileSnapshot 创建
- [x] CheckpointDiff 计算

### State 管理
- [x] CheckpointState 创建
- [x] 设置 Claude 目录
- [x] Manager 生命周期（创建、获取、删除）
- [x] 多 Session 支持

### 序列化
- [x] Checkpoint JSON 序列化
- [x] SessionTimeline JSON 序列化
- [x] CheckpointStrategy 枚举序列化
- [x] 完整往返测试
- [x] Timeline 树序列化

### 错误处理
- [x] 无效路径处理
- [x] 路径遍历攻击防护

## 🎯 运行示例

### 运行单元测试
```bash
cd src-tauri
cargo test --lib

# 输出示例
running 10 tests
test checkpoint_tests::test_checkpoint_creation ... ok
test checkpoint_tests::test_checkpoint_paths_creation ... ok
test checkpoint_tests::test_checkpoint_strategy_default ... ok
...
test result: ok. 10 passed; 0 failed
```

### 运行集成测试
```bash
cd src-tauri
cargo test --test integration_tests

# 输出示例
running 5 tests
test checkpoint_integration_tests::test_checkpoint_manager_creation ... ok
test checkpoint_integration_tests::test_checkpoint_persistence ... ok
test state_integration_tests::test_state_manager_lifecycle ... ok
...
test result: ok. 5 passed; 0 failed
```

### 运行特定模块测试
```bash
# 仅 Checkpoint 相关测试
cargo test checkpoint

# 仅 State 相关测试
cargo test state

# 仅序列化测试
cargo test serialization
```

## 🔧 测试配置

### Cargo.toml 测试配置
```toml
[dev-dependencies]
tempfile = "3"           # 临时目录
tokio-test = "0.4"       # Tokio 测试工具
pretty_assertions = "1"  # 美观的断言输出
criterion = "0.5"        # 基准测试

[features]
benchmarks = []          # 基准测试功能开关

[profile.test]
opt-level = 0            # 测试时不优化
debug = true             # 启用调试信息
lto = false              # 禁用 LTO（加速编译）
```

### 环境变量
```bash
# 显示详细输出
RUST_BACKTRACE=1 cargo test

# 仅运行特定测试
cargo test test_checkpoint_creation -- --exact

# 并行运行（默认）
cargo test -- --test-threads=4

# 串行运行
 cargo test -- --test-threads=1
```

## 📊 测试覆盖率

### 使用 cargo-tarpaulin
```bash
# 安装
cargo install cargo-tarpaulin

# 生成 HTML 报告
cargo tarpaulin --out Html --output-dir ../coverage

# 查看报告
open ../coverage/tarpaulin-report.html
```

### 使用 cargo-llvm-cov
```bash
# 安装
cargo install cargo-llvm-cov

# 生成报告
cargo llvm-cov --html --output-dir ../coverage
```

## 🏆 最佳实践

1. **使用 tempfile**: 为每个测试创建隔离的临时目录
2. **异步测试**: 使用 `#[tokio::test]` 测试异步代码
3. **并行执行**: 默认并行运行测试，确保测试独立
4. **清理资源**: 使用 `Drop` trait 自动清理临时文件
5. **Mock 数据**: 使用 fixtures 提供一致的测试数据

## 🔗 相关文档

- [Rust Testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tokio Testing](https://tokio.rs/tokio/topics/testing)
- [Tauri Testing](https://tauri.app/v1/guides/testing/unit-testing/)

---

**Tauri 后端测试就绪！** 🦀🚀
