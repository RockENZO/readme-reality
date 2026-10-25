# Readme Reality

**在用户照着 README 操作之前，发现失效的上手说明。**

离线检查本地链接、npm/pnpm/yarn 声明脚本、Python 脚本路径与依赖文件。输出行号、检查依据和真实候选路径。不调用模型、不需要密钥、不上传代码，也不会执行 README 命令。

- [互动演示](https://rockenzo.github.io/readme-reality/)使用明确标注的虚构快照，结果由真实共享引擎计算。
- Node.js 22.12+；从 GitHub Release 下载并解压 `readme-reality-0.1.1.tgz`。
- 在解压的 `package` 目录中运行 `node dist/cli.mjs check /你的仓库`，或添加 `--format json`。
- 目前没有发布 npm 包，不要使用假定存在的 npx 安装入口。

## 边界

只检查指定 Markdown 文件。本地链接相对于文档，代码块的工作目录每块重置为仓库根目录，支持块内简单 cd。复杂 shell、变量、workspace 选择器、第三方 Python 模块等标为“未检查”；git clone 等准备步骤不模拟。生成文件、下载权重和运行环境不在验证范围内。

退出码 0 表示没有确认错误，也可能只是部分覆盖；1 表示发现快照错误；2 表示输入或工具错误。不会自动修改文件，不读取密钥内容，不跟随符号链接，不访问仓库外路径。请扫描稳定的 checkout；它不是操作系统沙箱。

**文件或脚本声明存在，不等于命令能成功运行。** 完整命令、Action 使用方式、规则和限制见[英文说明](../README.md)。
