#!/bin/bash
# 停止彩票刮刮乐服务

SERVICE_NAME="lottery-game"

echo "正在停止 ${SERVICE_NAME} 服务..."
sudo systemctl stop ${SERVICE_NAME}

sleep 1

# 检查服务状态
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✗ 服务停止失败！"
    sudo systemctl status ${SERVICE_NAME} --no-pager
    exit 1
else
    echo "✓ 服务已停止"
fi
