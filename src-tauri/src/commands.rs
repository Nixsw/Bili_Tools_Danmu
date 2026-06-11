use crate::app_config::{save_config, AppConfig, ConfigPatch};
use crate::models::AppSnapshot;
use crate::ws_client::{connect_ws_inner, disconnect_ws_inner};
use crate::AppState;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn get_snapshot(state: State<'_, AppState>) -> Result<AppSnapshot, String> {
    let inner = state.inner.lock().map_err(|error| error.to_string())?;
    Ok(inner.store.snapshot())
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let inner = state.inner.lock().map_err(|error| error.to_string())?;
    Ok(inner.config.clone())
}

#[tauri::command]
pub fn update_config(
    app: AppHandle,
    state: State<'_, AppState>,
    patch: ConfigPatch,
) -> Result<AppConfig, String> {
    let config = {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.config.apply_patch(patch);
        save_config(&inner.config)?;
        inner.config.clone()
    };
    emit_snapshot(&app, &state)?;
    Ok(config)
}

#[tauri::command]
pub async fn connect_ws(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    connect_ws_inner(app, &state).await
}

#[tauri::command]
pub async fn disconnect_ws(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    disconnect_ws_inner(&state)?;
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.set_connection("已断开", false);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub async fn reconnect_ws(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    disconnect_ws_inner(&state)?;
    connect_ws_inner(app, &state).await
}

#[tauri::command]
pub fn ack_message(
    app: AppHandle,
    state: State<'_, AppState>,
    message_id: u64,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.ack_message(message_id);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn ack_user_messages(
    app: AppHandle,
    state: State<'_, AppState>,
    uid: String,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.ack_user_messages(&uid);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn select_user_anchor(
    app: AppHandle,
    state: State<'_, AppState>,
    message_id: u64,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.select_user_anchor(message_id);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn set_person_panel_hover(
    app: AppHandle,
    state: State<'_, AppState>,
    value: bool,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.set_person_panel_hover(value);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn scroll_main_viewport(
    app: AppHandle,
    state: State<'_, AppState>,
    delta: i32,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.scroll_main_viewport(delta as isize);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn scroll_person_viewport(
    app: AppHandle,
    state: State<'_, AppState>,
    delta: i32,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.scroll_person_viewport(delta as isize);
    }
    emit_snapshot(&app, &state)
}

#[tauri::command]
pub fn set_viewport_sizes(
    app: AppHandle,
    state: State<'_, AppState>,
    main_viewport_size: Option<usize>,
    person_viewport_size: Option<usize>,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner
            .store
            .set_viewport_sizes(main_viewport_size, person_viewport_size);
    }
    emit_snapshot(&app, &state)
}

pub fn emit_snapshot(app: &AppHandle, state: &State<'_, AppState>) -> Result<(), String> {
    let snapshot = {
        let inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.snapshot()
    };
    app.emit("danmu_state_changed", snapshot)
        .map_err(|error| error.to_string())
}
