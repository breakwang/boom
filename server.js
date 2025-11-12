const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 游戏状态存储（内存）
let gameState = {
    totalPoints: 0,
    playerCount: 0,
    pointsPerPlayer: 0,
    variance: 50,
    extremeMode: false,
    prizes: [],
    remainingDraws: 0,
    earnedPoints: 0,
    history: [],
    combo: 0,
    lastDrawTime: 0,
    isActive: false
};

// 在线用户统计
let onlineUsers = 0;

// Socket.IO 连接处理
io.on('connection', (socket) => {
    onlineUsers++;
    console.log(`新用户连接，当前在线: ${onlineUsers}`);
    
    // 向新连接的客户端发送当前游戏状态
    socket.emit('gameState', gameState);
    
    // 广播在线人数
    io.emit('onlineUsers', onlineUsers);
    
    // 创建奖池
    socket.on('createPool', (data) => {
        gameState = {
            ...data,
            isActive: true,
            timestamp: Date.now()
        };
        console.log('奖池已创建:', gameState.totalPoints, '点');
        // 广播给所有客户端
        io.emit('gameState', gameState);
    });
    
    // 抽奖
    socket.on('selectPrize', (data) => {
        const { prizeIndex } = data;
        
        if (gameState.prizes[prizeIndex] && !gameState.prizes[prizeIndex].revealed) {
            // 更新游戏状态
            gameState.prizes[prizeIndex].revealed = true;
            gameState.remainingDraws--;
            gameState.earnedPoints += gameState.prizes[prizeIndex].points;
            
            // 添加历史记录
            gameState.history.push({
                number: gameState.prizes[prizeIndex].number,
                points: gameState.prizes[prizeIndex].points,
                timestamp: Date.now()
            });
            
            // 计算连击
            const now = Date.now();
            if (now - gameState.lastDrawTime < 2000) {
                gameState.combo++;
            } else {
                gameState.combo = 1;
            }
            gameState.lastDrawTime = now;
            
            console.log(`编号 ${gameState.prizes[prizeIndex].number} 被抽中: ${gameState.prizes[prizeIndex].points} 点`);
            
            // 广播给所有客户端
            io.emit('gameState', gameState);
            
            // 发送抽奖结果
            io.emit('prizeSelected', {
                prizeIndex,
                prize: gameState.prizes[prizeIndex],
                combo: gameState.combo
            });
        }
    });
    
    // 揭晓所有
    socket.on('revealAll', () => {
        gameState.prizes.forEach(prize => {
            prize.revealed = true;
        });
        console.log('所有奖项已揭晓');
        io.emit('gameState', gameState);
    });
    
    // 重置游戏
    socket.on('resetGame', () => {
        gameState = {
            totalPoints: 0,
            playerCount: 0,
            pointsPerPlayer: 0,
            variance: 50,
            extremeMode: false,
            prizes: [],
            remainingDraws: 0,
            earnedPoints: 0,
            history: [],
            combo: 0,
            lastDrawTime: 0,
            isActive: false
        };
        console.log('游戏已重置');
        io.emit('gameState', gameState);
    });
    
    // 断开连接
    socket.on('disconnect', () => {
        onlineUsers--;
        console.log(`用户断开连接，当前在线: ${onlineUsers}`);
        io.emit('onlineUsers', onlineUsers);
    });
});

// API 路由
app.get('/api/status', (req, res) => {
    res.json({
        online: onlineUsers,
        gameActive: gameState.isActive,
        timestamp: Date.now()
    });
});

app.get('/api/state', (req, res) => {
    res.json(gameState);
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 抽奖游戏服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 WebSocket 服务已启动`);
    console.log(`👥 等待玩家连接...`);
});


