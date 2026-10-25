<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="Logotipo do NovaGest" />

# NovaGest

### Gerencie. Cresça. Avance.

**Estoque multialmoxarifado, ponto de venda, caixa diária e relatórios para o seu negócio.**
**Web instalável, aplicativo Android e servidor próprio — também sem conexão.**

🌐 [Español](../../README.md) · [English](README_en.md) · **Português** · [Français](README_fr.md) · [Italiano](README_it.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [简体中文](README_zh-CN.md)

[![CI](https://github.com/yhquintero/inventario/actions/workflows/ci.yml/badge.svg)](https://github.com/yhquintero/inventario/actions/workflows/ci.yml)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![Plataformas](https://img.shields.io/badge/plataformas-Web%20%C2%B7%20Android%20%C2%B7%20Servidor-1e1b4b?style=flat-square)](#-o-que-está-incluído)
[![PWA](https://img.shields.io/badge/PWA-funciona%20sem%20conex%C3%A3o-059669?style=flat-square)](#-perguntas-frequentes)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-início-rápido)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-dados%20compartilhados-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-475569?style=flat-square)](../../LICENSE)

[Funcionalidades](#-funcionalidades) · [Capturas de tela](#-capturas-de-tela) · [Início rápido](#-início-rápido) · [Documentação](#-documentação) · [Perguntas frequentes](#-perguntas-frequentes) · [Segurança](#-segurança) · [Licença](#-licença)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest: o Painel no navegador e a Venda rápida no celular" />
</p>

> [!NOTE]
> Esta é uma tradução do [README em espanhol](../../README.md), que é a versão de referência. A interface do aplicativo e os guias detalhados de `docs/` estão em espanhol.

> [!IMPORTANT]
> **O NovaGest é software proprietário.** O código é visível no GitHub, mas usá-lo em um negócio, copiá-lo, modificá-lo ou distribuí-lo exige uma **licença de uso** do titular. Consulte a [LICENSE](../../LICENSE) e a seção [Licença](#-licença).

## 💡 O que é o NovaGest?

O **NovaGest** reúne em um só lugar o que o seu negócio precisa todos os dias: **estoque em vários depósitos**, **ponto de venda**, **conferência de caixa diária** e **relatórios com análises**. Chega de planilhas soltas e cadernos: o aplicativo Web se instala como app e continua funcionando se a conexão cair, o app Android leva a operação para o bolso e o servidor compartilhado mantém todos trabalhando sobre o mesmo estado em tempo real — com licença de uso, perfis, auditoria e cópias de segurança.

> 📊 **Seus dados mandam.** As planilhas do Excel são apenas fontes de importação e referência: o aplicativo nunca importa nem substitui dados operacionais sem mostrar uma **prévia** e receber a sua confirmação. Uma instalação nova pode começar com os dados iniciais incluídos no projeto.

## 🧩 O que está incluído

| Aplicativo | O que você faz com ele |
|---|---|
| 🌐 **Web (PWA)** | A central de comando: estoque, depósitos, importação de valores, movimentações, venda rápida, conferência de caixa diária, relatório semanal, conferência de estoque e administração — com busca global (`Ctrl+K`), guia integrado, atalhos de teclado e modo claro/escuro. Instala-se como aplicativo e abre sem conexão. |
| 📱 **Android** | A operação em movimento: a mesma gestão com Kotlin + Jetpack Compose, armazenamento local, desbloqueio biométrico e sincronização com o servidor quando há conexão. |
| 🗄️ **Servidor** | O coração que une tudo: API e site Web em um único processo Python, dados compartilhados em SQLite, sessões e permissões validadas no servidor, licenças assinadas, auditoria e cópias criptografadas automáticas. |
| 🔑 **Keygen** *(interno)* | Aplicativo Android separado, **sem permissão de INTERNET**: o titular emite e verifica chaves de licença pelo celular, sem depender do notebook nem do servidor. |

## ✨ Funcionalidades

- 📦 **Estoque em vários depósitos** — cada depósito mantém seu próprio estoque e o estoque geral soma todos; importe valores, transfira mercadorias entre depósitos e ajuste diferenças com histórico completo.
- 🛒 **Ponto de venda** — venda rápida que baixa o estoque do depósito em uso na hora, com **leitor de código de barras** (câmera ou leitor USB/Bluetooth), pagamento **à vista ou fiado** para um cliente e comissões e taxas de entrega calculadas automaticamente.
- 🤝 **Clientes e fiado** — cadastro de clientes com limite de crédito, contas a receber com vencimento, situações (pendente/parcial/vencido/pago) e **pagamentos** com histórico; o total a receber aparece no Painel.
- 🧮 **Conferência de caixa diária (cuadre)** — taxas CUP/USD e MXN/USD, recebimentos, entradas, retiradas, fundos e despesas: o dia está «fechado» quando o resultado dá 0, e o aplicativo avisa se não estiver.
- 🔄 **Movimentações** — vendas, entradas e saídas com depósito, ponto de venda, quantidades, valores e observações; cada movimentação recalcula o estoque e fica registrada.
- 🧾 **Fichas de custo e IPV** — ficha de custo versionada por produto ou serviço (componentes do próprio estoque, custo total, rendimento e custo por porção) com fluxo Rascunho → Aprovada, e **controle IPV** por período (`IPV-AAAA-NNNN`) validado contra a ficha. Web: **Fichas de costo · IPV**; Android: consulta sincronizada. Adaptado de [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos); os valores ficam na moeda de cada ficha (USD ou CUP).
- 📊 **Relatórios e conferência** — conferências diárias, resumo semanal e conferência de estoque por dia, semana, mês, ano ou período personalizado, com exportação CSV/PDF pronta para imprimir ou enviar ao contador.
- 📈 **Análises e metas** — vendas por período, lucro bruto e líquido, valor do estoque a preço de venda e a custo, e progresso em relação às metas diárias e semanais.
- 🕵️ **Histórico e auditoria** — preços, custos e taxas por dia; registro de quem fez o quê e quando, conforme o perfil de cada usuário.
- ☁️ **Sincronização entre plataformas** — Web e Android trabalham sobre o mesmo estado; se a conexão cair, a Web continua operando e sincroniza ao reconectar.
- 🔐 **Segurança de nível empresarial** — licença de uso assinada criptograficamente, verificação em duas etapas (TOTP), bloqueio após tentativas falhas, fechamento de dias e cópias de segurança criptografadas.

## 👥 Papéis e permissões

Cada pessoa entra com a própria conta; o papel decide o que vê e o que pode alterar, e **o servidor valida as mesmas permissões** que a interface.

| Área | Administrador | Gerente | Financeiro | Almoxarife |
|---|:--:|:--:|:--:|:--:|
| Painel, estoque e movimentos (consulta) | ✅ | ✅ | ✅ | ✅ |
| Criar e editar produtos | ✅ | ✅ | — | ✅ |
| Armazéns, transferências e importar valores | ✅ | ✅ | somente ver | ✅ |
| Vender e registrar movimentos | ✅ | ✅ | — | ✅ |
| Caixa diária | ✅ | ✅ | editar | somente ver |
| Relatórios, conferência e finanças | ✅ | ✅ | ✅ | — |
| Clientes e fiados | ✅ | ✅ | ✅ | ✅ |
| Fichas de custo e IPV | ✅ | ✅ | ✅ | somente ver |
| Usuários e ajustes do negócio | ✅ | ✅ | — | — |
| Auditoria · cópias · licença | ✅ | ✅ | só auditoria | — |

## 📸 Capturas de tela

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="Venda rápida com leitor de código de barras, categorias, produtos e carrinho" /><br /><sub><b>Venda rápida</b> — leitor de código de barras, carrinho e pagamento à vista ou fiado.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="Estoque com quantidades, preços, custos e categorias" /><br /><sub><b>Estoque</b> — quantidades por depósito, preços, custos, comissões e categorias.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="Conferência de caixa diária com taxas, fundos, despesas e resultado do dia" /><br /><sub><b>Conferência de caixa</b> — taxas CUP/USD, fundos e despesas; o resultado deve ficar em 0.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="Análises e metas com indicadores, metas, margem por categoria e tendência de vendas" /><br /><sub><b>Análises e metas</b> — indicadores, metas, margem por categoria e tendência diária.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="Painel principal no modo claro" /><br /><sub><b>Painel</b> — resumo do dia, alertas de estoque e atalhos (modo claro).</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="Painel principal no modo escuro" /><br /><sub><b>Painel</b> — o mesmo resumo no modo escuro.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="O aplicativo Web do NovaGest no celular: Painel, Venda rápida e modo escuro" />
  <br /><sub>O aplicativo Web no celular: navegação inferior, instalável como app (PWA). Capturas com os dados de demonstração do projeto.</sub>
</p>

## 🚀 Início rápido

### Servidor e aplicativo Web

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 ou superior
python3 server/novagest_server.py            # Web + API em http://localhost:8080

# Em outro terminal: chave para esta instalação
python3 tools/generate_license.py --client "Minha Loja" --term MES
```

Abra `http://localhost:8080`, cole a chave na tela **Licencia de Uso** (licença de uso) e entre com uma das contas de demonstração. Uma instalação nova fica bloqueada até que uma chave válida seja ativada: o sistema completo é explicado em [docs/LICENCIAS.md](../LICENCIAS.md) (em espanhol).

<details>
<summary><b>Contas de demonstração (somente para testes locais)</b></summary>

<br />

Em um banco de dados novo são criadas estas contas (elas não aparecem mais na tela de acesso):

| Usuário | Senha inicial | Perfil |
|---|---|---|
| `admin` | `Admin123!` | Administrador |
| `jefe` | `Jefe123!` | Jefe (gerente) |
| `economico` | `Eco123!` | Económico (financeiro) |
| `almacenero` | `Alma123!` | Almacenero (estoquista) |

O perfil Administrador deve ativar a verificação em duas etapas ao entrar (`REQUIRE_ADMIN_TOTP=1`, padrão).

</details>

> [!WARNING]
> **Troque as senhas iniciais antes de usar o sistema com dados reais.** Em produção, inicie o servidor com `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secreta, mín. 10>`, use sempre HTTPS e guarde as chaves de criptografia fora do servidor. Lista completa em [SECURITY.md](../../SECURITY.md#-production-hardening).

### Windows com HTTPS (um notebook)

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Cria o certificado com o mkcert, libera a porta 8443 no Firewall e inicia o **Painel de Controle Visual** (ícone na bandeja do sistema) com o servidor e o gerador de licenças em segundo plano.

### Docker com domínio próprio

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

Abra a raiz do projeto no Android Studio (JDK 17 e Gradle 8.14.5), execute a configuração `app` e informe na tela de acesso o endereço HTTPS do servidor para sincronizar.

📖 Guia passo a passo — HTTPS, Painel de Controle Visual, Docker, Android e produção: [docs/INSTALACION.md](../INSTALACION.md) (em espanhol).

## 📥 Importar as planilhas do Excel

As importações são iniciadas pela interface e mostram uma **prévia** antes de salvar. Elas não substituem movimentações nem são executadas automaticamente ao abrir o aplicativo.

| Planilha em `xlsx/` | Onde se aplica | O que preserva |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → importar planilha | Detecta todas as abas diárias selecionadas e as importa em ordem cronológica: estoque, entradas, saídas, vendas, taxa e conferência. A data vem do nome da aba; as diferenças de abertura/fechamento são registradas como ajustes explícitos e reimportar substitui cada lote. Também alimenta os dados iniciais do projeto. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → importar planilha | Importação em massa das abas diárias com data, depósito e seleção corrigíveis; avisa sobre datas vazias e duplicadas antes de salvar. Preserva o valor real, o custo unitário e a comissão em CUP de cada venda e cria referências financeiras diárias para revisar diferenças de caixa e de estoque. |
| `PCH.xlsx` | Web → **Importar valores** → enviar arquivo | Escolhe-se uma das localidades (**Pinar del Río**, **Consolación** ou **Herradura**) e o seu estoque é importado para o depósito de destino. Nomes repetidos são consolidados somando o estoque; os preços globais não mudam, pois variam por localidade. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Lê a aba `PINAR`, mostra semanas, datas e totais antes de salvar e guarda cada semana como referência do Excel, sem substituir movimentações, conferências nem cálculos do aplicativo. |

📅 **Ano do resumo semanal:** a planilha semanal não imprime o ano. A importação propõe o ano da última data com dados (ou o ano atual, se não houver data) e o mostra na prévia antes de salvar.

O módulo **Importar valores** também aceita colunas coladas do Excel, envio de `.xlsx`, `.csv`, `.tsv` ou `.txt`, ou linhas digitadas à mão: você escolhe o depósito de destino, revisa as mudanças e decide se os valores existentes serão sobrescritos ou se apenas os que faltam serão preenchidos. Colunas vazias não alteram dados salvos.

📖 Guias (em espanhol): [Depósitos e importação](../ALMACENES.md) · [Manual rápido](../MANUAL.md) · [Mapeamento do Excel](../MAPEO_EXCEL.md).

## 📑 Relatórios e PDF

- **Web:** em Estoque, Movimentações, Depósitos, Conferência de caixa, Relatório semanal ou Conferência de estoque você pode imprimir ou salvar em PDF os dados visíveis ou o depósito escolhido. Na conferência de estoque você escolhe dia, semana, mês, ano ou datas **De/Até** e filtra por depósito: o relatório compara o estoque de abertura/fechamento com as movimentações usando os valores e custos históricos de cada venda. A impressão usa página A4 paisagem, cabeçalho com o negócio e o período, e oculta os controles.
- **Android:** a Conferência de caixa permite **exportar a conferência em PDF** e Relatórios permite **exportar a conferência de estoque em PDF**, com cabeçalhos, números principais, tabelas paginadas e rodapé, compartilhados pelo diálogo padrão do Android. Também há exportações CSV e Excel da conferência —com custo, lucro e comissão— e CSV de movimentações com o custo de cada momento.

## 🔑 Licenças de uso do produto

O NovaGest é ativado com uma **chave de licença assinada** (HMAC-SHA256, prefixo `NG-`) que cada instalação verifica com o seu próprio segredo.

- **Oito prazos** — dia, semana, mês, trimestre, semestre, ano, dois anos ou permanente; tipos FULL, TRIAL, ENTERPRISE e LIFETIME.
- **Pedido pelo WhatsApp** — na tela **Licencia de Uso** (Web e Android) o cliente pede o seu plano e o pedido fica registrado no servidor.
- **Quatro formas de emitir chaves** — o painel 🔐 **Gestionar licencia** da Web, o gerador independente `tools/license_studio.py` (HTTPS em porta própria), o terminal `tools/generate_license.py` e a API `POST /api/license/generate`.
- **Controle total** — licenças emitidas, aparelhos ativados, renovação, revogação e exportação CSV, tudo registrado na auditoria.

📖 Guia completo (em espanhol): [docs/LICENCIAS.md](../LICENCIAS.md).

## 🔒 Segurança

- **Contas** — senhas PBKDF2-SHA256 (210.000 iterações), bloqueio de 5 minutos após 5 tentativas falhas, verificação em duas etapas (TOTP) obrigatória por padrão para o Administrador e códigos de recuperação.
- **Sessões e permissões** — sessões que expiram por inatividade e por duração máxima, permissões validadas no servidor, cabeçalho anti-CSRF e limite de requisições por IP no acesso, na recuperação e nos pedidos de licença.
- **Dados** — cópias criptografadas automáticas todos os dias com rotação, réplica opcional fora do equipamento (`BACKUP_MIRROR_DIRS`, regra 3-2-1), fechamento de dias e auditoria.
- **Web** — cabeçalhos CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e HSTS quando servido por HTTPS.

Os dados legais públicos (#legal) são preenchidos em **Ajustes → Datos legales** — guia: [docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md) (em espanhol). Encontrou uma vulnerabilidade? **Não abra uma issue pública**: siga a [política de segurança](../../SECURITY.md#english).

## ✅ Testes

As mesmas verificações que a integração contínua executa (`.github/workflows/ci.yml`), a partir da raiz do repositório:

```bash
# Web e IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Servidor e ferramentas (Python)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Painel de Controle Visual (PowerShell 7) e Android (JDK 17 + Gradle 8.14.5)
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 Estrutura do projeto

```text
app/       Aplicativo Android (Kotlin + Jetpack Compose)
web/       Interface Web, lógica e recursos (PWA sem etapa de build)
server/    API, autenticação, SQLite, cópias e inicializadores para Windows (Python, PowerShell)
tools/     Testes, importação do Excel e gerador/controle de licenças
deploy/    Docker Compose + Caddy para publicar com HTTPS e domínio próprio
docs/      Manuais, guias legais e de conformidade, traduções e capturas de tela
xlsx/      Planilhas do Excel de referência para importar
brand/     Logotipo do NovaGest
venv/      Bibliotecas Python para Windows sem conexão (veja venv/README.md)
```

O banco de dados operacional, as cópias, os certificados e as chaves geradas (`data/`, `certs/`) ficam fora do controle de versão.

## 📚 Documentação

Os guias detalhados estão em espanhol.

| Documento | Conteúdo |
|---|---|
| [Instalação e implantação](../INSTALACION.md) | Servidor, Windows com HTTPS e Painel de Controle Visual, Docker, Android e produção |
| [Licenças de uso](../LICENCIAS.md) | Ativação, prazos, pedidos pelo WhatsApp, gerador independente e controle de chaves |
| [Manual rápido](../MANUAL.md) | Uso diário do aplicativo passo a passo |
| [Depósitos e importação](../ALMACENES.md) | Estoque por depósito, transferências e importação de valores |
| [Mapeamento do Excel](../MAPEO_EXCEL.md) | Como cada planilha de `xlsx/` é interpretada |
| [Dados legais](../GUIA_DATOS_LEGALES.md) | Como preencher as informações legais do negócio |
| [Conformidade](../CUMPLIMIENTO.md) · [Revisão legal](../REVISION_LEGAL.md) | Auditoria de conformidade, acessibilidade e segurança, e lista de fechamento legal |
| [Certificação](../certificacion/00-INDICE-Y-FIRMAS.md) | Preparação para ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2 e ISO 27701 |
| [Melhoria contínua](../MEJORA_CONTINUA.md) · [Roteiro](../ROADMAP.md) | Próximas melhorias priorizadas e como são verificadas |
| [Origem das imagens](../IMAGENES.md) | Origem e licença das imagens do projeto |
| [Registro de alterações](../../CHANGELOG.md) | Melhorias e correções de cada versão (Web e Android) |

## ❓ Perguntas frequentes

<details>
<summary><b>Funciona sem internet?</b></summary>

<br />

Sim, na rede do seu negócio. O servidor pode ser um notebook com Windows na sua rede local, sem acesso à internet. O aplicativo Web se instala como app (PWA) e, se a conexão com o servidor cair, continua operando e salva as alterações ao reconectar. O app Android trabalha com armazenamento local e sincroniza quando há conexão.

</details>

<details>
<summary><b>Preciso de um servidor?</b></summary>

<br />

Sim: o servidor Python serve o aplicativo Web e a API e guarda os dados compartilhados em SQLite. Pode ser um notebook com Windows (`server\iniciar-https.ps1`), um computador Linux ou um servidor com Docker e domínio próprio. Veja [Instalação e implantação](../INSTALACION.md).

</details>

<details>
<summary><b>Onde ficam os meus dados?</b></summary>

<br />

No servidor do seu negócio (`data/`), não em serviços de terceiros. O NovaGest não usa análises de tráfego nem publicidade, e as cópias de segurança diárias são guardadas criptografadas.

</details>

<details>
<summary><b>Como obtenho uma licença de uso?</b></summary>

<br />

Na tela **Licencia de Uso** da Web ou do app Android: escreva seu nome ou empresa, escolha o prazo e toque em **Solicitar por WhatsApp**. Você receberá uma chave assinada para ativar nessa mesma tela.

</details>

<details>
<summary><b>Posso importar minhas planilhas do Excel?</b></summary>

<br />

Sim. As planilhas de conferência diária, estoque por localidade e resumo semanal são importadas com prévia e confirmação, sem substituir dados sem a sua permissão. Veja [Importar as planilhas do Excel](#-importar-as-planilhas-do-excel).

</details>

<details>
<summary><b>E se o computador quebrar ou faltar energia?</b></summary>

<br />

O servidor faz uma cópia criptografada todos os dias e guarda as mais recentes; com `BACKUP_MIRROR_DIRS` também as replica em outro disco ou pasta de rede. Para recuperar, restaure em **Copias** (cópias de segurança). Guarde a chave de criptografia fora do servidor.

</details>

<details>
<summary><b>Funciona com leitor de código de barras?</b></summary>

<br />

Sim: com leitores USB ou Bluetooth (que digitam como um teclado) e com a câmera do celular ou do PC em **Venta rápida** (venda rápida).

</details>

<details>
<summary><b>Com quais moedas trabalha?</b></summary>

<br />

A conferência de caixa trabalha com taxas CUP/USD e MXN/USD, a venda rápida mostra o equivalente em CUP de cada pagamento e cada ficha de custo guarda seus valores em USD ou em CUP.

</details>

## 🤝 Contribuir

Contribuições são bem-vindas: relatos de erros, propostas de melhoria e pull requests. Leia o [guia de contribuição](../../CONTRIBUTING.md#english) antes de começar — ele explica como preparar o ambiente, executar os testes e propor mudanças.

## 📄 Licença

**Software proprietário — todos os direitos reservados.** © 2026 yhquintero.

Ver o código no GitHub não concede nenhum direito de uso: instalar o NovaGest em um negócio, copiá-lo, modificá-lo, distribuí-lo ou contornar o seu sistema de licenças exige uma licença de uso do titular. Condições completas na [LICENSE](../../LICENSE). Os componentes de terceiros mantêm as suas próprias licenças: [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## 📝 Registro de alterações e roteiro

As melhorias e correções de cada versão estão no [CHANGELOG.md](../../CHANGELOG.md); as próximas, priorizadas, em [docs/ROADMAP.md](../ROADMAP.md) (em espanhol).

---

<div align="center">

<sub><b>NovaGest</b> · Gerencie. Cresça. Avance. · © 2026 yhquintero · <a href="#novagest">Voltar ao topo ⬆</a></sub>

</div>
