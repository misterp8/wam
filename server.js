const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 設定靜態資源目錄
app.use(express.static(path.join(__dirname, 'public')));

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`遊戲伺服器已啟動於 http://localhost:${PORT}`);
    console.log(`👨‍🏫 老師端網址: http://localhost:${PORT}/teacher.html`);
    console.log(`👦 學生端網址: http://localhost:${PORT}/student.html`);
});