#!/bin/bash
# 推送到 GitHub 脚本

set -e

echo "🚀 准备推送到 GitHub..."

# 配置（请修改为您的信息）
GITHUB_USER="Yujianqiao"
REPO_NAME="douyin-downloader"
BRANCH_NAME="feature/ai-subtitle-remover"

# 检查是否已配置 git
git config --global user.name "AI Developer" 2>/dev/null || true
git config --global user.email "ai@example.com" 2>/dev/null || true

# 添加远程仓库（如果不存在）
if ! git remote | grep -q "origin"; then
    echo "🔗 添加远程仓库..."
    git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

# 创建并切换到新分支
echo "🌿 创建分支: ${BRANCH_NAME}"
git checkout -b "${BRANCH_NAME}" 2>/dev/null || git checkout "${BRANCH_NAME}"

# 推送代码
echo "📤 推送到 GitHub..."
git push -u origin "${BRANCH_NAME}" || {
    echo ""
    echo "❌ 推送失败！可能原因："
    echo "   1. 需要 GitHub 认证（token 或 SSH key）"
    echo "   2. 仓库不存在或没有写入权限"
    echo ""
    echo "💡 手动推送命令："
    echo "   git push -u origin ${BRANCH_NAME}"
    echo ""
    echo "🔗 仓库地址: https://github.com/${GITHUB_USER}/${REPO_NAME}"
    exit 1
}

echo ""
echo "✅ 推送成功！"
echo ""
echo "🔗 查看代码: https://github.com/${GITHUB_USER}/${REPO_NAME}/tree/${BRANCH_NAME}"
echo ""
echo "📋 接下来："
echo "   1. 在 GitHub 上创建 Pull Request"
echo "   2. 合并到 main 分支"
echo "   3. 构建并发布新版本"
