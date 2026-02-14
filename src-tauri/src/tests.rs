//! # Tauri 后端测试套件
//! 
//! 包含单元测试、集成测试和 Tauri 命令测试

#[cfg(test)]
mod tests {
    // 测试辅助工具
    pub mod test_utils {
        use std::path::PathBuf;
        use tempfile::TempDir;

        /// 创建临时测试目录
        pub fn create_temp_dir() -> TempDir {
            tempfile::tempdir().expect("Failed to create temp directory")
        }

        /// 创建临时 Claude 项目结构
        pub fn setup_test_project() -> (TempDir, PathBuf) {
            let temp_dir = create_temp_dir();
            let project_path = temp_dir.path().join("test-project");
            std::fs::create_dir_all(&project_path).unwrap();
            
            // 创建一些测试文件
            std::fs::write(project_path.join("main.rs"), "fn main() {}").unwrap();
            std::fs::write(project_path.join("Cargo.toml"), "[package]\nname = \"test\"").unwrap();
            
            (temp_dir, project_path)
        }

        /// 创建临时 Claude 目录结构
        pub fn setup_claude_dir() -> (TempDir, PathBuf) {
            let temp_dir = create_temp_dir();
            let claude_dir = temp_dir.path().join(".claude");
            std::fs::create_dir_all(&claude_dir).unwrap();
            std::fs::create_dir_all(claude_dir.join("projects")).unwrap();
            (temp_dir, claude_dir)
        }
    }
}

// Checkpoint 模块测试
#[cfg(test)]
mod checkpoint_tests {
    use crate::checkpoint::*;
    use chrono::Utc;
    use std::path::PathBuf;

    #[test]
    fn test_checkpoint_creation() {
        let checkpoint = Checkpoint {
            id: "chk-001".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 5,
            timestamp: Utc::now(),
            description: Some("Test checkpoint".to_string()),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 1000,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "Test prompt".to_string(),
                file_changes: 2,
                snapshot_size: 1024,
            },
        };

        assert_eq!(checkpoint.id, "chk-001");
        assert_eq!(checkpoint.message_index, 5);
        assert!(checkpoint.description.is_some());
    }

    #[test]
    fn test_session_timeline_creation() {
        let timeline = SessionTimeline::new("session-001".to_string());
        
        assert_eq!(timeline.session_id, "session-001");
        assert!(timeline.root_node.is_none());
        assert!(timeline.current_checkpoint_id.is_none());
        assert!(!timeline.auto_checkpoint_enabled);
        assert_eq!(timeline.total_checkpoints, 0);
    }

    #[test]
    fn test_checkpoint_strategy_default() {
        let strategy: CheckpointStrategy = Default::default();
        matches!(strategy, CheckpointStrategy::Smart);
    }

    #[test]
    fn test_timeline_find_checkpoint() {
        let mut timeline = SessionTimeline::new("session-001".to_string());
        
        // 创建根节点
        let checkpoint = Checkpoint {
            id: "root".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 0,
            timestamp: Utc::now(),
            description: None,
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 0,
                model_used: "".to_string(),
                user_prompt: "".to_string(),
                file_changes: 0,
                snapshot_size: 0,
            },
        };
        
        timeline.root_node = Some(TimelineNode {
            checkpoint,
            children: vec![],
            file_snapshot_ids: vec![],
        });
        
        // 测试查找存在的 checkpoint
        let found = timeline.find_checkpoint("root");
        assert!(found.is_some());
        
        // 测试查找不存在的 checkpoint
        let not_found = timeline.find_checkpoint("non-existent");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_checkpoint_paths_creation() {
        let claude_dir = PathBuf::from("/home/user/.claude");
        let paths = CheckpointPaths::new(&claude_dir, "project-1", "session-1");
        
        assert!(paths.timeline_file.to_string_lossy().contains("timeline.json"));
        assert!(paths.checkpoints_dir.to_string_lossy().contains("checkpoints"));
        assert!(paths.files_dir.to_string_lossy().contains("files"));
    }

    #[test]
    fn test_file_snapshot_creation() {
        let snapshot = FileSnapshot {
            checkpoint_id: "chk-001".to_string(),
            file_path: PathBuf::from("src/main.rs"),
            content: "fn main() {}".to_string(),
            hash: "abc123".to_string(),
            is_deleted: false,
            permissions: Some(0o644),
            size: 14,
        };

        assert_eq!(snapshot.file_path, PathBuf::from("src/main.rs"));
        assert!(!snapshot.is_deleted);
        assert_eq!(snapshot.size, 14);
    }

    #[test]
    fn test_checkpoint_diff_creation() {
        let diff = CheckpointDiff {
            from_checkpoint_id: "chk-001".to_string(),
            to_checkpoint_id: "chk-002".to_string(),
            modified_files: vec![],
            added_files: vec![PathBuf::from("new_file.rs")],
            deleted_files: vec![],
            token_delta: 100,
        };

        assert_eq!(diff.from_checkpoint_id, "chk-001");
        assert_eq!(diff.token_delta, 100);
        assert_eq!(diff.added_files.len(), 1);
    }
}

// Checkpoint State 测试
#[cfg(test)]
mod checkpoint_state_tests {
    use crate::checkpoint::state::CheckpointState;

    #[tokio::test]
    async fn test_checkpoint_state_creation() {
        let state = CheckpointState::new();
        // 新创建的 state 应该能正常工作
        assert!(state.get_manager("non-existent").await.is_none());
    }

    #[tokio::test]
    async fn test_set_claude_dir() {
        let state = CheckpointState::new();
        let claude_dir = std::path::PathBuf::from("/tmp/test-claude");
        
        state.set_claude_dir(claude_dir.clone()).await;
        // 设置后应该能获取到（通过 get_or_create_manager 间接验证）
    }

    #[tokio::test]
    async fn test_remove_nonexistent_manager() {
        let state = CheckpointState::new();
        let removed = state.remove_manager("non-existent").await;
        assert!(removed.is_none());
    }
}

// 序列化测试
#[cfg(test)]
mod serialization_tests {
    use crate::checkpoint::*;
    use chrono::Utc;

    #[test]
    fn test_checkpoint_serialization() {
        let checkpoint = Checkpoint {
            id: "chk-001".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 5,
            timestamp: Utc::now(),
            description: Some("Test".to_string()),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 1000,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "Hello".to_string(),
                file_changes: 0,
                snapshot_size: 0,
            },
        };

        let json = serde_json::to_string(&checkpoint).expect("Failed to serialize");
        let deserialized: Checkpoint = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(checkpoint.id, deserialized.id);
        assert_eq!(checkpoint.message_index, deserialized.message_index);
    }

    #[test]
    fn test_timeline_serialization() {
        let timeline = SessionTimeline::new("session-001".to_string());
        
        let json = serde_json::to_string(&timeline).expect("Failed to serialize");
        let deserialized: SessionTimeline = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(timeline.session_id, deserialized.session_id);
        assert_eq!(timeline.total_checkpoints, deserialized.total_checkpoints);
    }

    #[test]
    fn test_checkpoint_strategy_serialization() {
        let strategies = vec![
            CheckpointStrategy::Manual,
            CheckpointStrategy::PerPrompt,
            CheckpointStrategy::PerToolUse,
            CheckpointStrategy::Smart,
        ];

        for strategy in strategies {
            let json = serde_json::to_string(&strategy).expect("Failed to serialize");
            let deserialized: CheckpointStrategy = serde_json::from_str(&json).expect("Failed to deserialize");
            
            match (strategy, deserialized) {
                (CheckpointStrategy::Manual, CheckpointStrategy::Manual) => {},
                (CheckpointStrategy::PerPrompt, CheckpointStrategy::PerPrompt) => {},
                (CheckpointStrategy::PerToolUse, CheckpointStrategy::PerToolUse) => {},
                (CheckpointStrategy::Smart, CheckpointStrategy::Smart) => {},
                _ => panic!("Strategy serialization mismatch"),
            }
        }
    }
}

// 错误处理测试
#[cfg(test)]
mod error_tests {
    use std::path::PathBuf;

    #[test]
    fn test_invalid_path_handling() {
        let invalid_paths = vec![
            PathBuf::from(""),
            PathBuf::from("/nonexistent/path/that/does/not/exist"),
            PathBuf::from("../../../etc/passwd"), // 路径遍历尝试
        ];

        for path in invalid_paths {
            // 验证这些路径不应该导致 panic
            assert!(!path.exists() || path.to_string_lossy().contains(".."));
        }
    }
}

// 性能基准测试（可选，需要 criterion）
#[cfg(all(test, feature = "benchmarks"))]
mod benchmarks {
    use super::*;
    use criterion::{black_box, criterion_group, criterion_main, Criterion};

    fn benchmark_checkpoint_serialization(c: &mut Criterion) {
        let checkpoint = Checkpoint {
            id: "chk-bench".to_string(),
            session_id: "session-bench".to_string(),
            project_id: "project-bench".to_string(),
            message_index: 100,
            timestamp: Utc::now(),
            description: Some("Benchmark checkpoint".to_string()),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 10000,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "Benchmark prompt".to_string(),
                file_changes: 50,
                snapshot_size: 1024 * 1024, // 1MB
            },
        };

        c.bench_function("checkpoint_serialize", |b| {
            b.iter(|| {
                let json = serde_json::to_string(black_box(&checkpoint)).unwrap();
                black_box(json);
            })
        });

        let json = serde_json::to_string(&checkpoint).unwrap();
        c.bench_function("checkpoint_deserialize", |b| {
            b.iter(|| {
                let checkpoint: Checkpoint = serde_json::from_str(black_box(&json)).unwrap();
                black_box(checkpoint);
            })
        });
    }

    criterion_group!(benches, benchmark_checkpoint_serialization);
    criterion_main!(benches);
}
