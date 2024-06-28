const net = require('net');
const WebSocket = require('ws');
const http = require('http'); // 引入http模块
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);

// 定义常量
const VLESS_PATH = '/vless';
const ECHO_PATH = '/echo'

const uuid = 'YourGuid'.replace(/-/g, '');
const port = YourPort;

function onSocketError(err) {
    console.error(err);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 这里可以处理非WebSocket请求
    if (req.url === ECHO_PATH) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(req.url);
    } else {
        console.error("bad request:", req.url);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// 检查upgrade请求的路径
server.on('upgrade', (request, socket, head) => {
    socket.on('error', onSocketError);

    // 使用常量VLESS_PATH来检查路径
    if (request.url === VLESS_PATH) {
        console.log('upgrade');
        // 如果路径正确，继续WebSocket握手
        wss.handleUpgrade(request, socket, head, (ws) => {
            console.log('handleUpgrade...');
            wss.emit('connection', ws, request);
        });
    } else {
        console.error('path wrong:', request.url);
        // 否则，拒绝WebSocket升级请求
        socket.destroy();
    }
});

// 创建WebSocket服务器，传入noServer选项
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', ws => {
    console.log("on connection");

    ws.once('message', msg => {
        console.log("on message");
        const [VERSION] = msg;
        const id = msg.slice(1, 17);

        if (!id.every((v, i) => v === parseInt(uuid.substr(i * 2, 2), 16))) {
            console.error('Invalid client:', id.toString('hex'));
            ws.terminate();
            return;
        }

        let i = msg.slice(17, 18).readUInt8() + 19;
        const targetPort = msg.slice(i, i += 2).readUInt16BE(0);
        const ATYP = msg.slice(i, i += 1).readUInt8();
        const host = ATYP === 1 ? msg.slice(i, i += 4).join('.') : // IPV4
            (ATYP === 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) : // domain
                (ATYP === 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : '')); // IPV6

        console.log('conn:', host, targetPort);

        ws.send(new Uint8Array([VERSION, 0]));

        const duplex = WebSocket.createWebSocketStream(ws);

        net.connect({ host, port: targetPort }, function () {
            this.write(msg.slice(i));
            duplex.on('error', errcb('E1:')).pipe(this).on('error', errcb('E2:')).pipe(duplex);
        }).on('error', errcb('Conn-Err:', { host, port: targetPort }));
    }).on('error', errcb('EE:'));
});

server.listen(port, logcb('Server is listening on port', port));
