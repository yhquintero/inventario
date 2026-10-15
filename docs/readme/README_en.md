<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="NovaGest logo" />

# NovaGest

### Manage. Grow. Advance.

**Inventory, point of sale, daily cash reconciliation, and reports for your business — on the Web, on Android, and offline.**

🌐 [Español](../../README.md) · **English** · [Português](README_pt-BR.md) · [Français](README_fr.md) · [Italiano](README_it.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [简体中文](README_zh-CN.md)

[![Version](https://img.shields.io/badge/version-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![Platforms](https://img.shields.io/badge/platforms-Web%20%C2%B7%20Android%20%C2%B7%20Server-1e1b4b?style=flat-square)](#-whats-included)
[![PWA](https://img.shields.io/badge/PWA-works%20offline-059669?style=flat-square)](#-faq)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-quick-start)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-shared%20data-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![License](https://img.shields.io/badge/license-proprietary-475569?style=flat-square)](../../LICENSE)

[Features](#-features) · [Screenshots](#-screenshots) · [Quick start](#-quick-start) · [Documentation](#-documentation) · [FAQ](#-faq) · [Security](#-security) · [License](#-license)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest: the Dashboard in the browser and Quick sale on a phone" />
</p>

> [!NOTE]
> This is a translation of the [Spanish README](../../README.md), which is the reference version. The application interface and the detailed guides in `docs/` are in Spanish.

> [!IMPORTANT]
> **NovaGest is proprietary software.** The code is visible on GitHub, but using it in a business, copying, modifying, or distributing it requires a **usage license** from the owner. See [LICENSE](../../LICENSE) and the [License](#-license) section.

## 💡 What is NovaGest?

**NovaGest** brings together everything your business needs every day: **multi-warehouse inventory**, **point of sale**, **daily cash reconciliation**, and **reports with analytics**. No more loose spreadsheets or notebooks: the Web app installs like an app and keeps working if the connection drops, the Android app puts operations in your pocket, and the shared server keeps everyone working on the same real-time state — with usage licensing, roles, auditing, and backups.

> 📊 **Your data rules.** Excel workbooks are only import and reference sources: the application never imports or replaces operational data without showing you a **preview** and getting your confirmation. A new installation can start from the seed data included in the project.

## 🧩 What's included

| Application | What you do with it |
|---|---|
| 🌐 **Web (PWA)** | The command center: inventory, warehouses, value imports, stock movements, quick sale, daily reconciliation, weekly report, stock verification, and administration — with global search (`Ctrl+K`), a built-in guided tour, keyboard shortcuts, and light/dark mode. It installs as an app and opens offline. |
| 📱 **Android** | Operations on the go: the same management with Kotlin + Jetpack Compose, local storage, biometric unlock, and sync with the server whenever there is a connection. |
| 🗄️ **Server** | The heart that ties everything together: API and Web site in a single Python process, shared data in SQLite, server-side sessions and permissions, signed licenses, auditing, and automatic encrypted backups. |

## ✨ Features

- 📦 **Multi-warehouse inventory** — each warehouse keeps its own stock and the general inventory adds them all up; import values, transfer goods between warehouses, and adjust differences with full history.
- 🛒 **Point of sale** — quick sale that instantly deducts stock from the active warehouse, with a **barcode scanner** (camera or USB/Bluetooth reader), **cash or store-credit** payment for a customer, and automatically calculated commissions and delivery fees.
- 🤝 **Customers and store credit** — customer book with credit limits, receivables with due dates, statuses (pending/partial/overdue/paid), and **payments** with history; the total receivable is shown on the Dashboard.
- 🧮 **Daily cash reconciliation (cuadre)** — CUP/USD and MXN/USD exchange rates, collections, cash in, withdrawals, funds, and expenses: the day is "balanced" when the result is 0, and the app warns you when it is not.
- 🔄 **Stock movements** — sales, receipts, and issues with warehouse, sales point, quantities, amounts, and notes; every movement recalculates stock and is recorded.
- 🧾 **Cost sheets and IPV** — versioned cost sheet per product or service (components from your own inventory, total cost, yield, and cost per serving) with a Draft → Approved workflow, plus period-based **IPV control** (`IPV-YYYY-NNNN`) validated against the sheet. Web: **Fichas de costo · IPV**; Android: synced read-only view. Adapted from [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos); amounts are stored in each sheet's currency (USD or CUP).
- 📊 **Reports and verification** — daily reconciliations, weekly summary, and stock verification by day, week, month, year, or custom range, with CSV/PDF export ready to print or send to your accountant.
- 📈 **Analytics and goals** — sales by period, gross and net profit, inventory value at sale price and at cost, and progress against daily and weekly goals.
- 🕵️ **History and auditing** — prices, costs, and exchange rates by day; a record of who did what and when, according to each user's role.
- ☁️ **Cross-platform sync** — Web and Android work on the same state; if the connection is lost, the Web keeps working and syncs when it reconnects.
- 🔐 **Enterprise-grade security** — cryptographically signed usage license, two-step verification (TOTP), lockout after failed attempts, day closing, and encrypted backups.

## 📸 Screenshots

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="Quick sale with barcode scanner, categories, products, and cart" /><br /><sub><b>Quick sale</b> — barcode scanner, cart, and cash or store-credit payment.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="Inventory with stock, prices, costs, and categories" /><br /><sub><b>Inventory</b> — stock per warehouse, prices, costs, commissions, and categories.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="Daily reconciliation with exchange rates, funds, expenses, and the day's result" /><br /><sub><b>Daily reconciliation</b> — CUP/USD rates, funds, and expenses; the result must be 0.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="Analytics and goals with KPIs, goals, margins by category, and sales trend" /><br /><sub><b>Analytics and goals</b> — KPIs, goals, margin by category, and daily trend.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="Main dashboard in light mode" /><br /><sub><b>Dashboard</b> — today's summary, stock alerts, and shortcuts (light mode).</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="Main dashboard in dark mode" /><br /><sub><b>Dashboard</b> — the same summary in dark mode.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="The NovaGest Web app on a phone: Dashboard, Quick sale, and dark mode" />
  <br /><sub>The Web app on a phone: bottom navigation, installable as an app (PWA). Screenshots use the project's demo data.</sub>
</p>

## 🚀 Quick start

### Server and Web app

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 or later
python3 server/novagest_server.py            # Web + API at http://localhost:8080

# In another terminal: key for this installation
python3 tools/generate_license.py --client "My Store" --term MES
```

Open `http://localhost:8080`, paste the key into the **Licencia de Uso** (usage license) screen, and sign in with one of the demo accounts. A new installation stays locked until a valid key is activated: the whole system is explained in [docs/LICENCIAS.md](../LICENCIAS.md) (Spanish).

<details>
<summary><b>Demo accounts (local testing only)</b></summary>

<br />

A new database creates these accounts (they are no longer shown on the sign-in screen):

| User | Initial password | Role |
|---|---|---|
| `admin` | `Admin123!` | Administrador (administrator) |
| `jefe` | `Jefe123!` | Jefe (manager) |
| `economico` | `Eco123!` | Económico (finance) |
| `almacenero` | `Alma123!` | Almacenero (warehouse keeper) |

The Administrator role must enable two-step verification when signing in (`REQUIRE_ADMIN_TOTP=1`, the default).

</details>

> [!WARNING]
> **Change the initial passwords before using the system with real data.** In production, start the server with `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secret, min. 10 chars>`, always use HTTPS, and keep encryption keys off the server. Full checklist in [SECURITY.md](../../SECURITY.md#-production-hardening).

### Windows with HTTPS (a single laptop)

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

It creates the certificate with mkcert, opens the firewall for port 8443, and starts the **Visual Control Panel** (system tray icon) with the server and the license generator running in the background.

### Docker with your own domain

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

Open the project root in Android Studio (JDK 17 and Gradle 8.9), run the `app` configuration, and set the server's HTTPS address on the sign-in screen to sync.

📖 Step-by-step guide — HTTPS, Visual Control Panel, Docker, Android, and production: [docs/INSTALACION.md](../INSTALACION.md) (Spanish).

## 📥 Importing the Excel workbooks

Imports are started from the interface and show a **preview** before saving. They never replace movements and never run automatically when the app opens.

| Workbook in `xlsx/` | Where it is used | What it keeps |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → import workbook | Detects all selected daily sheets and imports them in chronological order: stock, receipts, issues, sales, exchange rate, and reconciliation. The date comes from the sheet name; opening/closing differences are recorded as explicit adjustments, and re-importing replaces each batch. It also feeds the project's seed data. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → import workbook | Bulk import of their daily sheets with editable date, warehouse, and selection; warns about empty and duplicate dates before saving. Keeps the actual amount, unit cost, and CUP commission per sale and creates daily financial references to review cash and stock differences. |
| `PCH.xlsx` | Web → **Importar valores** → upload file | You pick one of the locations (**Pinar del Río**, **Consolación**, or **Herradura**) and its stock is imported into the target warehouse. Repeated names are merged by adding up stock; global prices are not changed because they vary by location. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Reads the `PINAR` sheet, shows weeks, dates, and totals before saving, and keeps each week as an Excel reference without replacing the app's movements, reconciliations, or calculations. |

📅 **Weekly summary year:** the weekly workbook does not print the year. The import proposes the year of the latest dated entry (or the current year if there is none) and shows it in the preview before saving.

The **Importar valores** module also accepts columns pasted from Excel, `.xlsx`, `.csv`, `.tsv`, or `.txt` uploads, or rows typed by hand: you pick the target warehouse, review the changes, and decide whether existing values are overwritten or only missing ones are filled. Empty columns never alter saved data.

📖 Guides (Spanish): [Warehouses and imports](../ALMACENES.md) · [Quick manual](../MANUAL.md) · [Excel mapping](../MAPEO_EXCEL.md).

## 📑 Reports and PDF

- **Web:** from Inventory, Movements, Warehouses, Daily reconciliation, Weekly report, or Verification you can print or save as PDF the visible data or the selected warehouse. In Verification you choose a day, week, month, year, or **From/To** dates and filter by warehouse: the report compares opening/closing stock with movements using the historical amounts and costs of each sale. Printing uses landscape A4, a header with the business and the period, and hides the controls.
- **Android:** Daily reconciliation offers **Export reconciliation to PDF** and Reports offers **Export verification PDF**, with headers, key figures, paginated tables, and footers, shared through the standard Android dialog. CSV and Excel exports of the verification —with cost, profit, and commission— and CSV exports of movements with the cost at each moment are also available.

## 🔑 Product usage licenses

NovaGest is activated with a **signed license key** (HMAC-SHA256, `NG-` prefix) that each installation verifies with its own secret.

- **Eight terms** — day, week, month, quarter, half-year, year, two years, or permanent; FULL, TRIAL, ENTERPRISE, and LIFETIME types.
- **Requests via WhatsApp** — from the **Licencia de Uso** screen (Web and Android) the customer requests a plan, and the request is recorded on the server.
- **Four ways to issue keys** — the Web's 🔐 **Gestionar licencia** panel, the standalone generator `tools/license_studio.py` (HTTPS on its own port), the `tools/generate_license.py` command line, and the `POST /api/license/generate` API.
- **Full control** — issued licenses, activated devices, renewal, revocation, and CSV export, all recorded in the audit log.

📖 Full guide (Spanish): [docs/LICENCIAS.md](../LICENCIAS.md).

## 🔒 Security

- **Accounts** — PBKDF2-SHA256 passwords (210,000 iterations), a 5-minute lockout after 5 failed attempts, two-step verification (TOTP) required by default for the Administrator, and recovery codes.
- **Sessions and permissions** — sessions that expire after inactivity and after a maximum duration, server-side permission checks, an anti-CSRF header, and per-IP rate limits on sign-in, recovery, and license requests.
- **Data** — automatic daily encrypted backups with rotation, optional off-device replication (`BACKUP_MIRROR_DIRS`, 3-2-1 rule), day closing, and auditing.
- **Web** — CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and HSTS headers when served over HTTPS.

Public legal information (#legal) is filled in under **Ajustes → Datos legales** — guide: [docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md) (Spanish). Found a vulnerability? **Do not open a public issue**: follow the [security policy](../../SECURITY.md#english).

## ✅ Tests

The same checks that continuous integration runs (`.github/workflows/ci.yml`), from the repository root:

```bash
# Web and IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Server and tools (Python)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Visual Control Panel (PowerShell 7) and Android (JDK 17 + Gradle 8.9)
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 Project structure

```text
app/       Android app (Kotlin + Jetpack Compose)
web/       Web interface, logic, and assets (PWA with no build step)
server/    API, authentication, SQLite, backups, and Windows launchers (Python, PowerShell)
tools/     Tests, Excel import, and the license generator/manager
deploy/    Docker Compose + Caddy to publish with HTTPS and your own domain
docs/      Manuals, legal and compliance guides, translations, and screenshots
xlsx/      Reference Excel workbooks for importing
brand/     NovaGest logo
venv/      Python libraries for offline Windows setups (see venv/README.md)
```

The operational database, backups, certificates, and generated keys (`data/`, `certs/`) are kept out of version control.

## 📚 Documentation

The detailed guides are in Spanish.

| Document | Contents |
|---|---|
| [Installation and deployment](../INSTALACION.md) | Server, Windows with HTTPS and the Visual Control Panel, Docker, Android, and production |
| [Usage licenses](../LICENCIAS.md) | Activation, terms, WhatsApp requests, standalone generator, and key management |
| [Quick manual](../MANUAL.md) | Step-by-step daily use of the application |
| [Warehouses and imports](../ALMACENES.md) | Stock per warehouse, transfers, and value imports |
| [Excel mapping](../MAPEO_EXCEL.md) | How each workbook in `xlsx/` is interpreted |
| [Legal information](../GUIA_DATOS_LEGALES.md) | How to complete the business's legal information |
| [Compliance](../CUMPLIMIENTO.md) · [Legal review](../REVISION_LEGAL.md) | Compliance, accessibility, and security audit, and legal closing checklist |
| [Certification](../certificacion/00-INDICE-Y-FIRMAS.md) | Preparation for ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2, and ISO 27701 |
| [Continuous improvement](../MEJORA_CONTINUA.md) · [Roadmap](../ROADMAP.md) | Prioritized upcoming improvements and how they are verified |
| [Image provenance](../IMAGENES.md) | Origin and license of the project's images |
| [Changelog](../../CHANGELOG.md) | Improvements and fixes in each version (Web and Android) |

## ❓ FAQ

<details>
<summary><b>Does it work without Internet?</b></summary>

<br />

Yes, on your business's network. The server can be a Windows laptop on your local network with no Internet access. The Web app installs as an app (PWA) and, if the connection to the server is lost, keeps working and saves changes when it reconnects. The Android app works with local storage and syncs when there is a connection.

</details>

<details>
<summary><b>Do I need a server?</b></summary>

<br />

Yes: the Python server serves the Web app and the API and stores shared data in SQLite. It can be a Windows laptop (`server\iniciar-https.ps1`), a Linux machine, or a Docker server with your own domain. See [Installation and deployment](../INSTALACION.md).

</details>

<details>
<summary><b>Where is my data stored?</b></summary>

<br />

On your business's server (`data/`), not with third-party services. NovaGest uses no analytics or advertising, and daily backups are stored encrypted.

</details>

<details>
<summary><b>How do I get a usage license?</b></summary>

<br />

From the **Licencia de Uso** screen of the Web or Android app: enter your name or company, choose the term, and tap **Solicitar por WhatsApp** (request via WhatsApp). You will receive a signed key that you activate on that same screen.

</details>

<details>
<summary><b>Can I import my Excel workbooks?</b></summary>

<br />

Yes. Daily reconciliation, stock-by-location, and weekly summary workbooks are imported with a preview and confirmation, never replacing data without your permission. See [Importing the Excel workbooks](#-importing-the-excel-workbooks).

</details>

<details>
<summary><b>What if the computer breaks or the power goes out?</b></summary>

<br />

The server makes an encrypted backup every day and keeps the most recent ones; with `BACKUP_MIRROR_DIRS` it also replicates them to another disk or network folder. To recover, restore from **Copias** (backups). Keep the encryption key off the server.

</details>

<details>
<summary><b>Does it work with barcode scanners?</b></summary>

<br />

Yes: with USB or Bluetooth readers (which type like a keyboard) and with the phone's or PC's camera from **Venta rápida** (quick sale).

</details>

<details>
<summary><b>Which currencies does it handle?</b></summary>

<br />

The daily reconciliation works with CUP/USD and MXN/USD exchange rates, quick sale shows the CUP equivalent of each payment, and each cost sheet stores its amounts in USD or CUP.

</details>

## 🤝 Contributing

Contributions are welcome: bug reports, improvement proposals, and pull requests. Read the [contributing guide](../../CONTRIBUTING.md#english) before you start — it explains how to set up the environment, run the tests, and propose changes.

## 📄 License

**Proprietary software — all rights reserved.** © 2026 yhquintero.

Viewing the code on GitHub grants no right of use: installing NovaGest in a business, copying, modifying, distributing it, or circumventing its licensing system requires a usage license from the owner. Full terms in [LICENSE](../../LICENSE). Third-party components keep their own licenses: [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## 📝 Changelog and roadmap

Improvements and fixes for each version are in [CHANGELOG.md](../../CHANGELOG.md); upcoming ones, prioritized, in [docs/ROADMAP.md](../ROADMAP.md) (Spanish).

---

<div align="center">

<sub><b>NovaGest</b> · Manage. Grow. Advance. · © 2026 yhquintero · <a href="#novagest">Back to top ⬆</a></sub>

</div>
