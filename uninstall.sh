#!/bin/bash
# 彩票刮刮乐系统卸载脚本

set -e

echo "=========================================="
echo "  彩票刮刮乐系统卸载脚本"
echo "=========================================="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "错误: 请使用 root 用户运行此脚本"
    echo "使用方法: sudo bash uninstall.sh"
    exit 1
fi

# 设置变量
APP_NAME="lottery-game"
APP_DIR="/opt/${APP_NAME}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

echo ""
read -p "确定要卸载 ${APP_NAME} 吗？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消卸载"
    exit 0
fi

echo ""
echo "步骤 1/4: 停止服务..."
if systemctl is-active --quiet ${APP_NAME}; then
    systemctl stop ${APP_NAME}
    echo "服务已停止"
else
    echo "服务未运行"
fi

echo ""
echo "步骤 2/4: 禁用开机自启..."
if systemctl is-enabled --quiet ${APP_NAME}; then
    systemctl disable ${APP_NAME}
    echo "已禁用开机自启"
else
    echo "服务未设置开机自启"
fi

echo ""
echo "步骤 3/4: 删除服务文件..."
if [ -f "${SERVICE_FILE}" ]; then
    rm -f ${SERVICE_FILE}
    systemctl daemon-reload
    echo "服务文件已删除"
else
    echo "服务文件不存在"
fi

echo ""
echo "步骤 4/4: 删除应用目录..."
if [ -d "${APP_DIR}" ]; then
    rm -rf ${APP_DIR}
    echo "应用目录已删除: ${APP_DIR}"
else
    echo "应用目录不存在"
fi

echo ""
echo "=========================================="
echo "  卸载完成！"
echo "=========================================="
