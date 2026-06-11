import type {
  AppSnapshot,
  DanmuMessage,
  FanMedalColors,
  GuardType,
  IncomingDanmuRaw,
  PersonPanelSnapshot
} from "./types";

interface MessageStoreOptions {
  mainCapacity?: number;
  perUserCapacity?: number;
  mainViewportSize: number;
  personViewportSize: number;
}

interface ViewportSizePatch {
  mainViewportSize?: number;
  personViewportSize?: number;
}

const DEFAULT_MAIN_CAPACITY = 1000;
const DEFAULT_PER_USER_CAPACITY = 50;

export function normalizeIncomingDanmu(
  raw: IncomingDanmuRaw,
  messageId: number
): DanmuMessage {
  const contentLength = Array.from(raw.content ?? "").length;
  if (contentLength < 1 || contentLength > 40) {
    throw new Error("content length must be between 1 and 40 characters");
  }

  assertRange("userLevel", raw.userLevel, 0, 100);
  assertRange("fanLevel", raw.fanLevel, 0, 120);
  assertRange("guardType", raw.guardType, 0, 3);

  const timestampMs =
    typeof raw.timestampMs === "number"
      ? raw.timestampMs
      : typeof raw.timestamp === "number"
        ? raw.timestamp * 1000
        : Date.now();
  const fanMedalColors = normalizeFanMedalColors(raw.fanMedalColors);

  return {
    messageId,
    content: raw.content,
    uid: String(raw.uid),
    nickname: raw.nickname,
    userLevel: raw.userLevel,
    fanLevel: raw.fanLevel,
    guardType: raw.guardType as GuardType,
    ...(fanMedalColors ? { fanMedalColors } : {}),
    timestampMs,
    read: false
  };
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
}

function normalizeFanMedalColors(colors?: FanMedalColors) {
  if (!colors) {
    return undefined;
  }

  const normalized: FanMedalColors = {};
  for (const key of ["start", "end", "border", "text", "level"] as const) {
    const value = colors[key];
    if (typeof value === "string" && value.trim().length > 0) {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function createMessageStore(options: MessageStoreOptions) {
  let nextMessageId = 1;
  let mainStartIndex = 0;
  let selectedUid: string | null = null;
  let anchorMessageId: number | null = null;
  let personStartIndex = 0;
  let personManualViewport = false;
  let mainViewportSize = options.mainViewportSize;
  let personViewportSize = options.personViewportSize;
  let hoverFrozen = false;
  let connected = false;
  let connectionStatus = "未连接";

  const mainCapacity = options.mainCapacity ?? DEFAULT_MAIN_CAPACITY;
  const perUserCapacity = options.perUserCapacity ?? DEFAULT_PER_USER_CAPACITY;
  const messages: DanmuMessage[] = [];
  const byId = new Map<number, DanmuMessage>();
  const idsByUid = new Map<string, number[]>();

  const api = {
    ingest(raw: IncomingDanmuRaw) {
      const keepMainPinnedToBottom = isMainViewportAtBottom();
      const message = normalizeIncomingDanmu(raw, nextMessageId);
      nextMessageId += 1;
      messages.push(message);
      byId.set(message.messageId, message);

      const userIds = idsByUid.get(message.uid) ?? [];
      userIds.push(message.messageId);
      idsByUid.set(message.uid, userIds);

      trimMainCapacity();
      trimPerUserCapacity(message.uid);
      if (keepMainPinnedToBottom) {
        pinMainViewportToBottom();
      } else {
        clampMainViewportStart();
      }
      refreshPersonStartAfterDataChange(message.uid);

      return message;
    },

    ackMessage(messageId: number) {
      const message = byId.get(messageId);
      if (!message) {
        return;
      }

      message.read = true;
      while (messages[mainStartIndex]?.read) {
        mainStartIndex += 1;
      }
      clampMainViewportStart();
    },

    ackUserMessages(uid: string) {
      const userIds = idsByUid.get(String(uid)) ?? [];
      for (const messageId of userIds) {
        const message = byId.get(messageId);
        if (message) {
          message.read = true;
        }
      }

      for (const message of messages) {
        if (message.uid === String(uid)) {
          message.read = true;
        }
      }

      while (messages[mainStartIndex]?.read) {
        mainStartIndex += 1;
      }
      clampMainViewportStart();
    },

    selectUserAnchor(messageId: number) {
      const message = byId.get(messageId);
      if (!message) {
        return;
      }

      selectedUid = message.uid;
      anchorMessageId = message.messageId;
      hoverFrozen = false;
      personManualViewport = false;
      personStartIndex = computeAnchoredPersonStart();
    },

    setPersonPanelHover(value: boolean) {
      hoverFrozen = value;
      if (!hoverFrozen && !personManualViewport) {
        personStartIndex = computeAnchoredPersonStart();
      }
    },

    scrollMainViewport(delta: number) {
      mainStartIndex = scrollViewportStart(
        mainStartIndex,
        delta,
        messages.length,
        mainViewportSize
      );
    },

    scrollPersonViewport(delta: number) {
      const userIds = getSelectedUserIds();
      if (userIds.length === 0) {
        return;
      }
      personManualViewport = true;
      personStartIndex = scrollViewportStart(
        personStartIndex,
        delta,
        userIds.length,
        personViewportSize
      );
    },

    setViewportSizes(patch: ViewportSizePatch) {
      if (typeof patch.mainViewportSize === "number") {
        const keepMainPinnedToBottom = isMainViewportAtBottom();
        mainViewportSize = clampViewportSize(patch.mainViewportSize);
        if (keepMainPinnedToBottom) {
          pinMainViewportToBottom();
        } else {
          clampMainViewportStart();
        }
      }

      if (typeof patch.personViewportSize === "number") {
        personViewportSize = clampViewportSize(patch.personViewportSize);
        if (personManualViewport) {
          personStartIndex = clampViewportStart(
            personStartIndex,
            getSelectedUserIds().length,
            personViewportSize
          );
        } else {
          personStartIndex = computeAnchoredPersonStart();
        }
      }
    },

    setConnection(status: string, isConnected: boolean) {
      connectionStatus = status;
      connected = isConnected;
    },

    getMainVisible() {
      return messages.slice(
        mainStartIndex,
        mainStartIndex + mainViewportSize
      );
    },

    getPersonPanel(): PersonPanelSnapshot {
      const userIds = getSelectedUserIds();
      const visibleIds = userIds.slice(
        personStartIndex,
        personStartIndex + personViewportSize
      );
      const visibleMessages = visibleIds
        .map((id) => byId.get(id))
        .filter((message): message is DanmuMessage => Boolean(message));

      return {
        selectedUid,
        selectedNickname: getSelectedNickname(),
        anchorMessageId,
        hoverFrozen,
        visibleMessages,
        hiddenNewerCount: Math.max(
          0,
          userIds.length - (personStartIndex + personViewportSize)
        )
      };
    },

    getSnapshot(): AppSnapshot {
      return {
        connected,
        connectionStatus,
        mainVisible: api.getMainVisible(),
        personPanel: api.getPersonPanel()
      };
    }
  };

  function trimMainCapacity() {
    while (messages.length > mainCapacity) {
      const removed = messages.shift();
      if (!removed) {
        break;
      }
      if (removed.messageId !== anchorMessageId) {
        byId.delete(removed.messageId);
        removeMessageFromUserIndex(removed);
      }
      mainStartIndex = Math.max(0, mainStartIndex - 1);
    }
  }

  function removeMessageFromUserIndex(message: DanmuMessage) {
    const userIds = idsByUid.get(message.uid);
    if (!userIds) {
      return;
    }

    const removeIndex = userIds.indexOf(message.messageId);
    if (removeIndex < 0) {
      return;
    }

    userIds.splice(removeIndex, 1);
    if (message.uid === selectedUid && removeIndex < personStartIndex) {
      personStartIndex = Math.max(0, personStartIndex - 1);
    }
    if (message.uid === selectedUid) {
      personStartIndex = clampViewportStart(
        personStartIndex,
        userIds.length,
        personViewportSize
      );
    }
  }

  function trimPerUserCapacity(uid: string) {
    const userIds = idsByUid.get(uid);
    if (!userIds) {
      return;
    }

    while (userIds.length > perUserCapacity) {
      const removeIndex = getPerUserTrimIndex(uid, userIds);
      userIds.splice(removeIndex, 1);
      if (removeIndex < personStartIndex) {
        personStartIndex = Math.max(0, personStartIndex - 1);
      }
      personStartIndex = clampViewportStart(
        personStartIndex,
        userIds.length,
        personViewportSize
      );
    }
  }

  function getPerUserTrimIndex(uid: string, userIds: number[]) {
    if (selectedUid !== uid || !anchorMessageId) {
      return 0;
    }

    if (!userIds.includes(anchorMessageId)) {
      return 0;
    }

    const firstNonAnchorIndex = userIds.findIndex(
      (messageId) => messageId !== anchorMessageId
    );
    return firstNonAnchorIndex >= 0 ? firstNonAnchorIndex : 0;
  }

  function refreshPersonStartAfterDataChange(uid: string) {
    if (selectedUid !== uid || !anchorMessageId) {
      return;
    }

    if (!hoverFrozen && !personManualViewport) {
      personStartIndex = computeAnchoredPersonStart();
    }
  }

  function isMainViewportAtBottom() {
    return (
      messages.length > mainViewportSize &&
      mainStartIndex >= maxViewportStart(messages.length, mainViewportSize)
    );
  }

  function pinMainViewportToBottom() {
    mainStartIndex = maxViewportStart(messages.length, mainViewportSize);
  }

  function clampMainViewportStart() {
    mainStartIndex = clampViewportStart(
      mainStartIndex,
      messages.length,
      mainViewportSize
    );
  }

  function getSelectedUserIds() {
    return selectedUid ? (idsByUid.get(selectedUid) ?? []) : [];
  }

  function getSelectedNickname() {
    if (!selectedUid) {
      return null;
    }

    const userIds = idsByUid.get(selectedUid) ?? [];
    for (let index = userIds.length - 1; index >= 0; index -= 1) {
      const message = byId.get(userIds[index]);
      if (message) {
        return message.nickname;
      }
    }

    return null;
  }

  function computeAnchoredPersonStart() {
    const userIds = getSelectedUserIds();
    if (!anchorMessageId || userIds.length === 0) {
      return 0;
    }

    const anchorIndex = userIds.indexOf(anchorMessageId);
    if (anchorIndex < 0) {
      return Math.max(0, userIds.length - personViewportSize);
    }

    const latestStart = Math.max(0, userIds.length - personViewportSize);
    if (personViewportSize <= 1) {
      return Math.min(anchorIndex, latestStart);
    }

    if (anchorIndex === 0) {
      return 0;
    }

    if (anchorIndex > latestStart) {
      return latestStart;
    }

    return anchorIndex - 1;
  }

  function scrollViewportStart(
    startIndex: number,
    delta: number,
    itemCount: number,
    viewportSize: number
  ) {
    const maxStart = maxViewportStart(itemCount, viewportSize);
    const next = startIndex + Math.trunc(delta);
    return Math.min(maxStart, Math.max(0, next));
  }

  function clampViewportStart(
    startIndex: number,
    itemCount: number,
    viewportSize: number
  ) {
    return Math.min(maxViewportStart(itemCount, viewportSize), startIndex);
  }

  function maxViewportStart(itemCount: number, viewportSize: number) {
    return Math.max(0, itemCount - viewportSize);
  }

  function clampViewportSize(value: number) {
    return Math.min(100, Math.max(1, Math.trunc(value)));
  }

  return api;
}
