<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="NovaGest-Logo" />

# NovaGest

### Verwalten. Wachsen. Vorankommen.

**Lagerbestand, Kasse, täglicher Kassenabgleich und Berichte für Ihr Geschäft — im Web, auf Android und offline.**

🌐 [Español](../../README.md) · [English](README_en.md) · [Português](README_pt-BR.md) · [Français](README_fr.md) · [Italiano](README_it.md) · **Deutsch** · [Русский](README_ru.md) · [简体中文](README_zh-CN.md)

[![Version](https://img.shields.io/badge/Version-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![Plattformen](https://img.shields.io/badge/Plattformen-Web%20%C2%B7%20Android%20%C2%B7%20Server-1e1b4b?style=flat-square)](#-was-enthalten-ist)
[![PWA](https://img.shields.io/badge/PWA-funktioniert%20offline-059669?style=flat-square)](#-häufige-fragen)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-schnellstart)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-gemeinsame%20Daten-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![Lizenz](https://img.shields.io/badge/Lizenz-propriet%C3%A4r-475569?style=flat-square)](../../LICENSE)

[Funktionen](#-funktionen) · [Screenshots](#-screenshots) · [Schnellstart](#-schnellstart) · [Dokumentation](#-dokumentation) · [Häufige Fragen](#-häufige-fragen) · [Sicherheit](#-sicherheit) · [Lizenz](#-lizenz)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest: das Dashboard im Browser und der Schnellverkauf auf dem Smartphone" />
</p>

> [!NOTE]
> Dies ist eine Übersetzung des [spanischen README](../../README.md), das als Referenzversion gilt. Die Benutzeroberfläche und die ausführlichen Anleitungen in `docs/` sind auf Spanisch.

> [!IMPORTANT]
> **NovaGest ist proprietäre Software.** Der Code ist auf GitHub einsehbar, aber die Nutzung in einem Unternehmen, das Kopieren, Ändern oder Verbreiten erfordert eine **Nutzungslizenz** des Rechteinhabers. Siehe [LICENSE](../../LICENSE) und den Abschnitt [Lizenz](#-lizenz).

## 💡 Was ist NovaGest?

**NovaGest** vereint an einem Ort alles, was Ihr Geschäft täglich braucht: **Lagerverwaltung für mehrere Lager**, **Kasse (Point of Sale)**, **täglichen Kassenabgleich** und **Berichte mit Analysen**. Schluss mit losen Tabellen und Notizbüchern: Die Web-App lässt sich wie eine App installieren und arbeitet weiter, wenn die Verbindung abbricht, die Android-App bringt den Betrieb in die Hosentasche, und der gemeinsame Server hält alle in Echtzeit auf demselben Stand — mit Nutzungslizenz, Rollen, Protokollierung und Datensicherungen.

> 📊 **Ihre Daten haben Vorrang.** Excel-Arbeitsmappen sind nur Import- und Referenzquellen: Die Anwendung importiert oder ersetzt niemals Betriebsdaten, ohne Ihnen eine **Vorschau** zu zeigen und Ihre Bestätigung einzuholen. Eine neue Installation kann mit den im Projekt enthaltenen Startdaten beginnen.

## 🧩 Was enthalten ist

| Anwendung | Wofür Sie sie nutzen |
|---|---|
| 🌐 **Web (PWA)** | Die Kommandozentrale: Lagerbestand, Lager, Werteimport, Bewegungen, Schnellverkauf, täglicher Kassenabgleich, Wochenbericht, Bestandsprüfung und Verwaltung — mit globaler Suche (`Ctrl+K`), integrierter Einführung, Tastenkürzeln und hellem/dunklem Modus. Lässt sich als App installieren und öffnet offline. |
| 📱 **Android** | Der Betrieb unterwegs: dieselbe Verwaltung mit Kotlin + Jetpack Compose, lokaler Speicherung, biometrischer Entsperrung und Synchronisierung mit dem Server, sobald eine Verbindung besteht. |
| 🗄️ **Server** | Das Herz, das alles verbindet: API und Website in einem einzigen Python-Prozess, gemeinsame Daten in SQLite, serverseitig geprüfte Sitzungen und Berechtigungen, signierte Lizenzen, Protokollierung und automatische verschlüsselte Sicherungen. |

## ✨ Funktionen

- 📦 **Lagerverwaltung für mehrere Lager** — jedes Lager führt seinen eigenen Bestand, der Gesamtbestand summiert alle; importieren Sie Werte, verlagern Sie Ware zwischen Lagern und gleichen Sie Differenzen mit vollständigem Verlauf aus.
- 🛒 **Kasse** — Schnellverkauf, der den Bestand des aktiven Lagers sofort abbucht, mit **Barcode-Scanner** (Kamera oder USB-/Bluetooth-Scanner), Zahlung **bar oder auf Kredit** für einen Kunden sowie automatisch berechneten Provisionen und Liefergebühren.
- 🤝 **Kunden und Anschreiben** — Kundenkartei mit Kreditlimit, Forderungen mit Fälligkeit, Status (offen/teilweise/überfällig/bezahlt) und **Teilzahlungen** mit Verlauf; der offene Gesamtbetrag erscheint im Dashboard.
- 🧮 **Täglicher Kassenabgleich (cuadre)** — Wechselkurse CUP/USD und MXN/USD, Einnahmen, Einlagen, Entnahmen, Bestände und Ausgaben: Der Tag ist „ausgeglichen“, wenn das Ergebnis 0 ist, und die Anwendung warnt Sie, wenn nicht.
- 🔄 **Bewegungen** — Verkäufe, Zugänge und Abgänge mit Lager, Verkaufsstelle, Mengen, Beträgen und Bemerkungen; jede Bewegung berechnet den Bestand neu und wird protokolliert.
- 🧾 **Kostenblätter und IPV** — versioniertes Kostenblatt je Produkt oder Dienstleistung (Komponenten aus dem eigenen Bestand, Gesamtkosten, Ausbeute und Kosten pro Portion) mit dem Ablauf Entwurf → Freigegeben sowie periodenbezogene **IPV-Kontrolle** (`IPV-JJJJ-NNNN`), die gegen das Kostenblatt geprüft wird. Web: **Fichas de costo · IPV**; Android: synchronisierte Ansicht. Übernommen aus [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos); die Beträge werden in der Währung des jeweiligen Kostenblatts gespeichert (USD oder CUP).
- 📊 **Berichte und Prüfung** — tägliche Kassenabgleiche, Wochenübersicht und Bestandsprüfung nach Tag, Woche, Monat, Jahr oder frei wählbarem Zeitraum, mit CSV-/PDF-Export, bereit zum Drucken oder für die Buchhaltung.
- 📈 **Analysen und Ziele** — Umsatz nach Zeitraum, Brutto- und Nettogewinn, Lagerwert zu Verkaufs- und zu Einstandspreisen sowie Fortschritt gegenüber Tages- und Wochenzielen.
- 🕵️ **Verlauf und Protokollierung** — Preise, Kosten und Kurse pro Tag; Nachweis, wer was wann getan hat, je nach Rolle des Benutzers.
- ☁️ **Plattformübergreifende Synchronisierung** — Web und Android arbeiten auf demselben Stand; bricht die Verbindung ab, arbeitet das Web weiter und synchronisiert bei erneuter Verbindung.
- 🔐 **Sicherheit auf Unternehmensniveau** — kryptografisch signierte Nutzungslizenz, Zwei-Faktor-Verifizierung (TOTP), Sperre nach Fehlversuchen, Tagesabschluss und verschlüsselte Sicherungen.

## 📸 Screenshots

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="Schnellverkauf mit Barcode-Scanner, Kategorien, Produkten und Warenkorb" /><br /><sub><b>Schnellverkauf</b> — Barcode-Scanner, Warenkorb und Zahlung bar oder auf Kredit.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="Lagerbestand mit Mengen, Preisen, Kosten und Kategorien" /><br /><sub><b>Lagerbestand</b> — Bestand je Lager, Preise, Kosten, Provisionen und Kategorien.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="Täglicher Kassenabgleich mit Kursen, Beständen, Ausgaben und Tagesergebnis" /><br /><sub><b>Kassenabgleich</b> — CUP/USD-Kurse, Bestände und Ausgaben; das Ergebnis muss 0 sein.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="Analysen und Ziele mit Kennzahlen, Zielen, Marge nach Kategorie und Umsatztrend" /><br /><sub><b>Analysen und Ziele</b> — Kennzahlen, Ziele, Marge nach Kategorie und Tagestrend.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="Haupt-Dashboard im hellen Modus" /><br /><sub><b>Dashboard</b> — Tagesübersicht, Bestandswarnungen und Schnellzugriffe (heller Modus).</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="Haupt-Dashboard im dunklen Modus" /><br /><sub><b>Dashboard</b> — dieselbe Übersicht im dunklen Modus.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="Die NovaGest-Web-App auf dem Smartphone: Dashboard, Schnellverkauf und dunkler Modus" />
  <br /><sub>Die Web-App auf dem Smartphone: Navigation am unteren Rand, als App installierbar (PWA). Screenshots mit den Demodaten des Projekts.</sub>
</p>

## 🚀 Schnellstart

### Server und Web-App

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 oder neuer
python3 server/novagest_server.py            # Web + API unter http://localhost:8080

# In einem zweiten Terminal: Schlüssel für diese Installation
python3 tools/generate_license.py --client "Mein Geschäft" --term MES
```

Öffnen Sie `http://localhost:8080`, fügen Sie den Schlüssel im Bildschirm **Licencia de Uso** (Nutzungslizenz) ein und melden Sie sich mit einem der Demokonten an. Eine neue Installation bleibt gesperrt, bis ein gültiger Schlüssel aktiviert wird: Das gesamte System ist in [docs/LICENCIAS.md](../LICENCIAS.md) (auf Spanisch) beschrieben.

<details>
<summary><b>Demokonten (nur für lokale Tests)</b></summary>

<br />

Eine neue Datenbank legt diese Konten an (sie werden auf dem Anmeldebildschirm nicht mehr angezeigt):

| Benutzer | Anfangspasswort | Rolle |
|---|---|---|
| `admin` | `Admin123!` | Administrador (Administrator) |
| `jefe` | `Jefe123!` | Jefe (Filialleitung) |
| `economico` | `Eco123!` | Económico (Buchhaltung) |
| `almacenero` | `Alma123!` | Almacenero (Lagerist) |

Die Rolle Administrator muss bei der Anmeldung die Zwei-Faktor-Verifizierung aktivieren (`REQUIRE_ADMIN_TOTP=1`, Standard).

</details>

> [!WARNING]
> **Ändern Sie die Anfangspasswörter, bevor Sie das System mit echten Daten nutzen.** Starten Sie den Server im Produktivbetrieb mit `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<geheim, mind. 10 Zeichen>`, verwenden Sie immer HTTPS und bewahren Sie die Verschlüsselungsschlüssel außerhalb des Servers auf. Vollständige Liste in [SECURITY.md](../../SECURITY.md#-production-hardening).

### Windows mit HTTPS (ein einzelner Laptop)

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Erstellt das Zertifikat mit mkcert, gibt Port 8443 in der Firewall frei und startet das **visuelle Kontrollpanel** (Symbol im Infobereich) mit dem Server und dem Lizenzgenerator im Hintergrund.

### Docker mit eigener Domain

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

Öffnen Sie das Projektverzeichnis in Android Studio (JDK 17 und Gradle 8.14.5), führen Sie die Konfiguration `app` aus und geben Sie zum Synchronisieren im Anmeldebildschirm die HTTPS-Adresse des Servers ein.

📖 Schritt-für-Schritt-Anleitung — HTTPS, visuelles Kontrollpanel, Docker, Android und Produktivbetrieb: [docs/INSTALACION.md](../INSTALACION.md) (auf Spanisch).

## 📥 Excel-Arbeitsmappen importieren

Importe werden über die Oberfläche gestartet und zeigen vor dem Speichern eine **Vorschau**. Sie ersetzen keine Bewegungen und laufen nie automatisch beim Öffnen der Anwendung.

| Arbeitsmappe in `xlsx/` | Wo sie verwendet wird | Was erhalten bleibt |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → Arbeitsmappe importieren | Erkennt alle ausgewählten Tagesblätter und importiert sie chronologisch: Bestand, Zugänge, Abgänge, Verkäufe, Kurs und Kassenabgleich. Das Datum stammt aus dem Blattnamen; Eröffnungs-/Abschlussdifferenzen werden als ausdrückliche Korrekturen erfasst, ein erneuter Import ersetzt jede Charge. Speist außerdem die Startdaten des Projekts. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → Arbeitsmappe importieren | Massenimport der Tagesblätter mit korrigierbarem Datum, Lager und Auswahl; warnt vor leeren und doppelten Daten vor dem Speichern. Bewahrt den tatsächlichen Betrag, die Stückkosten und die CUP-Provision je Verkauf und legt tägliche Finanzreferenzen an, um Kassen- und Bestandsdifferenzen zu prüfen. |
| `PCH.xlsx` | Web → **Importar valores** → Datei hochladen | Man wählt einen der Standorte (**Pinar del Río**, **Consolación** oder **Herradura**), und sein Bestand wird in das Ziellager importiert. Doppelte Namen werden durch Summieren des Bestands zusammengeführt; globale Preise bleiben unverändert, da sie je Standort variieren. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Liest das Blatt `PINAR`, zeigt Wochen, Daten und Summen vor dem Speichern und speichert jede Woche als Excel-Referenz, ohne Bewegungen, Kassenabgleiche oder Berechnungen der Anwendung zu ersetzen. |

📅 **Jahr der Wochenübersicht:** Die Wochenmappe enthält kein Jahr. Der Import schlägt das Jahr des letzten Datums mit Daten vor (oder das aktuelle Jahr, falls keines vorhanden ist) und zeigt es vor dem Speichern in der Vorschau.

Das Modul **Importar valores** akzeptiert außerdem aus Excel eingefügte Spalten, hochgeladene `.xlsx`-, `.csv`-, `.tsv`- oder `.txt`-Dateien oder von Hand eingegebene Zeilen: Sie wählen das Ziellager, prüfen die Änderungen und entscheiden, ob vorhandene Werte überschrieben oder nur fehlende ergänzt werden. Leere Spalten verändern gespeicherte Daten nie.

📖 Anleitungen (auf Spanisch): [Lager und Import](../ALMACENES.md) · [Kurzanleitung](../MANUAL.md) · [Excel-Zuordnung](../MAPEO_EXCEL.md).

## 📑 Berichte und PDF

- **Web:** In Lagerbestand, Bewegungen, Lager, Kassenabgleich, Wochenbericht oder Prüfung können Sie die angezeigten Daten oder das gewählte Lager drucken oder als PDF speichern. In der Prüfung wählen Sie Tag, Woche, Monat, Jahr oder **Von/Bis**-Daten und filtern nach Lager: Der Bericht vergleicht Eröffnungs-/Abschlussbestand mit den Bewegungen anhand der historischen Beträge und Kosten jedes Verkaufs. Der Druck verwendet A4 quer, eine Kopfzeile mit Geschäft und Zeitraum und blendet die Bedienelemente aus.
- **Android:** Der Kassenabgleich bietet **Abgleich als PDF exportieren**, die Berichte bieten **Prüfung als PDF exportieren** — mit Kopfzeilen, Kennzahlen, paginierten Tabellen und Fußzeile, geteilt über den Standarddialog von Android. Außerdem gibt es CSV- und Excel-Exporte der Prüfung —mit Kosten, Gewinn und Provision— sowie CSV-Exporte der Bewegungen mit den Kosten zum jeweiligen Zeitpunkt.

## 🔑 Nutzungslizenzen des Produkts

NovaGest wird mit einem **signierten Lizenzschlüssel** (HMAC-SHA256, Präfix `NG-`) aktiviert, den jede Installation mit ihrem eigenen Geheimnis prüft.

- **Acht Laufzeiten** — Tag, Woche, Monat, Quartal, Halbjahr, Jahr, zwei Jahre oder unbefristet; Typen FULL, TRIAL, ENTERPRISE und LIFETIME.
- **Anfrage per WhatsApp** — im Bildschirm **Licencia de Uso** (Web und Android) fordert der Kunde seinen Tarif an, und die Anfrage wird auf dem Server erfasst.
- **Vier Wege, Schlüssel auszustellen** — das Panel 🔐 **Gestionar licencia** im Web, der eigenständige Generator `tools/license_studio.py` (HTTPS auf eigenem Port), die Kommandozeile `tools/generate_license.py` und die API `POST /api/license/generate`.
- **Volle Kontrolle** — ausgestellte Lizenzen, aktivierte Geräte, Verlängerung, Widerruf und CSV-Export, alles im Protokoll festgehalten.

📖 Vollständige Anleitung (auf Spanisch): [docs/LICENCIAS.md](../LICENCIAS.md).

## 🔒 Sicherheit

- **Konten** — Passwörter mit PBKDF2-SHA256 (210.000 Iterationen), 5 Minuten Sperre nach 5 Fehlversuchen, Zwei-Faktor-Verifizierung (TOTP) standardmäßig Pflicht für den Administrator und Wiederherstellungscodes.
- **Sitzungen und Berechtigungen** — Sitzungen, die nach Inaktivität und nach einer Höchstdauer ablaufen, serverseitig geprüfte Berechtigungen, Anti-CSRF-Header und Anfragebegrenzung pro IP bei Anmeldung, Wiederherstellung und Lizenzanfragen.
- **Daten** — tägliche automatische verschlüsselte Sicherungen mit Rotation, optionale Replikation außerhalb des Geräts (`BACKUP_MIRROR_DIRS`, 3-2-1-Regel), Tagesabschluss und Protokollierung.
- **Web** — Header für CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` und HSTS bei Auslieferung über HTTPS.

Die öffentlichen rechtlichen Angaben (#legal) werden unter **Ajustes → Datos legales** ausgefüllt — Anleitung: [docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md) (auf Spanisch). Sie haben eine Sicherheitslücke gefunden? **Eröffnen Sie kein öffentliches Issue**: Folgen Sie der [Sicherheitsrichtlinie](../../SECURITY.md#english).

## ✅ Tests

Dieselben Prüfungen, die die kontinuierliche Integration ausführt (`.github/workflows/ci.yml`), aus dem Wurzelverzeichnis des Repositorys:

```bash
# Web und IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Server und Werkzeuge (Python)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Visuelles Kontrollpanel (PowerShell 7) und Android (JDK 17 + Gradle 8.14.5)
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 Projektstruktur

```text
app/       Android-App (Kotlin + Jetpack Compose)
web/       Web-Oberfläche, Logik und Ressourcen (PWA ohne Build-Schritt)
server/    API, Authentifizierung, SQLite, Sicherungen und Windows-Starter (Python, PowerShell)
tools/     Tests, Excel-Import und Lizenzgenerator/-verwaltung
deploy/    Docker Compose + Caddy zur Veröffentlichung mit HTTPS und eigener Domain
docs/      Handbücher, Rechts- und Compliance-Leitfäden, Übersetzungen und Screenshots
xlsx/      Excel-Referenzmappen für den Import
brand/     NovaGest-Logo
venv/      Python-Bibliotheken für Windows ohne Internet (siehe venv/README.md)
```

Die Betriebsdatenbank, die Sicherungen, die Zertifikate und die erzeugten Schlüssel (`data/`, `certs/`) bleiben außerhalb der Versionsverwaltung.

## 📚 Dokumentation

Die ausführlichen Anleitungen sind auf Spanisch.

| Dokument | Inhalt |
|---|---|
| [Installation und Bereitstellung](../INSTALACION.md) | Server, Windows mit HTTPS und visuellem Kontrollpanel, Docker, Android und Produktivbetrieb |
| [Nutzungslizenzen](../LICENCIAS.md) | Aktivierung, Laufzeiten, Anfragen per WhatsApp, eigenständiger Generator und Schlüsselverwaltung |
| [Kurzanleitung](../MANUAL.md) | Täglicher Gebrauch der Anwendung Schritt für Schritt |
| [Lager und Import](../ALMACENES.md) | Bestand je Lager, Umlagerungen und Werteimport |
| [Excel-Zuordnung](../MAPEO_EXCEL.md) | Wie jede Arbeitsmappe in `xlsx/` interpretiert wird |
| [Rechtliche Angaben](../GUIA_DATOS_LEGALES.md) | Wie die rechtlichen Angaben des Geschäfts ausgefüllt werden |
| [Compliance](../CUMPLIMIENTO.md) · [Rechtliche Prüfung](../REVISION_LEGAL.md) | Audit zu Compliance, Barrierefreiheit und Sicherheit sowie rechtliche Abschlussliste |
| [Zertifizierung](../certificacion/00-INDICE-Y-FIRMAS.md) | Vorbereitung auf ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2 und ISO 27701 |
| [Kontinuierliche Verbesserung](../MEJORA_CONTINUA.md) · [Roadmap](../ROADMAP.md) | Priorisierte nächste Verbesserungen und wie sie geprüft werden |
| [Herkunft der Bilder](../IMAGENES.md) | Herkunft und Lizenz der Bilder des Projekts |
| [Änderungsprotokoll](../../CHANGELOG.md) | Verbesserungen und Korrekturen jeder Version (Web und Android) |

## ❓ Häufige Fragen

<details>
<summary><b>Funktioniert es ohne Internet?</b></summary>

<br />

Ja, im Netzwerk Ihres Geschäfts. Der Server kann ein Windows-Laptop in Ihrem lokalen Netzwerk ohne Internetzugang sein. Die Web-App lässt sich als App installieren (PWA) und arbeitet weiter, wenn die Verbindung zum Server abbricht; Änderungen werden bei erneuter Verbindung gespeichert. Die Android-App arbeitet mit lokaler Speicherung und synchronisiert, sobald eine Verbindung besteht.

</details>

<details>
<summary><b>Brauche ich einen Server?</b></summary>

<br />

Ja: Der Python-Server liefert die Web-App und die API aus und speichert die gemeinsamen Daten in SQLite. Das kann ein Windows-Laptop (`server\iniciar-https.ps1`), ein Linux-Rechner oder ein Docker-Server mit eigener Domain sein. Siehe [Installation und Bereitstellung](../INSTALACION.md).

</details>

<details>
<summary><b>Wo werden meine Daten gespeichert?</b></summary>

<br />

Auf dem Server Ihres Geschäfts (`data/`), nicht bei Drittanbietern. NovaGest verwendet weder Analysewerkzeuge noch Werbung, und die täglichen Sicherungen werden verschlüsselt abgelegt.

</details>

<details>
<summary><b>Wie erhalte ich eine Nutzungslizenz?</b></summary>

<br />

Über den Bildschirm **Licencia de Uso** der Web- oder Android-App: Geben Sie Ihren Namen oder Ihre Firma ein, wählen Sie die Laufzeit und tippen Sie auf **Solicitar por WhatsApp** (per WhatsApp anfordern). Sie erhalten einen signierten Schlüssel, den Sie im selben Bildschirm aktivieren.

</details>

<details>
<summary><b>Kann ich meine Excel-Arbeitsmappen importieren?</b></summary>

<br />

Ja. Arbeitsmappen für den täglichen Kassenabgleich, den Bestand je Standort und die Wochenübersicht werden mit Vorschau und Bestätigung importiert, ohne Daten ohne Ihre Zustimmung zu ersetzen. Siehe [Excel-Arbeitsmappen importieren](#-excel-arbeitsmappen-importieren).

</details>

<details>
<summary><b>Was passiert, wenn der Rechner ausfällt oder der Strom wegfällt?</b></summary>

<br />

Der Server erstellt jeden Tag eine verschlüsselte Sicherung und bewahrt die neuesten auf; mit `BACKUP_MIRROR_DIRS` repliziert er sie zusätzlich auf eine andere Festplatte oder einen Netzwerkordner. Zur Wiederherstellung stellen Sie die Daten unter **Copias** (Sicherungen) wieder her. Bewahren Sie den Verschlüsselungsschlüssel außerhalb des Servers auf.

</details>

<details>
<summary><b>Funktioniert es mit Barcode-Scannern?</b></summary>

<br />

Ja: mit USB- oder Bluetooth-Scannern (die wie eine Tastatur tippen) und mit der Kamera des Smartphones oder PCs in **Venta rápida** (Schnellverkauf).

</details>

<details>
<summary><b>Mit welchen Währungen arbeitet es?</b></summary>

<br />

Der Kassenabgleich arbeitet mit den Kursen CUP/USD und MXN/USD, der Schnellverkauf zeigt den CUP-Gegenwert jeder Zahlung an, und jedes Kostenblatt speichert seine Beträge in USD oder CUP.

</details>

## 🤝 Mitwirken

Beiträge sind willkommen: Fehlermeldungen, Verbesserungsvorschläge und Pull Requests. Lesen Sie vor dem Start den [Leitfaden für Beiträge](../../CONTRIBUTING.md#english) — er erklärt, wie Sie die Umgebung einrichten, die Tests ausführen und Änderungen vorschlagen.

## 📄 Lizenz

**Proprietäre Software — alle Rechte vorbehalten.** © 2026 yhquintero.

Das Einsehen des Codes auf GitHub gewährt keinerlei Nutzungsrecht: NovaGest in einem Unternehmen zu installieren, zu kopieren, zu ändern, zu verbreiten oder sein Lizenzsystem zu umgehen, erfordert eine Nutzungslizenz des Rechteinhabers. Vollständige Bedingungen in [LICENSE](../../LICENSE). Komponenten von Drittanbietern behalten ihre eigenen Lizenzen: [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## 📝 Änderungsprotokoll und Roadmap

Die Verbesserungen und Korrekturen jeder Version stehen in [CHANGELOG.md](../../CHANGELOG.md); die nächsten, nach Priorität geordnet, in [docs/ROADMAP.md](../ROADMAP.md) (auf Spanisch).

---

<div align="center">

<sub><b>NovaGest</b> · Verwalten. Wachsen. Vorankommen. · © 2026 yhquintero · <a href="#novagest">Nach oben ⬆</a></sub>

</div>
