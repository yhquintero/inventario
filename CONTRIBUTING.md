# Cómo contribuir · Contributing

🌐 **Español** · [English](#english)

¡Gracias por tu interés en mejorar NovaGest! Esta guía explica cómo informar de errores, proponer mejoras y enviar cambios.

> [!IMPORTANT]
> NovaGest es **software propietario** ([LICENSE](LICENSE)). Al enviar una contribución aceptas la cláusula 6 de la licencia: el titular puede usar tu aportación como parte del producto. Contribuir no concede derecho de uso sobre NovaGest.

## 🧭 Formas de contribuir

- 🐞 **Informar de un error** — abre un issue con la plantilla «Informe de error».
- ✨ **Proponer una mejora** — usa la plantilla «Propuesta de mejora» y explica qué problema resuelve.
- 🌍 **Mejorar las traducciones** del README en [`docs/readme/`](docs/readme/).
- 🧪 **Añadir pruebas** o **mejorar la documentación** de [`docs/`](docs/).
- 🔒 **Vulnerabilidades**: nunca en público; sigue la [política de seguridad](SECURITY.md).

## ✅ Antes de empezar

- Busca si ya existe un issue o un pull request sobre lo mismo.
- Para cambios grandes (un módulo nuevo, cambios en la base de datos o en el sistema de licencias), abre primero un issue y acordemos el enfoque.
- Un pull request = un cambio. Los cambios pequeños y enfocados se revisan antes.

## 🛠️ Preparar el entorno

Requisitos: **Python 3.10+** (la integración continua usa 3.12), **Node.js 22** para las pruebas Web y, opcionalmente, **JDK 17 + Gradle 8.9** para Android y **PowerShell 7** para las pruebas del Panel de Control Visual.

```bash
git clone https://github.com/yhquintero/inventario.git
cd inventario
python3 -m pip install -r requirements.txt

# Servidor con una carpeta de datos aparte, para no mezclar pruebas con datos reales
DATA_DIR=/tmp/novagest-dev python3 server/novagest_server.py

# En otra terminal: clave de licencia para esa misma carpeta de datos
DATA_DIR=/tmp/novagest-dev python3 tools/generate_license.py --client "Desarrollo" --term SEMANA
```

Abre `http://localhost:8080`, activa la clave y entra con una de las [cuentas de demostración](README.md#-inicio-rápido). La aplicación Web no tiene proceso de compilación: basta con recargar el navegador tras cada cambio en `web/`.

## 🧪 Pruebas

Ejecuta las pruebas relacionadas con tu cambio antes de abrir el pull request; la lista completa —la misma que corre la integración continua— está en el [README](README.md#-pruebas). Si cambias la interfaz Web, ejecuta también `node tools/smoke_web.mjs`, `node tools/test_accesibilidad.mjs` y `node tools/test_axe.mjs`.

## 📐 Estilo y convenciones

- **Idioma**: los textos de la interfaz, los mensajes de error y la documentación se escriben en español, con el mismo tono que los existentes.
- **Web** (`web/`): JavaScript moderno sin frameworks ni proceso de compilación. No añadas dependencias sin acordarlo antes en un issue.
- **Servidor** (`server/`): biblioteca estándar de Python más los paquetes de `requirements.txt`. Los permisos se validan siempre en el servidor, nunca solo en el cliente.
- **Android** (`app/`): Kotlin + Jetpack Compose, siguiendo la arquitectura existente (Hilt, Room, Navigation Compose).
- **Accesibilidad**: respeta WCAG 2.2 AA — etiquetas en los controles, contraste suficiente y navegación con teclado.
- **PowerShell**: guarda los `.ps1` que contengan acentos en UTF-8 con BOM; `tools/test_panel_control.ps1` lo comprueba.

## 🔏 Datos personales y secretos

Nunca subas al repositorio `data/`, `certs/`, copias de seguridad, claves (`license.key`, `LICENSE_SECRET`, `BACKUP_KEY`), contraseñas ni datos reales de clientes o empleados. Usa datos ficticios en las pruebas, en los issues y en las capturas de pantalla.

## 📝 Commits y pull requests

1. Crea una rama a partir de `main` con un nombre descriptivo, por ejemplo `fix/cuadre-redondeo`.
2. Escribe los mensajes de commit en español siguiendo [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:` o `chore:`, por ejemplo `fix(cuadre): corregir el redondeo de la tasa CUP/USD`.
3. Añade una entrada en [CHANGELOG.md](CHANGELOG.md) siguiendo el formato existente.
4. Actualiza la documentación afectada. Si cambias `README.md`, actualiza también las traducciones de `docs/readme/` o indícalo en el pull request para traducirlas después.
5. Abre el pull request, completa la plantilla y adjunta capturas si cambia la interfaz.
6. La integración continua debe terminar sin errores atribuibles a tu cambio.

## 🤝 Convivencia

Trata a todas las personas con respeto y cordialidad. Las críticas, siempre sobre el código y nunca sobre quien lo escribe. Se eliminarán los comentarios ofensivos, discriminatorios o de acoso.

---

<a id="english"></a>

## 🇬🇧 English

Thank you for your interest in improving NovaGest! This guide explains how to report bugs, suggest improvements, and submit changes.

> [!IMPORTANT]
> NovaGest is **proprietary software** ([LICENSE](LICENSE)). By submitting a contribution you accept clause 6 of the license: the owner may use your contribution as part of the product. Contributing does not grant you any right to use NovaGest.

### 🧭 Ways to contribute

- 🐞 **Report a bug** using the "Informe de error" (bug report) issue template.
- ✨ **Suggest an improvement** using the "Propuesta de mejora" (feature request) template, explaining the problem it solves.
- 🌍 **Improve the README translations** in [`docs/readme/`](docs/readme/).
- 🧪 **Add tests** or **improve the documentation** in [`docs/`](docs/).
- 🔒 **Security vulnerabilities**: never in public; follow the [security policy](SECURITY.md).

### ✅ Before you start

Search existing issues and pull requests first. For large changes (a new module, database changes, or changes to the licensing system), open an issue to agree on the approach. Keep each pull request focused on a single change.

### 🛠️ Development setup

Requirements: **Python 3.10+** (CI uses 3.12), **Node.js 22** for the Web tests and, optionally, **JDK 17 + Gradle 8.9** for Android and **PowerShell 7** for the Visual Control Panel tests.

```bash
git clone https://github.com/yhquintero/inventario.git
cd inventario
python3 -m pip install -r requirements.txt
DATA_DIR=/tmp/novagest-dev python3 server/novagest_server.py                                   # separate data folder
DATA_DIR=/tmp/novagest-dev python3 tools/generate_license.py --client "Development" --term SEMANA  # in another terminal
```

Open `http://localhost:8080`, activate the key, and sign in with one of the [demo accounts](README.md#-inicio-rápido). The Web app has no build step: just reload the browser after changing files in `web/`.

### 🧪 Tests

Run the tests related to your change before opening a pull request; the full list —the same one CI runs— is in the [README](README.md#-pruebas). For Web UI changes, also run `node tools/smoke_web.mjs`, `node tools/test_accesibilidad.mjs`, and `node tools/test_axe.mjs`.

### 📐 Style and conventions

- **Language**: UI text, error messages, and documentation are written in Spanish, matching the existing tone.
- **Web** (`web/`): modern JavaScript with no frameworks and no build step; do not add dependencies without discussing them in an issue first.
- **Server** (`server/`): Python standard library plus the packages in `requirements.txt`; permissions are always enforced on the server.
- **Android** (`app/`): Kotlin + Jetpack Compose, following the existing architecture (Hilt, Room, Navigation Compose).
- **Accessibility**: follow WCAG 2.2 AA — labeled controls, sufficient contrast, and keyboard navigation.
- **PowerShell**: save `.ps1` files that contain accented characters as UTF-8 with BOM; `tools/test_panel_control.ps1` checks it.

### 🔏 Personal data and secrets

Never commit `data/`, `certs/`, backups, keys (`license.key`, `LICENSE_SECRET`, `BACKUP_KEY`), passwords, or real customer or employee data. Use fictitious data in tests, issues, and screenshots.

### 📝 Commits and pull requests

1. Branch off `main` with a descriptive name, for example `fix/cuadre-rounding`.
2. Write commit messages following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`); Spanish is preferred.
3. Add an entry to [CHANGELOG.md](CHANGELOG.md) following the existing format.
4. Update the affected documentation. If you change `README.md`, update the translations in `docs/readme/` too, or say so in the pull request so they can be translated later.
5. Open the pull request, fill in the template, and attach screenshots for UI changes.
6. Continuous integration must finish without errors caused by your change.

### 🤝 Code of conduct

Treat everyone with respect and courtesy. Critique the code, never the person who wrote it. Offensive, discriminatory, or harassing comments will be removed.
