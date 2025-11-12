#!/bin/bash
# 重启彩票刮刮乐服务

SERVICE_NAME="lottery-game"

echo "正在重启 ${SERVICE_NAME} 服务..."
sudo systemctl restart ${SERVICE_NAME}

sleep 1

# 检查服务状态
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✓ 服务重启成功！"
    echo ""
    sudo systemctl status ${SERVICE_NAME} --no-pager
    echo ""
    echo "访问地址: http://localhost:1232"
    echo "查看日志: sudo journalctl -u ${SERVICE_NAME} -f"
else
    echo "✗ 服务重启失败！"
    echo "查看错误日志:"
    sudo journalctl -u ${SERVICE_NAME} -n 50 --no-pager
    exit 1
fi
