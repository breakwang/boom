#!/bin/bash
# 查看彩票刮刮乐服务状态

SERVICE_NAME="lottery-game"

echo "=========================================="
echo "  ${SERVICE_NAME} 服务状态"
echo "=========================================="
echo ""

sudo systemctl status ${SERVICE_NAME} --no-pager

echo ""
echo "=========================================="
echo "  最近日志 (最后20行)"
echo "=========================================="
echo ""

sudo journalctl -u ${SERVICE_NAME} -n 20 --no-pager

echo ""
echo "=========================================="
echo "  实时日志命令"
echo "=========================================="
echo "sudo journalctl -u ${SERVICE_NAME} -f"
