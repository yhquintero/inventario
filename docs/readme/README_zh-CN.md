<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="NovaGest 标志" />

# NovaGest

### 管理。成长。前进。

**为您的企业提供库存、收银、每日现金对账和报表 —— 支持网页、Android 与离线使用。**

🌐 [Español](../../README.md) · [English](README_en.md) · [Português](README_pt-BR.md) · [Français](README_fr.md) · [Italiano](README_it.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · **简体中文**

[![版本](https://img.shields.io/badge/%E7%89%88%E6%9C%AC-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![平台](https://img.shields.io/badge/%E5%B9%B3%E5%8F%B0-Web%20%C2%B7%20Android%20%C2%B7%20%E6%9C%8D%E5%8A%A1%E5%99%A8-1e1b4b?style=flat-square)](#-包含内容)
[![PWA](https://img.shields.io/badge/PWA-%E7%A6%BB%E7%BA%BF%E5%8F%AF%E7%94%A8-059669?style=flat-square)](#-常见问题)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-快速开始)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-%E5%85%B1%E4%BA%AB%E6%95%B0%E6%8D%AE-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![许可证](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-%E4%B8%93%E6%9C%89-475569?style=flat-square)](../../LICENSE)

[功能](#-功能) · [截图](#-截图) · [快速开始](#-快速开始) · [文档](#-文档) · [常见问题](#-常见问题) · [安全](#-安全) · [许可证](#-许可证)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest：浏览器中的仪表盘与手机上的快速销售" />
</p>

> [!NOTE]
> 本文译自[西班牙语 README](../../README.md)，以西班牙语版本为准。应用界面和 `docs/` 中的详细指南均为西班牙语。

> [!IMPORTANT]
> **NovaGest 是专有软件。** 代码可在 GitHub 上查看，但在企业中使用、复制、修改或分发本软件，须获得权利人授予的**使用许可**。请参阅 [LICENSE](../../LICENSE) 和[许可证](#-许可证)一节。

## 💡 NovaGest 是什么？

**NovaGest** 将企业日常所需集中在一处：**多仓库库存**、**收银（销售点）**、**每日现金对账**以及**带分析的报表**。告别零散的表格和笔记本：网页应用可以像 App 一样安装，断网后仍能继续工作；Android 应用让业务随身携带；共享服务器让所有人实时基于同一份数据工作 —— 并提供使用许可、角色、审计和备份。

> 📊 **以您的数据为准。** Excel 工作簿仅作为导入和参考来源：在未向您展示**预览**并获得确认之前，应用绝不会导入或替换业务数据。新安装可以从项目自带的初始数据开始使用。

## 🧩 包含内容

| 应用 | 用途 |
|---|---|
| 🌐 **网页（PWA）** | 指挥中心：库存、仓库、数值导入、出入库记录、快速销售、每日现金对账、周报、库存核对与系统管理 —— 支持全局搜索（`Ctrl+K`）、内置引导、键盘快捷键以及浅色/深色模式。可作为应用安装，并可离线打开。 |
| 📱 **Android** | 随时随地开展业务：使用 Kotlin + Jetpack Compose 提供同样的管理功能，支持本地存储、生物识别解锁，并在联网时与服务器同步。 |
| 🗄️ **服务器** | 连接一切的核心：API 与网站运行在同一个 Python 进程中，共享数据存储于 SQLite，会话与权限在服务器端校验，并提供签名许可、审计和自动加密备份。 |

## ✨ 功能

- 📦 **多仓库库存** —— 每个仓库保留各自的库存，总库存汇总所有仓库；可导入数值、在仓库之间调拨货物，并在完整历史记录下调整差异。
- 🛒 **收银** —— 快速销售会立即扣减当前仓库的库存，支持**条码扫描**（摄像头或 USB/蓝牙扫码枪）、为客户**现金或赊账**结算，并自动计算佣金和配送费。
- 🤝 **客户与赊账** —— 客户档案含信用额度，应收账款含到期日和状态（待付/部分/逾期/已付），并记录**还款**历史；应收总额显示在仪表盘上。
- 🧮 **每日现金对账（cuadre）** —— CUP/USD 与 MXN/USD 汇率、收款、存入、取出、资金和支出：结果为 0 时当日即为「已对平」，否则应用会提醒您。
- 🔄 **出入库记录** —— 销售、入库和出库，记录仓库、销售点、数量、金额和备注；每笔记录都会重新计算库存并留存。
- 🧾 **成本卡与 IPV** —— 按产品或服务管理的版本化成本卡（取自自有库存的组成部分、总成本、出成率和每份成本），流程为草稿 → 已批准；以及按期间进行的 **IPV 控制**（`IPV-YYYY-NNNN`），对照成本卡进行校验。网页端：**Fichas de costo · IPV**；Android：同步查看。改编自 [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos)；金额以每张成本卡的币种（USD 或 CUP）保存。
- 📊 **报表与核对** —— 每日对账、周汇总，以及按日、周、月、年或自定义区间的库存核对，可导出 CSV/PDF，方便打印或发送给会计。
- 📈 **分析与目标** —— 按期间统计的销售额、毛利与净利、按售价和成本计算的库存价值，以及每日和每周目标的完成进度。
- 🕵️ **历史与审计** —— 按日记录价格、成本和汇率；按每位用户的角色记录谁在何时做了什么。
- ☁️ **跨平台同步** —— 网页与 Android 基于同一份数据工作；断网时网页端可继续运行，并在重新连接后同步。
- 🔐 **企业级安全** —— 经过加密签名的使用许可、两步验证（TOTP）、多次失败后锁定、日结关账以及加密备份。

## 📸 截图

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="快速销售：条码扫描、分类、商品与购物车" /><br /><sub><b>快速销售</b> —— 条码扫描、购物车，以及现金或赊账结算。</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="库存：数量、价格、成本与分类" /><br /><sub><b>库存</b> —— 各仓库库存、价格、成本、佣金与分类。</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="每日现金对账：汇率、资金、支出与当日结果" /><br /><sub><b>每日对账</b> —— CUP/USD 汇率、资金与支出；结果应为 0。</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="分析与目标：指标、目标、各分类毛利率与销售趋势" /><br /><sub><b>分析与目标</b> —— 指标、目标、各分类毛利率与每日趋势。</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="浅色模式下的主仪表盘" /><br /><sub><b>仪表盘</b> —— 当日概览、库存预警与快捷入口（浅色模式）。</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="深色模式下的主仪表盘" /><br /><sub><b>仪表盘</b> —— 深色模式下的同一概览。</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="手机上的 NovaGest 网页应用：仪表盘、快速销售与深色模式" />
  <br /><sub>手机上的网页应用：底部导航，可作为应用安装（PWA）。截图使用的是项目自带的演示数据。</sub>
</p>

## 🚀 快速开始

### 服务器与网页应用

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 或更高版本
python3 server/novagest_server.py            # 网页 + API：http://localhost:8080

# 在另一个终端中：为本安装生成密钥
python3 tools/generate_license.py --client "我的商店" --term MES
```

打开 `http://localhost:8080`，将密钥粘贴到 **Licencia de Uso**（使用许可）界面，然后用任一演示账户登录。新安装在激活有效密钥之前处于锁定状态；整个许可系统的说明见 [docs/LICENCIAS.md](../LICENCIAS.md)（西班牙语）。

<details>
<summary><b>演示账户（仅限本地测试）</b></summary>

<br />

新数据库会创建以下账户（登录界面已不再显示它们）：

| 用户 | 初始密码 | 角色 |
|---|---|---|
| `admin` | `Admin123!` | Administrador（管理员） |
| `jefe` | `Jefe123!` | Jefe（店长） |
| `economico` | `Eco123!` | Económico（财务） |
| `almacenero` | `Alma123!` | Almacenero（仓管员） |

管理员角色登录时必须启用两步验证（`REQUIRE_ADMIN_TOTP=1`，默认值）。

</details>

> [!WARNING]
> **在使用真实数据之前，请先修改初始密码。** 在生产环境中，请使用 `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<密码，至少 10 个字符>` 启动服务器，始终使用 HTTPS，并将加密密钥保存在服务器之外。完整清单见 [SECURITY.md](../../SECURITY.md#-production-hardening)。

### 使用 HTTPS 的 Windows（单台笔记本电脑）

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

该脚本使用 mkcert 创建证书，在防火墙中开放 8443 端口，并启动**可视化控制面板**（系统托盘图标），在后台运行服务器和许可证生成器。

### 使用自有域名的 Docker

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

在 Android Studio 中打开项目根目录（JDK 17 与 Gradle 8.9），运行 `app` 配置，并在登录界面填写服务器的 HTTPS 地址以进行同步。

📖 分步指南 —— HTTPS、可视化控制面板、Docker、Android 与生产环境：[docs/INSTALACION.md](../INSTALACION.md)（西班牙语）。

## 📥 导入 Excel 工作簿

导入操作从界面发起，并在保存前显示**预览**。导入不会替换出入库记录，也绝不会在打开应用时自动执行。

| `xlsx/` 中的工作簿 | 使用位置 | 保留的内容 |
|---|---|---|
| `NovaGest SEPT.xlsx` | 网页 → **Copias** → 导入工作簿 | 识别所有选中的每日工作表并按时间顺序导入：库存、入库、出库、销售、汇率和对账。日期取自工作表名称；期初/期末差异会记录为明确的调整，重新导入会替换相应批次。同时也是项目初始数据的来源。 |
| `NOVA PINAR.xlsx`、`NOVA CONSOLACION.xlsx`、`NOVA HERRADURA.xlsx` | 网页 → **Copias** → 导入工作簿 | 批量导入每日工作表，日期、仓库和选择均可修正；保存前会提示空白和重复的日期。保留每笔销售的实际金额、单位成本和 CUP 佣金，并生成每日财务参考，用于核查现金和库存差异。 |
| `PCH.xlsx` | 网页 → **Importar valores** → 上传文件 | 选择其中一个地点（**Pinar del Río**、**Consolación** 或 **Herradura**），将其库存导入目标仓库。名称重复的商品会合并并累加库存；由于各地价格不同，不会修改全局价格。 |
| `RESUMEN POR SEMANA PINAR.xlsx` | 网页 → **Informe semanal** → **Importar resumen Excel** | 读取 `PINAR` 工作表，在保存前显示各周、日期和合计，并将每周数据保存为 Excel 参考，不会替换应用中的出入库记录、对账或计算结果。 |

📅 **周汇总的年份：** 周汇总工作簿中没有年份。导入时会建议使用最后一个有数据日期所在的年份（若没有日期则使用当前年份），并在保存前的预览中显示。

**Importar valores** 模块还支持粘贴从 Excel 复制的列、上传 `.xlsx`、`.csv`、`.tsv` 或 `.txt` 文件，或手动输入行：选择目标仓库、检查变更，并决定是覆盖已有数值还是只补全缺失的数值。空列绝不会改动已保存的数据。

📖 指南（西班牙语）：[仓库与导入](../ALMACENES.md) · [快速手册](../MANUAL.md) · [Excel 字段映射](../MAPEO_EXCEL.md)。

## 📑 报表与 PDF

- **网页端：** 在库存、出入库、仓库、每日对账、周报或核对页面中，可以打印或将当前显示的数据或所选仓库保存为 PDF。在核对页面中可选择日、周、月、年或**起止**日期并按仓库筛选：报表会使用每笔销售的历史金额和成本，将期初/期末库存与出入库记录进行比较。打印采用 A4 横向页面、包含企业名称和期间的页眉，并隐藏操作控件。
- **Android：** 每日对账支持**导出对账 PDF**，报表支持**导出核对 PDF**，包含页眉、关键数据、分页表格和页脚，并通过 Android 标准分享对话框发送。此外还支持将核对结果导出为 CSV 和 Excel（含成本、利润和佣金），以及将出入库记录连同当时的成本导出为 CSV。

## 🔑 产品使用许可

NovaGest 通过**签名的许可证密钥**（HMAC-SHA256，前缀 `NG-`）激活，每个安装都使用自己的密钥材料进行验证。

- **八种期限** —— 一天、一周、一个月、一个季度、半年、一年、两年或永久；类型包括 FULL、TRIAL、ENTERPRISE 和 LIFETIME。
- **通过 WhatsApp 申请** —— 客户在 **Licencia de Uso** 界面（网页和 Android）申请套餐，申请会记录在服务器上。
- **四种签发密钥的方式** —— 网页端的 🔐 **Gestionar licencia** 面板、独立生成器 `tools/license_studio.py`（在独立端口上使用 HTTPS）、命令行工具 `tools/generate_license.py`，以及 API `POST /api/license/generate`。
- **全面掌控** —— 已签发的许可证、已激活的设备、续期、吊销和 CSV 导出，全部记入审计日志。

📖 完整指南（西班牙语）：[docs/LICENCIAS.md](../LICENCIAS.md)。

## 🔒 安全

- **账户** —— 密码采用 PBKDF2-SHA256（210,000 次迭代），连续 5 次失败后锁定 5 分钟；管理员默认必须启用两步验证（TOTP），并提供恢复码。
- **会话与权限** —— 会话会因闲置或达到最长时长而过期；权限在服务器端校验；提供防 CSRF 请求头，并对登录、找回和许可申请按 IP 限制请求频率。
- **数据** —— 每日自动加密备份并轮换保留，可选择复制到本机以外的位置（`BACKUP_MIRROR_DIRS`，3-2-1 原则），并提供日结关账和审计。
- **网页** —— 通过 HTTPS 提供服务时启用 CSP、`X-Frame-Options`、`nosniff`、`Referrer-Policy` 和 HSTS 等安全响应头。

公开的法律信息（#legal）在 **Ajustes → Datos legales** 中填写 —— 指南：[docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md)（西班牙语）。发现了安全漏洞？**请勿创建公开 issue**，请遵循[安全策略](../../SECURITY.md#english)。

## ✅ 测试

以下检查与持续集成（`.github/workflows/ci.yml`）中运行的相同，请在仓库根目录执行：

```bash
# 网页与 IPV（Node 22）
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# 服务器与工具（Python）
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# 可视化控制面板（PowerShell 7）与 Android（JDK 17 + Gradle 8.9）
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 项目结构

```text
app/       Android 应用（Kotlin + Jetpack Compose）
web/       网页界面、逻辑与资源（无需构建步骤的 PWA）
server/    API、身份验证、SQLite、备份及 Windows 启动脚本（Python、PowerShell）
tools/     测试、Excel 导入以及许可证生成与管理工具
deploy/    Docker Compose + Caddy，用于以 HTTPS 和自有域名发布
docs/      手册、法律与合规指南、翻译和截图
xlsx/      用于导入的参考 Excel 工作簿
brand/     NovaGest 标志
venv/      供离线 Windows 使用的 Python 库（参见 venv/README.md）
```

业务数据库、备份、证书和生成的密钥（`data/`、`certs/`）均不纳入版本控制。

## 📚 文档

详细指南为西班牙语。

| 文档 | 内容 |
|---|---|
| [安装与部署](../INSTALACION.md) | 服务器、使用 HTTPS 和可视化控制面板的 Windows、Docker、Android 与生产环境 |
| [使用许可](../LICENCIAS.md) | 激活、期限、WhatsApp 申请、独立生成器与密钥管理 |
| [快速手册](../MANUAL.md) | 分步介绍应用的日常使用 |
| [仓库与导入](../ALMACENES.md) | 各仓库库存、调拨与数值导入 |
| [Excel 字段映射](../MAPEO_EXCEL.md) | `xlsx/` 中每个工作簿的解析方式 |
| [法律信息](../GUIA_DATOS_LEGALES.md) | 如何填写企业的法律信息 |
| [合规](../CUMPLIMIENTO.md) · [法律审查](../REVISION_LEGAL.md) | 合规、无障碍与安全审计，以及法律收尾清单 |
| [认证](../certificacion/00-INDICE-Y-FIRMAS.md) | 为 ISO 27001、SOC 2、OWASP ASVS、WCAG 2.2 和 ISO 27701 认证做准备 |
| [持续改进](../MEJORA_CONTINUA.md) · [路线图](../ROADMAP.md) | 按优先级排列的后续改进及其验证方式 |
| [图片来源](../IMAGENES.md) | 项目图片的来源与许可 |
| [更新日志](../../CHANGELOG.md) | 每个版本（网页与 Android）的改进与修复 |

## ❓ 常见问题

<details>
<summary><b>没有互联网也能用吗？</b></summary>

<br />

可以，在您企业的内部网络中即可使用。服务器可以是局域网中一台无需连接互联网的 Windows 笔记本电脑。网页应用可作为应用安装（PWA）；与服务器断开连接时仍可继续运行，并在重新连接后保存更改。Android 应用使用本地存储，并在联网时同步。

</details>

<details>
<summary><b>需要服务器吗？</b></summary>

<br />

需要：Python 服务器负责提供网页应用和 API，并将共享数据存储在 SQLite 中。它可以是一台 Windows 笔记本电脑（`server\iniciar-https.ps1`）、一台 Linux 计算机，或使用自有域名的 Docker 服务器。参见[安装与部署](../INSTALACION.md)。

</details>

<details>
<summary><b>我的数据存储在哪里？</b></summary>

<br />

存储在您企业的服务器上（`data/`），而不是第三方服务中。NovaGest 不使用任何分析或广告服务，每日备份均以加密形式保存。

</details>

<details>
<summary><b>如何获得使用许可？</b></summary>

<br />

在网页或 Android 应用的 **Licencia de Uso** 界面中：填写您的姓名或公司名称，选择期限，然后点击 **Solicitar por WhatsApp**（通过 WhatsApp 申请）。您会收到一个签名密钥，在同一界面中激活即可。

</details>

<details>
<summary><b>可以导入我的 Excel 工作簿吗？</b></summary>

<br />

可以。每日对账、各地点库存和周汇总工作簿均可通过预览和确认导入，未经您的许可不会替换任何数据。参见[导入 Excel 工作簿](#-导入-excel-工作簿)。

</details>

<details>
<summary><b>如果电脑损坏或停电怎么办？</b></summary>

<br />

服务器每天都会创建一份加密备份并保留最近的备份；配置 `BACKUP_MIRROR_DIRS` 后，还会将备份复制到另一块磁盘或网络文件夹。需要恢复时，在 **Copias**（备份）中还原即可。请将加密密钥保存在服务器之外。

</details>

<details>
<summary><b>支持条码扫描器吗？</b></summary>

<br />

支持：可以使用 USB 或蓝牙扫码枪（以键盘方式输入），也可以在 **Venta rápida**（快速销售）中使用手机或电脑的摄像头扫码。

</details>

<details>
<summary><b>支持哪些货币？</b></summary>

<br />

每日对账使用 CUP/USD 和 MXN/USD 汇率，快速销售会显示每笔付款对应的 CUP 金额，每张成本卡以 USD 或 CUP 保存金额。

</details>

## 🤝 参与贡献

欢迎贡献：错误报告、改进建议和 pull request。开始之前，请阅读[贡献指南](../../CONTRIBUTING.md#english) —— 其中说明了如何搭建环境、运行测试以及提交修改。

## 📄 许可证

**专有软件 —— 保留所有权利。** © 2026 yhquintero。

在 GitHub 上查看代码并不授予任何使用权：在企业中安装 NovaGest、复制、修改、分发本软件或规避其许可系统，均须获得权利人授予的使用许可。完整条款见 [LICENSE](../../LICENSE)。第三方组件保留其各自的许可证：[THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。

## 📝 更新日志与路线图

每个版本的改进与修复记录在 [CHANGELOG.md](../../CHANGELOG.md) 中；按优先级排列的后续计划见 [docs/ROADMAP.md](../ROADMAP.md)（西班牙语）。

---

<div align="center">

<sub><b>NovaGest</b> · 管理。成长。前进。 · © 2026 yhquintero · <a href="#novagest">返回顶部 ⬆</a></sub>

</div>
