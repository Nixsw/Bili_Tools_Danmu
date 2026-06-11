export type GuardType = 0 | 1 | 2 | 3;

export interface FanMedalColors {
  start?: string;
  end?: string;
  border?: string;
  text?: string;
  level?: string;
}

export interface IncomingDanmuRaw {
  content: string;
  uid: number | string;
  nickname: string;
  userLevel: number;
  fanLevel: number;
  guardType: GuardType | number;
  fanMedalColors?: FanMedalColors;
  timestampMs?: number;
  timestamp?: number;
}

export interface DanmuMessage {
  messageId: number;
  content: string;
  uid: string;
  nickname: string;
  userLevel: number;
  fanLevel: number;
  guardType: GuardType;
  fanMedalColors?: FanMedalColors;
  timestampMs: number;
  read: boolean;
}

export interface PersonPanelSnapshot {
  selectedUid: string | null;
  selectedNickname: string | null;
  anchorMessageId: number | null;
  hoverFrozen: boolean;
  visibleMessages: DanmuMessage[];
  hiddenNewerCount: number;
}

export interface AppSnapshot {
  connected: boolean;
  connectionStatus: string;
  mainVisible: DanmuMessage[];
  personPanel: PersonPanelSnapshot;
}
