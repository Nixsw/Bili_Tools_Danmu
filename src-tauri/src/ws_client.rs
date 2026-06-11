use crate::commands::emit_snapshot;
use crate::models::IncomingDanmuRaw;
use crate::AppState;
use futures_util::StreamExt;
use tauri::{AppHandle, State};
use tokio::time::{sleep, Duration};
use tokio_tungstenite::connect_async;

pub async fn connect_ws_inner(app: AppHandle, state: &State<'_, AppState>) -> Result<(), String> {
    disconnect_ws_inner(state)?;

    let url = {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.set_connection("连接中", false);
        inner.config.websocket_url.clone()
    };
    emit_snapshot(&app, state)?;

    let inner_state = state.inner.clone();
    let app_for_task = app.clone();
    let task = tauri::async_runtime::spawn(async move {
        loop {
            match connect_async(&url).await {
                Ok((stream, _)) => {
                    {
                        if let Ok(mut inner) = inner_state.lock() {
                            inner.store.set_connection("已连接", true);
                        }
                    }
                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);

                    let (_, mut read) = stream.split();
                    while let Some(next) = read.next().await {
                        match next {
                            Ok(message) if message.is_text() => {
                                let text = message.into_text().unwrap_or_default();
                                match serde_json::from_str::<IncomingDanmuRaw>(&text) {
                                    Ok(raw) => {
                                        if let Ok(mut inner) = inner_state.lock() {
                                            if let Err(error) = inner.store.ingest(raw) {
                                                inner.store.set_connection(
                                                    format!("解析失败：{error}"),
                                                    true,
                                                );
                                            }
                                        }
                                        let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                    }
                                    Err(error) => {
                                        if let Ok(mut inner) = inner_state.lock() {
                                            inner
                                                .store
                                                .set_connection(format!("JSON失败：{error}"), true);
                                        }
                                        let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                    }
                                }
                            }
                            Ok(_) => {}
                            Err(error) => {
                                if let Ok(mut inner) = inner_state.lock() {
                                    inner.store.set_connection(
                                        format!("已断开，2秒后重连：{error}"),
                                        false,
                                    );
                                }
                                let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                break;
                            }
                        }
                    }
                }
                Err(error) => {
                    if let Ok(mut inner) = inner_state.lock() {
                        inner
                            .store
                            .set_connection(format!("连接失败，2秒后重试：{error}"), false);
                    }
                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                }
            }

            sleep(Duration::from_secs(2)).await;
        }
    });

    let mut guard = state.ws_task.lock().map_err(|error| error.to_string())?;
    *guard = Some(task);
    Ok(())
}

pub fn disconnect_ws_inner(state: &State<'_, AppState>) -> Result<(), String> {
    let mut task = state.ws_task.lock().map_err(|error| error.to_string())?;
    if let Some(handle) = task.take() {
        handle.abort();
    }
    Ok(())
}

fn emit_snapshot_from_arc(
    app: &AppHandle,
    inner_state: &std::sync::Arc<std::sync::Mutex<crate::RuntimeState>>,
) -> Result<(), String> {
    let snapshot = {
        let inner = inner_state.lock().map_err(|error| error.to_string())?;
        inner.store.snapshot()
    };
    use tauri::Emitter;
    app.emit("danmu_state_changed", snapshot)
        .map_err(|error| error.to_string())
}
