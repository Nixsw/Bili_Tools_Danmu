# DanmuTools

DanmuTools 是一个 Windows 10+ x64 桌面弹幕消息展示小工具。它使用 Tauri v2 + React，窗口为半透明置顶挂件，右侧显示主消息流，左侧显示按 UID 锚定的指定人最近发言。

## 运行要求

- Node.js 20+ 和 npm
- Rust/Cargo
- Windows WebView2 Runtime
- Visual Studio Build Tools C++ 工具链

当前项目目录已包含前端、Tauri 配置、Rust 源码、单元测试和开发用 mock WebSocket 服务端。

## 常用命令

```powershell
npm install
npm test
npm run build
npm run mock:ws
npm run tauri:dev
npm run tauri:build
npm run package:portable
```

mock 服务端默认监听：

```text
ws://127.0.0.1:17878
```

打包后主要产物位于：

- `src-tauri/target/release/danmu-tools.exe`
- `src-tauri/target/release/bundle/nsis/DanmuTools_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/DanmuTools_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/portable/DanmuTools_0.1.0_x64_portable.zip`

## 占位 JSON 格式

真实 JSON 路径后续可在解析层调整。当前占位字段：

```json
{
  "content": "弹幕内容",
  "uid": "100000001",
  "nickname": "观众昵称",
  "userLevel": 12,
  "fanLevel": 8,
  "guardType": 0,
  "timestampMs": 1700000000000
}
```

`timestampMs` 为 Unix 毫秒时间戳；如果只有 `timestamp`，会按 Unix 秒时间戳处理。
当前占位解析校验：`userLevel` 为 0-100，`fanLevel` 为 0-120，`guardType` 为 0-3。

## 核心交互

- 主消息区从第一行开始累计，窗口未满时底部留空。
- 新消息追加到底部，但主消息区不会自动滚到最新。
- 点击主消息会标记已读、变灰，并展开指定人区域。
- 只有主消息可见区顶部连续已读时，主视口才向下推进。
- 指定人区域按 UID 显示，点击的主消息作为锚点，锚点必须保持可见。
- 指定人区域鼠标悬停时冻结自动上移；新消息仍进入缓存，离开后按锚点规则补齐。
