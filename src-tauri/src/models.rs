use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomingDanmuRaw {
    pub content: String,
    pub uid: Value,
    pub nickname: String,
    pub user_level: u8,
    pub fan_level: u8,
    pub guard_type: u8,
    pub timestamp_ms: Option<i64>,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DanmuMessage {
    pub message_id: u64,
    pub content: String,
    pub uid: String,
    pub nickname: String,
    pub user_level: u8,
    pub fan_level: u8,
    pub guard_type: u8,
    pub timestamp_ms: i64,
    pub read: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonPanelSnapshot {
    pub selected_uid: Option<String>,
    pub selected_nickname: Option<String>,
    pub anchor_message_id: Option<u64>,
    pub hover_frozen: bool,
    pub visible_messages: Vec<DanmuMessage>,
    pub hidden_newer_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSnapshot {
    pub connected: bool,
    pub connection_status: String,
    pub main_visible: Vec<DanmuMessage>,
    pub person_panel: PersonPanelSnapshot,
}

pub fn normalize_incoming(raw: IncomingDanmuRaw, message_id: u64) -> Result<DanmuMessage, String> {
    let content_len = raw.content.chars().count();
    if !(1..=40).contains(&content_len) {
        return Err("content length must be between 1 and 40 characters".to_string());
    }
    if raw.user_level > 100 {
        return Err("userLevel must be between 0 and 100".to_string());
    }
    if raw.fan_level > 120 {
        return Err("fanLevel must be between 0 and 120".to_string());
    }
    if raw.guard_type > 3 {
        return Err("guardType must be between 0 and 3".to_string());
    }

    let uid = match raw.uid {
        Value::String(value) => value,
        Value::Number(value) => value.to_string(),
        _ => return Err("uid must be a string or number".to_string()),
    };

    let timestamp_ms = raw
        .timestamp_ms
        .or_else(|| raw.timestamp.map(|seconds| seconds * 1000))
        .unwrap_or_else(now_ms);

    Ok(DanmuMessage {
        message_id,
        content: raw.content,
        uid,
        nickname: raw.nickname,
        user_level: raw.user_level,
        fan_level: raw.fan_level,
        guard_type: raw.guard_type,
        timestamp_ms,
        read: false,
    })
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn raw() -> IncomingDanmuRaw {
        IncomingDanmuRaw {
            content: "你好".to_string(),
            uid: json!(100000001u64),
            nickname: "观众A".to_string(),
            user_level: 12,
            fan_level: 8,
            guard_type: 0,
            timestamp_ms: Some(1_700_000_000_123),
            timestamp: None,
        }
    }

    #[test]
    fn accepts_official_fan_level_upper_bound() {
        let mut raw = raw();
        raw.fan_level = 120;

        let message = normalize_incoming(raw, 1).expect("fan level 120 should be accepted");

        assert_eq!(message.fan_level, 120);
    }

    #[test]
    fn rejects_fan_level_above_official_range() {
        let mut raw = raw();
        raw.fan_level = 121;

        let error = normalize_incoming(raw, 1).expect_err("fan level 121 should be rejected");

        assert!(error.contains("fanLevel"));
        assert!(error.contains("120"));
    }
}
