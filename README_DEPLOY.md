# 彩票刮刮乐系统 - CentOS 7 部署指南

## 快速安装

### 1. 上传文件到服务器

将整个项目文件夹上传到 CentOS 7 服务器，例如：
```bash
scp -r lottery-game root@your-server-ip:/root/
```

### 2. 运行安装脚本

```bash
cd /root/lottery-game
chmod +x *.sh
sudo bash install.sh
```

安装脚本会自动完成：
- ✓ 安装 Node.js（如果未安装）
- ✓ 创建应用目录 `/opt/lottery-game`
- ✓ 安装依赖包
- ✓ 配置 systemd 服务
- ✓ 配置防火墙（开放 3000 端口）
- ✓ 启动服务并设置开机自启

## 服务管理命令

### 使用脚本管理（推荐）

```bash
# 启动服务
./start.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 查看状态
./status.sh

# 卸载服务
sudo ./uninstall.sh
```

### 使用 systemctl 管理

```bash
# 启动服务
sudo systemctl start lottery-game

# 停止服务
sudo systemctl stop lottery-game

# 重启服务
sudo systemctl restart lottery-game

# 查看状态
sudo systemctl status lottery-game

# 开机自启
sudo systemctl enable lottery-game

# 禁用开机自启
sudo systemctl disable lottery-game

# 查看实时日志
sudo journalctl -u lottery-game -f

# 查看最近日志
sudo journalctl -u lottery-game -n 100
```

## 访问应用

安装完成后，通过浏览器访问：
```
http://YOUR_SERVER_IP:1232
```

## 配置说明

### 修改端口

编辑服务文件：
```bash
sudo vim /etc/systemd/system/lottery-game.service
```

修改 `Environment=PORT=1232` 为你想要的端口，然后重启：
```bash
sudo systemctl daemon-reload
sudo systemctl restart lottery-game
```

### 修改监听地址

默认监听 `0.0.0.0`（所有网络接口），如需修改：
```bash
sudo vim /etc/systemd/system/lottery-game.service
```

修改 `Environment=HOST=0.0.0.0` 为你想要的地址（如 `127.0.0.1` 仅本地访问）。

### 修改运行用户

默认使用 `nobody` 用户运行，如需修改：
```bash
sudo vim /etc/systemd/system/lottery-game.service
```

修改 `User=nobody` 为你想要的用户。

## 防火墙配置

### 开放端口

```bash
# 开放 1232 端口
sudo firewall-cmd --permanent --add-port=1232/tcp
sudo firewall-cmd --reload

# 查看已开放端口
sudo firewall-cmd --list-ports
```

### 关闭端口

```bash
sudo firewall-cmd --permanent --remove-port=1232/tcp
sudo firewall-cmd --reload
```

## 使用 Nginx 反向代理（可选）

### 1. 安装 Nginx

```bash
sudo yum install -y nginx
```

### 2. 配置 Nginx

创建配置文件：
```bash
sudo vim /etc/nginx/conf.d/lottery-game.conf
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 修改为你的域名或 IP

    location / {
        proxy_pass http://localhost:1232;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. 启动 Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 开放 80 端口

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

现在可以通过 `http://your-domain.com` 访问应用。

## 故障排查

### 服务无法启动

1. 查看详细日志：
```bash
sudo journalctl -u lottery-game -n 100 --no-pager
```

2. 检查端口是否被占用：
```bash
sudo netstat -tlnp | grep 1232
```

3. 检查 Node.js 是否安装：
```bash
node -v
npm -v
```

### 无法访问

1. 检查服务是否运行：
```bash
sudo systemctl status lottery-game
```

2. 检查防火墙：
```bash
sudo firewall-cmd --list-ports
```

3. 检查 SELinux（如果启用）：
```bash
sudo setenforce 0  # 临时关闭
```

### 查看进程

```bash
ps aux | grep node
```

## 性能优化

### 使用 PM2 管理（可选）

如果需要更强大的进程管理，可以使用 PM2：

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
cd /opt/lottery-game
pm2 start server.js --name lottery-game

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs lottery-game
```

## 备份与恢复

### 备份

```bash
# 备份应用目录
sudo tar -czf lottery-game-backup-$(date +%Y%m%d).tar.gz /opt/lottery-game

# 备份服务文件
sudo cp /etc/systemd/system/lottery-game.service ~/lottery-game.service.bak
```

### 恢复

```bash
# 恢复应用目录
sudo tar -xzf lottery-game-backup-YYYYMMDD.tar.gz -C /

# 恢复服务文件
sudo cp ~/lottery-game.service.bak /etc/systemd/system/lottery-game.service
sudo systemctl daemon-reload
sudo systemctl restart lottery-game
```

## 更新应用

```bash
# 1. 停止服务
sudo systemctl stop lottery-game

# 2. 备份当前版本
sudo cp -r /opt/lottery-game /opt/lottery-game.bak

# 3. 上传新版本文件到服务器

# 4. 复制新文件
sudo cp -r /path/to/new/files/* /opt/lottery-game/

# 5. 安装依赖
cd /opt/lottery-game
sudo npm install --production

# 6. 启动服务
sudo systemctl start lottery-game

# 7. 检查状态
sudo systemctl status lottery-game
```

## 安全建议

1. **使用非标准端口**：当前使用 1232 端口，避免常见端口扫描
2. **使用 Nginx**：通过反向代理隐藏真实端口
3. **配置 HTTPS**：使用 Let's Encrypt 免费证书
4. **限制访问**：使用防火墙规则限制访问 IP
5. **定期备份**：设置定时任务自动备份
6. **更新系统**：定期更新 CentOS 和 Node.js
7. **监听地址**：当前监听 0.0.0.0（所有接口），如仅本地访问可改为 127.0.0.1

## 联系支持

如有问题，请查看日志文件或联系技术支持。
