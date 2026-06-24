use crate::bilibili::{
    build_enter_packet, build_heartbeat_packet, clear_cached_connect_info_after_ws_failure,
    decode_frame, is_http_connect_api_url, resolve_connect_info,
};
use crate::commands::emit_snapshot;
use crate::AppState;
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, State};
use tokio::time::{sleep, timeout, Duration};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

const RETRY_DELAY_SECONDS: u64 = 2;
const WS_CONNECT_TIMEOUT: Duration = Duration::from_secs(20);

pub async fn connect_ws_inner(app: AppHandle, state: &State<'_, AppState>) -> Result<(), String> {
    disconnect_ws_inner(state)?;

    let url = {
        let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
        inner.store.set_connection("对接中...", false);
        inner.config.connect_api_url.clone()
    };
    let connect_cache = state.connect_cache.clone();
    emit_snapshot(&app, state)?;

    let inner_state = state.inner.clone();
    let app_for_task = app.clone();
    let task = tauri::async_runtime::spawn(async move {
        loop {
            if let Ok(mut inner) = inner_state.lock() {
                inner.store.set_connection("对接中...", false);
            }
            let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
            match resolve_connect_info(&url, connect_cache.clone()).await {
                Ok(connect_info) => {
                    if let Ok(mut inner) = inner_state.lock() {
                        inner.store.set_connection("连接中...", false);
                    }
                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                    match timeout(
                        WS_CONNECT_TIMEOUT,
                        connect_async(connect_info.wsurl.as_str()),
                    )
                    .await
                    {
                        Err(_) => {
                            let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                            if let Ok(mut inner) = inner_state.lock() {
                                inner.store.set_connection(ws_retry_status(true), false);
                            }
                            let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                        }
                        Ok(Err(_error)) => {
                            let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                            if let Ok(mut inner) = inner_state.lock() {
                                inner.store.set_connection(ws_retry_status(false), false);
                            }
                            let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                        }
                        Ok(Ok((mut stream, _))) => {
                            if let Err(_error) = stream
                                .send(Message::Binary(
                                    build_enter_packet(
                                        connect_info.uid,
                                        connect_info.room_id,
                                        &connect_info.token,
                                    )
                                    .into(),
                                ))
                                .await
                            {
                                let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                                if let Ok(mut inner) = inner_state.lock() {
                                    inner.store.set_connection(ws_retry_status(false), false);
                                }
                                let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                continue;
                            }

                            if let Ok(mut inner) = inner_state.lock() {
                                inner.store.set_connection("连接中...", true);
                            }
                            let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);

                            let mut heartbeat = tokio::time::interval(Duration::from_secs(30));
                            loop {
                                tokio::select! {
                                    _ = heartbeat.tick() => {
                                        if let Err(_error) = stream
                                            .send(Message::Binary(build_heartbeat_packet().into()))
                                            .await
                                        {
                                            let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                                            if let Ok(mut inner) = inner_state.lock() {
                                                inner.store.set_connection(ws_retry_status(false), false);
                                            }
                                            let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                            break;
                                        }
                                    }
                                    next = stream.next() => {
                                        match next {
                                            Some(Ok(Message::Binary(data))) => match decode_frame(&data) {
                                                Ok(frame) => {
                                                    if frame.room_enter_response {
                                                        if let Ok(mut inner) = inner_state.lock() {
                                                            inner.store.set_connection("已连接！", true);
                                                        }
                                                    }
                                                    for event in frame.events {
                                                        if let Ok(mut inner) = inner_state.lock() {
                                                            let _ = inner.store.ingest(event.raw);
                                                        }
                                                    }
                                                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                                }
                                                Err(_error) => {
                                                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                                }
                                            },
                                            Some(Ok(_)) => {}
                                            Some(Err(_error)) => {
                                                let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                                                if let Ok(mut inner) = inner_state.lock() {
                                                    inner.store.set_connection(ws_retry_status(false), false);
                                                }
                                                let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                                break;
                                            }
                                            None => {
                                                let _ = clear_cached_connect_info_after_ws_failure(&connect_cache);
                                                if let Ok(mut inner) = inner_state.lock() {
                                                    inner.store.set_connection(ws_retry_status(false), false);
                                                }
                                                let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(error) => {
                    if let Ok(mut inner) = inner_state.lock() {
                        inner
                            .store
                            .set_connection(api_retry_status(&url, &error), false);
                    }
                    let _ = emit_snapshot_from_arc(&app_for_task, &inner_state);
                }
            }

            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
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

fn api_retry_status(connect_api_url: &str, error: &str) -> String {
    if !is_http_connect_api_url(connect_api_url) || error.contains("接口地址必须") {
        retry_status("接口.未开启")
    } else if is_timeout_error(error) {
        retry_status("接口.请求超时")
    } else {
        retry_status("接口.解析异常")
    }
}

fn ws_retry_status(timed_out: bool) -> String {
    if timed_out {
        retry_status("连接.请求超时")
    } else {
        retry_status("连接.意外断开")
    }
}

fn retry_status(prefix: &str) -> String {
    format!("{prefix}, {RETRY_DELAY_SECONDS}秒后重试")
}

fn is_timeout_error(error: &str) -> bool {
    let lower = error.to_ascii_lowercase();
    error.contains("超时") || lower.contains("timeout") || lower.contains("timed out")
}

#[cfg(test)]
mod tests {
    use super::{api_retry_status, ws_retry_status};

    #[test]
    fn formats_api_retry_statuses_concisely() {
        assert_eq!(
            api_retry_status("", "接口地址必须是 http:// 或 https://"),
            "接口.未开启, 2秒后重试"
        );
        assert_eq!(
            api_retry_status("http://127.0.0.1:2333/connect", "连接接口请求超时"),
            "接口.请求超时, 2秒后重试"
        );
        assert_eq!(
            api_retry_status(
                "http://127.0.0.1:2333/connect",
                "连接接口返回 JSON 解析失败"
            ),
            "接口.解析异常, 2秒后重试"
        );
    }

    #[test]
    fn formats_ws_retry_statuses_concisely() {
        assert_eq!(ws_retry_status(true), "连接.请求超时, 2秒后重试");
        assert_eq!(ws_retry_status(false), "连接.意外断开, 2秒后重试");
    }
}
