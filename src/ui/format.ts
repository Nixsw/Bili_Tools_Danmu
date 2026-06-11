import type { GuardType } from "../core/types";

const GUARD_NICKNAME_COLORS: Record<GuardType, string> = {
  0: "#666666",
  1: "#F7A54C",
  2: "#E17AFF",
  3: "#00D1F1"
};

export function formatMmSs(timestampMs: number) {
  const date = new Date(timestampMs);
  return `${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function formatHhMmSs(timestampMs: number) {
  const date = new Date(timestampMs);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}`;
}

export function formatLevel(prefix: string, value: number) {
  return `${prefix}${value}`;
}

export function formatGuardLabel(guardType: GuardType) {
  switch (guardType) {
    case 1:
      return "总督";
    case 2:
      return "提督";
    case 3:
      return "舰长";
    default:
      return "无";
  }
}

export function getGuardNicknameColor(guardType: GuardType) {
  return GUARD_NICKNAME_COLORS[guardType];
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}
