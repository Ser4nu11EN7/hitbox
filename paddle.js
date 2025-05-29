class Paddle {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 挡板尺寸
        this.width = 100;
        this.height = 15;
        
        // 挡板位置
        this.x = (canvas.width - this.width) / 2;
        this.y = canvas.height - 30;
        
        // 挡板移动速度
        this.speed = 8;
        this.dx = 0;
        
        // 挡板颜色和视觉效果
        this.color = '#2ecc71';
        this.borderColor = '#27ae60';
        
        // 鼠标控制状态
        this.isMouseControl = true;
        
        // 键盘控制状态
        this.rightPressed = false;
        this.leftPressed = false;
        
        // 触摸控制状态
        this.isTouching = false;
        this.touchX = 0;
        
        // 绑定键盘和鼠标事件
        this.initEventListeners();
    }
    
    initEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => this.keyDownHandler(e), false);
        document.addEventListener('keyup', (e) => this.keyUpHandler(e), false);
        
        // 鼠标控制
        document.addEventListener('mousemove', (e) => this.mouseMoveHandler(e), false);
        
        // 触摸控制（移动端）
        this.canvas.addEventListener('touchstart', (e) => this.touchStartHandler(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.touchMoveHandler(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.touchEndHandler(e), false);
        
        // 添加移动端虚拟按钮支持
        this.setupVirtualButtons();
    }
    
    // 设置移动端虚拟方向按钮
    setupVirtualButtons() {
        // 查找控制区域，如果不存在则创建
        let controlsArea = document.querySelector('.mobile-controls');
        
        if (!controlsArea) {
            controlsArea = document.createElement('div');
            controlsArea.className = 'mobile-controls';
            controlsArea.style.cssText = `
                display: none;
                position: fixed;
                bottom: 20px;
                left: 0;
                width: 100%;
                padding: 10px;
                text-align: center;
                z-index: 100;
            `;
            
            // 创建左右虚拟按钮
            const leftBtn = document.createElement('button');
            leftBtn.id = 'virtualLeftBtn';
            leftBtn.innerHTML = '&larr;';
            leftBtn.style.cssText = `
                margin: 0 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.7);
                font-size: 24px;
                color: #333;
            `;
            
            const rightBtn = document.createElement('button');
            rightBtn.id = 'virtualRightBtn';
            rightBtn.innerHTML = '&rarr;';
            rightBtn.style.cssText = leftBtn.style.cssText;
            
            // 添加到控制区域
            controlsArea.appendChild(leftBtn);
            controlsArea.appendChild(rightBtn);
            
            // 添加到文档中
            document.body.appendChild(controlsArea);
            
            // 为虚拟按钮添加事件
            leftBtn.addEventListener('touchstart', () => { 
                this.leftPressed = true; 
                this.isMouseControl = false;
            });
            
            leftBtn.addEventListener('touchend', () => { 
                this.leftPressed = false; 
            });
            
            rightBtn.addEventListener('touchstart', () => { 
                this.rightPressed = true; 
                this.isMouseControl = false;
            });
            
            rightBtn.addEventListener('touchend', () => { 
                this.rightPressed = false; 
            });
            
            // 在小屏幕设备上显示虚拟按钮
            const showVirtualButtons = () => {
                if (window.innerWidth <= 768) {
                    controlsArea.style.display = 'block';
                } else {
                    controlsArea.style.display = 'none';
                }
            };
            
            // 初次检查并添加窗口大小变化监听
            showVirtualButtons();
            window.addEventListener('resize', showVirtualButtons);
        }
    }
    
    keyDownHandler(e) {
        // 切换到键盘控制
        this.isMouseControl = false;
        
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = true;
        }
    }
    
    keyUpHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = false;
        }
    }
    
    mouseMoveHandler(e) {
        // 切换到鼠标控制
        this.isMouseControl = true;
        
        // 计算鼠标相对于Canvas的位置
        const relativeX = e.clientX - this.canvas.getBoundingClientRect().left;
        
        // 更新挡板位置
        this.updatePaddlePosition(relativeX);
    }
    
    touchStartHandler(e) {
        // 防止触摸滑动时页面滚动
        e.preventDefault();
        
        // 设置触摸状态
        this.isTouching = true;
        
        // 切换到触摸控制
        this.isMouseControl = true;
        
        // 获取第一个触摸点
        const touch = e.touches[0];
        this.touchX = touch.clientX;
        
        // 计算触摸点相对于Canvas的位置
        const relativeX = this.touchX - this.canvas.getBoundingClientRect().left;
        
        // 更新挡板位置
        this.updatePaddlePosition(relativeX);
    }
    
    touchMoveHandler(e) {
        // 防止触摸滑动时页面滚动
        e.preventDefault();
        
        if (!this.isTouching) return;
        
        // 获取第一个触摸点
        const touch = e.touches[0];
        this.touchX = touch.clientX;
        
        // 计算触摸点相对于Canvas的位置
        const relativeX = this.touchX - this.canvas.getBoundingClientRect().left;
        
        // 更新挡板位置
        this.updatePaddlePosition(relativeX);
    }
    
    touchEndHandler(e) {
        // 结束触摸
        this.isTouching = false;
    }
    
    // 统一更新挡板位置的方法
    updatePaddlePosition(relativeX) {
        // 确保挡板在画布范围内
        if (relativeX > 0 && relativeX < this.canvas.width) {
            // 根据触摸/鼠标位置更新挡板位置（挡板中心与触摸点对齐）
            this.x = relativeX - this.width / 2;
            
            // 限制挡板不超出边界
            if (this.x < 0) {
                this.x = 0;
            } else if (this.x + this.width > this.canvas.width) {
                this.x = this.canvas.width - this.width;
            }
        }
    }
    
    update() {
        // 键盘控制逻辑
        if (!this.isMouseControl) {
            // 根据按键状态更新挡板位置
            if (this.rightPressed && this.x + this.width < this.canvas.width) {
                this.x += this.speed;
            } else if (this.leftPressed && this.x > 0) {
                this.x -= this.speed;
            }
        }
    }
    
    draw() {
        // 绘制挡板阴影
        this.ctx.beginPath();
        this.ctx.rect(this.x, this.y + 2, this.width, this.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fill();
        this.ctx.closePath();
        
        // 绘制挡板主体
        this.ctx.beginPath();
        this.ctx.rect(this.x, this.y, this.width, this.height);
        
        // 创建渐变填充
        const gradient = this.ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.borderColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 绘制高光效果
        this.ctx.beginPath();
        this.ctx.rect(this.x + 5, this.y + 2, this.width - 10, 3);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    reset() {
        // 重置挡板位置
        this.x = (this.canvas.width - this.width) / 2;
    }
} 