//! # 快照测试（Snapshot Testing）
//! 
//! 使用 Insta 进行回归测试

#[cfg(test)]
mod snapshot_tests {
    use insta::assert_yaml_snapshot;
    use opcode_lib::checkpoint::*;
    use chrono::Utc;

    #[test]
    fn test_checkpoint_snapshot() {
        let checkpoint = Checkpoint {
            id: "chk-snapshot-001".to_string(),
            session_id: "session-snapshot".to_string(),
            project_id: "project-snapshot".to_string(),
            message_index: 42,
            timestamp: Utc::now(),
            description: Some("Snapshot test checkpoint".to_string()),
            parent_checkpoint_id: Some("chk-parent".to_string()),
            metadata: CheckpointMetadata {
                total_tokens: 1234567,
                model_used: "claude-3-opus-20240229".to_string(),
                user_prompt: "Test prompt for snapshot".to_string(),
                file_changes: 15,
                snapshot_size: 1024 * 1024 * 5,
            },
        };

        assert_yaml_snapshot!(checkpoint, {
            ".timestamp" => "[datetime]",
        });
    }

    #[test]
    fn test_timeline_snapshot() {
        let root_checkpoint = Checkpoint {
            id: "root".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 0,
            timestamp: Utc::now(),
            description: Some("Root".to_string()),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: 0,
                model_used: "".to_string(),
                user_prompt: "".to_string(),
                file_changes: 0,
                snapshot_size: 0,
            },
        };

        let child_checkpoint = Checkpoint {
            id: "child-1".to_string(),
            session_id: "session-001".to_string(),
            project_id: "project-001".to_string(),
            message_index: 5,
            timestamp: Utc::now(),
            description: Some("Child".to_string()),
            parent_checkpoint_id: Some("root".to_string()),
            metadata: CheckpointMetadata {
                total_tokens: 5000,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "Child prompt".to_string(),
                file_changes: 3,
                snapshot_size: 1024,
            },
        };

        let timeline = SessionTimeline {
            session_id: "session-001".to_string(),
            root_node: Some(TimelineNode {
                checkpoint: root_checkpoint,
                children: vec![TimelineNode {
                    checkpoint: child_checkpoint,
                    children: vec![],
                    file_snapshot_ids: vec!["snap-001".to_string()],
                }],
                file_snapshot_ids: vec![],
            }),
            current_checkpoint_id: Some("child-1".to_string()),
            auto_checkpoint_enabled: true,
            checkpoint_strategy: CheckpointStrategy::Smart,
            total_checkpoints: 2,
        };

        assert_yaml_snapshot!(timeline, {
            ".root_node.checkpoint.timestamp" => "[datetime]",
            ".root_node.children[0].checkpoint.timestamp" => "[datetime]",
        });
    }

    #[test]
    fn test_checkpoint_strategy_variants() {
        let strategies = vec![
            CheckpointStrategy::Manual,
            CheckpointStrategy::PerPrompt,
            CheckpointStrategy::PerToolUse,
            CheckpointStrategy::Smart,
        ];

        assert_yaml_snapshot!(strategies);
    }

    #[test]
    fn test_checkpoint_result_snapshot() {
        let result = CheckpointResult {
            checkpoint: Checkpoint {
                id: "result-chk-001".to_string(),
                session_id: "session-001".to_string(),
                project_id: "project-001".to_string(),
                message_index: 10,
                timestamp: Utc::now(),
                description: Some("Result checkpoint".to_string()),
                parent_checkpoint_id: None,
                metadata: CheckpointMetadata {
                    total_tokens: 10000,
                    model_used: "claude-3-opus".to_string(),
                    user_prompt: "Test".to_string(),
                    file_changes: 5,
                    snapshot_size: 10240,
                },
            },
            files_processed: 42,
            warnings: vec![
                "Large file detected".to_string(),
                "Binary file skipped".to_string(),
            ],
        };

        assert_yaml_snapshot!(result, {
            ".checkpoint.timestamp" => "[datetime]",
        });
    }

    #[test]
    fn test_checkpoint_diff_snapshot() {
        let diff = CheckpointDiff {
            from_checkpoint_id: "chk-001".to_string(),
            to_checkpoint_id: "chk-002".to_string(),
            modified_files: vec![
                FileDiff {
                    path: std::path::PathBuf::from("src/main.rs"),
                    additions: 50,
                    deletions: 20,
                    diff_content: Some("@@ -1,10 +1,15 @@\n fn main() {\n+    println!(\"Hello\");\n }".to_string()),
                },
            ],
            added_files: vec![
                std::path::PathBuf::from("src/new_file.rs"),
            ],
            deleted_files: vec![
                std::path::PathBuf::from("src/old_file.rs"),
            ],
            token_delta: 1500,
        };

        assert_yaml_snapshot!(diff);
    }

    #[test]
    fn test_file_snapshot_snapshot() {
        let snapshot = FileSnapshot {
            checkpoint_id: "chk-001".to_string(),
            file_path: std::path::PathBuf::from("src/main.rs"),
            content: "fn main() {\n    println!(\"Hello, World!\");\n}".to_string(),
            hash: "abc123def456".to_string(),
            is_deleted: false,
            permissions: Some(0o644),
            size: 42,
        };

        assert_yaml_snapshot!(snapshot);
    }

    #[test]
    fn test_checkpoint_paths_snapshot() {
        let claude_dir = std::path::PathBuf::from("/home/user/.claude");
        let paths = CheckpointPaths::new(
            &claude_dir,
            "project-123",
            "session-456",
        );

        assert_yaml_snapshot!(paths);
    }
}
