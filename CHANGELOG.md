# 更新日志

## v0.1.18-alpha.1 (2025-02-25)

### 我们的新功能

- **CLI 技能安装** — 技能市场页面新增命令行安装，支持粘贴 `npx skills add ...` 或 GitHub 地址，一键安装技能
- **安装实时进度** — CLI 安装支持 IPC 事件流实时推送状态，中文翻译进度消息
- **ANSI 转义码清理** — 全面清理 CLI 输出中的控制字符，确保进度文字干净显示
- **HiLight 频道 WebSocket URL 下拉选择** — wsUrl 从文本输入改为下拉（官方/自定义）
- **自动切换外部触发会话** — 飞书等外部渠道触发新会话时自动切换，实时查看流式输出
- **会话删除修复** — 修复 session:delete preload 白名单缺失
- **卸载清理** — NSIS 卸载时清理 ClawX-Data 和 clawx-updater 目录

### 合并上游 v0.1.16

- feat(openclaw): update openclaw version 223 (#149)
- chore(release): update release workflow to build and publish artifacts (#150)
- feat(updater): implement auto-install countdown and cancellation for updates (#151)
- chore(release): update build commands in release workflow to use pnpm (#152)
- fix(gateway): improve process termination handling and add timeout (#153)

### 合并上游 v0.1.17-alpha.1

- Development environment setup (#157)

### 合并上游 v0.1.17-alpha.2

- feat(package): compress artifact size (#160)
- feat(electron): integrate ClawX context into openclaw workspace initi… (#161)
- 最新修改验证 (#162)

### 合并上游 v0.1.17-alpha.0

- fix(model): custom model choose error (#164) — 自定义模型配置改为完全替换（非合并）
- API Key 传递从模板字符串改为直接传值，gateway 通过 auth-profiles 解析
- 多 Agent 密钥同步：遍历所有 agent 目录写入/删除 key
- Google 默认模型升级至 gemini-3.1-pro-preview
- 新增 custom provider 注册
- 网关孤儿进程清理优化：先 SIGTERM 等 3 秒，再 SIGKILL 残留进程
