import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X
} from "lucide-react";
import {
  getCurrentWindow,
  PhysicalPosition,
  PhysicalSize
} from "@tauri-apps/api/window";
import { createDanmuClient, type DisplayConfig } from "./api/client";
import type { AppSnapshot, DanmuMessage } from "./core/types";
import { formatHhMmSs, formatMmSs, getGuardNicknameColor } from "./ui/format";
import {
  getSplitLayout,
  isPersonPanelVisible,
  MAIN_READABLE_WIDTH,
  PERSON_PANEL_DEFAULT_WIDTH
} from "./ui/layout";
import {
  getFanMedalLevelClass,
  getFanMedalLabelClass,
  getFanMedalLayoutStyle,
  getFanMedalStyle,
  getGuardMedalIconUrl,
  getWealthMedalUrl
} from "./ui/biliBadges";
import { getPersonPanelResizePlan } from "./ui/panelWindow";
import { estimateViewportCapacity } from "./ui/viewportCapacity";
import {
  getMessageContextMenuLabels,
  shouldSuppressNativeContextMenu,
  type MessageContextMenuScope
} from "./ui/contextMenu";
import "./styles.css";

const initialSnapshot: AppSnapshot = {
  connected: false,
  connectionStatus: "启动中",
  mainVisible: [],
  personPanel: {
    selectedUid: null,
    selectedNickname: null,
    anchorMessageId: null,
    hoverFrozen: false,
    visibleMessages: [],
    hiddenNewerCount: 0
  }
};

interface MessageContextMenuState {
  x: number;
  y: number;
  message: DanmuMessage;
  scope: MessageContextMenuScope;
}

export default function App() {
  const client = useMemo(() => createDanmuClient(), []);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [config, setConfig] = useState<DisplayConfig>({
    websocketUrl: "ws://127.0.0.1:17878",
    opacity: 0.82,
    fontSize: 14,
    panelCollapsed: false
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const contentGridRef = useRef<HTMLElement>(null);
  const personListRef = useRef<HTMLDivElement>(null);
  const lastPersonViewportSizeRef = useRef<number | null>(null);
  const [contentWidth, setContentWidth] = useState(
    MAIN_READABLE_WIDTH + PERSON_PANEL_DEFAULT_WIDTH
  );
  const [manualPersonRatio, setManualPersonRatio] = useState<number | null>(
    null
  );
  const [splitDragging, setSplitDragging] = useState(false);
  const [messageContextMenu, setMessageContextMenu] =
    useState<MessageContextMenuState | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let disposeTrayReconnect: (() => void) | undefined;
    let disposeTrayDisconnect: (() => void) | undefined;
    let disposeTraySettings: (() => void) | undefined;
    client.getConfig().then(setConfig).catch(() => undefined);
    client.init(setSnapshot).then((unlisten) => {
      dispose = unlisten;
      void client.connect().catch(() => undefined);
    });
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      listen("tray_reconnect_requested", () => client.reconnect()).then((unlisten) => {
        disposeTrayReconnect = unlisten;
      });
      listen("tray_disconnect_requested", () => client.disconnect()).then((unlisten) => {
        disposeTrayDisconnect = unlisten;
      });
      listen("tray_settings_requested", () => setSettingsOpen(true)).then((unlisten) => {
        disposeTraySettings = unlisten;
      });
    }
    return () => {
      dispose?.();
      disposeTrayReconnect?.();
      disposeTrayDisconnect?.();
      disposeTraySettings?.();
    };
  }, [client]);

  useEffect(() => {
    if (!messageContextMenu) {
      return;
    }

    const close = () => setMessageContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [messageContextMenu]);

  useEffect(() => {
    const suppress = (event: MouseEvent) => {
      if (shouldSuppressNativeContextMenu("background")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", suppress, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", suppress, { capture: true });
    };
  }, []);

  const personVisible = isPersonPanelVisible(
    config.panelCollapsed,
    snapshot.personPanel.selectedUid
  );
  const splitLayout = useMemo(
    () =>
      getSplitLayout({
        totalWidth: contentWidth,
        personVisible,
        personRatio: manualPersonRatio
      }),
    [contentWidth, manualPersonRatio, personVisible]
  );
  const personMeasurementKey = snapshot.personPanel.visibleMessages
    .map((message) => message.messageId)
    .join(":");
  const personWindowVisibleRef = useRef(false);

  useEffect(() => {
    const element = contentGridRef.current;
    if (!element) {
      return;
    }

    let frame = 0;
    const syncWidth = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setContentWidth(Math.round(element.clientWidth));
      });
    };

    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (personVisible) {
      personWindowVisibleRef.current = true;
    } else if (config.panelCollapsed) {
      personWindowVisibleRef.current = false;
    }
  }, [config.panelCollapsed, personVisible]);

  useEffect(() => {
    if (!personVisible) {
      return;
    }

    const list = personListRef.current;
    if (!list) {
      return;
    }

    let frame = 0;
    const syncCapacity = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rows = Array.from(
          list.querySelectorAll<HTMLElement>(".person-row")
        );
        if (rows.length === 0) {
          return;
        }

        const style = window.getComputedStyle(list);
        const capacity = estimateViewportCapacity({
          containerHeight: list.clientHeight,
          rowHeights: rows.map((row) => row.getBoundingClientRect().height),
          gap: cssNumber(style.rowGap),
          paddingTop: cssNumber(style.paddingTop),
          paddingBottom: cssNumber(style.paddingBottom),
          max: 50
        });

        if (capacity === lastPersonViewportSizeRef.current) {
          return;
        }

        lastPersonViewportSizeRef.current = capacity;
        void client.setViewportSizes({ personViewportSize: capacity });
      });
    };

    syncCapacity();
    const observer = new ResizeObserver(syncCapacity);
    observer.observe(list);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    client,
    config.fontSize,
    personVisible,
    snapshot.personPanel.hiddenNewerCount,
    personMeasurementKey
  ]);

  const rootStyle = {
    "--glass-opacity": config.opacity.toString(),
    "--app-font-size": `${config.fontSize}px`,
    "--person-panel-width": `${splitLayout.personWidth}px`,
    "--main-panel-width": `${splitLayout.mainWidth}px`
  } as React.CSSProperties;

  const updateConfig = async (patch: Partial<DisplayConfig>) => {
    const next = await client.updateConfig(patch);
    setConfig(next);
  };

  const resizeWindowForPersonPanel = async (nextVisible: boolean) => {
    if (!isTauriRuntime()) {
      return;
    }

    const window = getCurrentWindow();
    const [position, size, scaleFactor] = await Promise.all([
      window.outerPosition(),
      window.innerSize(),
      window.scaleFactor()
    ]);
    const plan = getPersonPanelResizePlan({
      currentVisible: personWindowVisibleRef.current,
      nextVisible,
      x: position.x,
      width: size.width,
      height: size.height,
      scaleFactor
    });

    if (!plan) {
      return;
    }

    await window.setPosition(new PhysicalPosition(plan.x, position.y));
    await window.setSize(new PhysicalSize(plan.width, plan.height));
    personWindowVisibleRef.current = nextVisible;
  };

  const updatePersonPanelCollapsed = async (panelCollapsed: boolean) => {
    const nextVisible = !panelCollapsed;
    await resizeWindowForPersonPanel(nextVisible).catch(() => undefined);
    await updateConfig({ panelCollapsed });
  };

  const onMainMessageClick = async (message: DanmuMessage) => {
    setMessageContextMenu(null);
    await client.selectUserAnchor(message.messageId);
    await client.ackMessage(message.messageId);
    await resizeWindowForPersonPanel(true).catch(() => undefined);
    await updateConfig({ panelCollapsed: false });
  };

  const onPersonMessageClick = async (message: DanmuMessage) => {
    setMessageContextMenu(null);
    await client.ackMessage(message.messageId);
  };

  const openMessageContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    message: DanmuMessage,
    scope: MessageContextMenuScope
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMessageContextMenu({
      x: event.clientX,
      y: event.clientY,
      message,
      scope
    });
  };

  const copyFromContextMenu = async (text: string) => {
    await copyText(text).catch(() => undefined);
    setMessageContextMenu(null);
  };

  const ackUserFromContextMenu = async (uid: string) => {
    await client.ackUserMessages(uid);
    setMessageContextMenu(null);
  };

  const collapsePersonPanelFromContextMenu = async () => {
    setMessageContextMenu(null);
    await updatePersonPanelCollapsed(true);
  };

  const wheelToViewportDelta = (event: React.WheelEvent<HTMLElement>) => {
    if (event.deltaY === 0) {
      return 0;
    }
    event.preventDefault();
    return event.deltaY > 0 ? 1 : -1;
  };

  const onMainWheel = (event: React.WheelEvent<HTMLElement>) => {
    const delta = wheelToViewportDelta(event);
    if (delta !== 0) {
      void client.scrollMainViewport(delta);
    }
  };

  const onPersonWheel = (event: React.WheelEvent<HTMLElement>) => {
    const delta = wheelToViewportDelta(event);
    if (delta !== 0) {
      void client.scrollPersonViewport(delta);
    }
  };

  const startWindowDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (!isTauriRuntime() || event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button,input,textarea,select,a")) {
      return;
    }
    getCurrentWindow().startDragging().catch(() => undefined);
  };

  const updateManualSplit = (clientX: number) => {
    const grid = contentGridRef.current;
    if (!grid || !personVisible) {
      return;
    }

    const rect = grid.getBoundingClientRect();
    const width = Math.max(0, Math.round(rect.width));
    if (width <= 0) {
      return;
    }

    const desiredRatio = (clientX - rect.left) / width;
    const nextLayout = getSplitLayout({
      totalWidth: width,
      personVisible: true,
      personRatio: desiredRatio
    });
    setContentWidth(width);
    setManualPersonRatio(nextLayout.personWidth / width);
  };

  const onSplitterPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || !personVisible) {
      return;
    }

    event.preventDefault();
    setSplitDragging(true);
    updateManualSplit(event.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateManualSplit(moveEvent.clientX);
    };
    const onPointerUp = (upEvent: PointerEvent) => {
      updateManualSplit(upEvent.clientX);
      setSplitDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const suppressNativeContextMenu = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (shouldSuppressNativeContextMenu("background")) {
      event.preventDefault();
    }
  };

  return (
    <main
      className="app-shell"
      style={rootStyle}
      onContextMenu={suppressNativeContextMenu}
    >
      <header
        className="drag-bar"
        onMouseDown={startWindowDrag}
      >
        <div className="drag-title">
          <span>看弹幕工具</span>
          <span className="status-dot" data-state={snapshot.connected ? "on" : "off"} />
        </div>

        <div className="window-actions">
          <button
            className="icon-button"
            title={personVisible ? "收起指定人记录" : "展开指定人记录"}
            onClick={() => updatePersonPanelCollapsed(!config.panelCollapsed)}
          >
            {personVisible ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          <button
            className="icon-button"
            title="设置"
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <Settings size={15} />
          </button>
          <button
            className="icon-button"
            title="最小化"
            onClick={() => getCurrentWindow().minimize().catch(() => undefined)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="icon-button"
            title="关闭"
            onClick={() => getCurrentWindow().hide().catch(() => undefined)}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="settings-popover">
          <label>
            <span>WebSocket</span>
            <input
              value={config.websocketUrl}
              onChange={(event) => updateConfig({ websocketUrl: event.target.value })}
            />
          </label>
          <label>
            <span>透明度</span>
            <input
              type="range"
              min="0.45"
              max="0.98"
              step="0.01"
              value={config.opacity}
              onChange={(event) =>
                updateConfig({ opacity: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>字号</span>
            <input
              type="range"
              min="12"
              max="18"
              step="1"
              value={config.fontSize}
              onChange={(event) =>
                updateConfig({ fontSize: Number(event.target.value) })
              }
            />
          </label>
        </section>
      )}

      <section
        ref={contentGridRef}
        className={`content-grid ${personVisible ? "with-person" : ""} ${
          splitDragging ? "is-splitting" : ""
        }`}
      >
        <aside
          className="person-panel"
          data-visible={personVisible}
          onMouseEnter={() => client.setPersonPanelHover(true)}
          onMouseLeave={() => client.setPersonPanelHover(false)}
          onWheel={onPersonWheel}
        >
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                {snapshot.personPanel.selectedUid
                  ? `UID ${snapshot.personPanel.selectedUid}`
                  : "UID"}
              </span>
              <strong>{snapshot.personPanel.selectedNickname ?? "未选择"}</strong>
            </div>
            <button
              className="icon-button"
              title="收起"
              onClick={() => updatePersonPanelCollapsed(true)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="person-list" ref={personListRef}>
            {snapshot.personPanel.visibleMessages.map((message) => (
              <button
                className={`person-row ${message.read ? "is-read" : ""} ${
                  snapshot.personPanel.anchorMessageId === message.messageId
                    ? "is-anchor"
                    : ""
                }`}
                key={message.messageId}
                onClick={() => onPersonMessageClick(message)}
                onContextMenu={(event) =>
                  openMessageContextMenu(event, message, "person")
                }
              >
                <span className="time">{formatMmSs(message.timestampMs)}</span>
                <span className="person-content">{message.content}</span>
              </button>
            ))}
          </div>
          {snapshot.personPanel.hiddenNewerCount > 0 && (
            <div className="newer-tip">
              还有 {snapshot.personPanel.hiddenNewerCount} 条更新
            </div>
          )}
        </aside>

        {personVisible && (
          <div
            className="panel-splitter"
            role="separator"
            aria-label="调整两栏宽度"
            aria-orientation="vertical"
            title="拖动调整两栏宽度"
            onPointerDown={onSplitterPointerDown}
          />
        )}

        <section className="main-panel" onWheel={onMainWheel}>
          <div className="message-list">
            {snapshot.mainVisible.map((message) => (
              <button
                key={message.messageId}
                className={`message-card ${message.read ? "is-read" : ""}`}
                onClick={() => onMainMessageClick(message)}
                onContextMenu={(event) => openMessageContextMenu(event, message, "main")}
              >
                <span className="meta-line">
                  <WealthMedal level={message.userLevel} />
                  <FanMedal message={message} />
                  <strong
                    className="nickname"
                    style={{ color: getGuardNicknameColor(message.guardType) }}
                  >
                    {message.nickname}
                  </strong>
                  <span className="message-time">
                    {formatHhMmSs(message.timestampMs)}
                  </span>
                </span>
                <span className="content-line">{message.content}</span>
              </button>
            ))}
          </div>
        </section>
      </section>

      {messageContextMenu && (
        <div
          className="message-context-menu"
          style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {messageContextMenu.scope === "main" ? (
            <>
              <button onClick={() => copyFromContextMenu(messageContextMenu.message.content)}>
                {getMessageContextMenuLabels("main")[0]}
              </button>
              <button onClick={() => copyFromContextMenu(messageContextMenu.message.nickname)}>
                {getMessageContextMenuLabels("main")[1]}
              </button>
              <button onClick={() => copyFromContextMenu(messageContextMenu.message.uid)}>
                {getMessageContextMenuLabels("main")[2]}
              </button>
              <button onClick={() => ackUserFromContextMenu(messageContextMenu.message.uid)}>
                {getMessageContextMenuLabels("main")[3]}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => copyFromContextMenu(messageContextMenu.message.content)}>
                {getMessageContextMenuLabels("person")[0]}
              </button>
              <button onClick={() => ackUserFromContextMenu(messageContextMenu.message.uid)}>
                {getMessageContextMenuLabels("person")[1]}
              </button>
              <button onClick={collapsePersonPanelFromContextMenu}>
                {getMessageContextMenuLabels("person")[2]}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function cssNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function WealthMedal({ level }: { level: number }) {
  const src = getWealthMedalUrl(level);
  if (!src) {
    return null;
  }

  return (
    <span className="wealth-medal-ctnr" title="这是 TA 的荣耀等级勋章">
      <img
        className="wealth-medal"
        src={src}
        alt={`UL${Math.trunc(level)}`}
        draggable={false}
      />
    </span>
  );
}

function FanMedal({ message }: { message: DanmuMessage }) {
  if (message.fanLevel <= 0) {
    return null;
  }

  const levelClass = getFanMedalLevelClass(message.fanLevel);
  const className = ["fans-medal-level", levelClass]
    .filter(Boolean)
    .join(" ");
  const guardIconUrl = getGuardMedalIconUrl(message.guardType);

  return (
    <span
      className="fans-medal-item"
      title="这是 TA 的粉丝勋章"
      style={
        {
          ...getFanMedalStyle(message.fanLevel, message.fanMedalColors),
          ...getFanMedalLayoutStyle(message.fanLevel, message.guardType)
        } as React.CSSProperties
      }
    >
      <span
        className={getFanMedalLabelClass(message.guardType)}
        aria-hidden="true"
      >
        {guardIconUrl && (
          <i
            className="medal-deco medal-guard"
            style={{ backgroundImage: `url(${guardIconUrl})` }}
          />
        )}
        <span className="fans-medal-content" />
      </span>
      <span className={className}>
        <span className="fans-medal-level-font">{message.fanLevel}</span>
      </span>
    </span>
  );
}
