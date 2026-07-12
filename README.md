# EBS™ Community

一个免费、开源的 AI 聊天 Web 应用，几分钟即可在本地运行——使用你自己的 API 密钥。

**[文档](https://docs.ebs.top)** · **[社区文档](https://docs.ebs.top/community.html)** · **[ebs.top](https://ebs.top)**

在一个小巧、易读的 Next.js 代码库中，提供支持多家服务商的流式聊天，以及带水印的图像生成演示。无需账户、无需注册、无需数据库。带上你自己的密钥即可开始。

> **EBS Community 是免费版。** 它是对整体架构的一次浅尝——而不是一门生意。当你准备好构建并发布真正的 AI 产品时，请参阅下文的 [升级](#升级)。

## 功能特性

- **流式 AI 聊天**——通过 Vercel AI SDK 接入 OpenAI、Anthropic、Google、GLM（z.ai）、DeepSeek 和 Qwen 六种模型。通过环境变量使用你自己的密钥。
- **图像生成演示**——由 fal.ai 驱动的带水印、512×512 演示。用于展示能力，不适用于生产环境。
- **几分钟即可本地运行**——`npm install`、添加密钥、`npm run dev`。无需数据库、无需 Docker。
- **小巧且易读**——一个 Next.js 代码库（React、TypeScript、Tailwind），可以从头到尾通读。没有黑箱。

## 快速开始

需要 Node 22 及以上版本。

获取本项目并进入项目目录后，运行：

```bash
npm install
cp .env.example .env.local   # 至少添加一个服务商密钥
npm run dev
```

打开 http://localhost:3000 。在未设置任何密钥的情况下，应用仍可启动：聊天会返回带标记的空跑（dry-run）回复，图像演示会显示“请设置密钥”的提示。添加密钥即可开启对应功能。

## 配置

在 `.env.local` 中设置密钥（全部可选——按需添加）：

| 变量 | 启用的功能 |
|---|---|
| `OPENAI_API_KEY` | 使用 GPT 模型聊天 |
| `ANTHROPIC_API_KEY` | 使用 Claude 模型聊天 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | 使用 Gemini 模型聊天 |
| `ZAI_API_KEY` | 使用 GLM 模型聊天 |
| `DEEPSEEK_API_KEY` | 使用 DeepSeek 模型聊天 |
| `DASHSCOPE_API_KEY` | 使用 Qwen 模型聊天 |
| `FAL_KEY` | 图像生成演示（fal.ai） |

密钥保存在本地——仅从环境变量中读取。没有数据库，除了直接发送给你所配置的服务商之外，不会向任何地方发送任何内容。

完整配置参考：**[docs.ebs.top/community.html](https://docs.ebs.top/community.html)**

## 它是什么（以及不是什么）

EBS Community 有意保持简单：单用户、本地运行、自带密钥。聊天记录仅在会话内保留。图像演示被刻意设计为带水印且上限 512×512。没有计费、没有鉴权、没有持久化。

它是更大系统的免费尝鲜版——一个干净、诚实的起点，供你探索其架构。

## 升级

需要的不只是一个演示？付费版本采用相同的架构，但更加完整成熟：

- **[EBS Developer — Web](https://docs.ebs.top/developer-web.html)**（$249）——完整脚手架：媒体工作室（图像、视频、音频）、图库、多模型目录、Clerk 鉴权、Postgres、Redis、存储，以及可直接部署的配置。
- **[EBS Developer — Message](https://docs.ebs.top/developer-message.html)**（$249）——一个 AI 机器人横跨八个消息平台：Discord、Telegram、Slack、WhatsApp、企业微信、飞书、钉钉和微信公众号。
- **[EBS Business](https://docs.ebs.top/business.html)**——上线并向客户收费：计费、预付费积分账本、支付通道以及多租户。

两个 Developer 版本单独出售，因为大多数开发者要么构建 Web 应用，要么构建机器人——而不是两者兼有。

每个版本的完整文档——安装、每一个环境变量、架构以及部署——都在 **[docs.ebs.top](https://docs.ebs.top)**。购买前请先阅读手册。

前往 **[ebs.top](https://ebs.top)** 了解更多并升级。

## 许可证

MIT——参见 [LICENSE](./LICENSE)。可自由使用、修改和二次开发。

## 商标

EBS™ 是 eBusiness Systems 的商标。MIT 许可证仅涵盖源代码；它不授予使用 EBS 名称或标志来为你自己的产品进行品牌宣传或暗示背书的权利。

## 支持

社区支持通过 GitHub Issues 和 Discussions 提供。对于付费版本，支持已包含在你于 [ebs.top](https://ebs.top) 的购买之中。
