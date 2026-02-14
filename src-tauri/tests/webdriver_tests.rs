//! # Tauri WebDriver 测试
//! 
//! 使用 WebDriver 测试完整的桌面应用
//! 需要运行中的 Tauri 应用

#[cfg(test)]
mod webdriver_tests {
    use fantoccini::{Client, Locator};
    use std::time::Duration;
    use tokio::time::timeout;

    /// 创建 WebDriver 客户端
    async fn create_client() -> Result<Client, fantoccini::error::NewSessionError> {
        let caps = serde_json::json!({
            "alwaysMatch": {
                "app": "./target/debug/opcode",
                "platformName": "linux",
            }
        });
        
        Client::with_capabilities("http://localhost:4444", caps).await
    }

    /// 等待元素出现
    async fn wait_for_element(
        client: &Client,
        locator: Locator<'_>,
        duration: Duration,
    ) -> Result<fantoccini::elements::Element, Box<dyn std::error::Error>> {
        timeout(duration, async {
            loop {
                match client.find(locator.clone()).await {
                    Ok(element) => return Ok(element),
                    Err(_) => tokio::time::sleep(Duration::from_millis(100)).await,
                }
            }
        })
        .await
        .map_err(|_| "Timeout waiting for element".into())
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_app_launches() {
        let client = create_client().await.expect("Failed to create WebDriver client");
        
        // 等待应用加载
        tokio::time::sleep(Duration::from_secs(2)).await;
        
        // 验证应用标题
        let title = client.title().await.expect("Failed to get title");
        assert!(title.to_lowercase().contains("opcode"));
        
        client.close().await.expect("Failed to close client");
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_project_list_displays() {
        let client = create_client().await.expect("Failed to create WebDriver client");
        
        // 等待项目列表加载
        let project_list = wait_for_element(
            &client,
            Locator::Css("[data-testid='project-list']"),
            Duration::from_secs(10),
        )
        .await
        .expect("Project list not found");
        
        // 验证列表可见
        let is_displayed = project_list.is_displayed().await.expect("Failed to check visibility");
        assert!(is_displayed);
        
        client.close().await.expect("Failed to close client");
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_create_project_flow() {
        let client = create_client().await.expect("Failed to create WebDriver client");
        
        // 点击创建项目按钮
        let create_btn = wait_for_element(
            &client,
            Locator::Css("[data-testid='create-project-button']"),
            Duration::from_secs(5),
        )
        .await
        .expect("Create button not found");
        
        create_btn.click().await.expect("Failed to click create button");
        
        // 等待模态框
        let modal = wait_for_element(
            &client,
            Locator::Css("[data-testid='project-modal']"),
            Duration::from_secs(5),
        )
        .await
        .expect("Modal not found");
        
        // 填写表单
        let name_input = client
            .find(Locator::Css("[data-testid='project-name-input']"))
            .await
            .expect("Name input not found");
        
        name_input
            .send_keys("WebDriver Test Project")
            .await
            .expect("Failed to enter name");
        
        let path_input = client
            .find(Locator::Css("[data-testid='project-path-input']"))
            .await
            .expect("Path input not found");
        
        path_input
            .send_keys("/tmp/webdriver-test")
            .await
            .expect("Failed to enter path");
        
        // 保存
        let save_btn = client
            .find(Locator::Css("[data-testid='save-project-button']"))
            .await
            .expect("Save button not found");
        
        save_btn.click().await.expect("Failed to click save");
        
        // 等待模态框关闭
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        // 验证项目创建成功
        let project_card = client
            .find(Locator::XPath("//*[contains(text(), 'WebDriver Test Project')]"))
            .await;
        
        assert!(project_card.is_ok(), "Project was not created");
        
        client.close().await.expect("Failed to close client");
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_navigation_between_tabs() {
        let client = create_client().await.expect("Failed to create WebDriver client");
        
        let tabs = vec![
            ("projects-tab", "Projects"),
            ("agents-tab", "Agents"),
            ("usage-tab", "Usage"),
            ("settings-tab", "Settings"),
            ("mcp-tab", "MCP"),
        ];
        
        for (tab_id, expected_content) in tabs {
            // 点击标签
            let tab = client
                .find(Locator::Css(&format!("[data-testid='{}']", tab_id)))
                .await
                .expect(&format!("Tab {} not found", tab_id));
            
            tab.click().await.expect(&format!("Failed to click {}", tab_id));
            
            // 等待内容加载
            tokio::time::sleep(Duration::from_millis(300)).await;
            
            // 验证页面内容
            let body_text = client
                .find(Locator::Css("body"))
                .await
                .expect("Body not found")
                .text()
                .await
                .expect("Failed to get text");
            
            assert!(
                body_text.contains(expected_content) || body_text.to_lowercase().contains(&tab_id.replace("-tab", "")),
                "Content for {} not found",
                tab_id
            );
        }
        
        client.close().await.expect("Failed to close client");
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_window_state() {
        let client = create_client().await.expect("Failed to create WebDriver client");
        
        // 获取窗口大小
        let rect = client.get_window_rect().await.expect("Failed to get rect");
        
        assert!(rect.width > 0);
        assert!(rect.height > 0);
        
        // 调整窗口大小
        client
            .set_window_rect(fantoccini::wd::WindowRect {
                x: rect.x,
                y: rect.y,
                width: 1024,
                height: 768,
            })
            .await
            .expect("Failed to resize window");
        
        // 验证新大小
        let new_rect = client.get_window_rect().await.expect("Failed to get new rect");
        assert_eq!(new_rect.width, 1024);
        assert_eq!(new_rect.height, 768);
        
        client.close().await.expect("Failed to close client");
    }

    #[tokio::test]
    #[ignore = "Requires running WebDriver server and Tauri app"]
    async fn test_screenshot_on_failure() {
        let client = match create_client().await {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Skipping test: {}", e);
                return;
            }
        };
        
        // 尝试找到一个可能不存在的元素
        let result = client.find(Locator::Css("[data-testid='non-existent']")).await;
        
        if result.is_err() {
            // 截图保存
            let screenshot = client.screenshot().await.expect("Failed to take screenshot");
            
            // 保存到文件
            let filename = format!("./screenshots/failure-{}.png", chrono::Utc::now().timestamp());
            tokio::fs::write(&filename, screenshot)
                .await
                .expect("Failed to save screenshot");
            
            println!("Screenshot saved to {}", filename);
        }
        
        client.close().await.expect("Failed to close client");
    }
}

/// 设置和配置测试
#[cfg(test)]
mod tauri_config_tests {
    use std::path::PathBuf;

    #[test]
    fn test_tauri_config_exists() {
        let config_path = PathBuf::from("tauri.conf.json");
        assert!(config_path.exists(), "tauri.conf.json should exist");
    }

    #[test]
    fn test_tauri_config_is_valid_json() {
        let config_content = std::fs::read_to_string("tauri.conf.json")
            .expect("Failed to read tauri.conf.json");
        
        let config: serde_json::Value = serde_json::from_str(&config_content)
            .expect("tauri.conf.json should be valid JSON");
        
        // 验证必需字段
        assert!(config.get("productName").is_some());
        assert!(config.get("version").is_some());
        assert!(config.get("identifier").is_some());
    }

    #[test]
    fn test_icon_files_exist() {
        let icon_sizes = vec!["32x32", "64x64", "128x128"];
        
        for size in icon_sizes {
            let icon_path = PathBuf::from(format!("icons/{}.png", size));
            assert!(
                icon_path.exists(),
                "Icon {} should exist",
                size
            );
        }
    }
}
