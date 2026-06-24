import { describe, expect, it } from "vitest";
import {
  formatConnectionStatusWithCountdown,
  formatTransientConnectionStatus,
  getConnectedToastDeadlineMs,
  getRetryDeadlineMs
} from "./connectionStatus";

describe("connection status countdown", () => {
  it("creates a retry deadline from a status message", () => {
    expect(getRetryDeadlineMs("接口.未开启, 2秒后重试", 1_000)).toBe(3_000);
  });

  it("updates concise retry statuses without appending error details", () => {
    const text = formatConnectionStatusWithCountdown(
      "接口.请求超时, 2秒后重试",
      3_000,
      2_100
    );

    expect(text).toBe("接口.请求超时, 1秒后重试");
  });

  it("leaves statuses without retry text unchanged", () => {
    expect(formatConnectionStatusWithCountdown("对接中...", null, 2_000)).toBe(
      "对接中..."
    );
  });

  it("creates a five second deadline for the connected toast", () => {
    expect(getConnectedToastDeadlineMs("已连接！", 1_000)).toBe(6_000);
    expect(getConnectedToastDeadlineMs("连接中...", 1_000)).toBeNull();
  });

  it("hides the connected toast after five seconds", () => {
    expect(
      formatTransientConnectionStatus("已连接！", null, 6_000, 5_999)
    ).toBe("已连接！");
    expect(
      formatTransientConnectionStatus("已连接！", null, 6_000, 6_000)
    ).toBe("");
  });
});
