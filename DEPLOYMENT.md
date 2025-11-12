# 部署说明

本项目支持多人跨设备、跨网络的实时抽奖游戏。

## 架构说明

- **前端**: HTML + CSS + JavaScript + Socket.IO Client
- **后端**: Node.js + Express + Socket.IO
- **实时通信**: WebSocket
- **数据存储**: 内存存储（可扩展为数据库）

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

或使用开发模式（自动重启）：

```bash
npm run dev
```

### 3. 访问游戏

打开浏览器访问：
```
http://localhost:3000
```

## 服务器部署

### 方式一：使用传统服务器（VPS、云服务器）

#### 1. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 2. 上传代码

```bash
# 使用 git
git clone <your-repo>
cd lottery-game

# 或使用 scp
scp -r ./* user@server:/path/to/lottery-game/
```

#### 3. 安装依赖

```bash
npm install --production
```

#### 4. 使用 PM2 运行（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name lottery-game

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs lottery-game
```

#### 5. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 方式二：部署到 Heroku

#### 1. 创建 Procfile

```
web: node server.js
```

#### 2. 部署

```bash
# 登录 Heroku
heroku login

# 创建应用
heroku create your-lottery-game

# 推送代码
git push heroku main

# 打开应用
heroku open
```

### 方式三：部署到 Railway

1. 访问 [railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 选择项目并部署
4. Railway 会自动检测 Node.js 项目并部署

### 方式四：部署到 Vercel（需要调整）

Vercel 主要支持无服务器函数，WebSocket 支持有限。建议使用 Railway、Heroku 或传统服务器。

## 环境变量

创建 `.env` 文件（可选）：

```bash
PORT=3000
NODE_ENV=production
```

## 防火墙配置

确保开放端口：

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## SSL 配置（HTTPS）

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

## 监控和日志

### PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs

# 重启应用
pm2 restart lottery-game

# 停止应用
pm2 stop lottery-game
```

### 日志文件

日志存储在：
- PM2: `~/.pm2/logs/`
- 应用日志: 控制台输出

## 性能优化

### 1. 启用 Gzip 压缩

在 `server.js` 中添加：

```javascript
const compression = require('compression');
app.use(compression());
```

### 2. 静态文件缓存

```javascript
app.use(express.static('public', {
    maxAge: '1d'
}));
```

### 3. 使用 Redis 存储（可选）

对于高并发场景，可以使用 Redis 替代内存存储：

```bash
npm install redis
```

## 扩展功能

### 添加数据库持久化

```bash
npm install mongoose  # MongoDB
# 或
npm install mysql2    # MySQL
```

### 添加用户认证

```bash
npm install passport passport-local express-session
```

### 添加管理后台

创建管理员界面，用于：
- 查看游戏历史
- 管理奖池设置
- 查看在线用户统计

## 故障排查

### WebSocket 连接失败

1. 检查防火墙设置
2. 确认 Nginx 配置正确
3. 查看浏览器控制台错误

### 服务器崩溃

```bash
# 查看 PM2 日志
pm2 logs lottery-game --lines 100

# 重启服务
pm2 restart lottery-game
```

### 内存占用过高

```bash
# 查看内存使用
pm2 show lottery-game

# 设置内存限制
pm2 start server.js --max-memory-restart 500M
```

## 安全建议

1. **限制请求频率**: 使用 express-rate-limit
2. **输入验证**: 验证所有客户端输入
3. **HTTPS**: 始终使用 HTTPS
4. **CORS 配置**: 限制允许的域名
5. **定期更新**: 保持依赖包更新

## 支持

- GitHub Issues: [创建问题](https://github.com/your-repo/issues)
- 邮件支持: your-email@example.com

## 许可证

MIT License


