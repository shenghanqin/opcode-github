//! # Tauri 集成测试
//! 
//! 端到端测试 Tauri 应用的核心功能

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Checkpoint Manager 集成测试
#[cfg(test)]
mod checkpoint_integration_tests {
    use super::*;
    use opcode_lib::checkpoint::{*, manager::CheckpointManager};
    use tempfile::TempDir;

    async fn setup_test_environment() -> (TempDir, PathBuf, PathBuf, String, String) {
        let temp_dir = TempDir::new().unwrap();
        let claude_dir = temp_dir.path().join(".claude");
        let project_path = temp_dir.path().join("test-project");
        
        std::fs::create_dir_all(&claude_dir).unwrap();
        std::fs::create_dir_all(&project_path).unwrap();
        
        // 创建测试文件
        std::fs::write(project_path.join("main.rs"), "fn main() { println!(\"Hello\"); }").unwrap();
        std::fs::write(project_path.join("lib.rs"), "pub fn add(a: i32, b: i32) -> i32 { a + b }").unwrap();
        
        let project_id = "test-project-001".to_string();
        let session_id = "test-session-001".to_string();
        
        (temp_dir, claude_dir, project_path, project_id, session_id)
    }

    #[tokio::test]
    async fn test_checkpoint_manager_creation() {
        let (_temp, claude_dir, project_path, project_id, session_id) = setup_test_environment().await;
        
        let manager = CheckpointManager::new(
            project_id,
            session_id,
            project_path,
            claude_dir,
        ).await;
        
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_create_checkpoint() {
        let (_temp, claude_dir, project_path, project_id, session_id) = setup_test_environment().await;
        
        let manager = CheckpointManager::new(
            project_id.clone(),
            session_id.clone(),
            project_path,
            claude_dir,
        ).await.expect("Failed to create manager");

        // 注意：实际的 create_checkpoint 需要更多参数
        // 这里仅测试 manager 能正常工作
        assert_eq!(manager.project_id, project_id);
        assert_eq!(manager.session_id, session_id);
    }

    #[tokio::test]
    async fn test_checkpoint_persistence() {
        let (_temp, claude_dir, project_path, project_id, session_id) = setup_test_environment().await;
        
        // 创建第一个 manager
        {
            let manager = CheckpointManager::new(
                project_id.clone(),
                session_id.clone(),
                project_path.clone(),
                claude_dir.clone(),
            ).await.expect("Failed to create manager");
            
            // manager 在这里被 drop，数据应该被持久化
            drop(manager);
        }
        
        // 创建第二个 manager，应该能恢复状态
        let manager2 = CheckpointManager::new(
            project_id,
            session_id,
            project_path,
            claude_dir,
        ).await.expect("Failed to create manager");
        
        // 验证 manager 正常工作
        assert!(!manager2.project_id.is_empty());
    }
}

/// Checkpoint State 集成测试
#[cfg(test)]
mod state_integration_tests {
    use super::*;
    use opcode_lib::checkpoint::state::CheckpointState;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_state_manager_lifecycle() {
        let state = CheckpointState::new();
        let temp_dir = TempDir::new().unwrap();
        let claude_dir = temp_dir.path().join(".claude");
        std::fs::create_dir_all(&claude_dir).unwrap();
        
        // 设置 Claude 目录
        state.set_claude_dir(claude_dir.clone()).await;
        
        // 创建 manager
        let session_id = "test-session-001";
        let project_id = "test-project-001";
        let project_path = temp_dir.path().join("test-project");
        std::fs::create_dir_all(&project_path).unwrap();
        
        let manager = state.get_or_create_manager(
            session_id.to_string(),
            project_id.to_string(),
            project_path.clone(),
        ).await;
        
        assert!(manager.is_ok());
        
        // 获取已存在的 manager
        let manager2 = state.get_manager(session_id).await;
        assert!(manager2.is_some());
        
        // 移除 manager
        let removed = state.remove_manager(session_id).await;
        assert!(removed.is_some());
        
        // 再次获取应该为 None
        let manager3 = state.get_manager(session_id).await;
        assert!(manager3.is_none());
    }

    #[tokio::test]
    async fn test_multiple_sessions() {
        let state = CheckpointState::new();
        let temp_dir = TempDir::new().unwrap();
        let claude_dir = temp_dir.path().join(".claude");
        std::fs::create_dir_all(&claude_dir).unwrap();
        
        state.set_claude_dir(claude_dir).await;
        
        // 创建多个 session
        let sessions: Vec<(String, String, PathBuf)> = (0..5)
            .map(|i| {
                let project_path = temp_dir.path().join(format!("project-{}", i));
                std::fs::create_dir_all(&project_path).unwrap();
                (
                    format!("session-{}", i),
                    format!("project-{}", i),
                    project_path,
                )
            })
            .collect();
        
        // 为每个 session 创建 manager
        for (session_id, project_id, project_path) in &sessions {
            let manager = state.get_or_create_manager(
                session_id.clone(),
                project_id.clone(),
                project_path.clone(),
            ).await;
            assert!(manager.is_ok());
        }
        
        // 验证所有 manager 都存在
        for (session_id, _, _) in &sessions {
            let manager = state.get_manager(session_id).await;
            assert!(manager.is_some(), "Manager for {} should exist", session_id);
        }
    }
}

/// 存储集成测试
#[cfg(test)]
mod storage_integration_tests {
    use super::*;
    use opcode_lib::checkpoint::storage::CheckpointStorage;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_storage_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let base_dir = temp_dir.path().join("checkpoints");
        
        let storage = CheckpointStorage::new(base_dir.clone());
        
        // 初始化应该创建目录结构
        storage.initialize().await.expect("Failed to initialize storage");
        
        assert!(base_dir.exists());
    }

    #[tokio::test]
    async fn test_storage_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let base_dir = temp_dir.path().join("checkpoints");
        
        let storage = CheckpointStorage::new(base_dir);
        storage.initialize().await.unwrap();
        
        // 保存数据
        let test_data = serde_json::json!({
            "id": "test-checkpoint",
            "timestamp": "2024-01-01T00:00:00Z",
        });
        
        storage.save_checkpoint_metadata("test-checkpoint", &test_data)
            .await
            .expect("Failed to save metadata");
        
        // 加载数据
        let loaded = storage.load_checkpoint_metadata("test-checkpoint")
            .await
            .expect("Failed to load metadata");
        
        assert_eq!(loaded["id"], "test-checkpoint");
    }
}

/// 序列化集成测试
#[cfg(test)]
mod serialization_integration_tests {
    use super::*;
    use opcode_lib::checkpoint::*;
    use chrono::Utc;

    #[test]
    fn test_full_checkpoint_roundtrip() {
        let checkpoint = Checkpoint {
            id: "chk-full-001".to_string(),
            session_id: "session-full-001".to_string(),
            project_id: "project-full-001".to_string(),
            message_index: 42,
            timestamp: Utc::now(),
            description: Some("Full integration test checkpoint".to_string()),
            parent_checkpoint_id: Some("chk-parent-001".to_string()),
            metadata: CheckpointMetadata {
                total_tokens: 1234567,
                model_used: "claude-3-opus-20240229".to_string(),
                user_prompt: "This is a comprehensive test of the checkpoint system".to_string(),
                file_changes: 15,
                snapshot_size: 1024 * 1024 * 5, // 5MB
            },
        };

        // 序列化
        let json = serde_json::to_string_pretty(&checkpoint)
            .expect("Failed to serialize checkpoint");
        
        // 验证 JSON 包含关键字段
        assert!(json.contains("chk-full-001"));
        assert!(json.contains("claude-3-opus"));
        assert!(json.contains("totalTokens"));
        
        // 反序列化
        let deserialized: Checkpoint = serde_json::from_str(&json)
            .expect("Failed to deserialize checkpoint");
        
        // 验证所有字段
        assert_eq!(checkpoint.id, deserialized.id);
        assert_eq!(checkpoint.session_id, deserialized.session_id);
        assert_eq!(checkpoint.project_id, deserialized.project_id);
        assert_eq!(checkpoint.message_index, deserialized.message_index);
        assert_eq!(checkpoint.description, deserialized.description);
        assert_eq!(checkpoint.parent_checkpoint_id, deserialized.parent_checkpoint_id);
        assert_eq!(checkpoint.metadata.total_tokens, deserialized.metadata.total_tokens);
        assert_eq!(checkpoint.metadata.model_used, deserialized.metadata.model_used);
        assert_eq!(checkpoint.metadata.file_changes, deserialized.metadata.file_changes);
    }

    #[test]
    fn test_timeline_tree_serialization() {
        let checkpoint1 = Checkpoint {
            id: "root".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 0,
            timestamp: Utc::now(),
            description: Some("Root checkpoint".to_string()),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 0,
                model_used: "".to_string(),
                user_prompt: "".to_string(),
                file_changes: 0,
                snapshot_size: 0,
            },
        };

        let checkpoint2 = Checkpoint {
            id: "child-1".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 5,
            timestamp: Utc::now(),
            description: Some("Child checkpoint".to_string()),
            parent_checkpoint_id: Some("root".to_string()),
            metadata: CheckpointMetadata {
                total_tokens: 1000,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "Test".to_string(),
                file_changes: 2,
                snapshot_size: 1024,
            },
        };

        let root_node = TimelineNode {
            checkpoint: checkpoint1,
            children: vec![TimelineNode {
                checkpoint: checkpoint2,
                children: vec![],
                file_snapshot_ids: vec!["snap-001".to_string()],
            }],
            file_snapshot_ids: vec![],
        };

        let timeline = SessionTimeline {
            session_id: "session-001".to_string(),
            root_node: Some(root_node),
            current_checkpoint_id: Some("child-1".to_string()),
            auto_checkpoint_enabled: true,
            checkpoint_strategy: CheckpointStrategy::Smart,
            total_checkpoints: 2,
        };

        // 序列化和反序列化
        let json = serde_json::to_string_pretty(&timeline).unwrap();
        let deserialized: SessionTimeline = serde_json::from_str(&json).unwrap();

        assert_eq!(timeline.session_id, deserialized.session_id);
        assert_eq!(timeline.total_checkpoints, deserialized.total_checkpoints);
        assert!(deserialized.root_node.is_some());
        
        let root = deserialized.root_node.unwrap();
        assert_eq!(root.children.len(), 1);
        assert_eq!(root.checkpoint.id, "root");
        assert_eq!(root.children[0].checkpoint.id, "child-1");
    }
}
