# 更新日志

## v0.1.18-alpha.1 (2025-02-25)

### 新功能

- **CLI 技能安装** — 技能市场页面新增命令行安装
- **安装实时进度** — CLI 安装支持 IPC 事件流实时推送状态
- **HiLight 频道 WebSocket URL 下拉选择** — wsUrl 从文本输入改为下拉（官方/自定义）
- **HiLight 插件升级至 2.0.1** — 新增消息策略（dmPolicy）和允许用户（allowFrom）配置字段
- **自动切换外部触发会话** — 飞书等外部渠道触发新会话时自动切换，实时查看流式输出

### 修复

- **网关进程终止优化** — 改进孤儿进程清理策略：先 SIGTERM 等待 3 秒，再 SIGKILL 残留进程
- **自定义模型选择修复** — 自定义/ollama provider 配置改为完全替换（非合并），避免不同 baseUrl 的模型混在一起
- **API Key 传递方式** — provider apiKey 从模板字符串改为直接传值，gateway 通过 auth-profiles 解析密钥
- **多 Agent 密钥同步** — API Key 保存/删除改为遍历所有 agent 目录，确保非 main agent 也能同步
- **会话删除修复** — 修复 session:delete preload 白名单缺失
- **卸载清理** — NSIS 卸载时清理 ClawX-Data 和 clawx-updater 目录

### 合并上游 (v0.1.16 ~ v0.1.17-alpha.0)

- 更新 OpenClaw 版本至 223 (#149)
- 更新发布工作流，使用 pnpm 构建发布 (#150, #152)
- 应用更新支持倒计时自动安装，可手动取消 (#151)
- 网关进程终止处理优化，增加超时机制 (#153)
- 开发环境配置 (#157)
- 压缩构建产物体积 (#160)
- ClawX 上下文集成到 OpenClaw 工作区初始化 (#161)
- 修复自定义模型选择错误 (#164)
- Google 默认模型升级至 gemini-3.1-pro-preview
- 新增 custom provider 注册
