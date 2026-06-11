import { WebSocketServer } from "ws";

const port = Number(process.env.DANMUTOOLS_MOCK_PORT ?? 17878);
const server = new WebSocketServer({ port });
const names = [
  ["100000001", "南桥"],
  ["100000002", "阿晴"],
  ["100000003", "Kira"],
  ["100000004", "月见"],
  ["100000005", "山海"],
  ["100000006", "Dora"]
] as const;
const contents = [
  "主播这波细节拉满",
  "这里能再看一次吗",
  "舰长路过打个卡",
  "这个配置我记一下",
  "弹幕小窗看起来很稳",
  "UID追踪这个设计好用",
  "刚刚那条别滚走",
  "左侧锚点逻辑很关键"
];

let index = 0;

server.on("connection", (socket) => {
  socket.send(JSON.stringify(makeMessage()));
});

setInterval(() => {
  const payload = JSON.stringify(makeMessage());
  for (const client of server.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}, 950);

console.log(`DanmuTools mock WebSocket listening on ws://127.0.0.1:${port}`);

function makeMessage() {
  const [uid, nickname] = names[index % names.length];
  const message = {
    content: contents[index % contents.length],
    uid,
    nickname,
    userLevel: (index * 7) % 101,
    fanLevel: (index * 5) % 121,
    guardType: index % 4,
    timestampMs: Date.now()
  };
  index += 1;
  return message;
}
