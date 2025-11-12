# 端口和监听地址配置说明

## 当前配置

- **端口**: 1232
- **监听地址**: 0.0.0.0（所有网络接口）

## 配置方式

### 方式1：使用 .env 文件（推荐）

已创建 `.env` 文件，内容如下：
```
PORT=1232
HOST=0.0.0.0
NODE_ENV=production
```

### 方式2：使用环境变量

```bash
PORT=1232 HOST=0.0.0.0 npm start
```

### 方式3：修改 server.js

在 server.js 文件的最后部分，找到：
```javascript
const PORT = process.env.PORT || 3000;
```

修改为：
```javascript
const PORT = process.env.PORT || 1232;
const HOST = process.env.HOST || '0.0.0.0';
```

然后找到：
```javascript
server.listen(PORT, () => {
```

修改为：
```javascript
server.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`🎮 抽奖游戏服务器运行在 http://${displayHost}:${PORT}`);
    console.log(`📡 监听地址: ${HOST}:${PORT}`);
```

## 验证配置

启动服务后，检查端口是否正确：

```bash
# 检查端口监听
netstat -tlnp | grep 1232

# 或使用 lsof
lsof -i :1232

# 测试访问
curl http://localhost:1232/health
```

## CentOS 7 部署

systemd 服务文件已配置为使用端口 1232：
- 服务文件: `lottery-game.service`
- 环境变量: `Environment=PORT=1232` 和 `Environment=HOST=0.0.0.0`

## 注意事项

1. 如果使用 Kiro IDE，可能会自动格式化代码，建议使用 .env 文件方式
2. 确保防火墙开放了 1232 端口
3. 0.0.0.0 表示监听所有网络接口，可以从外部访问
4. 如果只需本地访问，可以改为 127.0.0.1
