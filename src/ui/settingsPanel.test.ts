import { describe, expect, it } from "vitest";
import { createConnectApiUrlPatch } from "./settingsPanel";

describe("settings panel actions", () => {
  it("creates a connect api url patch from the edited draft", () => {
    expect(
      createConnectApiUrlPatch(
        "  http://127.0.0.1:2333/api/v1/external/danmu-reader/connect?token=abc  "
      )
    ).toEqual({
      connectApiUrl:
        "http://127.0.0.1:2333/api/v1/external/danmu-reader/connect?token=abc"
    });
  });
});
