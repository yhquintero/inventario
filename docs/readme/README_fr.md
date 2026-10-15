<div align="center">

<img src="../../brand/novagest-icon.png" width="104" alt="Logo de NovaGest" />

# NovaGest

### Gérez. Grandissez. Avancez.

**Stock, point de vente, rapprochement de caisse quotidien et rapports pour votre commerce — sur le Web, sur Android et hors ligne.**

🌐 [Español](../../README.md) · [English](README_en.md) · [Português](README_pt-BR.md) · **Français** · [Italiano](README_it.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [简体中文](README_zh-CN.md)

[![Version](https://img.shields.io/badge/version-1.0.0-4f46e5?style=flat-square)](../../CHANGELOG.md)
[![Plateformes](https://img.shields.io/badge/plateformes-Web%20%C2%B7%20Android%20%C2%B7%20Serveur-1e1b4b?style=flat-square)](#-ce-qui-est-inclus)
[![PWA](https://img.shields.io/badge/PWA-fonctionne%20hors%20ligne-059669?style=flat-square)](#-questions-fréquentes)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-démarrage-rapide)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](../../app/)
[![SQLite](https://img.shields.io/badge/SQLite-donn%C3%A9es%20partag%C3%A9es-003B57?style=flat-square&logo=sqlite&logoColor=white)](../../server/)
[![Licence](https://img.shields.io/badge/licence-propri%C3%A9taire-475569?style=flat-square)](../../LICENSE)

[Fonctionnalités](#-fonctionnalités) · [Captures d'écran](#-captures-décran) · [Démarrage rapide](#-démarrage-rapide) · [Documentation](#-documentation) · [Questions fréquentes](#-questions-fréquentes) · [Sécurité](#-sécurité) · [Licence](#-licence)

</div>

<p align="center">
  <img src="../assets/novagest-hero.png" width="100%" alt="NovaGest : le tableau de bord dans le navigateur et la vente rapide sur mobile" />
</p>

> [!NOTE]
> Ceci est une traduction du [README en espagnol](../../README.md), qui fait référence. L'interface de l'application et les guides détaillés de `docs/` sont en espagnol.

> [!IMPORTANT]
> **NovaGest est un logiciel propriétaire.** Le code est visible sur GitHub, mais l'utiliser dans une entreprise, le copier, le modifier ou le distribuer nécessite une **licence d'utilisation** accordée par le titulaire. Voir [LICENSE](../../LICENSE) et la section [Licence](#-licence).

## 💡 Qu'est-ce que NovaGest ?

**NovaGest** réunit en un seul endroit tout ce dont votre commerce a besoin au quotidien : **stock multi-entrepôts**, **point de vente**, **rapprochement de caisse quotidien** et **rapports avec analyses**. Fini les feuilles volantes et les cahiers : l'application Web s'installe comme une app et continue de fonctionner si la connexion tombe, l'application Android met l'activité dans votre poche et le serveur partagé fait travailler tout le monde sur le même état en temps réel — avec licence d'utilisation, rôles, audit et sauvegardes.

> 📊 **Vos données décident.** Les classeurs Excel ne sont que des sources d'import et de référence : l'application n'importe ni ne remplace jamais des données opérationnelles sans vous montrer un **aperçu** et obtenir votre confirmation. Une nouvelle installation peut démarrer avec les données initiales fournies avec le projet.

## 🧩 Ce qui est inclus

| Application | Ce que vous en faites |
|---|---|
| 🌐 **Web (PWA)** | Le poste de commande : stock, entrepôts, import de valeurs, mouvements, vente rapide, rapprochement de caisse, rapport hebdomadaire, contrôle de stock et administration — avec recherche globale (`Ctrl+K`), visite guidée intégrée, raccourcis clavier et mode clair/sombre. S'installe comme une application et s'ouvre hors ligne. |
| 📱 **Android** | L'activité en déplacement : la même gestion avec Kotlin + Jetpack Compose, stockage local, déverrouillage biométrique et synchronisation avec le serveur dès qu'il y a une connexion. |
| 🗄️ **Serveur** | Le cœur qui relie tout : API et site Web dans un seul processus Python, données partagées dans SQLite, sessions et permissions vérifiées côté serveur, licences signées, audit et sauvegardes chiffrées automatiques. |

## ✨ Fonctionnalités

- 📦 **Stock multi-entrepôts** — chaque entrepôt conserve son propre stock et le stock général les additionne ; importez des valeurs, transférez des marchandises entre entrepôts et ajustez les écarts avec un historique complet.
- 🛒 **Point de vente** — vente rapide qui déduit instantanément le stock de l'entrepôt actif, avec **lecteur de codes-barres** (caméra ou lecteur USB/Bluetooth), paiement **comptant ou à crédit** pour un client, et commissions et frais de livraison calculés automatiquement.
- 🤝 **Clients et ventes à crédit** — fichier clients avec plafond de crédit, créances avec échéance, statuts (en attente/partiel/en retard/payé) et **versements** avec historique ; le total à encaisser s'affiche sur le tableau de bord.
- 🧮 **Rapprochement de caisse quotidien (cuadre)** — taux CUP/USD et MXN/USD, encaissements, entrées, retraits, fonds et dépenses : la journée est « équilibrée » quand le résultat vaut 0, et l'application vous prévient si ce n'est pas le cas.
- 🔄 **Mouvements** — ventes, entrées et sorties avec entrepôt, point de vente, quantités, montants et observations ; chaque mouvement recalcule le stock et reste enregistré.
- 🧾 **Fiches de coût et IPV** — fiche de coût versionnée par produit ou service (composants issus de votre propre stock, coût total, rendement et coût par portion) avec un circuit Brouillon → Approuvée, et **contrôle IPV** par période (`IPV-AAAA-NNNN`) vérifié par rapport à la fiche. Web : **Fichas de costo · IPV** ; Android : consultation synchronisée. Adapté de [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos) ; les montants sont conservés dans la devise de chaque fiche (USD ou CUP).
- 📊 **Rapports et contrôle** — rapprochements quotidiens, résumé hebdomadaire et contrôle de stock par jour, semaine, mois, année ou période personnalisée, avec export CSV/PDF prêt à imprimer ou à envoyer à votre comptable.
- 📈 **Analyses et objectifs** — ventes par période, marge brute et bénéfice net, valeur du stock au prix de vente et au coût, et progression par rapport aux objectifs quotidiens et hebdomadaires.
- 🕵️ **Historique et audit** — prix, coûts et taux par jour ; trace de qui a fait quoi et quand, selon le rôle de chaque utilisateur.
- ☁️ **Synchronisation multiplateforme** — Web et Android travaillent sur le même état ; si la connexion est perdue, le Web continue de fonctionner et se synchronise à la reconnexion.
- 🔐 **Sécurité de niveau entreprise** — licence d'utilisation signée cryptographiquement, vérification en deux étapes (TOTP), blocage après plusieurs échecs, clôture des journées et sauvegardes chiffrées.

## 📸 Captures d'écran

<table>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/venta-rapida.png" alt="Vente rapide avec lecteur de codes-barres, catégories, produits et panier" /><br /><sub><b>Vente rapide</b> — lecteur de codes-barres, panier et paiement comptant ou à crédit.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/inventario.png" alt="Stock avec quantités, prix, coûts et catégories" /><br /><sub><b>Stock</b> — quantités par entrepôt, prix, coûts, commissions et catégories.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/cuadre-diario.png" alt="Rapprochement de caisse avec taux, fonds, dépenses et résultat de la journée" /><br /><sub><b>Rapprochement de caisse</b> — taux CUP/USD, fonds et dépenses ; le résultat doit être égal à 0.</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/analisis-y-metas.png" alt="Analyses et objectifs avec indicateurs, objectifs, marge par catégorie et tendance des ventes" /><br /><sub><b>Analyses et objectifs</b> — indicateurs, objectifs, marge par catégorie et tendance quotidienne.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="../assets/capturas/panel.png" alt="Tableau de bord principal en mode clair" /><br /><sub><b>Tableau de bord</b> — résumé du jour, alertes de stock et raccourcis (mode clair).</sub></td>
    <td width="50%" valign="top"><img src="../assets/capturas/panel-oscuro.png" alt="Tableau de bord principal en mode sombre" /><br /><sub><b>Tableau de bord</b> — le même résumé en mode sombre.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="../assets/novagest-movil.png" width="100%" alt="L'application Web NovaGest sur mobile : tableau de bord, vente rapide et mode sombre" />
  <br /><sub>L'application Web sur mobile : navigation en bas d'écran, installable comme une app (PWA). Captures réalisées avec les données de démonstration du projet.</sub>
</p>

## 🚀 Démarrage rapide

### Serveur et application Web

```bash
python3 -m pip install -r requirements.txt   # Python 3.10 ou supérieur
python3 server/novagest_server.py            # Web + API sur http://localhost:8080

# Dans un autre terminal : clé pour cette installation
python3 tools/generate_license.py --client "Ma Boutique" --term MES
```

Ouvrez `http://localhost:8080`, collez la clé dans l'écran **Licencia de Uso** (licence d'utilisation) et connectez-vous avec l'un des comptes de démonstration. Une nouvelle installation reste bloquée tant qu'aucune clé valide n'est activée : tout le système est décrit dans [docs/LICENCIAS.md](../LICENCIAS.md) (en espagnol).

<details>
<summary><b>Comptes de démonstration (tests locaux uniquement)</b></summary>

<br />

Une nouvelle base de données crée ces comptes (ils ne sont plus affichés sur l'écran de connexion) :

| Utilisateur | Mot de passe initial | Rôle |
|---|---|---|
| `admin` | `Admin123!` | Administrador (administrateur) |
| `jefe` | `Jefe123!` | Jefe (responsable) |
| `economico` | `Eco123!` | Económico (comptabilité) |
| `almacenero` | `Alma123!` | Almacenero (magasinier) |

Le rôle Administrateur doit activer la vérification en deux étapes à la connexion (`REQUIRE_ADMIN_TOTP=1`, par défaut).

</details>

> [!WARNING]
> **Changez les mots de passe initiaux avant d'utiliser le système avec des données réelles.** En production, démarrez le serveur avec `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secret, 10 caractères min.>`, utilisez toujours HTTPS et conservez les clés de chiffrement hors du serveur. Liste complète dans [SECURITY.md](../../SECURITY.md#-production-hardening).

### Windows avec HTTPS (un seul ordinateur portable)

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Crée le certificat avec mkcert, ouvre le port 8443 dans le pare-feu et lance le **Panneau de contrôle visuel** (icône dans la zone de notification) avec le serveur et le générateur de licences en arrière-plan.

### Docker avec votre propre domaine

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### Android

Ouvrez la racine du projet dans Android Studio (JDK 17 et Gradle 8.9), exécutez la configuration `app` et indiquez l'adresse HTTPS du serveur sur l'écran de connexion pour synchroniser.

📖 Guide pas à pas — HTTPS, Panneau de contrôle visuel, Docker, Android et production : [docs/INSTALACION.md](../INSTALACION.md) (en espagnol).

## 📥 Importer les classeurs Excel

Les imports se lancent depuis l'interface et affichent un **aperçu** avant l'enregistrement. Ils ne remplacent pas les mouvements et ne s'exécutent jamais automatiquement à l'ouverture de l'application.

| Classeur dans `xlsx/` | Où il s'applique | Ce qu'il conserve |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → importer un classeur | Détecte toutes les feuilles quotidiennes sélectionnées et les importe dans l'ordre chronologique : stock, entrées, sorties, ventes, taux et rapprochement. La date provient du nom de la feuille ; les écarts d'ouverture/clôture sont enregistrés comme ajustements explicites et réimporter remplace chaque lot. Il alimente aussi les données initiales du projet. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → importer un classeur | Import en masse des feuilles quotidiennes avec date, entrepôt et sélection modifiables ; signale les dates vides ou en double avant l'enregistrement. Conserve le montant réel, le coût unitaire et la commission en CUP de chaque vente et crée des références financières quotidiennes pour examiner les écarts de caisse et de stock. |
| `PCH.xlsx` | Web → **Importar valores** → téléverser un fichier | On choisit l'un des emplacements (**Pinar del Río**, **Consolación** ou **Herradura**) et son stock est importé dans l'entrepôt de destination. Les noms en double sont regroupés en additionnant le stock ; les prix globaux ne changent pas, car ils varient selon l'emplacement. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Lit la feuille `PINAR`, affiche les semaines, les dates et les totaux avant l'enregistrement et conserve chaque semaine comme référence Excel, sans remplacer les mouvements, les rapprochements ni les calculs de l'application. |

📅 **Année du résumé hebdomadaire :** le classeur hebdomadaire n'imprime pas l'année. L'import propose l'année de la dernière date renseignée (ou l'année en cours à défaut) et l'affiche dans l'aperçu avant l'enregistrement.

Le module **Importar valores** accepte aussi des colonnes collées depuis Excel, des fichiers `.xlsx`, `.csv`, `.tsv` ou `.txt`, ou des lignes saisies à la main : vous choisissez l'entrepôt de destination, vérifiez les changements et décidez si les valeurs existantes sont écrasées ou si seules les valeurs manquantes sont complétées. Les colonnes vides ne modifient jamais les données enregistrées.

📖 Guides (en espagnol) : [Entrepôts et import](../ALMACENES.md) · [Manuel rapide](../MANUAL.md) · [Correspondance Excel](../MAPEO_EXCEL.md).

## 📑 Rapports et PDF

- **Web :** depuis Stock, Mouvements, Entrepôts, Rapprochement de caisse, Rapport hebdomadaire ou Contrôle, vous pouvez imprimer ou enregistrer en PDF les données affichées ou l'entrepôt choisi. Dans Contrôle, vous choisissez un jour, une semaine, un mois, une année ou des dates **Du/Au** et filtrez par entrepôt : le rapport compare le stock d'ouverture/clôture aux mouvements en utilisant les montants et coûts historiques de chaque vente. L'impression utilise le format A4 paysage, un en-tête avec le commerce et la période, et masque les commandes.
- **Android :** le Rapprochement de caisse permet d'**exporter le rapprochement en PDF** et Rapports d'**exporter le contrôle en PDF**, avec en-têtes, chiffres clés, tableaux paginés et pied de page, partagés via la boîte de dialogue standard d'Android. Des exports CSV et Excel du contrôle —avec coût, marge et commission— et des exports CSV des mouvements avec le coût de chaque instant sont également disponibles.

## 🔑 Licences d'utilisation du produit

NovaGest s'active avec une **clé de licence signée** (HMAC-SHA256, préfixe `NG-`) que chaque installation vérifie avec son propre secret.

- **Huit durées** — jour, semaine, mois, trimestre, semestre, année, deux ans ou permanente ; types FULL, TRIAL, ENTERPRISE et LIFETIME.
- **Demande par WhatsApp** — depuis l'écran **Licencia de Uso** (Web et Android), le client demande son forfait et la demande est enregistrée sur le serveur.
- **Quatre façons d'émettre des clés** — le panneau 🔐 **Gestionar licencia** du Web, le générateur autonome `tools/license_studio.py` (HTTPS sur son propre port), la ligne de commande `tools/generate_license.py` et l'API `POST /api/license/generate`.
- **Contrôle total** — licences émises, appareils activés, renouvellement, révocation et export CSV, le tout consigné dans l'audit.

📖 Guide complet (en espagnol) : [docs/LICENCIAS.md](../LICENCIAS.md).

## 🔒 Sécurité

- **Comptes** — mots de passe PBKDF2-SHA256 (210 000 itérations), blocage de 5 minutes après 5 tentatives échouées, vérification en deux étapes (TOTP) obligatoire par défaut pour l'administrateur et codes de récupération.
- **Sessions et permissions** — sessions qui expirent après inactivité et après une durée maximale, permissions vérifiées côté serveur, en-tête anti-CSRF et limitation du nombre de requêtes par IP pour la connexion, la récupération et les demandes de licence.
- **Données** — sauvegardes chiffrées automatiques chaque jour avec rotation, réplication facultative hors de la machine (`BACKUP_MIRROR_DIRS`, règle 3-2-1), clôture des journées et audit.
- **Web** — en-têtes CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` et HSTS lorsque le site est servi en HTTPS.

Les informations légales publiques (#legal) se renseignent dans **Ajustes → Datos legales** — guide : [docs/GUIA_DATOS_LEGALES.md](../GUIA_DATOS_LEGALES.md) (en espagnol). Vous avez trouvé une vulnérabilité ? **N'ouvrez pas d'issue publique** : suivez la [politique de sécurité](../../SECURITY.md#english).

## ✅ Tests

Les mêmes vérifications que l'intégration continue (`.github/workflows/ci.yml`), depuis la racine du dépôt :

```bash
# Web et IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Serveur et outils (Python)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Panneau de contrôle visuel (PowerShell 7) et Android (JDK 17 + Gradle 8.9)
pwsh -NoProfile -File tools/test_panel_control.ps1
gradle testDebugUnitTest
```

## 📁 Structure du projet

```text
app/       Application Android (Kotlin + Jetpack Compose)
web/       Interface Web, logique et ressources (PWA sans étape de compilation)
server/    API, authentification, SQLite, sauvegardes et lanceurs Windows (Python, PowerShell)
tools/     Tests, import Excel et générateur/gestionnaire de licences
deploy/    Docker Compose + Caddy pour publier en HTTPS avec votre propre domaine
docs/      Manuels, guides juridiques et de conformité, traductions et captures d'écran
xlsx/      Classeurs Excel de référence à importer
brand/     Logo de NovaGest
venv/      Bibliothèques Python pour Windows hors ligne (voir venv/README.md)
```

La base de données opérationnelle, les sauvegardes, les certificats et les clés générées (`data/`, `certs/`) restent en dehors du contrôle de version.

## 📚 Documentation

Les guides détaillés sont en espagnol.

| Document | Contenu |
|---|---|
| [Installation et déploiement](../INSTALACION.md) | Serveur, Windows avec HTTPS et Panneau de contrôle visuel, Docker, Android et production |
| [Licences d'utilisation](../LICENCIAS.md) | Activation, durées, demandes par WhatsApp, générateur autonome et gestion des clés |
| [Manuel rapide](../MANUAL.md) | Utilisation quotidienne de l'application pas à pas |
| [Entrepôts et import](../ALMACENES.md) | Stock par entrepôt, transferts et import de valeurs |
| [Correspondance Excel](../MAPEO_EXCEL.md) | Comment chaque classeur de `xlsx/` est interprété |
| [Informations légales](../GUIA_DATOS_LEGALES.md) | Comment compléter les informations légales du commerce |
| [Conformité](../CUMPLIMIENTO.md) · [Revue juridique](../REVISION_LEGAL.md) | Audit de conformité, d'accessibilité et de sécurité, et liste de clôture juridique |
| [Certification](../certificacion/00-INDICE-Y-FIRMAS.md) | Préparation à ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2 et ISO 27701 |
| [Amélioration continue](../MEJORA_CONTINUA.md) · [Feuille de route](../ROADMAP.md) | Prochaines améliorations priorisées et leur vérification |
| [Provenance des images](../IMAGENES.md) | Origine et licence des images du projet |
| [Journal des modifications](../../CHANGELOG.md) | Améliorations et corrections de chaque version (Web et Android) |

## ❓ Questions fréquentes

<details>
<summary><b>Fonctionne-t-il sans Internet ?</b></summary>

<br />

Oui, sur le réseau de votre commerce. Le serveur peut être un ordinateur portable Windows sur votre réseau local, sans accès à Internet. L'application Web s'installe comme une app (PWA) et, si la connexion au serveur est perdue, continue de fonctionner et enregistre les modifications à la reconnexion. L'application Android travaille avec un stockage local et se synchronise dès qu'il y a une connexion.

</details>

<details>
<summary><b>Ai-je besoin d'un serveur ?</b></summary>

<br />

Oui : le serveur Python sert l'application Web et l'API et stocke les données partagées dans SQLite. Il peut s'agir d'un ordinateur portable Windows (`server\iniciar-https.ps1`), d'une machine Linux ou d'un serveur Docker avec votre propre domaine. Voir [Installation et déploiement](../INSTALACION.md).

</details>

<details>
<summary><b>Où sont stockées mes données ?</b></summary>

<br />

Sur le serveur de votre commerce (`data/`), pas chez des services tiers. NovaGest n'utilise ni outils d'analyse d'audience ni publicité, et les sauvegardes quotidiennes sont conservées chiffrées.

</details>

<details>
<summary><b>Comment obtenir une licence d'utilisation ?</b></summary>

<br />

Depuis l'écran **Licencia de Uso** de l'application Web ou Android : saisissez votre nom ou votre entreprise, choisissez la durée et appuyez sur **Solicitar por WhatsApp** (demander par WhatsApp). Vous recevrez une clé signée à activer sur ce même écran.

</details>

<details>
<summary><b>Puis-je importer mes classeurs Excel ?</b></summary>

<br />

Oui. Les classeurs de rapprochement quotidien, de stock par emplacement et de résumé hebdomadaire s'importent avec aperçu et confirmation, sans jamais remplacer de données sans votre accord. Voir [Importer les classeurs Excel](#-importer-les-classeurs-excel).

</details>

<details>
<summary><b>Que se passe-t-il si l'ordinateur tombe en panne ou en cas de coupure de courant ?</b></summary>

<br />

Le serveur effectue chaque jour une sauvegarde chiffrée et conserve les plus récentes ; avec `BACKUP_MIRROR_DIRS`, il les réplique aussi sur un autre disque ou un dossier réseau. Pour récupérer, restaurez depuis **Copias** (sauvegardes). Conservez la clé de chiffrement hors du serveur.

</details>

<details>
<summary><b>Fonctionne-t-il avec un lecteur de codes-barres ?</b></summary>

<br />

Oui : avec des lecteurs USB ou Bluetooth (qui saisissent comme un clavier) et avec la caméra du téléphone ou du PC depuis **Venta rápida** (vente rapide).

</details>

<details>
<summary><b>Quelles devises gère-t-il ?</b></summary>

<br />

Le rapprochement de caisse utilise les taux CUP/USD et MXN/USD, la vente rapide affiche l'équivalent en CUP de chaque paiement et chaque fiche de coût conserve ses montants en USD ou en CUP.

</details>

## 🤝 Contribuer

Les contributions sont les bienvenues : signalements de bogues, propositions d'amélioration et pull requests. Lisez le [guide de contribution](../../CONTRIBUTING.md#english) avant de commencer — il explique comment préparer l'environnement, lancer les tests et proposer des changements.

## 📄 Licence

**Logiciel propriétaire — tous droits réservés.** © 2026 yhquintero.

Consulter le code sur GitHub ne confère aucun droit d'utilisation : installer NovaGest dans une entreprise, le copier, le modifier, le distribuer ou contourner son système de licences nécessite une licence d'utilisation accordée par le titulaire. Conditions complètes dans [LICENSE](../../LICENSE). Les composants tiers conservent leurs propres licences : [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## 📝 Journal des modifications et feuille de route

Les améliorations et corrections de chaque version figurent dans [CHANGELOG.md](../../CHANGELOG.md) ; les prochaines, par ordre de priorité, dans [docs/ROADMAP.md](../ROADMAP.md) (en espagnol).

---

<div align="center">

<sub><b>NovaGest</b> · Gérez. Grandissez. Avancez. · © 2026 yhquintero · <a href="#novagest">Retour en haut ⬆</a></sub>

</div>
