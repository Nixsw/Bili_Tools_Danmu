# DanmuTools

DanmuTools 是一个 Windows 10+ x64 桌面弹幕消息展示小工具。它使用 Tauri v2 + React，窗口为半透明置顶挂件，右侧显示主消息流，左侧显示按 UID 锚定的指定人最近发言。

## 当前进度

更新时间：2026-06-12

### 已完成

- Tauri v2 + React 桌面应用骨架，目标 Windows 10+ x64。
- 半透明、无边框、置顶主窗口，支持拖动、缩放、托盘菜单和配置持久化。
- 启动窗口默认隐藏，前端首帧渲染后再显示，避免启动时短暂白框闪烁。
- WebSocket 客户端、断线重连、JSON 占位字段解析和开发用 mock WebSocket 服务端。
- 主消息区按时间正序显示，新消息追加但不强制自动追最新。
- 主消息区支持鼠标滚轮查看历史和新消息；消息不足一屏时不允许空滚；消息超过一屏时保持列表铺满，不允许顶部或底部留白。
- 主消息点击后标记已读；只有当前视口顶部连续已读时才自动推进。
- 指定人区域默认显示，点击主消息后按 UID 展示该用户发言，并把被点击消息设为锚点。
- 指定人锚点保持可见；有新消息时锚点最高停在第二行；溢出时显示“还有 N 条更新”。
- 指定人区域支持滚轮查看该用户历史和更新，鼠标悬停时冻结自动视口移动。
- 主消息和指定人消息的右键菜单：复制弹幕、复制昵称/UID、全部已读此人、收起指定人区域。
- Bilibili 直播风格荣耀等级、粉丝等级、大航海图标和舰长/提督/总督昵称固定色。
- 主消息和指定人消息默认使用透明列表风格，去掉单条消息玻璃卡背景。
- 主消息 hover 只让昵称、内容、等级和粉丝等级轻微变亮。
- 指定人已读状态改为内容变淡；时间单独使用更灰、更浅的颜色，hover 时不过度点燃。

### 最近修复

- 修复主消息区手动滚动后，新消息进入时视口可能异常留白的问题。
- 修复窗口拉伸高度时，列表底部短暂空一块的问题。
- 修复指定人区域消息多时锚点乱跳、锚点被缓存裁剪后消失的问题。
- 修复左侧指定人区域已读后时间颜色被整行透明度一起压灰的问题。
- 修复启动时 WebView 初始白底先闪一下再显示正常 UI 的问题。

### 最近验证

- `npm test`：54 个测试通过。
- `npm run build`：通过。
- `cargo test --manifest-path src-tauri\Cargo.toml`：20 个测试通过。
- `npm run tauri:build`：Windows x64 release、NSIS、MSI 构建通过。
- `npm run package:portable`：便携 zip 生成通过。
- 桌面启动验证：release exe 可从隐藏启动进入可见主窗口，进程响应正常。

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
- 新消息追加到底部，但主消息区不会强制自动滚到最新。
- 主消息区和指定人区域都支持鼠标滚轮向上查看历史、向下查看更新。
- 消息不足一屏时不允许向上空滚；消息超过一屏时必须保持首条可贴顶、末条可贴底，列表视口不留白。
- 点击主消息会标记已读、变灰，并展开指定人区域。
- 只有主消息可见区顶部连续已读时，主视口才向下推进。
- 指定人区域按 UID 显示，点击的主消息作为锚点，锚点必须保持可见。
- 指定人区域鼠标悬停时冻结自动上移；新消息仍进入缓存，离开后按锚点规则补齐。

## 后续待定

- 接入真实直播间 JSON 路径后，只调整解析层。
- 继续根据实际 Bilibili 下发字段校准粉丝牌颜色、图标资源和昵称颜色。
- 可选功能暂未做：搜索、过滤、完整主题系统、点击穿透、开机自启。
