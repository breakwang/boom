// Socket.IO 客户端连接
let socket;
let isConnected = false;

// 游戏状态
let gameState = {
    totalPoints: 0,
    playerCount: 0,
    pointsPerPlayer: 0,
    winRate: 70,
    variance: 50,
    prizes: [],
    remainingDraws: 0,
    earnedPoints: 0,
    history: [],
    combo: 0,
    lastDrawTime: 0
};

// 初始化 Socket.IO 连接
function initSocket() {
    // 连接到服务器
    socket = io();
    
    // 连接成功
    socket.on('connect', () => {
        isConnected = true;
        updateConnectionStatus(true);
        console.log('✅ 已连接到服务器');
    });
    
    // 连接断开
    socket.on('disconnect', () => {
        isConnected = false;
        updateConnectionStatus(false);
        console.log('❌ 与服务器断开连接');
    });
    
    // 接收游戏状态更新
    socket.on('gameState', (state) => {
        gameState = state;
        console.log('📡 收到游戏状态更新');
        
        // 根据游戏状态显示对应界面
        if (gameState.prizes && gameState.prizes.length > 0) {
            document.getElementById('setupPanel').style.display = 'none';
            document.getElementById('gamePanel').style.display = 'block';
            renderGame();
        } else {
            document.getElementById('setupPanel').style.display = 'block';
            document.getElementById('gamePanel').style.display = 'none';
        }
    });
    
    // 接收在线人数更新
    socket.on('onlineUsers', (count) => {
        document.getElementById('onlineCount').textContent = `${count}人在线`;
    });
    
    // 接收抽奖结果（用于触发动画）
    socket.on('prizeSelected', (data) => {
        const { prizeIndex, prize, combo } = data;
        triggerPrizeAnimation(prize, combo);
    });
}

// 更新连接状态显示
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusDot.classList.remove('disconnected');
        statusText.textContent = '实时同步';
    } else {
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        statusText.textContent = '连接断开';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Socket.IO
    initSocket();
    
    // 更新总点数显示
    updateTotalPointsDisplay();
    
    // 监听输入变化
    document.getElementById('playerCount').addEventListener('input', updateTotalPointsDisplay);
    document.getElementById('pointsPerPlayer').addEventListener('input', updateTotalPointsDisplay);
    document.getElementById('winRate').addEventListener('input', function() {
        document.getElementById('winRateValue').textContent = this.value;
    });
    document.getElementById('variance').addEventListener('input', function() {
        document.getElementById('varianceValue').textContent = this.value;
    });
});

// 更新总点数显示
function updateTotalPointsDisplay() {
    const playerCount = parseInt(document.getElementById('playerCount').value) || 0;
    const pointsPerPlayer = parseInt(document.getElementById('pointsPerPlayer').value) || 0;
    const total = playerCount * pointsPerPlayer;
    document.getElementById('totalPoints').textContent = total;
}

// 创建奖池
function createPrizePool() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    const pointsPerPlayer = parseInt(document.getElementById('pointsPerPlayer').value);
    const winRate = parseInt(document.getElementById('winRate').value);
    const variance = parseInt(document.getElementById('variance').value);
    
    // 验证输入
    if (!playerCount || playerCount < 1) {
        alert('请输入有效的购买张数（至少1张）');
        return;
    }
    
    if (!pointsPerPlayer || pointsPerPlayer < 10) {
        alert('请输入有效的票单价（至少10元）');
        return;
    }
    
    if (pointsPerPlayer % 10 !== 0) {
        alert('票单价必须是10的倍数');
        return;
    }
    
    if (!isConnected) {
        alert('未连接到服务器，请稍后再试');
        return;
    }
    
    // 计算总点数
    const totalPoints = playerCount * pointsPerPlayer;
    
    // 分配点数到10个编号
    const prizes = distributePoints(totalPoints, winRate, variance);
    
    // 发送到服务器
    socket.emit('createPool', {
        totalPoints: totalPoints,
        playerCount: playerCount,
        pointsPerPlayer: pointsPerPlayer,
        winRate: winRate,
        variance: variance,
        prizes: prizes,
        remainingDraws: playerCount,
        earnedPoints: 0,
        history: [],
        combo: 0,
        lastDrawTime: 0
    });
}

// 分配点数算法
function distributePoints(totalPoints, winRate, variance) {
    const numberOfPrizes = 10;
    let prizes = [];
    
    // 根据中奖概率计算总奖金池
    const totalPrizePool = Math.round(totalPoints * winRate / 100 / 10) * 10; // 确保是10的倍数
    
    // 计算中奖彩票数量（至少1张，最多8张，因为至少要有1张0元）
    const winningTickets = Math.max(1, Math.min(8, Math.floor(numberOfPrizes * (winRate / 100 + 0.2))));
    
    // 必须至少有1张0元彩票
    const losingTickets = Math.max(1, numberOfPrizes - winningTickets);
    const actualWinningTickets = numberOfPrizes - losingTickets;
    
    if (actualWinningTickets === 0 || totalPrizePool === 0) {
        // 如果没有奖金池，全部是0元
        const allocatedPoints = new Array(numberOfPrizes).fill(0);
        const shuffledPoints = shuffleArray(allocatedPoints);
        for (let i = 0; i < numberOfPrizes; i++) {
            prizes.push({
                number: i + 1,
                points: shuffledPoints[i],
                revealed: false
            });
        }
        return prizes;
    }
    
    // 根据奖金差距计算最大奖金倍数
    // variance: 0 = 1x (均匀), 50 = 5x, 100 = 10x (超级大奖)
    const maxMultiplier = 1 + (variance / 100) * 9; // 1x 到 10x
    
    // 根据差距系数生成权重
    let weights = [];
    
    for (let i = 0; i < actualWinningTickets; i++) {
        if (variance === 0) {
            // 差距为0，均分
            weights.push(1);
        } else {
            // 根据差距系数生成不同的权重
            // variance越大，权重差异越大
            const factor = Math.pow(Math.random(), 3 - (variance / 50));
            weights.push(factor);
        }
    }
    
    // 计算权重总和
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // 计算平均奖金
    const avgPrize = Math.floor(totalPrizePool / actualWinningTickets / 10) * 10;
    
    // 根据权重分配奖金
    let allocatedPoints = [];
    let remainingPrizePool = totalPrizePool;
    
    // 分配中奖彩票
    for (let i = 0; i < actualWinningTickets - 1; i++) {
        // 计算当前应分配的奖金（按权重比例）
        let points = Math.round((weights[i] / totalWeight) * totalPrizePool);
        
        // 确保是10的倍数
        points = Math.round(points / 10) * 10;
        
        // 限制最大奖金不超过 avgPrize * maxMultiplier
        const maxPrize = Math.floor(avgPrize * maxMultiplier / 10) * 10;
        points = Math.min(points, maxPrize);
        
        // 最小0元（可以是谢谢惠顾）
        points = Math.max(0, points);
        
        allocatedPoints.push(points);
        remainingPrizePool -= points;
    }
    
    // 最后一张中奖彩票获得剩余奖金
    remainingPrizePool = Math.round(remainingPrizePool / 10) * 10;
    remainingPrizePool = Math.max(0, remainingPrizePool);
    
    // 限制最大奖金
    const maxPrize = Math.floor(avgPrize * maxMultiplier / 10) * 10;
    remainingPrizePool = Math.min(remainingPrizePool, maxPrize);
    
    allocatedPoints.push(remainingPrizePool);
    
    // 调整总和，确保精确等于totalPrizePool
    let currentTotal = allocatedPoints.reduce((sum, p) => sum + p, 0);
    let diff = totalPrizePool - currentTotal;
    
    // 如果有差异，从最大的奖项中调整（确保是10的倍数）
    if (diff !== 0) {
        diff = Math.round(diff / 10) * 10;
        if (allocatedPoints.length > 0) {
            const maxIndex = allocatedPoints.indexOf(Math.max(...allocatedPoints));
            allocatedPoints[maxIndex] += diff;
            allocatedPoints[maxIndex] = Math.max(0, allocatedPoints[maxIndex]);
            
            // 再次限制最大奖金
            const maxPrize = Math.floor(avgPrize * maxMultiplier / 10) * 10;
            if (allocatedPoints[maxIndex] > maxPrize) {
                const excess = allocatedPoints[maxIndex] - maxPrize;
                allocatedPoints[maxIndex] = maxPrize;
                // 将多余的分配给其他奖项
                for (let i = 0; i < allocatedPoints.length && excess > 0; i++) {
                    if (i !== maxIndex) {
                        const canAdd = Math.min(excess, maxPrize - allocatedPoints[i]);
                        allocatedPoints[i] += Math.round(canAdd / 10) * 10;
                    }
                }
            }
        }
    }
    
    // 添加未中奖彩票（0元）- 至少1张
    for (let i = 0; i < losingTickets; i++) {
        allocatedPoints.push(0);
    }
    
    // 打乱点数顺序
    const shuffledPoints = shuffleArray(allocatedPoints);
    
    // 创建奖项对象
    for (let i = 0; i < numberOfPrizes; i++) {
        prizes.push({
            number: i + 1,
            points: shuffledPoints[i],
            revealed: false
        });
    }
    
    return prizes;
}

// 数组打乱函数
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 渲染游戏界面
function renderGame() {
    // 更新信息栏
    document.getElementById('gameTotalPoints').textContent = gameState.totalPoints;
    document.getElementById('remainingDraws').textContent = gameState.remainingDraws;
    document.getElementById('earnedPoints').textContent = gameState.earnedPoints;
    
    // 渲染奖项网格
    const prizesGrid = document.getElementById('prizesGrid');
    prizesGrid.innerHTML = '';
    
    gameState.prizes.forEach((prize, index) => {
        const prizeBox = document.createElement('div');
        let className = 'prize-box';
        
        if (prize.revealed) {
            className += ' revealed';
            const avgPoints = gameState.pointsPerPlayer;
            
            if (prize.points === 0) {
                className += ' negative';
            } else if (prize.points >= avgPoints * 3) {
                className += ' mega-win';
            } else if (prize.points >= avgPoints * 2) {
                className += ' big-win';
            }
        }
        
        prizeBox.className = className;
        
        if (prize.revealed) {
            const pointsText = prize.points === 0 ? '谢谢惠顾' : `¥${prize.points}`;
            const emoji = prize.points === 0 ? '💔' : prize.points >= gameState.pointsPerPlayer * 3 ? '💎' : prize.points >= gameState.pointsPerPlayer * 2 ? '🔥' : prize.points > gameState.pointsPerPlayer ? '⭐' : '✓';
            prizeBox.innerHTML = `
                <div class="prize-number">${emoji} 彩票 ${prize.number}</div>
                <div class="prize-points">${pointsText}</div>
            `;
        } else {
            prizeBox.innerHTML = `
                <div class="scratch-card" data-index="${index}">
                    <canvas class="scratch-canvas"></canvas>
                    <div class="scratch-content">
                        <div class="prize-number">彩票 ${prize.number}</div>
                        <div class="prize-points prize-hidden">刮开查看</div>
                    </div>
                </div>
            `;
            
            // 初始化刮刮乐
            setTimeout(() => initScratchCard(prizeBox.querySelector('.scratch-card'), index), 0);
        }
        
        prizesGrid.appendChild(prizeBox);
    });
    
    // 渲染历史记录
    if (gameState.history.length > 0) {
        document.getElementById('historyCard').style.display = 'block';
        renderHistory();
    }
}

// 初始化刮刮乐卡片
function initScratchCard(cardElement, index) {
    const canvas = cardElement.querySelector('.scratch-canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置 canvas 尺寸
    const rect = cardElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 绘制刮刮层
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 添加纹理效果
    ctx.fillStyle = '#a0a0a0';
    for (let i = 0; i < 50; i++) {
        ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 3,
            Math.random() * 3
        );
    }
    
    // 添加文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮开有奖', canvas.width / 2, canvas.height / 2);
    
    let isScratching = false;
    let scratchedPixels = 0;
    const totalPixels = canvas.width * canvas.height;
    
    // 刮开函数
    function scratch(x, y) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // 计算刮开的百分比
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let transparent = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) transparent++;
        }
        scratchedPixels = transparent;
        
        // 如果刮开超过 50%，自动揭晓
        if (scratchedPixels / totalPixels > 0.5) {
            selectPrize(index);
        }
    }
    
    // 鼠标事件
    canvas.addEventListener('mousedown', (e) => {
        isScratching = true;
        const rect = canvas.getBoundingClientRect();
        scratch(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isScratching) {
            const rect = canvas.getBoundingClientRect();
            scratch(e.clientX - rect.left, e.clientY - rect.top);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isScratching = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isScratching = false;
    });
    
    // 触摸事件
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isScratching = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isScratching) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            scratch(touch.clientX - rect.left, touch.clientY - rect.top);
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isScratching = false;
    });
}

// 选择奖项
function selectPrize(index) {
    if (gameState.remainingDraws <= 0) {
        alert('彩票已全部刮完！');
        return;
    }
    
    if (gameState.prizes[index].revealed) {
        return;
    }
    
    if (!isConnected) {
        alert('未连接到服务器，请稍后再试');
        return;
    }
    
    // 发送到服务器
    socket.emit('selectPrize', { prizeIndex: index });
}

// 触发抽奖动画
function triggerPrizeAnimation(prize, combo) {
    const avgPoints = gameState.pointsPerPlayer;
    
    if (prize.points === 0) {
        createScreenFlash('#808080');
        showBigText('💔 谢谢惠顾！');
    } else if (prize.points >= avgPoints * 3) {
        createConfetti(100);
        createScreenFlash('#FFD700');
        showBigText(`🎰 特等奖 ¥${prize.points}!`);
        if (combo > 1) {
            setTimeout(() => showBigText(`${combo}x 连中!`), 800);
        }
    } else if (prize.points >= avgPoints * 2) {
        createConfetti(50);
        createScreenFlash('#ff6b6b');
        showBigText(`🔥 一等奖 ¥${prize.points}!`);
    } else if (prize.points > avgPoints) {
        createConfetti(30);
        showBigText(`🎉 中奖 ¥${prize.points}!`);
    } else {
        showBigText(`✓ 获得 ¥${prize.points}`);
    }
}

// 揭晓所有
function revealAll() {
    if (!confirm('确定要揭晓所有未抽取的奖项吗？')) {
        return;
    }
    
    if (!isConnected) {
        alert('未连接到服务器，请稍后再试');
        return;
    }
    
    socket.emit('revealAll');
}

// 渲染历史记录
function renderHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    gameState.history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const prizeText = item.points === 0 ? '谢谢惠顾' : `¥${item.points}`;
        historyItem.innerHTML = `
            <span class="number">第 ${index + 1} 张 - 彩票 ${item.number}</span>
            <span class="points">${prizeText}</span>
        `;
        historyList.appendChild(historyItem);
    });
}

// 重新开始
function resetGame() {
    if (!confirm('确定要重新开始吗？当前进度将丢失。')) {
        return;
    }
    
    if (!isConnected) {
        alert('未连接到服务器，请稍后再试');
        return;
    }
    
    socket.emit('resetGame');
    
    document.getElementById('historyCard').style.display = 'none';
}

// 创建彩纸动画
function createConfetti(count = 50) {
    const container = document.getElementById('confettiContainer');
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#FFD700', '#FF6B6B'];
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.3 + 's';
            confetti.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            
            container.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 20);
    }
}

// 屏幕闪光效果
function createScreenFlash(color = '#ffffff') {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.background = color;
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.remove();
    }, 500);
}

// 显示大文字效果
function showBigText(text) {
    const display = document.createElement('div');
    display.className = 'combo-display';
    display.textContent = text;
    document.body.appendChild(display);
    
    setTimeout(() => {
        display.remove();
    }, 1500);
}


