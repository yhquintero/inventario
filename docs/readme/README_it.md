<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="Logo di NovaGest" />

# NovaGest

### Gestisci. Cresci. Avanza.

**Magazzino, punto vendita, quadratura di cassa giornaliera e report per la tua attività — sul Web, su Android e offline.**

🌐 [Español](../../README.md) · [English](README_en.md) · [Português](README_pt-BR.md) · [Français](README_fr.md) · **Italiano** · [Deutsch](README_de.md) · [Русский](README_ru.md) · [简体中文](README_zh-CN.md)

[![Versione](https://img.shields.io/badge/versione-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![Piattaforme](https://img.shields.io/badge/piattaforme-Web%20%C2%B7%20Android%20%C2%B7%20Server-1e1b4b?style=flat-square)](#-cosa-include)
[![PWA](https://img.shields.io/badge/PWA-funziona%20offline-059669?style=flat-square)](#-domande-frequenti)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-avvio-rapido)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-dati%20condivisi-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![Licenza](https://img.shields.io/badge/licenza-proprietaria-475569?style=flat-square)](../../LICENSE)

[Funzionalità](#-funzionalità) · [Screenshot](#-screenshot) · [Avvio rapido](#-avvio-rapido) · [Documentazione](#-documentazione) · [Domande frequenti](#-domande-frequenti) · [Sicurezza](#-sicurezza) · [Licenza](#-licenza)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest: la dashboard nel browser e la vendita rapida sullo smartphone" />
</p>

> [!NOTE]
> Questa è una traduzione del [README in spagnolo](../../README.md), che è la versione di riferimento. L'interfaccia dell'applicazione e le guide dettagliate in `docs/` sono in spagnolo.

> [!IMPORTANT]
> **NovaGest è software proprietario.** Il codice è visibile su GitHub, ma usarlo in un'attività, copiarlo, modificarlo o distribuirlo richiede una **licenza d'uso** concessa dal titolare. Vedi [LICENSE](../../LICENSE) e la sezione [Licenza](#-licenza).

## 💡 Che cos'è NovaGest?

**NovaGest** riunisce in un unico posto tutto ciò di cui la tua attività ha bisogno ogni giorno: **magazzino multi-deposito**, **punto vendita**, **quadratura di cassa giornaliera** e **report con analisi**. Basta fogli sparsi e quaderni: l'applicazione Web si installa come un'app e continua a funzionare se cade la connessione, l'app Android porta l'operatività in tasca e il server condiviso fa lavorare tutti sullo stesso stato in tempo reale — con licenza d'uso, ruoli, audit e backup.

> 📊 **Comandano i tuoi dati.** Le cartelle di lavoro Excel sono solo fonti di importazione e di riferimento: l'applicazione non importa né sostituisce mai dati operativi senza mostrarti un'**anteprima** e ricevere la tua conferma. Una nuova installazione può partire dai dati iniziali inclusi nel progetto.

## 🧩 Cosa include

| Applicazione | Cosa ci fai |
|---|---|
| 🌐 **Web (PWA)** | Il centro di comando: magazzino, depositi, importazione di valori, movimenti, vendita rapida, quadratura di cassa, report settimanale, verifica delle giacenze e amministrazione — con ricerca globale (`Ctrl+K`), guida integrata, scorciatoie da tastiera e tema chiaro/scuro. Si installa come applicazione e si apre offline. |
| 📱 **Android** | L'operatività in movimento: la stessa gestione con Kotlin + Jetpack Compose, archiviazione locale, sblocco biometrico e sincronizzazione con il server quando c'è connessione. |
| 🗄️ **Server** | Il cuore che unisce tutto: API e sito Web in un unico processo Python, dati condivisi in SQLite, sessioni e permessi verificati sul server, licenze firmate, audit e backup cifrati automatici. |

## ✨ Funzionalità

- 📦 **Magazzino multi-deposito** — ogni deposito conserva le proprie giacenze e il magazzino generale le somma tutte; importa valori, trasferisci merce tra depositi e correggi le differenze con lo storico completo.
- 🛒 **Punto vendita** — vendita rapida che scala all'istante le giacenze del deposito in uso, con **lettore di codici a barre** (fotocamera o lettore USB/Bluetooth), pagamento **in contanti o a credito** per un cliente, e commissioni e costi di consegna calcolati automaticamente.
- 🤝 **Clienti e vendite a credito** — anagrafica clienti con limite di credito, crediti con scadenza, stati (in sospeso/parziale/scaduto/pagato) e **acconti** con storico; il totale da incassare è visibile nella dashboard.
- 🧮 **Quadratura di cassa giornaliera (cuadre)** — tassi CUP/USD e MXN/USD, incassi, entrate, prelievi, fondi e spese: la giornata è «quadrata» quando il risultato è 0, e l'applicazione ti avvisa se non lo è.
- 🔄 **Movimenti** — vendite, carichi e scarichi con deposito, punto vendita, quantità, importi e note; ogni movimento ricalcola le giacenze e resta registrato.
- 🧾 **Schede di costo e IPV** — scheda di costo versionata per prodotto o servizio (componenti presi dal tuo magazzino, costo totale, resa e costo per porzione) con flusso Bozza → Approvata, e **controllo IPV** per periodo (`IPV-AAAA-NNNN`) verificato rispetto alla scheda. Web: **Fichas de costo · IPV**; Android: consultazione sincronizzata. Adattato da [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos); gli importi sono salvati nella valuta di ogni scheda (USD o CUP).
- 📊 **Report e verifica** — quadrature giornaliere, riepilogo settimanale e verifica delle giacenze per giorno, settimana, mese, anno o periodo personalizzato, con esportazione CSV/PDF pronta da stampare o da inviare al commercialista.
- 📈 **Analisi e obiettivi** — vendite per periodo, utile lordo e netto, valore del magazzino a prezzo di vendita e a costo, e avanzamento rispetto agli obiettivi giornalieri e settimanali.
- 🕵️ **Storico e audit** — prezzi, costi e tassi per giorno; registro di chi ha fatto cosa e quando, in base al ruolo di ogni utente.
- ☁️ **Sincronizzazione multipiattaforma** — Web e Android lavorano sullo stesso stato; se la connessione si interrompe, il Web continua a funzionare e si sincronizza alla riconnessione.
- 🔐 **Sicurezza di livello aziendale** — licenza d'uso firmata crittograficamente, verifica in due passaggi (TOTP), blocco dopo tentativi falliti, chiusura delle giornate e backup cifrati.

## 📸 Screenshot

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="Vendita rapida con lettore di codici a barre, categorie, prodotti e carrello" /><br /><sub><b>Vendita rapida</b> — lettore di codici a barre, carrello e pagamento in contanti o a credito.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="Magazzino con giacenze, prezzi, costi e categorie" /><br /><sub><b>Magazzino</b> — giacenze per deposito, prezzi, costi, commissioni e categorie.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="Quadratura di cassa con tassi, fondi, spese e risultato della giornata" /><br /><sub><b>Quadratura di cassa</b> — tassi CUP/USD, fondi e spese; il risultato deve essere 0.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="Analisi e obiettivi con indicatori, obiettivi, margine per categoria e andamento delle vendite" /><br /><sub><b>Analisi e obiettivi</b> — indicatori, obiettivi, margine per categoria e andamento giornaliero.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="Dashboard principale con tema chiaro" /><br /><sub><b>Dashboard</b> — riepilogo del giorno, avvisi di giacenza e scorciatoie (tema chiaro).</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="Dashboard principale con tema scuro" /><br /><sub><b>Dashboard</b> — lo stesso riepilogo con tema scuro.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="L'applicazione Web di NovaGest sullo smartphone: dashboard, vendita rapida e tema scuro" />
  <br /><sub>L'applicazione Web sullo smartphone: navigazione in basso, installabile come app (PWA). Screenshot con i dati dimostrativi del progetto.</sub>
</p>

## 🚀 Avvio rapido

### Server e applicazione Web

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 o successivo
python3 server/novagest_server.py            # Web + API su http://localhost:8080

# In un altro terminale: chiave per questa installazione
python3 tools/generate_license.py --client "Il Mio Negozio" --term MES
```

Apri `http://localhost:8080`, incolla la chiave nella schermata **Licencia de Uso** (licenza d'uso) ed entra con uno degli account dimostrativi. Una nuova installazione resta bloccata finché non viene attivata una chiave valida: l'intero sistema è spiegato in [docs/LICENCIAS.md](../LICENCIAS.md) (in spagnolo).

<details>
<summary><b>Account dimostrativi (solo per test locali)</b></summary>

<br />

Un nuovo database crea questi account (non vengono più mostrati nella schermata di accesso):

| Utente | Password iniziale | Ruolo |
|---|---|---|
| `admin` | `Admin123!` | Administrador (amministratore) |
| `jefe` | `Jefe123!` | Jefe (responsabile) |
| `economico` | `Eco123!` | Económico (amministrazione contabile) |
| `almacenero` | `Alma123!` | Almacenero (magazziniere) |

Il ruolo Amministratore deve attivare la verifica in due passaggi all'accesso (`REQUIRE_ADMIN_TOTP=1`, predefinito).

</details>

> [!WARNING]
> **Cambia le password iniziali prima di usare il sistema con dati reali.** In produzione avvia il server con `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<segreta, min. 10 caratteri>`, usa sempre HTTPS e conserva le chiavi di cifratura fuori dal server. Elenco completo in [SECURITY.md](../../SECURITY.md#-production-hardening).

### Windows con HTTPS (un solo portatile)

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Crea il certificato con mkcert, apre la porta 8443 nel firewall e avvia il **Pannello di controllo visivo** (icona nell'area di notifica) con il server e il generatore di licenze in background.

### Docker con un dominio proprio

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

Apri la radice del progetto in Android Studio (JDK 17 e Gradle 8.14.5), esegui la configurazione `app` e indica nella schermata di accesso l'indirizzo HTTPS del server per sincronizzare.

📖 Guida passo passo — HTTPS, Pannello di controllo visivo, Docker, Android e produzione: [docs/INSTALACION.md](../INSTALACION.md) (in spagnolo).

## 📥 Importare le cartelle di lavoro Excel

Le importazioni si avviano dall'interfaccia e mostrano un'**anteprima** prima del salvataggio. Non sostituiscono i movimenti e non vengono mai eseguite automaticamente all'apertura dell'applicazione.

| Cartella di lavoro in `xlsx/` | Dove si applica | Cosa conserva |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → importa cartella di lavoro | Rileva tutti i fogli giornalieri selezionati e li importa in ordine cronologico: giacenze, carichi, scarichi, vendite, tasso e quadratura. La data deriva dal nome del foglio; le differenze di apertura/chiusura sono registrate come rettifiche esplicite e reimportare sostituisce ogni lotto. Alimenta anche i dati iniziali del progetto. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → importa cartella di lavoro | Importazione massiva dei fogli giornalieri con data, deposito e selezione correggibili; segnala date vuote e duplicate prima del salvataggio. Conserva l'importo reale, il costo unitario e la commissione in CUP di ogni vendita e crea riferimenti finanziari giornalieri per controllare le differenze di cassa e di giacenza. |
| `PCH.xlsx` | Web → **Importar valores** → carica file | Si sceglie una delle sedi (**Pinar del Río**, **Consolación** o **Herradura**) e le sue giacenze vengono importate nel deposito di destinazione. I nomi ripetuti vengono uniti sommando le giacenze; i prezzi globali non cambiano, perché variano da sede a sede. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Legge il foglio `PINAR`, mostra settimane, date e totali prima del salvataggio e conserva ogni settimana come riferimento Excel, senza sostituire movimenti, quadrature o calcoli dell'applicazione. |

📅 **Anno del riepilogo settimanale:** la cartella settimanale non riporta l'anno. L'importazione propone l'anno dell'ultima data con dati (o l'anno corrente se non ce ne sono) e lo mostra nell'anteprima prima del salvataggio.

Il modulo **Importar valores** accetta anche colonne incollate da Excel, file `.xlsx`, `.csv`, `.tsv` o `.txt`, oppure righe scritte a mano: scegli il deposito di destinazione, rivedi le modifiche e decidi se sovrascrivere i valori esistenti o completare solo quelli mancanti. Le colonne vuote non modificano mai i dati salvati.

📖 Guide (in spagnolo): [Depositi e importazione](../ALMACENES.md) · [Manuale rapido](../MANUAL.md) · [Mappatura di Excel](../MAPEO_EXCEL.md).

## 📑 Report e PDF

- **Web:** da Magazzino, Movimenti, Depositi, Quadratura di cassa, Report settimanale o Verifica puoi stampare o salvare in PDF i dati visibili o il deposito scelto. In Verifica scegli giorno, settimana, mese, anno o date **Da/A** e filtri per deposito: il report confronta le giacenze di apertura/chiusura con i movimenti usando gli importi e i costi storici di ogni vendita. La stampa usa il formato A4 orizzontale, un'intestazione con l'attività e il periodo, e nasconde i controlli.
- **Android:** la Quadratura di cassa consente di **esportare la quadratura in PDF** e Report di **esportare la verifica in PDF**, con intestazioni, cifre chiave, tabelle paginate e piè di pagina, condivisi tramite la finestra di dialogo standard di Android. Sono disponibili anche esportazioni CSV ed Excel della verifica —con costo, utile e commissione— e CSV dei movimenti con il costo di ogni momento.

## 🔑 Licenze d'uso del prodotto

NovaGest si attiva con una **chiave di licenza firmata** (HMAC-SHA256, prefisso `NG-`) che ogni installazione verifica con il proprio segreto.

- **Otto durate** — giorno, settimana, mese, trimestre, semestre, anno, due anni o permanente; tipi FULL, TRIAL, ENTERPRISE e LIFETIME.
- **Richiesta tramite WhatsApp** — dalla schermata **Licencia de Uso** (Web e Android) il cliente richiede il proprio piano e la richiesta viene registrata sul server.
- **Quattro modi per emettere chiavi** — il pannello 🔐 **Gestionar licencia** del Web, il generatore autonomo `tools/license_studio.py` (HTTPS sulla propria porta), la riga di comando `tools/generate_license.py` e l'API `POST /api/license/generate`.
- **Controllo totale** — licenze emesse, dispositivi attivati, rinnovo, revoca ed esportazione CSV, tutto registrato nell'audit.

📖 Guida completa (in spagnolo): [docs/LICENCIAS.md](../LICENCIAS.md).

## 🔒 Sicurezza

- **Account** — password PBKDF2-SHA256 (210.000 iterazioni), blocco di 5 minuti dopo 5 tentativi falliti, verifica in due passaggi (TOTP) obbligatoria per impostazione predefinita per l'amministratore e codici di recupero.
- **Sessioni e permessi** — sessioni che scadono per inattività e per durata massima, permessi verificati sul server, intestazione anti-CSRF e limite di richieste per IP su accesso, recupero e richieste di licenza.
- **Dati** — backup cifrati automatici ogni giorno con rotazione, replica facoltativa fuori dal computer (`BACKUP_MIRROR_DIRS`, regola 3-2-1), chiusura delle giornate e audit.
- **Web** — intestazioni CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e HSTS quando servito in HTTPS.

Le informazioni legali pubbliche (#legal) si compilano in **Ajustes → Datos legales** — guida: [docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md) (in spagnolo). Hai trovato una vulnerabilità? **Non aprire una issue pubblica**: segui la [politica di sicurezza](../../SECURITY.md#english).

## ✅ Test

Gli stessi controlli eseguiti dall'integrazione continua (`.github/workflows/ci.yml`), dalla radice del repository:

```bash
# Web e IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Server e strumenti (Python)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Pannello di controllo visivo (PowerShell 7) e Android (JDK 17 + Gradle 8.14.5)
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 Struttura del progetto

```text
app/       Applicazione Android (Kotlin + Jetpack Compose)
web/       Interfaccia Web, logica e risorse (PWA senza fase di build)
server/    API, autenticazione, SQLite, backup e avviatori per Windows (Python, PowerShell)
tools/     Test, importazione da Excel e generatore/gestore di licenze
deploy/    Docker Compose + Caddy per pubblicare in HTTPS con un dominio proprio
docs/      Manuali, guide legali e di conformità, traduzioni e screenshot
xlsx/      Cartelle di lavoro Excel di riferimento da importare
brand/     Logo di NovaGest
venv/      Librerie Python per Windows offline (vedi venv/README.md)
```

Il database operativo, i backup, i certificati e le chiavi generate (`data/`, `certs/`) restano fuori dal controllo di versione.

## 📚 Documentazione

Le guide dettagliate sono in spagnolo.

| Documento | Contenuto |
|---|---|
| [Installazione e distribuzione](../INSTALACION.md) | Server, Windows con HTTPS e Pannello di controllo visivo, Docker, Android e produzione |
| [Licenze d'uso](../LICENCIAS.md) | Attivazione, durate, richieste tramite WhatsApp, generatore autonomo e gestione delle chiavi |
| [Manuale rapido](../MANUAL.md) | Uso quotidiano dell'applicazione passo passo |
| [Depositi e importazione](../ALMACENES.md) | Giacenze per deposito, trasferimenti e importazione di valori |
| [Mappatura di Excel](../MAPEO_EXCEL.md) | Come viene interpretata ogni cartella di lavoro di `xlsx/` |
| [Informazioni legali](../GUIA_DATOS_LEGALES.md) | Come completare le informazioni legali dell'attività |
| [Conformità](../CUMPLIMIENTO.md) · [Revisione legale](../REVISION_LEGAL.md) | Audit di conformità, accessibilità e sicurezza, ed elenco di chiusura legale |
| [Certificazione](../certificacion/00-INDICE-Y-FIRMAS.md) | Preparazione a ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2 e ISO 27701 |
| [Miglioramento continuo](../MEJORA_CONTINUA.md) · [Roadmap](../ROADMAP.md) | Prossimi miglioramenti in ordine di priorità e come vengono verificati |
| [Provenienza delle immagini](../IMAGENES.md) | Origine e licenza delle immagini del progetto |
| [Registro delle modifiche](../../CHANGELOG.md) | Miglioramenti e correzioni di ogni versione (Web e Android) |

## ❓ Domande frequenti

<details>
<summary><b>Funziona senza Internet?</b></summary>

<br />

Sì, nella rete della tua attività. Il server può essere un portatile Windows nella tua rete locale, senza accesso a Internet. L'applicazione Web si installa come app (PWA) e, se la connessione con il server si interrompe, continua a funzionare e salva le modifiche alla riconnessione. L'app Android lavora con archiviazione locale e si sincronizza quando c'è connessione.

</details>

<details>
<summary><b>Mi serve un server?</b></summary>

<br />

Sì: il server Python serve l'applicazione Web e l'API e conserva i dati condivisi in SQLite. Può essere un portatile Windows (`server\iniciar-https.ps1`), un computer Linux o un server Docker con un dominio proprio. Vedi [Installazione e distribuzione](../INSTALACION.md).

</details>

<details>
<summary><b>Dove vengono salvati i miei dati?</b></summary>

<br />

Sul server della tua attività (`data/`), non presso servizi di terzi. NovaGest non usa strumenti di analisi né pubblicità, e i backup giornalieri vengono conservati cifrati.

</details>

<details>
<summary><b>Come ottengo una licenza d'uso?</b></summary>

<br />

Dalla schermata **Licencia de Uso** dell'app Web o Android: scrivi il tuo nome o quello dell'azienda, scegli la durata e tocca **Solicitar por WhatsApp** (richiedi tramite WhatsApp). Riceverai una chiave firmata da attivare nella stessa schermata.

</details>

<details>
<summary><b>Posso importare le mie cartelle di lavoro Excel?</b></summary>

<br />

Sì. Le cartelle di quadratura giornaliera, giacenze per sede e riepilogo settimanale si importano con anteprima e conferma, senza mai sostituire dati senza il tuo permesso. Vedi [Importare le cartelle di lavoro Excel](#-importare-le-cartelle-di-lavoro-excel).

</details>

<details>
<summary><b>Cosa succede se il computer si guasta o va via la corrente?</b></summary>

<br />

Il server esegue ogni giorno un backup cifrato e conserva i più recenti; con `BACKUP_MIRROR_DIRS` li replica anche su un altro disco o in una cartella di rete. Per recuperare, ripristina da **Copias** (backup). Conserva la chiave di cifratura fuori dal server.

</details>

<details>
<summary><b>Funziona con i lettori di codici a barre?</b></summary>

<br />

Sì: con lettori USB o Bluetooth (che digitano come una tastiera) e con la fotocamera dello smartphone o del PC da **Venta rápida** (vendita rapida).

</details>

<details>
<summary><b>Con quali valute lavora?</b></summary>

<br />

La quadratura di cassa lavora con i tassi CUP/USD e MXN/USD, la vendita rapida mostra l'equivalente in CUP di ogni pagamento e ogni scheda di costo conserva i propri importi in USD o in CUP.

</details>

## 🤝 Contribuire

I contributi sono benvenuti: segnalazioni di bug, proposte di miglioramento e pull request. Leggi la [guida per contribuire](../../CONTRIBUTING.md#english) prima di iniziare — spiega come preparare l'ambiente, eseguire i test e proporre modifiche.

## 📄 Licenza

**Software proprietario — tutti i diritti riservati.** © 2026 yhquintero.

Consultare il codice su GitHub non concede alcun diritto d'uso: installare NovaGest in un'attività, copiarlo, modificarlo, distribuirlo o aggirarne il sistema di licenze richiede una licenza d'uso del titolare. Condizioni complete in [LICENSE](../../LICENSE). I componenti di terze parti mantengono le proprie licenze: [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## 📝 Registro delle modifiche e roadmap

I miglioramenti e le correzioni di ogni versione sono in [CHANGELOG.md](../../CHANGELOG.md); i prossimi, in ordine di priorità, in [docs/ROADMAP.md](../ROADMAP.md) (in spagnolo).

---

<div align="center">

<sub><b>NovaGest</b> · Gestisci. Cresci. Avanza. · © 2026 yhquintero · <a href="#novagest">Torna su ⬆</a></sub>

</div>
