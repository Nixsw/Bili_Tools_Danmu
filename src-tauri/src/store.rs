use crate::models::{
    normalize_incoming, AppSnapshot, DanmuMessage, IncomingDanmuRaw, PersonPanelSnapshot,
};
use std::collections::{HashMap, VecDeque};

pub struct MessageStore {
    next_message_id: u64,
    main_capacity: usize,
    per_user_capacity: usize,
    main_viewport_size: usize,
    person_viewport_size: usize,
    main_start_index: usize,
    selected_uid: Option<String>,
    anchor_message_id: Option<u64>,
    person_start_index: usize,
    person_manual_viewport: bool,
    hover_frozen: bool,
    connected: bool,
    connection_status: String,
    messages: VecDeque<DanmuMessage>,
    by_id: HashMap<u64, DanmuMessage>,
    ids_by_uid: HashMap<String, VecDeque<u64>>,
}

impl MessageStore {
    pub fn new(main_capacity: usize, per_user_capacity: usize) -> Self {
        Self {
            next_message_id: 1,
            main_capacity,
            per_user_capacity,
            main_viewport_size: 22,
            person_viewport_size: 14,
            main_start_index: 0,
            selected_uid: None,
            anchor_message_id: None,
            person_start_index: 0,
            person_manual_viewport: false,
            hover_frozen: false,
            connected: false,
            connection_status: "未连接".to_string(),
            messages: VecDeque::new(),
            by_id: HashMap::new(),
            ids_by_uid: HashMap::new(),
        }
    }

    pub fn ingest(&mut self, raw: IncomingDanmuRaw) -> Result<DanmuMessage, String> {
        let keep_main_pinned_to_bottom = self.is_main_viewport_at_bottom();
        let message = normalize_incoming(raw, self.next_message_id)?;
        self.next_message_id += 1;
        self.messages.push_back(message.clone());
        self.by_id.insert(message.message_id, message.clone());
        self.ids_by_uid
            .entry(message.uid.clone())
            .or_default()
            .push_back(message.message_id);

        self.trim_main_capacity();
        self.trim_user_capacity(&message.uid);
        if keep_main_pinned_to_bottom {
            self.pin_main_viewport_to_bottom();
        } else {
            self.clamp_main_viewport_start();
        }
        self.refresh_person_start_after_data_change(&message.uid);
        Ok(message)
    }

    pub fn ack_message(&mut self, message_id: u64) {
        if let Some(message) = self.by_id.get_mut(&message_id) {
            message.read = true;
        }
        for message in self.messages.iter_mut() {
            if message.message_id == message_id {
                message.read = true;
                break;
            }
        }

        while self
            .messages
            .get(self.main_start_index)
            .map(|message| message.read)
            .unwrap_or(false)
        {
            self.main_start_index += 1;
        }
        self.clamp_main_viewport_start();
    }

    pub fn ack_user_messages(&mut self, uid: &str) {
        if let Some(user_ids) = self.ids_by_uid.get(uid) {
            for message_id in user_ids {
                if let Some(message) = self.by_id.get_mut(message_id) {
                    message.read = true;
                }
            }
        }

        for message in self.messages.iter_mut() {
            if message.uid == uid {
                message.read = true;
            }
        }

        while self
            .messages
            .get(self.main_start_index)
            .map(|message| message.read)
            .unwrap_or(false)
        {
            self.main_start_index += 1;
        }
        self.clamp_main_viewport_start();
    }

    pub fn select_user_anchor(&mut self, message_id: u64) {
        let Some(message) = self.by_id.get(&message_id) else {
            return;
        };
        self.selected_uid = Some(message.uid.clone());
        self.anchor_message_id = Some(message_id);
        self.hover_frozen = false;
        self.person_manual_viewport = false;
        self.person_start_index = self.compute_anchored_person_start();
    }

    pub fn set_person_panel_hover(&mut self, value: bool) {
        self.hover_frozen = value;
        if !value && !self.person_manual_viewport {
            self.person_start_index = self.compute_anchored_person_start();
        }
    }

    pub fn scroll_main_viewport(&mut self, delta: isize) {
        self.main_start_index = scroll_viewport_start(
            self.main_start_index,
            delta,
            self.messages.len(),
            self.main_viewport_size,
        );
    }

    pub fn scroll_person_viewport(&mut self, delta: isize) {
        let user_count = self.selected_user_ids().len();
        if user_count == 0 {
            return;
        }
        self.person_manual_viewport = true;
        self.person_start_index = scroll_viewport_start(
            self.person_start_index,
            delta,
            user_count,
            self.person_viewport_size,
        );
    }

    pub fn set_viewport_sizes(
        &mut self,
        main_viewport_size: Option<usize>,
        person_viewport_size: Option<usize>,
    ) {
        if let Some(value) = main_viewport_size {
            let keep_main_pinned_to_bottom = self.is_main_viewport_at_bottom();
            self.main_viewport_size = clamp_viewport_size(value);
            if keep_main_pinned_to_bottom {
                self.pin_main_viewport_to_bottom();
            } else {
                self.clamp_main_viewport_start();
            }
        }

        if let Some(value) = person_viewport_size {
            self.person_viewport_size = clamp_viewport_size(value);
            if self.person_manual_viewport {
                self.person_start_index = clamp_viewport_start(
                    self.person_start_index,
                    self.selected_user_ids().len(),
                    self.person_viewport_size,
                );
            } else {
                self.person_start_index = self.compute_anchored_person_start();
            }
        }
    }

    pub fn set_connection(&mut self, status: impl Into<String>, connected: bool) {
        self.connection_status = status.into();
        self.connected = connected;
    }

    pub fn snapshot(&self) -> AppSnapshot {
        AppSnapshot {
            connected: self.connected,
            connection_status: self.connection_status.clone(),
            main_visible: self.main_visible(),
            person_panel: self.person_panel(),
        }
    }

    fn main_visible(&self) -> Vec<DanmuMessage> {
        self.messages
            .iter()
            .skip(self.main_start_index)
            .take(self.main_viewport_size)
            .cloned()
            .collect()
    }

    fn person_panel(&self) -> PersonPanelSnapshot {
        let user_ids = self.selected_user_ids();
        let visible_messages = user_ids
            .iter()
            .skip(self.person_start_index)
            .take(self.person_viewport_size)
            .filter_map(|id| self.by_id.get(id))
            .cloned()
            .collect::<Vec<_>>();

        PersonPanelSnapshot {
            selected_uid: self.selected_uid.clone(),
            selected_nickname: self.selected_nickname(),
            anchor_message_id: self.anchor_message_id,
            hover_frozen: self.hover_frozen,
            visible_messages,
            hidden_newer_count: user_ids
                .len()
                .saturating_sub(self.person_start_index + self.person_viewport_size),
        }
    }

    fn trim_main_capacity(&mut self) {
        while self.messages.len() > self.main_capacity {
            if let Some(removed) = self.messages.pop_front() {
                if Some(removed.message_id) != self.anchor_message_id {
                    self.by_id.remove(&removed.message_id);
                    self.remove_message_from_user_index(&removed);
                }
                self.main_start_index = self.main_start_index.saturating_sub(1);
            }
        }
    }

    fn remove_message_from_user_index(&mut self, message: &DanmuMessage) {
        let is_selected_uid = self.selected_uid.as_deref() == Some(message.uid.as_str());
        let Some(user_ids) = self.ids_by_uid.get_mut(&message.uid) else {
            return;
        };
        let Some(remove_index) = user_ids.iter().position(|id| *id == message.message_id) else {
            return;
        };

        user_ids.remove(remove_index);
        if is_selected_uid && remove_index < self.person_start_index {
            self.person_start_index = self.person_start_index.saturating_sub(1);
        }
        if is_selected_uid {
            self.person_start_index = clamp_viewport_start(
                self.person_start_index,
                user_ids.len(),
                self.person_viewport_size,
            );
        }
    }

    fn trim_user_capacity(&mut self, uid: &str) {
        let preserved_anchor_id = if self.selected_uid.as_deref() == Some(uid) {
            self.anchor_message_id
        } else {
            None
        };
        let Some(user_ids) = self.ids_by_uid.get_mut(uid) else {
            return;
        };
        while user_ids.len() > self.per_user_capacity {
            let remove_index = preserved_anchor_id
                .filter(|anchor_id| user_ids.iter().any(|id| id == anchor_id))
                .and_then(|anchor_id| user_ids.iter().position(|id| *id != anchor_id))
                .unwrap_or(0);

            user_ids.remove(remove_index);
            if remove_index < self.person_start_index {
                self.person_start_index = self.person_start_index.saturating_sub(1);
            }
            self.person_start_index = clamp_viewport_start(
                self.person_start_index,
                user_ids.len(),
                self.person_viewport_size,
            );
        }
    }

    fn refresh_person_start_after_data_change(&mut self, uid: &str) {
        if self.selected_uid.as_deref() != Some(uid) || self.anchor_message_id.is_none() {
            return;
        }
        if !self.hover_frozen && !self.person_manual_viewport {
            self.person_start_index = self.compute_anchored_person_start();
        }
    }

    fn is_main_viewport_at_bottom(&self) -> bool {
        self.messages.len() > self.main_viewport_size
            && self.main_start_index
                >= max_viewport_start(self.messages.len(), self.main_viewport_size)
    }

    fn pin_main_viewport_to_bottom(&mut self) {
        self.main_start_index = max_viewport_start(self.messages.len(), self.main_viewport_size);
    }

    fn clamp_main_viewport_start(&mut self) {
        self.main_start_index = clamp_viewport_start(
            self.main_start_index,
            self.messages.len(),
            self.main_viewport_size,
        );
    }

    fn selected_user_ids(&self) -> Vec<u64> {
        self.selected_uid
            .as_ref()
            .and_then(|uid| self.ids_by_uid.get(uid))
            .map(|ids| ids.iter().copied().collect())
            .unwrap_or_default()
    }

    fn selected_nickname(&self) -> Option<String> {
        let selected_uid = self.selected_uid.as_ref()?;
        let user_ids = self.ids_by_uid.get(selected_uid)?;
        user_ids
            .iter()
            .rev()
            .find_map(|id| self.by_id.get(id))
            .map(|message| message.nickname.clone())
    }

    fn compute_anchored_person_start(&self) -> usize {
        let user_ids = self.selected_user_ids();
        let Some(anchor_id) = self.anchor_message_id else {
            return 0;
        };
        if user_ids.is_empty() {
            return 0;
        }

        let Some(anchor_index) = user_ids.iter().position(|id| *id == anchor_id) else {
            return user_ids.len().saturating_sub(self.person_viewport_size);
        };

        let latest_start = user_ids.len().saturating_sub(self.person_viewport_size);
        if self.person_viewport_size <= 1 {
            return anchor_index.min(latest_start);
        }

        if anchor_index == 0 {
            return 0;
        }

        if anchor_index > latest_start {
            return latest_start;
        }

        anchor_index.saturating_sub(1)
    }
}

fn scroll_viewport_start(
    start_index: usize,
    delta: isize,
    item_count: usize,
    viewport_size: usize,
) -> usize {
    let max_start = max_viewport_start(item_count, viewport_size);
    let next = if delta >= 0 {
        start_index.saturating_add(delta as usize)
    } else {
        start_index.saturating_sub(delta.unsigned_abs())
    };
    next.min(max_start)
}

fn clamp_viewport_start(start_index: usize, item_count: usize, viewport_size: usize) -> usize {
    start_index.min(max_viewport_start(item_count, viewport_size))
}

fn max_viewport_start(item_count: usize, viewport_size: usize) -> usize {
    item_count.saturating_sub(viewport_size)
}

fn clamp_viewport_size(value: usize) -> usize {
    value.clamp(1, 100)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn raw(content: &str, uid: u64, timestamp_ms: i64) -> IncomingDanmuRaw {
        IncomingDanmuRaw {
            content: content.to_string(),
            uid: json!(uid),
            nickname: "观众".to_string(),
            user_level: 12,
            fan_level: 8,
            guard_type: 0,
            timestamp_ms: Some(timestamp_ms),
            timestamp: None,
        }
    }

    #[test]
    fn main_viewport_does_not_auto_scroll_on_overflow() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }
        let snapshot = store.snapshot();
        let visible = snapshot
            .main_visible
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        assert_eq!(visible, ["A", "B", "C", "D", "E"]);
    }

    #[test]
    fn main_viewport_advances_only_after_top_messages_are_read() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }
        store.ack_message(2);
        assert_eq!(store.snapshot().main_visible[0].content, "A");
        store.ack_message(1);
        let snapshot = store.snapshot();
        let visible = snapshot
            .main_visible
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        assert_eq!(visible, ["C", "D", "E", "F", "G"]);
    }

    #[test]
    fn ack_user_messages_marks_all_cached_messages_from_that_uid() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        store.ingest(raw("A", 1, 1)).unwrap();
        store.ingest(raw("B", 2, 2)).unwrap();
        store.ingest(raw("C", 1, 3)).unwrap();
        store.ingest(raw("D", 1, 4)).unwrap();
        store.ingest(raw("E", 2, 5)).unwrap();

        store.ack_user_messages("1");

        assert_eq!(
            store
                .snapshot()
                .main_visible
                .iter()
                .map(|message| format!("{}:{}", message.content, message.read))
                .collect::<Vec<_>>(),
            ["A:true", "B:false", "C:true", "D:true", "E:false"]
        );
    }

    #[test]
    fn main_viewport_stays_full_when_acknowledgements_advance_near_the_end() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }

        store.ack_message(1);
        store.ack_message(2);
        store.ack_message(3);

        assert_eq!(main_contents(&store), ["C", "D", "E", "F", "G"]);
    }

    #[test]
    fn main_viewport_scrolls_history_and_newer_without_auto_following() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G", "H"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }

        store.scroll_main_viewport(2);
        assert_eq!(main_contents(&store), ["C", "D", "E", "F", "G"]);

        store.scroll_main_viewport(-1);
        assert_eq!(main_contents(&store), ["B", "C", "D", "E", "F"]);

        store.ingest(raw("I", 1, 1)).unwrap();
        assert_eq!(main_contents(&store), ["B", "C", "D", "E", "F"]);

        store.scroll_main_viewport(99);
        assert_eq!(main_contents(&store), ["E", "F", "G", "H", "I"]);
    }

    #[test]
    fn main_viewport_keeps_bottom_pinned_when_new_message_arrives_at_bottom() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }

        store.scroll_main_viewport(99);
        assert_eq!(main_contents(&store), ["C", "D", "E", "F", "G"]);

        store.ingest(raw("H", 1, 1)).unwrap();
        assert_eq!(main_contents(&store), ["D", "E", "F", "G", "H"]);
    }

    #[test]
    fn main_viewport_keeps_bottom_pinned_when_viewport_shrinks_at_bottom() {
        let mut store = MessageStore::new(1000, 50);
        store.main_viewport_size = 5;
        for content in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] {
            store.ingest(raw(content, 1, 1)).unwrap();
        }

        store.scroll_main_viewport(99);
        assert_eq!(main_contents(&store), ["F", "G", "H", "I", "J"]);

        store.set_viewport_sizes(Some(3), None);
        assert_eq!(main_contents(&store), ["H", "I", "J"]);
    }

    #[test]
    fn person_anchor_stops_at_second_row_and_counts_hidden_newer() {
        let mut store = MessageStore::new(1000, 50);
        store.person_viewport_size = 5;
        for i in 1..=8 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }
        store.select_user_anchor(3);
        let panel = store.snapshot().person_panel;
        assert_eq!(panel.selected_nickname.as_deref(), Some("观众"));
        let visible = panel
            .visible_messages
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        assert_eq!(visible, ["M2", "M3", "M4", "M5", "M6"]);
        assert_eq!(panel.hidden_newer_count, 2);
    }

    #[test]
    fn person_anchor_stays_on_second_row_instead_of_bouncing_through_first_row() {
        let mut store = MessageStore::new(1000, 50);
        store.person_viewport_size = 5;
        for i in 1..=5 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        store.select_user_anchor(3);
        store.ingest(raw("M6", 42, 6)).unwrap();
        assert_eq!(person_contents(&store), ["M2", "M3", "M4", "M5", "M6"]);

        store.ingest(raw("M7", 42, 7)).unwrap();
        let panel = store.snapshot().person_panel;
        let visible = panel
            .visible_messages
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        let anchor_row = panel
            .visible_messages
            .iter()
            .position(|message| Some(message.message_id) == panel.anchor_message_id);

        assert_eq!(visible, ["M2", "M3", "M4", "M5", "M6"]);
        assert_eq!(anchor_row, Some(1));
        assert_eq!(panel.hidden_newer_count, 1);
    }

    #[test]
    fn person_anchor_is_preserved_when_trimming_per_user_message_cache() {
        let mut store = MessageStore::new(1000, 5);
        store.person_viewport_size = 5;
        for i in 1..=5 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        store.select_user_anchor(3);
        for i in 6..=8 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        let panel = store.snapshot().person_panel;
        let visible = panel
            .visible_messages
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        let anchor_visible = panel
            .visible_messages
            .iter()
            .any(|message| Some(message.message_id) == panel.anchor_message_id);

        assert!(anchor_visible);
        assert_eq!(visible, ["M3", "M5", "M6", "M7", "M8"]);
    }

    #[test]
    fn person_anchor_is_preserved_when_trimming_main_message_cache() {
        let mut store = MessageStore::new(5, 10);
        store.main_viewport_size = 5;
        store.person_viewport_size = 5;
        for i in 1..=5 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        store.select_user_anchor(3);
        for i in 6..=8 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        let panel = store.snapshot().person_panel;
        let visible = panel
            .visible_messages
            .iter()
            .map(|message| message.content.clone())
            .collect::<Vec<_>>();
        let anchor_visible = panel
            .visible_messages
            .iter()
            .any(|message| Some(message.message_id) == panel.anchor_message_id);

        assert!(anchor_visible);
        assert_eq!(visible, ["M3", "M4", "M5", "M6", "M7"]);
        assert_eq!(panel.hidden_newer_count, 1);
    }

    #[test]
    fn person_viewport_scrolls_history_and_newer() {
        let mut store = MessageStore::new(1000, 50);
        store.person_viewport_size = 5;
        for i in 1..=9 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        store.select_user_anchor(4);
        assert_eq!(person_contents(&store), ["M3", "M4", "M5", "M6", "M7"]);
        assert_eq!(store.snapshot().person_panel.hidden_newer_count, 2);

        store.scroll_person_viewport(-2);
        assert_eq!(person_contents(&store), ["M1", "M2", "M3", "M4", "M5"]);
        assert_eq!(store.snapshot().person_panel.hidden_newer_count, 4);

        store.set_person_panel_hover(true);
        store.scroll_person_viewport(99);
        assert_eq!(person_contents(&store), ["M5", "M6", "M7", "M8", "M9"]);
        assert_eq!(store.snapshot().person_panel.hidden_newer_count, 0);

        store.set_person_panel_hover(false);
        store.ingest(raw("M10", 42, 10)).unwrap();
        assert_eq!(person_contents(&store), ["M5", "M6", "M7", "M8", "M9"]);
        assert_eq!(store.snapshot().person_panel.hidden_newer_count, 1);
    }

    #[test]
    fn person_viewport_size_updates_to_fill_taller_panel() {
        let mut store = MessageStore::new(1000, 50);
        store.person_viewport_size = 5;
        for i in 1..=9 {
            store.ingest(raw(&format!("M{i}"), 42, i)).unwrap();
        }

        store.select_user_anchor(4);
        assert_eq!(person_contents(&store), ["M3", "M4", "M5", "M6", "M7"]);

        store.set_viewport_sizes(None, Some(8));

        assert_eq!(
            person_contents(&store),
            ["M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"]
        );
        assert_eq!(store.snapshot().person_panel.hidden_newer_count, 0);
    }

    fn main_contents(store: &MessageStore) -> Vec<String> {
        store
            .snapshot()
            .main_visible
            .iter()
            .map(|message| message.content.clone())
            .collect()
    }

    fn person_contents(store: &MessageStore) -> Vec<String> {
        store
            .snapshot()
            .person_panel
            .visible_messages
            .iter()
            .map(|message| message.content.clone())
            .collect()
    }
}
