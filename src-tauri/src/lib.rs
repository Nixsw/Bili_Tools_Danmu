mod app_config;
mod commands;
mod models;
mod store;
mod ws_client;

use app_config::{load_config, save_window_position, save_window_size};
use commands::{
    ack_message, ack_user_messages, connect_ws, disconnect_ws, get_config, get_snapshot, reconnect_ws,
    scroll_main_viewport, scroll_person_viewport, select_user_anchor, set_person_panel_hover,
    set_viewport_sizes, update_config,
};
use std::sync::{Arc, Mutex};
use store::MessageStore;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

pub struct AppState {
    pub inner: Arc<Mutex<RuntimeState>>,
    pub ws_task: Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
}

pub struct RuntimeState {
    pub store: MessageStore,
    pub config: app_config::AppConfig,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config = load_config();
            let runtime_state = Arc::new(Mutex::new(RuntimeState {
                store: MessageStore::new(config.main_capacity, config.per_user_capacity),
                config,
            }));
            let state = AppState {
                inner: runtime_state.clone(),
                ws_task: Arc::new(Mutex::new(None)),
            };
            app.manage(state);
            ensure_main_window(app)?;
            apply_main_window_config(app, &runtime_state)?;
            persist_main_window_geometry(app, runtime_state)?;
            setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_config,
            update_config,
            connect_ws,
            disconnect_ws,
            reconnect_ws,
            ack_message,
            ack_user_messages,
            select_user_anchor,
            set_person_panel_hover,
            scroll_main_viewport,
            scroll_person_viewport,
            set_viewport_sizes
        ])
        .run(tauri::generate_context!())
        .expect("failed to run DanmuTools");
}

fn ensure_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window("main").is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("DanmuTools")
        .inner_size(600.0, 780.0)
        .min_inner_size(420.0, 520.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(true)
        .build()?;
    Ok(())
}

fn apply_main_window_config(
    app: &tauri::App,
    runtime_state: &Arc<Mutex<RuntimeState>>,
) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let config = runtime_state
        .lock()
        .map(|state| state.config.clone())
        .unwrap_or_default();

    if let (Some(width), Some(height)) = (config.window_width, config.window_height) {
        let _ = window.set_size(PhysicalSize::new(width, height));
    }
    if let (Some(x), Some(y)) = (config.window_x, config.window_y) {
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
    Ok(())
}

fn persist_main_window_geometry(
    app: &tauri::App,
    runtime_state: Arc<Mutex<RuntimeState>>,
) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.on_window_event(move |event| match event {
            WindowEvent::Moved(position) => {
                if let Ok(mut state) = runtime_state.lock() {
                    let config = state.config.clone();
                    if let Ok(next) = save_window_position(position.x, position.y, config) {
                        state.config = next;
                    }
                }
            }
            WindowEvent::Resized(size) => {
                if let Ok(mut state) = runtime_state.lock() {
                    let config = state.config.clone();
                    if let Ok(next) = save_window_size(size.width, size.height, config) {
                        state.config = next;
                    }
                }
            }
            _ => {}
        });
    }
    Ok(())
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let disconnect = MenuItem::with_id(app, "disconnect", "断开", true, None::<&str>)?;
    let reconnect = MenuItem::with_id(app, "reconnect", "重连", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &settings, &disconnect, &reconnect, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("DanmuTools")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            "reconnect" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray_reconnect_requested", ());
                }
            }
            "disconnect" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray_disconnect_requested", ());
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("tray_settings_requested", ());
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
