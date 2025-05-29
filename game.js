// 等待页面加载完成
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});

class Game {
    constructor() {
        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;
        this.level = 1;
        
        // DOM 元素
        this.canvas = null;
        this.ctx = null;
        this.scoreElement = null;
        this.livesElement = null;
        this.messageElement = null;
        this.startBtn = null;
        this.randomBtn = null;
        this.pauseBtn = null;
        
        // 游戏组件
        this.ball = null;
        this.paddle = null;
        this.bricks = [];
        this.brickGenerator = null;
        this.particles = [];
        
        // 音效
        this.sounds = {};
        
        // 动画
        this.animationId = null;
        this.lastFrameTime = 0;
        this.fpsInterval = 1000 / 60; // 目标帧率：60fps
    }
    
    init() {
        // 初始化画布
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 调整Canvas尺寸以适应屏幕
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 获取DOM元素
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.messageElement = document.getElementById('gameMessage');
        this.startBtn = document.getElementById('startBtn');
        this.randomBtn = document.getElementById('randomBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        
        // 初始化游戏元素
        this.ball = new Ball(this.canvas);
        this.paddle = new Paddle(this.canvas);
        this.brickGenerator = new BrickGenerator(this.canvas);
        
        // 生成砖块
        this.bricks = this.brickGenerator.generate();
        
        // 加载音效
        this.loadSounds();
        
        // 绑定按钮事件
        this.startBtn.addEventListener('click', () => this.toggleStart());
        this.randomBtn.addEventListener('click', () => this.randomizeBricks());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        // 监听空格键暂停/继续游戏
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.gameOver) {
                    this.restartGame();
                } else {
                    this.togglePause();
                }
                e.preventDefault();
            }
        });
        
        // 初次绘制游戏
        this.drawGame();
        
        // 显示初始化信息
        this.showMessage('点击"随机布局"生成砖块，然后点击"开始游戏"');
    }
    
    resizeCanvas() {
        // 获取容器尺寸
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(800, container.clientWidth);
        
        // 保持4:3比例（游戏性更好的比例）
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * 0.75;
        
        // 如果游戏已经初始化，重新调整所有游戏元素
        if (this.brickGenerator) {
            // 根据屏幕大小调整砖块生成器参数
            const screenSizeBasedRows = maxWidth < 400 ? 4 : 5;  // 小屏幕减少行数
            const screenSizeBasedCols = Math.max(4, Math.floor(maxWidth / 100));  // 根据宽度动态计算列数
            
            // 重新创建砖块布局
            this.brickGenerator = new BrickGenerator(
                this.canvas,
                screenSizeBasedRows + Math.min(3, this.level - 1), // 加上当前关卡的难度调整
                screenSizeBasedCols
            );
            
            // 重新生成砖块
            if (this.isRunning) {
                // 如果游戏正在运行，保持当前砖块状态
                const visibleBricks = this.bricks.filter(brick => brick.visible).length;
                if (visibleBricks > 0) {
                    // 还有砖块，重新调整它们的尺寸和位置
                    this.adjustBricksPosition();
                } else {
                    // 当前关卡已清空，生成新的
                    this.bricks = this.brickGenerator.generate();
                }
            } else {
                // 游戏未运行，直接生成新砖块
                this.bricks = this.brickGenerator.generate();
            }
            
            // 调整小球大小和速度
            if (this.ball) {
                // 根据屏幕大小调整球的尺寸和速度
                this.ball.radius = Math.max(8, Math.min(12, maxWidth / 70)); 
                this.ball.speed = Math.max(4, Math.min(7, maxWidth / 120));
                this.ball.reset();
            }
            
            // 调整挡板大小和速度
            if (this.paddle) {
                // 根据屏幕大小调整挡板尺寸和速度
                this.paddle.width = Math.max(70, Math.min(120, maxWidth / 7));
                this.paddle.height = Math.max(10, Math.min(15, maxWidth / 50));
                this.paddle.speed = Math.max(5, Math.min(10, maxWidth / 100));
                this.paddle.reset();
            }
        }
        
        // 重绘游戏
        if (this.ctx) {
            this.drawGame();
        }
    }
    
    // 添加新方法来调整砖块位置
    adjustBricksPosition() {
        if (!this.bricks || this.bricks.length === 0) return;
        
        // 获取新的砖块布局参数
        const brickWidth = (this.canvas.width - this.brickGenerator.offsetLeft * 2 - 
                           this.brickGenerator.padding * (this.brickGenerator.cols - 1)) / 
                           this.brickGenerator.cols;
        const brickHeight = 25;
        
        // 计算调整因子（新画布尺寸与原始尺寸的比例）
        const canvasWidthRatio = this.canvas.width / (this.bricks[0]?.canvas?.width || 800);
        
        // 调整每个砖块的位置和尺寸
        this.bricks.forEach((brick) => {
            if (brick) {
                // 保持相对位置不变，但适应新尺寸
                brick.width = brickWidth;
                brick.height = brickHeight;
                
                // 计算新的坐标
                const relCol = Math.round((brick.x - this.brickGenerator.offsetLeft) / 
                              (brick.width + this.brickGenerator.padding));
                const relRow = Math.round((brick.y - this.brickGenerator.offsetTop) / 
                              (brick.height + this.brickGenerator.padding));
                
                // 设置新位置
                brick.x = this.brickGenerator.offsetLeft + relCol * (brickWidth + this.brickGenerator.padding);
                brick.y = this.brickGenerator.offsetTop + relRow * (brickHeight + this.brickGenerator.padding);
            }
        });
    }
    
    loadSounds() {
        // 加载游戏音效
        const soundFiles = {
            'paddleHit': 'https://assets.codepen.io/21542/howler-push.mp3',
            'brickHit': 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
            'wallHit': 'https://assets.codepen.io/21542/howler-sfx-liquid.mp3',
            'loseLife': 'https://assets.codepen.io/21542/howler-sfx-exp.mp3',
            'gameOver': 'https://assets.codepen.io/21542/howler-sfx-death.mp3',
            'gameWin': 'https://assets.codepen.io/21542/howler-sfx-coins.mp3'
        };
        
        // 创建Audio对象
        for (const [name, url] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio(url);
            this.sounds[name].volume = 0.3;
        }
    }
    
    playSound(name) {
        // 播放指定音效
        if (this.sounds[name]) {
            // 克隆音效以允许重叠播放
            const sound = this.sounds[name].cloneNode();
            sound.volume = 0.3;
            sound.play().catch(err => {
                // 忽略浏览器自动播放限制错误
                console.log('Sound play failed:', err);
            });
        }
    }
    
    toggleStart() {
        if (this.gameOver) {
            // 如果游戏已结束，重新开始
            this.restartGame();
        } else if (!this.isRunning) {
            // 如果游戏未运行，开始游戏
            this.startGame();
        } else {
            // 如果游戏已运行，重新开始
            this.restartGame();
        }
    }
    
    togglePause() {
        if (!this.isRunning || this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // 暂停游戏
            this.pauseBtn.textContent = '继续';
            this.showMessage('游戏已暂停');
            cancelAnimationFrame(this.animationId);
        } else {
            // 继续游戏
            this.pauseBtn.textContent = '暂停';
            this.hideMessage();
            this.lastFrameTime = performance.now();
            this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }
    
    startGame() {
        this.isRunning = true;
        this.isPaused = false;
        this.gameOver = false;
        
        // 更新按钮文本
        this.startBtn.textContent = '重新开始';
        this.pauseBtn.textContent = '暂停';
        
        // 隐藏消息
        this.hideMessage();
        
        // 开始游戏循环
        this.lastFrameTime = performance.now();
        this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    restartGame() {
        // 重置游戏状态
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.level = 1;
        
        // 更新显示
        this.updateScoreDisplay();
        this.updateLivesDisplay();
        
        // 重置游戏元素
        this.ball.reset();
        this.paddle.reset();
        this.particles = [];
        
        // 重新生成砖块
        this.bricks = this.brickGenerator.generate();
        
        // 开始游戏
        this.startGame();
    }
    
    randomizeBricks() {
        // 随机生成新的砖块布局
        this.bricks = this.brickGenerator.generateRandom();
        
        // 绘制游戏
        this.drawGame();
    }
    
    gameLoop(timestamp) {
        // 计算帧间隔
        const elapsed = timestamp - this.lastFrameTime;
        
        // 如果达到了目标帧率间隔，更新游戏状态
        if (elapsed > this.fpsInterval) {
            this.lastFrameTime = timestamp - (elapsed % this.fpsInterval);
            
            // 清除屏幕
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 更新和绘制游戏元素
            this.updateGame();
            this.drawGame();
            
            // 检查游戏状态
            this.checkGameState();
        }
        
        // 继续游戏循环
        if (this.isRunning && !this.isPaused) {
            this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }
    
    updateGame() {
        // 更新挡板
        this.paddle.update();
        
        // 更新小球
        this.ball.update(this.paddle, this.bricks, this);
        
        // 更新砖块
        this.bricks.forEach(brick => {
            if (brick.visible) {
                brick.update();
            }
        });
        
        // 更新粒子效果
        this.updateParticles();
    }
    
    drawGame() {
        // 绘制游戏背景
        this.drawBackground();
        
        // 绘制砖块
        this.bricks.forEach(brick => {
            if (brick.visible) {
                brick.draw(this.ctx);
            }
        });
        
        // 绘制挡板
        this.paddle.draw();
        
        // 绘制小球
        this.ball.draw();
        
        // 绘制粒子效果
        this.drawParticles();
    }
    
    drawBackground() {
        // 绘制简单的渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    checkGameState() {
        // 检查是否所有砖块都已被清除
        const remainingBricks = this.bricks.filter(brick => brick.visible).length;
        
        if (remainingBricks === 0) {
            this.winLevel();
        }
    }
    
    winLevel() {
        // 关卡胜利
        this.level++;
        this.isRunning = false;
        
        // 播放胜利音效
        this.playSound('gameWin');
        
        // 显示胜利消息
        this.showMessage(`恭喜！你通过了第 ${this.level-1} 关！点击"开始游戏"进入下一关`);
        
        // 增加砖块难度
        this.brickGenerator = new BrickGenerator(this.canvas, 5 + Math.min(3, this.level - 1), 8);
        this.bricks = this.brickGenerator.generate();
        
        // 重置球和挡板
        this.ball.reset();
        this.paddle.reset();
        
        // 更新按钮文本
        this.startBtn.textContent = '下一关';
        
        // 取消动画
        cancelAnimationFrame(this.animationId);
    }
    
    endGame(win = false) {
        this.isRunning = false;
        this.gameOver = true;
        
        // 播放结束音效
        this.playSound(win ? 'gameWin' : 'gameOver');
        
        // 显示结束消息
        const message = win 
            ? `恭喜你赢了！最终分数: ${this.score}` 
            : `游戏结束！最终分数: ${this.score}`;
        this.showMessage(message);
        
        // 更新按钮文本
        this.startBtn.textContent = '重新开始';
        
        // 取消动画
        cancelAnimationFrame(this.animationId);
    }
    
    loseLife() {
        // 播放失败音效
        this.playSound('loseLife');
        
        // 减少生命值
        this.lives--;
        
        // 更新生命值显示
        this.updateLivesDisplay();
        
        // 检查是否游戏结束
        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            // 短暂暂停游戏
            this.isPaused = true;
            this.showMessage(`失去一条生命！剩余: ${this.lives}`);
            
            // 2秒后继续游戏
            setTimeout(() => {
                if (!this.gameOver) {
                    this.isPaused = false;
                    this.hideMessage();
                    this.paddle.reset();
                }
            }, 2000);
        }
    }
    
    addScore(points) {
        this.score += points;
        this.updateScoreDisplay();
    }
    
    updateScoreDisplay() {
        this.scoreElement.textContent = this.score;
    }
    
    updateLivesDisplay() {
        this.livesElement.textContent = this.lives;
    }
    
    showMessage(text) {
        this.messageElement.textContent = text;
        this.messageElement.style.display = 'block';
    }
    
    hideMessage() {
        this.messageElement.style.display = 'none';
    }
    
    // 粒子系统
    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                size: Math.random() * 3 + 1,
                color: color,
                speed: Math.random() * 3 + 1,
                angle: Math.random() * Math.PI * 2,
                life: 30,
                opacity: 1
            });
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // 更新粒子位置
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            
            // 减少粒子生命
            particle.life--;
            particle.opacity = particle.life / 30;
            
            // 如果粒子生命结束，从数组中移除
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            // 将十六进制颜色转换为rgba
            const r = parseInt(particle.color.slice(1, 3), 16);
            const g = parseInt(particle.color.slice(3, 5), 16);
            const b = parseInt(particle.color.slice(5, 7), 16);
            
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.opacity})`;
            this.ctx.fill();
            this.ctx.closePath();
        });
    }
} 