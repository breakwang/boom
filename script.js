// 游戏状态
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
    lastDrawTime: 0
};

// 本地存储的键名
const STORAGE_KEY = 'lottery_game_state';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从本地存储加载游戏状态
    loadGameState();
    
    // 更新总点数显示
    updateTotalPointsDisplay();
    
    // 监听输入变化
    document.getElementById('playerCount').addEventListener('input', updateTotalPointsDisplay);
    document.getElementById('pointsPerPlayer').addEventListener('input', updateTotalPointsDisplay);
    document.getElementById('variance').addEventListener('input', function() {
        document.getElementById('varianceValue').textContent = this.value;
    });
    
    // 监听其他标签页的状态变化
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            loadGameState();
        }
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
    const variance = parseInt(document.getElementById('variance').value);
    const extremeMode = document.getElementById('extremeMode').checked;
    
    // 验证输入
    if (!playerCount || playerCount < 1) {
        alert('请输入有效的参与人数（至少1人）');
        return;
    }
    
    if (!pointsPerPlayer || pointsPerPlayer < 10) {
        alert('请输入有效的人均点数（至少10点）');
        return;
    }
    
    if (pointsPerPlayer % 10 !== 0) {
        alert('人均点数必须是10的倍数');
        return;
    }
    
    // 计算总点数
    const totalPoints = playerCount * pointsPerPlayer;
    
    // 分配点数到10个编号
    const prizes = distributePoints(totalPoints, variance, extremeMode);
    
    // 初始化游戏状态
    gameState = {
        totalPoints: totalPoints,
        playerCount: playerCount,
        pointsPerPlayer: pointsPerPlayer,
        variance: variance,
        extremeMode: extremeMode,
        prizes: prizes,
        remainingDraws: playerCount,
        earnedPoints: 0,
        history: [],
        combo: 0,
        lastDrawTime: 0
    };
    
    // 切换到游戏界面
    document.getElementById('setupPanel').style.display = 'none';
    document.getElementById('gamePanel').style.display = 'block';
    
    // 保存状态到本地存储
    saveGameState();
    
    // 渲染游戏界面
    renderGame();
}

// 分配点数算法
function distributePoints(totalPoints, variance, extremeMode) {
    const numberOfPrizes = 10;
    let prizes = [];
    
    // 极限模式：添加特殊奖项
    let specialPrizes = [];
    if (extremeMode) {
        // 30% 概率出现0点
        if (Math.random() < 0.3) {
            const zeroCount = Math.floor(Math.random() * 2) + 1; // 1-2个0点
            for (let i = 0; i < zeroCount; i++) {
                specialPrizes.push({
                    type: 'zero',
                    points: 0
                });
            }
        }
        
        // 40% 概率出现超高倍数
        if (Math.random() < 0.4) {
            const megaCount = Math.floor(Math.random() * 2) + 1; // 1-2个超高倍数
            for (let i = 0; i < megaCount; i++) {
                specialPrizes.push({
                    type: 'mega',
                    multiplier: (Math.floor(Math.random() * 3) + 3) // 3x to 5x
                });
            }
        }
    }
    
    // 根据差距系数生成权重
    let weights = [];
    const normalPrizes = numberOfPrizes - specialPrizes.length;
    
    for (let i = 0; i < normalPrizes; i++) {
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
    
    // 计算平均点数
    const avgPoints = Math.floor(totalPoints / numberOfPrizes / 10) * 10;
    
    // 根据权重分配点数
    let remainingPoints = totalPoints;
    let allocatedPoints = [];
    
    for (let i = 0; i < normalPrizes - 1; i++) {
        // 计算当前应分配的点数（按权重比例）
        let points = Math.round((weights[i] / totalWeight) * totalPoints);
        
        // 确保是10的倍数
        points = Math.round(points / 10) * 10;
        
        // 在极限模式下允许0点，否则至少分配10点
        if (!extremeMode) {
            points = Math.max(10, points);
        } else {
            points = Math.max(0, points);
        }
        
        allocatedPoints.push(points);
        remainingPoints -= points;
    }
    
    // 处理特殊奖项
    for (let special of specialPrizes) {
        if (special.type === 'zero') {
            allocatedPoints.push(0);
            // 0点不影响剩余点数
        } else if (special.type === 'mega') {
            const megaPoints = avgPoints * special.multiplier;
            allocatedPoints.push(megaPoints);
            remainingPoints -= megaPoints;
        }
    }
    
    // 最后一个编号获得剩余所有点数
    remainingPoints = Math.round(remainingPoints / 10) * 10;
    // 确保剩余点数不为负数
    remainingPoints = Math.max(0, remainingPoints);
    allocatedPoints.push(remainingPoints);
    
    // 调整总和，确保精确等于totalPoints
    let currentTotal = allocatedPoints.reduce((sum, p) => sum + p, 0);
    let diff = totalPoints - currentTotal;
    
    // 如果有差异，从最大的奖项中调整
    if (diff !== 0) {
        const positivePoints = allocatedPoints.filter(p => p > 0);
        if (positivePoints.length > 0) {
            const maxIndex = allocatedPoints.indexOf(Math.max(...positivePoints));
            if (maxIndex !== -1) {
                allocatedPoints[maxIndex] += diff;
                // 确保调整后不为负数
                allocatedPoints[maxIndex] = Math.max(0, allocatedPoints[maxIndex]);
            }
        }
    }
    
    // 打乱点数顺序
    const shuffledPoints = shuffleArray(allocatedPoints);
    
    // 创建奖项对象，编号固定1-10，点数随机分配
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
            const pointsText = prize.points === 0 ? '0 点' : `${prize.points} 点`;
            const emoji = prize.points === 0 ? '💔' : prize.points >= gameState.pointsPerPlayer * 3 ? '💎' : prize.points >= gameState.pointsPerPlayer * 2 ? '🔥' : prize.points > gameState.pointsPerPlayer ? '⭐' : '✓';
            prizeBox.innerHTML = `
                <div class="prize-number">${emoji} 编号 ${prize.number}</div>
                <div class="prize-points">${pointsText}</div>
            `;
        } else {
            prizeBox.innerHTML = `
                <div class="prize-number">编号 ${prize.number}</div>
                <div class="prize-points prize-hidden">?</div>
            `;
            prizeBox.onclick = () => selectPrize(index);
        }
        
        prizesGrid.appendChild(prizeBox);
    });
    
    // 渲染历史记录
    if (gameState.history.length > 0) {
        document.getElementById('historyCard').style.display = 'block';
        renderHistory();
    }
}

// 选择奖项
function selectPrize(index) {
    if (gameState.remainingDraws <= 0) {
        alert('已达到抽奖次数上限！');
        return;
    }
    
    if (gameState.prizes[index].revealed) {
        return;
    }
    
    // 添加翻牌动画
    const prizeBox = document.querySelectorAll('.prize-box')[index];
    prizeBox.classList.add('flipping');
    
    // 延迟显示结果，增加悬念
    setTimeout(() => {
        // 揭晓奖项
        gameState.prizes[index].revealed = true;
        gameState.remainingDraws--;
        const points = gameState.prizes[index].points;
        gameState.earnedPoints += points;
        
        // 添加到历史记录
        gameState.history.push({
            number: gameState.prizes[index].number,
            points: points
        });
        
        // 计算连击
        const now = Date.now();
        if (now - gameState.lastDrawTime < 2000) {
            gameState.combo++;
        } else {
            gameState.combo = 1;
        }
        gameState.lastDrawTime = now;
        
        // 保存状态到本地存储
        saveGameState();
        
        // 重新渲染
        renderGame();
        
        // 根据点数触发不同效果
        const avgPoints = gameState.pointsPerPlayer;
        
        if (points === 0) {
            // 0点效果
            createScreenFlash('#808080');
            showBigText('💔 什么都没有！');
        } else if (points >= avgPoints * 3) {
            // 超级大奖
            createConfetti(100);
            createScreenFlash('#FFD700');
            showBigText('🎰 MEGA WIN!');
            if (gameState.combo > 1) {
                setTimeout(() => showBigText(`${gameState.combo}x COMBO!`), 800);
            }
        } else if (points >= avgPoints * 2) {
            // 大奖
            createConfetti(50);
            createScreenFlash('#ff6b6b');
            showBigText('🔥 BIG WIN!');
        } else if (points > avgPoints) {
            // 中奖
            createConfetti(30);
            showBigText('🎉 中奖！');
        }
        
        // 检查是否全部抽完
        if (gameState.remainingDraws === 0) {
            setTimeout(() => {
                const avgEarned = gameState.earnedPoints / gameState.playerCount;
                const message = avgEarned > gameState.pointsPerPlayer 
                    ? `🎉 恭喜！平均获得 ${avgEarned.toFixed(0)} 点，超过预期 ${((avgEarned / gameState.pointsPerPlayer - 1) * 100).toFixed(1)}%！` 
                    : avgEarned === 0
                    ? `💔 太惨了！平均 0 点，一无所获...`
                    : `完成抽奖！平均获得 ${avgEarned.toFixed(0)} 点。`;
                alert(message);
            }, 1000);
        }
    }, 500);
}

// 揭晓所有
function revealAll() {
    if (!confirm('确定要揭晓所有未抽取的奖项吗？')) {
        return;
    }
    
    gameState.prizes.forEach((prize, index) => {
        if (!prize.revealed) {
            prize.revealed = true;
        }
    });
    
    // 保存状态到本地存储
    saveGameState();
    
    renderGame();
}

// 渲染历史记录
function renderHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    gameState.history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="number">第 ${index + 1} 次 - 编号 ${item.number}</span>
            <span class="points">${item.points} 点</span>
        `;
        historyList.appendChild(historyItem);
    });
}

// 重新开始
function resetGame() {
    if (!confirm('确定要重新开始吗？当前进度将丢失。')) {
        return;
    }
    
    document.getElementById('setupPanel').style.display = 'block';
    document.getElementById('gamePanel').style.display = 'none';
    document.getElementById('historyCard').style.display = 'none';
    
    // 重置游戏状态
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
        lastDrawTime: 0
    };
    
    // 清除本地存储
    clearGameState();
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

// 保存游戏状态到本地存储
function saveGameState() {
    try {
        const stateToSave = {
            ...gameState,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error('保存游戏状态失败:', error);
    }
}

// 从本地存储加载游戏状态
function loadGameState() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            
            // 检查状态是否有效（有奖池数据）
            if (parsedState.prizes && parsedState.prizes.length > 0) {
                gameState = parsedState;
                
                // 切换到游戏界面
                document.getElementById('setupPanel').style.display = 'none';
                document.getElementById('gamePanel').style.display = 'block';
                
                // 渲染游戏界面
                renderGame();
            }
        }
    } catch (error) {
        console.error('加载游戏状态失败:', error);
    }
}

// 清除本地存储的游戏状态
function clearGameState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('清除游戏状态失败:', error);
    }
}
