# Opcode Windows 终端弹窗问题修复指南

## 问题描述

在 Windows 系统上运行 Opcode 时，调用外部命令（如 `claude`、`claude-code`、`taskkill` 等）会弹出空白控制台窗口（黑窗口），严重影响用户体验。

## 根本原因

1. **缺少 `windows_subsystem` 设置** - 未告诉 Windows 在 Release 模式下隐藏控制台
2. **未设置 `CREATE_NO_WINDOW` 标志** - 调用外部命令时未隐藏子进程窗口
3. **调用交互式 CLI 工具** - Claude CLI 是 Node.js 脚本，通过 cmd.exe 执行时会弹出终端

## 影响范围

| 文件 | 行号 | 问题命令 |
|------|------|---------|
| `src-tauri/src/main.rs` | 缺失 | 全局子系统设置 |
| `src-tauri/src/commands/claude.rs` | 239, 603, 681, 1095, 2167 | `Command::new("claude")` 等 |
| `src-tauri/src/commands/agents.rs` | 多处 | `Command::new("kill")` 等 |
| `src-tauri/src/web_server.rs` | 多处 | `Command::new(&claude_path)` |

## 修复方案

### 方案一：最小改动（推荐）

只修改关键文件，快速解决问题。

#### 1. 修改 `src-tauri/src/main.rs`

在文件**第一行**添加：

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

**完整文件开头示例**：

```rust
// 第一行：防止 Windows Release 模式下显示控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::net::TcpListener;
// ... 其他导入
```

**作用**：告诉 Windows 在 Release 构建时不要显示控制台窗口。

#### 2. 修改 `src-tauri/src/commands/claude.rs`

在文件顶部添加 Windows 特定的导入：

```rust
// 在文件顶部，和其他 use 语句一起
#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
```

然后修改所有 `Command::new` 调用。以第 239 行为例：

**修改前**：
```rust
let mut tokio_cmd = Command::new(program);
```

**修改后**：
```rust
let mut tokio_cmd = Command::new(program);
#[cfg(windows)]
tokio_cmd.creation_flags(CREATE_NO_WINDOW);
```

**第 603 行修改示例**：

```rust
// 修改前
let mut cmd = std::process::Command::new(claude_path);

// 修改后
let mut cmd = std::process::Command::new(claude_path);
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
```

**第 681 行修改示例**：

```rust
// 修改前
let output = std::process::Command::new(claude_path)
    .args(&["--version"])
    .output();

// 修改后
let mut cmd = std::process::Command::new(claude_path);
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
let output = cmd
    .args(&["--version"])
    .output();
```

#### 3. 修改 `src-tauri/src/commands/agents.rs`

同样添加导入：

```rust
#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
```

然后修改所有 `Command::new` 调用，添加：

```rust
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
```

#### 4. 修改 `src-tauri/src/web_server.rs`

添加导入：

```rust
#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
```

修改 Command 调用（约第 100-150 行附近）：

```rust
let mut cmd = Command::new(&claude_path);
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
```

---

### 方案二：封装函数（更优雅）

创建一个统一的命令创建函数，避免重复代码。

#### 1. 创建 `src-tauri/src/utils/command.rs`

```rust
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

/// 创建命令（自动处理 Windows 控制台窗口隐藏）
pub fn create_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    
    cmd
}

/// 创建 tokio 命令（异步版本）
pub fn create_tokio_command(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    
    cmd
}
```

#### 2. 在 `src-tauri/src/utils/mod.rs` 中添加模块

```rust
pub mod command;
```

#### 3. 修改 `src-tauri/src/lib.rs` 导出 utils

```rust
pub mod utils;
```

#### 4. 使用封装函数

在其他文件中替换 `Command::new`：

```rust
// 修改前
use std::process::Command;
let mut cmd = Command::new("claude");

// 修改后
use crate::utils::command::create_command;
let mut cmd = create_command("claude");
```

---

### 方案三：Tokio 异步版本（如果大量使用 tokio）

如果项目大量使用 `tokio::process::Command`，可以创建一个 trait 扩展。

#### 1. 创建 `src-tauri/src/utils/tokio_command_ext.rs`

```rust
use tokio::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub trait CommandExt {
    fn new_hidden(program: &str) -> Self;
}

impl CommandExt for Command {
    fn new_hidden(program: &str) -> Self {
        let mut cmd = Command::new(program);
        
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);
        
        cmd
    }
}
```

#### 2. 使用方式

```rust
use crate::utils::tokio_command_ext::CommandExt;

let mut cmd = Command::new_hidden("claude");
```

---

## 完整修复示例

### `src-tauri/src/main.rs`（完整开头）

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::net::TcpListener;
use std::time::Duration;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn main() {
    // ... 原有代码
}
```

### `src-tauri/src/commands/claude.rs`（关键修改）

```rust
// 文件顶部添加
#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// 第 239 行附近修改
let mut tokio_cmd = Command::new(program);
#[cfg(windows)]
tokio_cmd.creation_flags(CREATE_NO_WINDOW);

// 第 603 行附近修改
let mut cmd = std::process::Command::new(claude_path);
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);

// 第 681 行附近修改
let mut cmd = std::process::Command::new(claude_path);
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
let output = cmd.arg("--version").output();

// 第 1095 行附近修改（taskkill）
let mut cmd = std::process::Command::new("taskkill");
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);

// 第 2167 行附近修改（bash）
let mut cmd = std::process::Command::new("bash");
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
```

---

## 测试验证

### 本地测试

1. **构建 Release 版本**：
```bash
cd src-tauri
cargo build --release
```

2. **运行测试**：
```bash
./target/release/opcode.exe
```

3. **验证**：
   - 启动时不应有控制台窗口弹出
   - 调用 Claude CLI 时不应有黑窗口

### GitHub Actions 验证

使用之前创建的 `.github/workflows/windows-console-test.yml`：

```bash
git add .
git commit -m "fix: 修复 Windows 终端弹窗问题

- 添加 windows_subsystem 设置
- 为所有 Command 调用添加 CREATE_NO_WINDOW 标志"
git push origin playwright-test
```

然后在 GitHub Actions 页面查看运行结果。

---

## 常见问题

### Q1: 修改后仍然弹窗？

**检查**：
1. 是否在 Release 模式下构建？（`cargo build --release`）
2. `windows_subsystem` 是否在文件第一行？
3. `creation_flags` 是否在 `spawn()` 或 `output()` 之前调用？

### Q2: Debug 模式下需要控制台？

**解决**：`windows_subsystem` 只在非 Debug 模式下生效：
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

Debug 模式下仍然可以看到控制台输出，方便调试。

### Q3: 某些命令需要显示窗口？

**解决**：可以有选择地隐藏：
```rust
let mut cmd = Command::new("notepad");
// 不需要添加 CREATE_NO_WINDOW，让用户看到记事本窗口
```

### Q4: 如何验证修复成功？

**方法**：
1. 在 Windows 虚拟机或实体机上测试
2. 使用 Process Monitor 查看进程创建标志
3. 使用 GitHub Actions 自动测试

---

## 参考文档

- [Rust std::process::Command](https://doc.rust-lang.org/std/process/struct.Command.html)
- [Windows CREATE_NO_WINDOW 标志](https://docs.microsoft.com/en-us/windows/win32/procthread/process-creation-flags)
- [Tauri Windows 子系统](https://tauri.app/v1/guides/building/windows/)

---

## 总结

修复 Windows 终端弹窗问题需要两步：

1. **全局设置**：在 `main.rs` 添加 `windows_subsystem`
2. **局部设置**：为每个 `Command` 添加 `CREATE_NO_WINDOW`

推荐**方案一**（最小改动）快速修复，或**方案二**（封装函数）长期维护。
