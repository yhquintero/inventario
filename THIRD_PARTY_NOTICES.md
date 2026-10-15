# Avisos de terceros · Third-party notices

🌐 **Español** · [English](#english)

NovaGest es software propietario ([LICENSE](LICENSE)). Este repositorio incluye o utiliza componentes de terceros que se rigen por **sus propias licencias**, indicadas a continuación; para cada componente prevalece su licencia sobre LICENSE. Los textos completos acompañan a cada componente (cabecera del archivo o carpeta `*.dist-info`) o están en el enlace indicado.

## 📦 Componentes incluidos en el repositorio

### Aplicación Web (`web/vendor/`)

| Componente | Versión | Archivo | Licencia | Titular |
|---|---|---|---|---|
| [SheetJS Community Edition](https://sheetjs.com) (lectura y escritura de Excel) | 0.18.5 | `web/vendor/xlsx.full.min.js` | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | © 2013-present SheetJS |
| [QR Code Generator for JavaScript](https://github.com/kazuhikoarase/qrcode-generator) (códigos QR de la verificación en dos pasos) | — | `web/vendor/qrcode.mjs` | [MIT](https://opensource.org/license/mit) | © 2009 Kazuhiko Arase |

*«QR Code» es una marca registrada de DENSO WAVE INCORPORATED.*

### Librerías de Python para Windows (`venv/`)

Entorno virtual de Python 3.8.2 de 32 bits; más información en [venv/README.md](venv/README.md).

| Paquete | Versión | Licencia | Titular | Texto de la licencia |
|---|---|---|---|---|
| cffi | 1.17.1 | MIT | Armin Rigo, Maciej Fijalkowski | `venv/Lib/site-packages/cffi-1.17.1.dist-info/LICENSE` |
| cryptography ¹ | 47.0.0 | Apache-2.0 OR BSD-3-Clause | Individual contributors (Python Cryptographic Authority) | `venv/Lib/site-packages/cryptography-47.0.0.dist-info/licenses/` |
| et_xmlfile | 2.0.0 | MIT | © 2010 openpyxl | `venv/Lib/site-packages/et_xmlfile-2.0.0.dist-info/LICENCE.rst` |
| openpyxl | 3.1.5 | MIT | © 2010 openpyxl | `venv/Lib/site-packages/openpyxl-3.1.5.dist-info/LICENCE.rst` |
| pip | 25.0.1 | MIT | © 2008-present The pip developers | `venv/Lib/site-packages/pip-25.0.1.dist-info/LICENSE.txt` |
| pycparser | 2.23 | BSD-3-Clause | © 2008-2022 Eli Bendersky | `venv/Lib/site-packages/pycparser-2.23.dist-info/LICENSE` |
| setuptools | 41.2.0 | MIT | © 2016 Jason R. Coombs | `venv/Lib/site-packages/setuptools-41.2.0.dist-info/LICENSE` |
| typing_extensions | 4.13.2 | PSF-2.0 | Python Software Foundation | `venv/Lib/site-packages/typing_extensions-4.13.2.dist-info/licenses/LICENSE` |
| Lanzadores de CPython (`python.exe`, `pythonw.exe`) | 3.8.2 | PSF-2.0 | Python Software Foundation | [docs.python.org/3/license.html](https://docs.python.org/3/license.html) |

¹ El módulo binario de cryptography (`_rust.pyd`) incluye OpenSSL enlazado estáticamente ([Apache-2.0](https://www.openssl.org/source/license.html)) y dependencias de Rust con licencias MIT o Apache-2.0.

## ⬇️ Dependencias que se descargan al instalar o compilar

No están incluidas en el repositorio; se obtienen de sus registros oficiales.

| Ámbito | Componentes | Licencia |
|---|---|---|
| Servidor (`requirements.txt`) | cryptography, openpyxl | Apache-2.0 OR BSD-3-Clause; MIT |
| Android (`app/build.gradle.kts`) | AndroidX (Core, Activity, Fragment, Lifecycle, Navigation, Room, DataStore, Security Crypto, Biometric, WorkManager, Hilt), Jetpack Compose, Material Components for Android, Dagger Hilt, kotlinx.coroutines, kotlinx.serialization | Apache-2.0 |
| Pruebas de Android | JUnit 4 · Truth · kotlinx-coroutines-test | EPL-1.0 · Apache-2.0 · Apache-2.0 |
| Pruebas Web (`tools/package.json`) | axe-core · jsdom | MPL-2.0 · MIT |
| Despliegue (`Dockerfile`, `deploy/`) | Imagen `python:3.12-slim` · imagen `caddy:2` | PSF-2.0 y licencias de Debian · Apache-2.0 |

## 🖼️ Imágenes y marca

- El nombre **NovaGest**, el logotipo (`brand/novagest-icon.png`) y los iconos de la aplicación pertenecen al titular y no están cubiertos por ninguna licencia de terceros.
- La procedencia de las imágenes de categoría y del resto de imágenes está documentada en [docs/IMAGENES.md](docs/IMAGENES.md).

---

<a id="english"></a>

## 🇬🇧 English

NovaGest is proprietary software ([LICENSE](LICENSE)). This repository includes or uses third-party components governed by **their own licenses**, listed above; for each component, its own license prevails over LICENSE. Full license texts ship with each component (file header or `*.dist-info` folder) or are available at the linked address.

- **Included in the repository:** SheetJS Community Edition 0.18.5 (`web/vendor/xlsx.full.min.js`, Apache-2.0, © 2013-present SheetJS); QR Code Generator for JavaScript (`web/vendor/qrcode.mjs`, MIT, © 2009 Kazuhiko Arase — "QR Code" is a registered trademark of DENSO WAVE INCORPORATED); and the Python 3.8.2 (32-bit) Windows virtual environment in `venv/` with cffi, cryptography (which statically links OpenSSL), et_xmlfile, openpyxl, pip, pycparser, setuptools, typing_extensions, and the CPython launchers, under the licenses shown in the table above.
- **Downloaded at install or build time (not included):** the server's Python packages, the Android libraries (AndroidX, Jetpack Compose, Material Components, Dagger Hilt, kotlinx — Apache-2.0; JUnit 4 — EPL-1.0), the Web test tools (axe-core — MPL-2.0; jsdom — MIT), and the deployment images (`python:3.12-slim`, `caddy:2`).
- **Images and brand:** the NovaGest name, logo, and app icons belong to the owner; the provenance of all other images is documented in [docs/IMAGENES.md](docs/IMAGENES.md).
