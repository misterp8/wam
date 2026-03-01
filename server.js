const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 加入 CORS 與連線設定，確保在 Render 的環境下 Socket.io 不會被阻擋
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 設定靜態資源目錄
app.use(express.static(path.join(__dirname, 'public')));

// 基礎路由：根目錄直接導向學生端
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// 便捷路由：加上 /teacher 即可進入老師端
app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// 遊戲狀態儲存：記錄所有連線的玩家
let players = {}; 

io.on('connection', (socket) => {
    console.log(`[連線] 裝置已連線: ${socket.id}`);

    // [老師端] 請求當前玩家名單
    socket.on('teacher:getPlayers', () => {
        socket.emit('teacher:updatePlayers', Object.values(players));
    });

    // [學生端] 處理自訂介面登入
    socket.on('student:login', (name) => {
        players[socket.id] = {
            id: socket.id,
            name: name,
            status: 'LOBBY' // 預設狀態：大廳等候中
        };
        console.log(`[登入] 學生 ${name} 進入大廳 (${socket.id})`);
        
        // 回傳登入成功給該學生
        socket.emit('student:loginSuccess', players[socket.id]);
        
        // 廣播給老師端更新畫面
        io.emit('teacher:updatePlayers', Object.values(players));
    });

    // 處理斷線
    socket.on('disconnect', () => {
        if (players[socket.id]) {
            console.log(`[離線] 學生 ${players[socket.id].name} 已離開`);
            delete players[socket.id];
            // 更新名單給老師
            io.emit('teacher:updatePlayers', Object.values(players));
        }
    });
});

// 配合 Render 動態分配的 PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器已啟動於 Port ${PORT}`);
});