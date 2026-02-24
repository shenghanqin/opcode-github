# Opcode Windows 终端弹窗问题修复指南（长期维护版）

## 设计原则

1. **小改动原则** - 只修改必要文件，不重构项目结构
2. **跨平台兼容** - Windows/macOS/Linux 都能正常编译运行
3. **长期维护** - 代码清晰易懂，方便后续维护
4. **零副作用** - 不影响现有功能

## 修复方案（推荐）

### 第一步：修改 `src-tauri/src/main.rs`

**在文件第一行添加**（最重要）：

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

**作用**：
- Windows Release 模式：隐藏控制台窗口
- Windows Debug 模式：保留控制台（方便调试）
- macOS/Linux：自动忽略，无影响

**完整文件开头示例**：

```rust
// 第一行：Windows Release 模式下隐藏控制台窗口
// macOS/Linux 自动忽略此设置
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::net::TcpListener;
use std::time::Duration;
use tauri::Manager;

// ... 原有代码保持不变
```

---

### 第二步：创建跨平台命令工具模块

**新建文件**：`src-tauri/src/platform_cmd.rs`

```rust
//! 跨平台命令执行工具
//! 
//! 自动处理 Windows 控制台窗口隐藏
//! macOS/Linux 保持原有行为

use std::process::Command as StdCommand;

/// Windows 控制台窗口隐藏标志
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// 创建命令（跨平台）
/// 
/// Windows: 自动隐藏控制台窗口
/// macOS/Linux: 保持默认行为
pub fn new(program: &str) -> StdCommand {
    let mut cmd = StdCommand::new(program);
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    cmd
}

/// 异步命令创建（Tokio 版本）
#[cfg(feature = "tokio")]
pub fn new_tokio(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    cmd
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_creation() {
        let cmd = new("echo");
        // 命令创建成功即可
        // 实际执行在集成测试中验证
    }
}
```

---

### 第三步：在 `src-tauri/src/lib.rs` 添加模块

**在文件中找到 `mod` 声明区域，添加**：

```rust
// 现有模块...
pub mod platform_cmd;
```

---

### 第四步：修改 `src-tauri/src/commands/claude.rs`

**修改 1：文件顶部添加导入**（约第 1-10 行）

```rust
// 在现有 use 语句之后添加
use crate::platform_cmd;
```

**修改 2：第 239 行附近**

**修改前**：
```rust
let mut tokio_cmd = Command::new(program);
```

**修改后**：
```rust
let mut tokio_cmd = platform_cmd::new_tokio(program);
```

**修改 3：第 603 行附近**

**修改前**：
```rust
let mut cmd = std::process::Command::new(claude_path);
```

**修改后**：
```rust
let mut cmd = platform_cmd::new(&claude_path);
```

**修改 4：第 681 行附近**

**修改前**：
```rust
let output = std::process::Command::new(claude_path)
    .arg("--version")
    .output();
```

**修改后**：
```rust
let output = platform_cmd::new(&claude_path)
    .arg("--version")
    .output();
```

**修改 5：第 1095 行附近（taskkill）**

**修改前**：
```rust
std::process::Command::new("taskkill")
```

**修改后**：
```rust
platform_cmd::new("taskkill")
```

**修改 6：第 2167 行附近（bash）**

**修改前**：
```rust
let mut cmd = std::process::Command::new("bash");
```

**修改后**：
```rust
let mut cmd = platform_cmd::new("bash");
```

---

### 第五步：修改 `src-tauri/src/commands/agents.rs`

**修改 1：文件顶部添加导入**

```rust
use crate::platform_cmd;
```

**修改 2：替换所有 `std::process::Command::new`**

**修改前**：
```rust
let kill_result = std::process::Command::new("kill")
```

**修改后**：
```rust
let kill_result = platform_cmd::new("kill")
```

**修改 3：Windows 特定的 tasklist/kill**

**修改前**：
```rust
match std::process::Command::new("tasklist")
match std::process::Command::new("kill")
```

**修改后**：
```rust
match platform_cmd::new("tasklist")
match platform_cmd::new("kill")
```

**修改 4：Tokio Command 转换**

**修改前**：
```rust
let mut tokio_cmd = Command::new(program);
```

**修改后**：
```rust
let mut tokio_cmd = platform_cmd::new_tokio(program);
```

---

### 第六步：修改 `src-tauri/src/web_server.rs`

**修改 1：文件顶部添加导入**

```rust
use crate::platform_cmd;
```

**修改 2：替换 Command 创建**

**修改前**：
```rust
let mut cmd = Command::new(&claude_path);
```

**修改后**：
```rust
let mut cmd = platform_cmd::new_tokio(&claude_path);
```

---

## 修改总结

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src-tauri/src/main.rs` | 修改 | 添加 `windows_subsystem` |
| `src-tauri/src/platform_cmd.rs` | 新增 | 跨平台命令工具 |
| `src-tauri/src/lib.rs` | 修改 | 添加 `mod platform_cmd` |
| `src-tauri/src/commands/claude.rs` | 修改 | 使用 `platform_cmd` |
| `src-tauri/src/commands/agents.rs` | 修改 | 使用 `platform_cmd` |
| `src-tauri/src/web_server.rs` | 修改 | 使用 `platform_cmd` |

### 代码变更统计

- **新增文件**：1 个（`platform_cmd.rs`，约 50 行）
- **修改文件**：5 个
- **删除代码**：0 行（全部替换，不删除功能）
- **新增代码**：约 10 行（导入 + 调用替换）

---

## 跨平台兼容性

### Windows
- ✅ Release 模式：无控制台窗口
- ✅ Debug 模式：有控制台窗口（方便调试）
- ✅ 所有子进程：无弹窗

### macOS
- ✅ 正常编译运行
- ✅ `#[cfg(windows)]` 自动忽略
- ✅ 不影响现有功能

### Linux
- ✅ 正常编译运行
- ✅ `#[cfg(windows)]` 自动忽略
- ✅ 不影响现有功能

---

## 测试验证

### 本地测试

```bash
# 1. 构建 Release 版本（Windows）
cd src-tauri
cargo build --release

# 2. 运行测试
./target/release/opcode.exe

# 3. 验证：启动时不应有控制台窗口
```

### macOS 测试

```bash
# 确保 macOS 也能编译
cargo build --release

# 运行测试
./target/release/opcode
```

### GitHub Actions 测试

```bash
# 推送代码
git add .
git commit -m "fix: 修复 Windows 终端弹窗问题

- 添加 windows_subsystem 设置
- 创建跨平台命令工具模块
- 兼容 Windows/macOS/Linux"
git push origin playwright-test
```

---

## 长期维护建议

### 1. 新增命令时

**不要**：
```rust
let cmd = Command::new("new-program");  // ❌ Windows 会弹窗
```

**要**：
```rust
let cmd = platform_cmd::new("new-program");  // ✅ 跨平台兼容
```

### 2. 代码审查清单

- [ ] 新增 `Command::new` 是否使用了 `platform_cmd`？
- [ ] Windows 特定代码是否有 `#[cfg(windows)]`？
- [ ] macOS/Linux 是否仍然可以编译？

### 3. 文档维护

在 `platform_cmd.rs` 文件顶部添加注释：
```rust
//! 创建时间: 2026-02-24
//! 用途: 解决 Windows 终端弹窗问题
//! 维护者: [你的名字]
//! 注意事项: 新增命令时优先使用此模块
```

---

## 常见问题

### Q1: macOS 上编译报错？

**检查**：
- `platform_cmd.rs` 中的 `#[cfg(windows)]` 是否正确使用
- 不要直接导入 Windows 特定的 trait

### Q2: Windows Debug 模式也需要隐藏窗口？

**解决**：修改 `main.rs`：
```rust
// 删除 not(debug_assertions) 条件
#![windows_subsystem = "windows"]
```

### Q3: 某些命令需要显示窗口？

**解决**：直接使用标准库：
```rust
// 需要显示窗口的程序（如 notepad）
let cmd = std::process::Command::new("notepad");
```

---

## 完整代码参考

### `src-tauri/src/platform_cmd.rs`（完整版）

```rust
//! 跨平台命令执行工具
//! 
//! 创建时间: 2026-02-24
//! 用途: 解决 Windows 终端弹窗问题
//! 设计原则: 小改动、跨平台、长期维护
//!
//! 使用示例:
//! ```rust
//! use crate::platform_cmd;
//! 
//! // 同步命令
//! let mut cmd = platform_cmd::new("claude");
//! cmd.arg("--version");
//! 
//! // 异步命令
//! let mut cmd = platform_cmd::new_tokio("claude");
//! cmd.arg("--version");
//! ```

use std::process::Command as StdCommand;

/// Windows 控制台窗口隐藏标志
/// 参考: https://docs.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// 创建同步命令（跨平台）
/// 
/// # 平台行为
/// - Windows: 自动隐藏控制台窗口（Release 模式）
/// - macOS/Linux: 保持默认行为
///
/// # 示例
/// ```rust
/// let mut cmd = platform_cmd::new("echo");
/// cmd.arg("Hello");
/// let output = cmd.output().unwrap();
/// ```
pub fn new(program: &str) -> StdCommand {
    let mut cmd = StdCommand::new(program);
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    cmd
}

/// 创建异步命令（Tokio 版本）
/// 
/// # 要求
/// 需要在 `Cargo.toml` 中启用 `tokio` feature
///
/// # 示例
/// ```rust
/// let mut cmd = platform_cmd::new_tokio("claude");
/// cmd.arg("--version");
/// let output = cmd.output().await.unwrap();
/// ```
#[cfg(feature = "tokio")]
pub fn new_tokio(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    cmd
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_creation() {
        let cmd = new("echo");
        // 命令创建成功即可，实际执行在集成测试中验证
        assert_eq!(cmd.get_program(), "echo");
    }
}
```

---

## 提交信息模板

```bash
git add .
git commit -m "fix: 修复 Windows 终端弹窗问题（长期维护版）

主要变更:
1. 添加 windows_subsystem 设置（main.rs）
2. 创建跨平台命令工具模块（platform_cmd.rs）
3. 替换所有 Command::new 调用

设计原则:
- 小改动：仅修改必要文件
- 跨平台：Windows/macOS/Linux 兼容
- 长期维护：代码清晰，易于扩展

测试:
- [ ] Windows Release 无弹窗
- [ ] Windows Debug 有控制台
- [ ] macOS 正常编译运行
- [ ] Linux 正常编译运行

Closes: #windows-console-issue"
```

---

## 总结

本方案遵循**小改动原则**：
- 只新增 1 个文件（50 行）
- 修改 5 个文件（简单替换）
- 不重构项目结构
- 跨平台兼容
- 易于长期维护
