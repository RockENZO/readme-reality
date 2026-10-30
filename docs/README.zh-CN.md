# Readme Reality

**在用户照着 README 操作之前，发现失效的上手说明。**

离线检查本地链接、npm/pnpm/yarn 声明脚本、Python 脚本路径与依赖文件。输出行号、检查依据和真实候选路径。不调用模型、不需要密钥、不上传代码，也不会执行 README 命令。

- [互动演示](https://rockenzo.github.io/readme-reality/)使用明确标注的虚构快照，结果由真实共享引擎计算。
- Node.js 22.12+；从 GitHub Release 下载并解压 `readme-reality-0.3.0.tgz`。
- 在解压的 `package` 目录中运行 `node dist/cli.mjs check /你的仓库`，或添加 `--format json`。
- 目前没有发布 npm 包，不要使用假定存在的 npx 安装入口。

## 边界

只检查显式指定的 Markdown 文件，不递归发现文档或追踪所有链接。本地链接相对于文档，代码块的工作目录每块重置为仓库根目录，支持块内简单 cd。复杂 shell、变量、workspace 选择器、第三方 Python 模块等标为“未检查”；git clone 等准备步骤不模拟。生成文件、下载权重和运行环境不在验证范围内。

退出码 0 表示没有确认错误，也可能只是部分覆盖；1 表示发现快照错误；2 表示输入或工具错误。不会自动修改文件，不读取密钥内容，不跟随符号链接，不访问仓库外路径。请扫描稳定的 checkout；它不是操作系统沙箱。

**文件或脚本声明存在，不等于命令能成功运行。** 完整命令、Action 使用方式、规则和限制见[英文说明](../README.md)。

## HTML 卡片中的本地引用

支持原始 HTML 中的 `a[href]` 与 `img[src]`，沿用 Markdown 的仓库内路径规则、实体解码和属性所在行号。注释、代码示例、脚本/样式文本及 template 内容不作为真实引用；动态 URL、空属性、`srcset` 等其他属性和外部命名空间明确显示未检查。出现 HTML `base` 时不猜测 HTML URL 的解析方式，相关引用保留未检查。不会执行 HTML、访问外部链接或验证图片内容。网页新增 Profile media 示例，可比较缺失 GIF 路径与修复后的快照。

## 一次检查多份文档

CLI 可重复传入 `--readme`，例如 `--readme README.md --readme docs/start.md`；Action 的 `readme` 输入每行一个路径，空行忽略、每行两端空白去除。不展开 glob，每次最多传入 25 个路径，规范化后重复的路径只计一次。单个文档仍受 2 MB 限制，各文档保留自己的行号、相对链接和代码块工作目录规则。

多项选择输出 `kind: "batch"`，包含每份文档的状态、汇总计数和发现。缺失、不可读、超限或不安全路径显示 `invalid`，其他文件继续检查；存在任意输入失败时退出 2，优先于发现错误的退出 1。默认及单项 CLI 保留原来的 JSON 格式。Action 新增 `documents` 和 `input-errors` 输出。文件数量不等于通过检查的数量，空文档和不支持的内容仍保留部分覆盖状态。
