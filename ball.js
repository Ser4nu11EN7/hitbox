class Ball {
    constructor(canvas, radius = 10) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.radius = radius;
        this.speed = 5;
        this.reset();
        
        // 球的颜色
        this.color = '#ffffff';
        
        // 球的轨迹效果
        this.trail = [];
        this.trailLength = 5;
    }
    
    reset() {
        // 球的初始位置（在画布中心底部偏上）
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 80;
        
        // 随机设置球的初始角度（向上方向，带有随机偏移）
        const angle = Math.PI * (Math.random() * 0.5 + 0.75);
        this.dx = this.speed * Math.cos(angle);
        this.dy = -this.speed * Math.sin(angle);
        
        // 清空轨迹
        this.trail = [];
    }
    
    update(paddle, bricks, game) {
        // 记录轨迹
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
        
        // 更新球的位置
        this.x += this.dx;
        this.y += this.dy;
        
        // 边界碰撞检测
        this.handleBoundaryCollision(game);
        
        // 挡板碰撞检测
        this.handlePaddleCollision(paddle);
        
        // 砖块碰撞检测
        this.handleBrickCollision(bricks, game);
    }
    
    handleBoundaryCollision(game) {
        // 左右边界碰撞
        if (this.x - this.radius < 0 || this.x + this.radius > this.canvas.width) {
            this.dx = -this.dx;
            // 播放碰撞音效
            game.playSound('wallHit');
        }
        
        // 上边界碰撞
        if (this.y - this.radius < 0) {
            this.dy = -this.dy;
            // 播放碰撞音效
            game.playSound('wallHit');
        }
        
        // 下边界碰撞（失败）
        if (this.y + this.radius > this.canvas.height) {
            game.loseLife();
            this.reset();
        }
    }
    
    handlePaddleCollision(paddle) {
        // 检查是否与挡板碰撞
        if (this.y + this.radius > paddle.y && 
            this.y - this.radius < paddle.y + paddle.height && 
            this.x + this.radius > paddle.x && 
            this.x - this.radius < paddle.x + paddle.width) {
            
            // 碰撞后改变球的方向
            // 根据球击中挡板的位置来改变反弹角度
            const hitPosition = (this.x - paddle.x) / paddle.width;
            const angle = (-0.5 + hitPosition) * Math.PI * 0.7;
            
            this.dx = this.speed * Math.sin(angle);
            this.dy = -this.speed * Math.cos(angle);
            
            // 确保球不会卡在挡板内
            this.y = paddle.y - this.radius;
            
            return true;
        }
        return false;
    }
    
    handleBrickCollision(bricks, game) {
        for (let i = 0; i < bricks.length; i++) {
            const brick = bricks[i];
            
            if (brick.visible) {
                // 简化的碰撞检测
                if (this.x + this.radius > brick.x && 
                    this.x - this.radius < brick.x + brick.width && 
                    this.y + this.radius > brick.y && 
                    this.y - this.radius < brick.y + brick.height) {
                    
                    // 确定从哪个方向碰撞，改变相应的速度
                    // 计算球的中心到砖块各边的距离
                    const distX = Math.abs(this.x - (brick.x + brick.width / 2));
                    const distY = Math.abs(this.y - (brick.y + brick.height / 2));
                    
                    // 如果x方向距离更远，则是左右碰撞
                    if (distX > distY) {
                        this.dx = -this.dx;
                    } else {
                        this.dy = -this.dy;
                    }
                    
                    // 击中砖块，减少其耐久或使其消失
                    brick.hit();
                    
                    // 增加分数
                    game.addScore(brick.points);
                    
                    // 播放碰撞音效
                    game.playSound('brickHit');
                    
                    // 创建粒子效果
                    game.createParticles(this.x, this.y, brick.color);
                    
                    // 只处理一次碰撞，然后退出循环
                    break;
                }
            }
        }
    }
    
    draw() {
        // 绘制轨迹
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = i / this.trail.length;
            
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
            this.ctx.fill();
            this.ctx.closePath();
        }
        
        // 绘制球
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // 创建径向渐变
        const gradient = this.ctx.createRadialGradient(
            this.x - this.radius/3, this.y - this.radius/3, 1, 
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#aaccff');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = '#888888';
        this.ctx.stroke();
        this.ctx.closePath();
    }
} 