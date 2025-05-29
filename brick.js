class Brick {
    constructor(x, y, width, height, color, durability = 1) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.visible = true;
        
        // 砖块颜色
        this.color = color || '#cccccc'; // 提供默认颜色
        this.borderColor = this.darkenColor(this.color, 20);
        this.highlightColor = this.lightenColor(this.color, 30);
        
        // 砖块耐久度和得分
        this.durability = durability;
        this.maxDurability = durability;
        this.points = durability * 10;
        
        // 砖块状态效果
        this.isHit = false;
        this.hitAnimationFrame = 0;
        this.maxHitAnimationFrames = 10;
    }
    
    // 颜色处理方法
    darkenColor(color, percent) {
        // 添加防御性检查，如果color未定义，则返回灰色
        if (!color) return '#999999';
        
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return '#' + (1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1);
        } catch (e) {
            console.warn('颜色处理错误:', e);
            return '#999999'; // 出错时返回默认颜色
        }
    }
    
    lightenColor(color, percent) {
        // 添加防御性检查，如果color未定义，则返回亮灰色
        if (!color) return '#cccccc';
        
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return '#' + (1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1);
        } catch (e) {
            console.warn('颜色处理错误:', e);
            return '#cccccc'; // 出错时返回默认颜色
        }
    }
    
    hit() {
        // 触发砖块被击中动画
        this.isHit = true;
        this.hitAnimationFrame = this.maxHitAnimationFrames;
        
        // 减少砖块耐久度
        this.durability--;
        
        // 如果耐久度为0，则砖块消失
        if (this.durability <= 0) {
            this.visible = false;
        }
    }
    
    update() {
        // 更新砖块状态
        if (this.isHit) {
            this.hitAnimationFrame--;
            
            if (this.hitAnimationFrame <= 0) {
                this.isHit = false;
            }
        }
    }
    
    draw(ctx) {
        if (!this.visible) return;
        
        // 计算砖块当前大小（被击中时有动画效果）
        let scaleX = 1;
        let scaleY = 1;
        let offsetX = 0;
        let offsetY = 0;
        
        if (this.isHit) {
            const animationProgress = this.hitAnimationFrame / this.maxHitAnimationFrames;
            scaleX = 1 + animationProgress * 0.1;
            scaleY = 1 - animationProgress * 0.1;
            offsetX = -((scaleX - 1) * this.width) / 2;
            offsetY = -((scaleY - 1) * this.height) / 2;
        }
        
        // 计算砖块透明度（基于耐久度）
        const alpha = 0.4 + (this.durability / this.maxDurability) * 0.6;
        
        // 绘制砖块阴影
        ctx.beginPath();
        ctx.rect(
            this.x + offsetX + 2, 
            this.y + offsetY + 2, 
            this.width * scaleX, 
            this.height * scaleY
        );
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
        ctx.fill();
        ctx.closePath();
        
        // 绘制砖块主体
        ctx.beginPath();
        ctx.rect(
            this.x + offsetX, 
            this.y + offsetY, 
            this.width * scaleX, 
            this.height * scaleY
        );
        
        // 根据耐久度调整颜色
        ctx.fillStyle = `rgba(${parseInt(this.color.slice(1, 3), 16)}, 
                             ${parseInt(this.color.slice(3, 5), 16)}, 
                             ${parseInt(this.color.slice(5, 7), 16)}, 
                             ${alpha})`;
        ctx.fill();
        
        // 绘制砖块边框
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
        
        // 绘制高光效果
        ctx.beginPath();
        ctx.rect(
            this.x + offsetX + 2, 
            this.y + offsetY + 2, 
            this.width * scaleX - 4, 
            4
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fill();
        ctx.closePath();
        
        // 如果砖块耐久度大于1，显示耐久度指示器
        if (this.maxDurability > 1 && this.durability > 0) {
            const centerX = this.x + offsetX + this.width * scaleX / 2;
            const centerY = this.y + offsetY + this.height * scaleY / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fillStyle = this.highlightColor;
            ctx.fill();
            ctx.closePath();
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.durability.toString(), centerX, centerY);
        }
    }
}

// 砖块布局生成器
class BrickGenerator {
    constructor(canvas, rows = 5, cols = 8) {
        this.canvas = canvas;
        this.rows = rows;
        this.cols = cols;
        this.padding = 10;
        this.offsetTop = 60;
        this.offsetLeft = 30;
    }
    
    // 生成默认砖块布局
    generate() {
        const bricks = [];
        const brickWidth = (this.canvas.width - this.offsetLeft * 2 - this.padding * (this.cols - 1)) / this.cols;
        const brickHeight = 25;
        
        // 砖块颜色设置
        const colors = [
            '#e74c3c', // 红色
            '#e67e22', // 橙色
            '#f1c40f', // 黄色
            '#2ecc71', // 绿色
            '#3498db'  // 蓝色
        ];
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const brickX = this.offsetLeft + c * (brickWidth + this.padding);
                const brickY = this.offsetTop + r * (brickHeight + this.padding);
                
                // 修改颜色选择逻辑，确保不会越界（使用 r % colors.length 循环使用颜色）
                const color = colors[r % colors.length];
                
                // 创建砖块（基础行的砖块耐久度为1，越往上耐久度越高）
                const durability = r === 0 ? 3 : (r === 1 ? 2 : 1);
                
                bricks.push(new Brick(brickX, brickY, brickWidth, brickHeight, color, durability));
            }
        }
        
        return bricks;
    }
    
    // 生成随机砖块布局
    generateRandom() {
        const bricks = [];
        const brickWidth = (this.canvas.width - this.offsetLeft * 2 - this.padding * (this.cols - 1)) / this.cols;
        const brickHeight = 25;
        
        // 砖块颜色设置
        const colors = [
            '#e74c3c', // 红色
            '#e67e22', // 橙色
            '#f1c40f', // 黄色
            '#2ecc71', // 绿色
            '#3498db', // 蓝色
            '#9b59b6', // 紫色
            '#34495e'  // 深蓝色
        ];
        
        // 随机确定布局密度（60%-100%的方块会出现）
        const density = 0.6 + Math.random() * 0.4;
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // 根据密度随机决定是否生成砖块
                if (Math.random() < density) {
                    const brickX = this.offsetLeft + c * (brickWidth + this.padding);
                    const brickY = this.offsetTop + r * (brickHeight + this.padding);
                    
                    // 随机选择颜色
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    
                    // 随机设置耐久度（最高3）
                    const durability = Math.floor(Math.random() * 3) + 1;
                    
                    bricks.push(new Brick(brickX, brickY, brickWidth, brickHeight, color, durability));
                }
            }
        }
        
        return bricks;
    }
} 