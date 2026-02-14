//! # Criterion 基准测试
//! 
//! 使用 Criterion.rs 进行性能基准测试

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use opcode_lib::checkpoint::*;
use chrono::Utc;
use std::path::PathBuf;

/// 创建测试用的 checkpoint
fn create_test_checkpoint(id: &str, message_index: usize) -> Checkpoint {
    Checkpoint {
        id: id.to_string(),
        session_id: "bench-session".to_string(),
        project_id: "bench-project".to_string(),
        message_index,
        timestamp: Utc::now(),
        description: Some(format!("Checkpoint {}", id)),
        parent_checkpoint_id: if message_index > 0 {
            Some(format!("chk-{}", message_index - 1))
        } else {
            None
        },
        metadata: CheckpointMetadata {
            total_tokens: (message_index as u64) * 1000,
            model_used: "claude-3-opus".to_string(),
            user_prompt: format!("Prompt {}", message_index),
            file_changes: message_index,
            snapshot_size: 1024 * 1024, // 1MB
        },
    }
}

/// Benchmark Checkpoint 序列化性能
fn benchmark_checkpoint_serialization(c: &mut Criterion) {
    let checkpoint = create_test_checkpoint("bench-001", 100);
    
    let mut group = c.benchmark_group("checkpoint_serialization");
    
    group.bench_function("serialize", |b| {
        b.iter(|| {
            let json = serde_json::to_string(black_box(&checkpoint)).unwrap();
            black_box(json);
        })
    });
    
    let json = serde_json::to_string(&checkpoint).unwrap();
    group.bench_function("deserialize", |b| {
        b.iter(|| {
            let checkpoint: Checkpoint = serde_json::from_str(black_box(&json)).unwrap();
            black_box(checkpoint);
        })
    });
    
    group.finish();
}

/// Benchmark Timeline 查找性能
fn benchmark_timeline_lookup(c: &mut Criterion) {
    let mut timeline = SessionTimeline::new("bench-session".to_string());
    
    // 创建包含 N 个节点的 timeline
    let sizes = vec![10, 100, 1000];
    
    for size in sizes {
        let root_checkpoint = create_test_checkpoint("root", 0);
        let mut root = TimelineNode {
            checkpoint: root_checkpoint,
            children: vec![],
            file_snapshot_ids: vec![],
        };
        
        // 添加子节点
        for i in 0..size {
            let child = TimelineNode {
                checkpoint: create_test_checkpoint(&format!("chk-{}", i), i + 1),
                children: vec![],
                file_snapshot_ids: vec![format!("snap-{}", i)],
            };
            root.children.push(child);
        }
        
        timeline.root_node = Some(root);
        
        c.bench_with_input(
            BenchmarkId::new("timeline_find", size),
            &size,
            |b, _| {
                b.iter(|| {
                    let idx = black_box(size / 2);
                    let result = timeline.find_checkpoint(&format!("chk-{}", idx));
                    black_box(result);
                })
            },
        );
    }
}

/// Benchmark 不同大小的 Checkpoint 序列化
fn benchmark_checkpoint_size(c: &mut Criterion) {
    let sizes = vec![
        ("small", 100),
        ("medium", 1024),
        ("large", 10240),
        ("xlarge", 102400),
    ];
    
    let mut group = c.benchmark_group("checkpoint_size");
    
    for (name, content_size) in sizes {
        let checkpoint = Checkpoint {
            id: format!("bench-{}", name),
            session_id: "bench-session".to_string(),
            project_id: "bench-project".to_string(),
            message_index: 1,
            timestamp: Utc::now(),
            description: Some("a".repeat(content_size)),
            parent_checkpoint_id: None,
            metadata: CheckpointMetadata {
                total_tokens: content_size as u64,
                model_used: "claude-3-opus".to_string(),
                user_prompt: "x".repeat(content_size),
                file_changes: 10,
                snapshot_size: content_size as u64,
            },
        };
        
        group.bench_with_input(
            BenchmarkId::new("serialize", name),
            &checkpoint,
            |b, checkpoint| {
                b.iter(|| {
                    let json = serde_json::to_string(black_box(checkpoint)).unwrap();
                    black_box(json);
                })
            },
        );
    }
    
    group.finish();
}

/// Benchmark CheckpointPaths 生成性能
fn benchmark_checkpoint_paths(c: &mut Criterion) {
    let claude_dir = PathBuf::from("/home/user/.claude");
    
    c.bench_function("checkpoint_paths_creation", |b| {
        b.iter(|| {
            let paths = CheckpointPaths::new(
                black_box(&claude_dir),
                black_box("project-123"),
                black_box("session-456"),
            );
            black_box(paths);
        })
    });
}

criterion_group!(
    benches,
    benchmark_checkpoint_serialization,
    benchmark_timeline_lookup,
    benchmark_checkpoint_size,
    benchmark_checkpoint_paths
);
criterion_main!(benches);
