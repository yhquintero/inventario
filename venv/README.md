# 🐍 venv — Librerías de Python para Windows sin conexión

🌐 **Español** · [English](#english)

Entorno virtual de **Python 3.8.2 de 32 bits para Windows** con las librerías que usa NovaGest. Se incluye en el repositorio para preparar una PC con Windows **sin conexión a Internet**, sin descargar paquetes con `pip`.

> [!NOTE]
> Es código de terceros: está marcado como *vendored* en [`.gitattributes`](../.gitattributes), así que no cuenta en la barra de lenguajes del repositorio. Las licencias de cada paquete se resumen en [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## 📦 Contenido

| Paquete | Versión | Para qué lo usa NovaGest | Licencia |
|---|---|---|---|
| [cryptography](https://cryptography.io) | 47.0.0 | Cifrado de las copias de seguridad (Fernet) en el servidor | Apache-2.0 OR BSD-3-Clause |
| [cffi](https://cffi.readthedocs.io) | 1.17.1 | Dependencia de cryptography | MIT |
| [pycparser](https://github.com/eliben/pycparser) | 2.23 | Dependencia de cffi | BSD-3-Clause |
| [openpyxl](https://openpyxl.readthedocs.io) | 3.1.5 | Leer los libros Excel de `xlsx/` para regenerar las semillas (`tools/import_excel.py`) | MIT |
| [et_xmlfile](https://foss.heptapod.net/openpyxl/et_xmlfile) | 2.0.0 | Dependencia de openpyxl | MIT |
| [typing_extensions](https://github.com/python/typing_extensions) | 4.13.2 | Dependencia de cryptography | PSF-2.0 |
| [pip](https://pip.pypa.io) | 25.0.1 | Gestor de paquetes del entorno | MIT |
| [setuptools](https://setuptools.pypa.io) | 41.2.0 | Herramientas de empaquetado del entorno | MIT |

Estructura: `Lib/site-packages/` (paquetes), `Scripts/` (activación y lanzadores `python.exe`, `pip.exe`), `Include/` (cabeceras de C) y `pyvenv.cfg` (configuración).

## ▶️ Uso en Windows

El archivo `pyvenv.cfg` apunta al intérprete base `C:\Program Files (x86)\Python38-32`: el entorno solo funciona si **Python 3.8.2 de 32 bits** está instalado en esa ruta.

```powershell
# Desde la raíz del repositorio
.\venv\Scripts\python.exe server\novagest_server.py
.\venv\Scripts\python.exe tools\import_excel.py
```

Usa `.\venv\Scripts\python.exe -m pip …` en lugar de `pip.exe`: los lanzadores `.exe` de `Scripts/` guardan la ruta de la PC donde se creó el entorno.

## ⚠️ Estado y recomendaciones

- **Python 3.8 ya no recibe parches de seguridad** (fin de soporte: octubre de 2024) y la documentación del proyecto pide **Python 3.10 o posterior** para el servidor.
- **cryptography 47.0.0 es anterior** a la versión mínima de [`requirements.txt`](../requirements.txt) (`cryptography>=50.0.2`).
- Para una instalación nueva con conexión, lo recomendado es crear un entorno propio con una versión de Python con soporte:

  ```powershell
  py -3.12 -m venv .venv
  .\.venv\Scripts\python.exe -m pip install -r requirements.txt
  ```

  La carpeta `.venv/` ya está excluida en [`.gitignore`](../.gitignore), así que no se sube al repositorio.

---

<a id="english"></a>

## 🇬🇧 English

A **Python 3.8.2 (32-bit) virtual environment for Windows** with the libraries NovaGest uses — cryptography 47.0.0 (encrypted backups), openpyxl 3.1.5 (reading the `xlsx/` workbooks) and their dependencies (cffi, pycparser, et_xmlfile, typing_extensions), plus pip and setuptools. It is kept in the repository to set up a Windows PC **without Internet access**.

- It only works if Python 3.8.2 (32-bit) is installed at `C:\Program Files (x86)\Python38-32` (see `pyvenv.cfg`). Run `.\venv\Scripts\python.exe server\novagest_server.py` from the repository root, and use `python.exe -m pip` instead of `pip.exe`.
- Python 3.8 reached end of life in October 2024, the project documentation requires Python 3.10+ for the server, and cryptography 47.0.0 is older than the minimum in `requirements.txt` (`>=50.0.2`). With Internet access, prefer a fresh environment: `py -3.12 -m venv .venv` and `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.
- These are third-party libraries, marked as vendored in `.gitattributes`; their licenses are summarized in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
