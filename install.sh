#!/bin/bash
# 彩票刮刮乐系统安装脚本 for CentOS 7

set -e

echo "=========================================="
echo "  彩票刮刮乐系统安装脚本"
echo "=========================================="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "错误: 请使用 root 用户运行此脚本"
    echo "使用方法: sudo bash install.sh"
    exit 1
fi

# 设置变量
APP_NAME="lottery-game"
APP_DIR="/opt/${APP_NAME}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
CURRENT_DIR=$(pwd)

echo ""
echo "步骤 1/6: 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "未检测到 Node.js，正在安装..."
    curl -sL https://rpm.nodesource.com/setup_16.x | bash -
    yum install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo "已安装 Node.js ${NODE_VERSION}"
fi

echo ""
echo "步骤 2/6: 创建应用目录..."
mkdir -p ${APP_DIR}
echo "应用目录: ${APP_DIR}"

echo ""
echo "步骤 3/6: 复制应用文件..."
cp -r ${CURRENT_DIR}/* ${APP_DIR}/
echo "文件已复制到 ${APP_DIR}"

echo ""
echo "步骤 4/6: 安装依赖..."
cd ${APP_DIR}
npm install --production
echo "依赖安装完成"

echo ""
echo "步骤 5/6: 配置 systemd 服务..."
cp ${APP_DIR}/lottery-game.service ${SERVICE_FILE}

# 修改服务文件中的路径
sed -i "s|WorkingDirectory=.*|WorkingDirectory=${APP_DIR}|g" ${SERVICE_FILE}

# 重新加载 systemd
systemctl daemon-reload
echo "systemd 服务已配置"

echo ""
echo "步骤 6/6: 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=1232/tcp
    firewall-cmd --reload
    echo "防火墙已配置，开放端口 1232"
else
    echo "未检测到 firewalld，跳过防火墙配置"
fi

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""
echo "使用以下命令管理服务："
echo "  启动服务: systemctl start ${APP_NAME}"
echo "  停止服务: systemctl stop ${APP_NAME}"
echo "  重启服务: systemctl restart ${APP_NAME}"
echo "  查看状态: systemctl status ${APP_NAME}"
echo "  开机自启: systemctl enable ${APP_NAME}"
echo "  查看日志: journalctl -u ${APP_NAME} -f"
echo ""
echo "访问地址: http://YOUR_SERVER_IP:1232"
echo ""
echo "现在启动服务..."
systemctl start ${APP_NAME}
systemctl enable ${APP_NAME}

sleep 2
systemctl status ${APP_NAME} --no-pager

echo ""
echo "服务已启动并设置为开机自启！"
