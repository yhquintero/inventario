#!/usr/bin/env python3
"""Pruebas del instalador de Windows (S-04).

El instalador solo puede ejecutarse en Windows, así que aquí se comprueba todo lo
que sí se puede verificar sin él, y que es lo que rompe una instalación real:

  * que existan los cinco archivos de `deploy/`;
  * que los `.ps1` con acentos lleven BOM UTF-8 (Windows PowerShell 5.1);
  * que los delimitadores estén equilibrados ignorando cadenas, here-strings y
    comentarios (un `}` de más deja el guion inutilizable);
  * que el `param(...)` venga antes que cualquier sentencia (regla de PowerShell);
  * que el instalador haga los cinco pasos del criterio de aceptación: Python si
    falta, entorno virtual, accesos directos, arranque al iniciar sesión y
    arranque del servidor;
  * que verifique la descarga por SHA-256 y no use `Invoke-Expression`;
  * que el manual lo explique paso a paso;
  * que el CI ejecute esta prueba y que `test_panel_control.ps1` incluya los
    guiones en su analizador de sintaxis (allí sí hay PowerShell real).

    python3 tools/test_instalador.py     (código de salida 0 = correcto)
"""

from __future__ import annotations

import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DEPLOY = RAIZ / "deploy"
MANUAL = RAIZ / "docs" / "INSTALACION.md"
CI = RAIZ / ".github" / "workflows" / "ci.yml"
PANEL = RAIZ / "tools" / "test_panel_control.ps1"

PS1 = {
    "instalador": DEPLOY / "instalar-novagest.ps1",
    "lanzador": DEPLOY / "arrancar-novagest.ps1",
    "consola": DEPLOY / "iniciar-servidor.ps1",
}

fallos = 0
pruebas = 0


def ok(nombre: str, condicion: bool, detalle: str = "") -> None:
    global fallos, pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos += 1
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


def leer(ruta: pathlib.Path) -> str:
    return ruta.read_text(encoding="utf-8-sig")


def equilibrado(texto: str) -> str | None:
    """Devuelve el error de delimitadores, o `None` si todo cuadra."""
    i, n, linea = 0, len(texto), 1
    pila: list[tuple[str, int]] = []
    while i < n:
        c = texto[i]
        if c == "\n":
            linea += 1
            i += 1
            continue
        if c == "<" and i + 1 < n and texto[i + 1] == "#":
            j = texto.find("#>", i + 2)
            if j < 0:
                return f"comentario de bloque sin cerrar en la línea {linea}"
            linea += texto.count("\n", i, j)
            i = j + 2
            continue
        if c == "@" and i + 1 < n and texto[i + 1] in "'\"":
            comilla = texto[i + 1]
            j = texto.find("\n" + comilla + "@", i)
            if j < 0:
                return f"here-string sin cerrar en la línea {linea}"
            linea += texto.count("\n", i, j)
            i = j + 1 + 2
            continue
        if c == "#":
            j = texto.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "'":
            i += 1
            while i < n:
                if texto[i] == "'":
                    if i + 1 < n and texto[i + 1] == "'":
                        i += 2
                        continue
                    break
                if texto[i] == "\n":
                    linea += 1
                i += 1
            i += 1
            continue
        if c == '"':
            i += 1
            while i < n:
                if texto[i] == "`":
                    i += 2
                    continue
                if texto[i] == '"':
                    break
                if texto[i] == "\n":
                    linea += 1
                i += 1
            i += 1
            continue
        if c in "([{":
            pila.append((c, linea))
        elif c in ")]}":
            if not pila:
                return f"'{c}' sin abrir en la línea {linea}"
            tope, ln = pila.pop()
            if "([{".index(tope) != ")]}".index(c):
                return f"'{tope}' (línea {ln}) cerrado con '{c}' en la línea {linea}"
        i += 1
    if pila:
        tope, ln = pila[-1]
        return f"'{tope}' sin cerrar (abierto en la línea {ln})"
    return None


def primera_sentencia(texto: str) -> str:
    """Primera línea con contenido real: sin comentarios, atributos ni `#Requires`."""
    sin_bloques = re.sub(r"<#.*?#>", "", texto, flags=re.S)
    for linea in sin_bloques.splitlines():
        t = linea.strip()
        if not t or t.startswith("#"):
            continue
        if t.startswith(("[CmdletBinding", "[Validate", "[int]", "[switch]", "[OutputType")):
            continue
        if t == ")" or t.startswith(")"):
            continue
        return t
    return ""


def main() -> int:
    print("  ===  Instalador de Windows (S-04)  ===\n")

    # ------------------------------------------------------------ 1) archivos
    print("  Archivos de deploy/")
    esperados = [
        DEPLOY / "instalar-novagest.ps1",
        DEPLOY / "arrancar-novagest.ps1",
        DEPLOY / "iniciar-servidor.ps1",
        DEPLOY / "instalar.bat",
        DEPLOY / "python-hashes.txt",
    ]
    for ruta in esperados:
        ok(f"{ruta.relative_to(RAIZ)} existe", ruta.is_file())

    textos: dict[str, str] = {}
    for clave, ruta in PS1.items():
        if not ruta.is_file():
            continue
        crudo = ruta.read_bytes()
        texto = leer(ruta)
        textos[clave] = texto
        ok(
            f"{ruta.name} lleva BOM UTF-8 (acentos legibles en PowerShell 5.1)",
            crudo.startswith(b"\xef\xbb\xbf") or not re.search(r"[^\x00-\x7F]", texto),
            "empieza por " + repr(crudo[:3]),
        )
        ok(f"{ruta.name} tiene los delimitadores equilibrados", equilibrado(texto) is None,
           equilibrado(texto) or "")
        ok(
            f"{ruta.name} declara el param() antes que cualquier sentencia",
            primera_sentencia(texto).startswith("param("),
            "primera sentencia: " + primera_sentencia(texto)[:60],
        )
        ok(f"{ruta.name} fija #Requires -Version 5.1",
           re.search(r"(?m)^#Requires -Version 5\.1\s*$", texto) is not None)

    # ------------------------------------------------- 2) los cinco pasos (S-04)
    print("\n  Instalador: los cinco pasos del criterio de aceptación")
    inst = textos.get("instalador", "")
    if inst:
        ok("1 · busca Python 3.10+ antes de instalarlo", "Find-Python" in inst and "3.10.0" in inst)
        ok("1 · si falta, instala el oficial de python.org", "python.org/ftp/python" in inst)
        ok("1 · verifica la descarga por SHA-256", "Get-FileHash" in inst and "SHA256" in inst)
        ok("1 · contrasta el hash con deploy/python-hashes.txt", "python-hashes.txt" in inst)
        ok("2 · crea el entorno virtual venv", "-m venv" in inst and "venv" in inst)
        ok("2 · instala requirements.txt dentro del venv", "requirements.txt" in inst)
        ok("3 · crea el acceso directo del Escritorio", "GetFolderPath('Desktop')" in inst)
        ok("3 · crea los accesos del Menú Inicio", "GetFolderPath('Programs')" in inst)
        ok("3 · usa WScript.Shell para el .lnk", "WScript.Shell" in inst and "CreateShortcut" in inst)
        ok("4 · registra el arranque al iniciar la sesión", "GetFolderPath('Startup')" in inst)
        ok("5 · arranca el servidor y espera a que escuche", "arrancar-novagest.ps1" in inst)
        ok("acepta -Puerto", "[int]$Puerto" in inst)
        ok("acepta -Desinstalar", "[switch]$Desinstalar" in inst)
        ok("acepta -SinArranque y -SinNavegador", "[switch]$SinArranque" in inst and "[switch]$SinNavegador" in inst)
        ok("acepta -SoloDependencias", "[switch]$SoloDependencias" in inst)
        ok("la raíz sale de $PSScriptRoot (no de Get-Location)",
           "$PSScriptRoot" in inst and "Split-Path -Parent $PSScriptRoot" in inst
           and "Get-Location" not in inst)
        ok("no borra data\\ al desinstalar", "data\\" in inst and "NO se ha tocado" in inst)

    # ---------------------------------------------------------- 3) lanzador
    print("\n  Lanzador de los accesos directos")
    lan = textos.get("lanzador", "")
    if lan:
        ok("arranca venv\\Scripts\\python.exe", "venv\\Scripts\\python.exe" in lan)
        ok("lanza server\\novagest_server.py", "novagest_server.py" in lan)
        ok("pasa el puerto por la variable de entorno PORT", "$env:PORT" in lan)
        ok("abre el navegador en localhost", "localhost" in lan and "Abrir-Navegador" in lan)
        ok("no arranca una segunda copia si el puerto ya escucha", "Test-PuertoEnUso" in lan)
        ok("espera a que el servidor responda (máx. 60 s)", "AddSeconds(60)" in lan)
        ok("guarda la salida en data\\logs", "data\\logs" in lan)
        ok("respeta -SinNavegador y -Consola", "[switch]$SinNavegador" in lan and "[switch]$Consola" in lan)

    # ------------------------------------------------------- 4) guion de consola
    print("\n  Arranque en consola (desarrollo)")
    con = textos.get("consola", "")
    if con:
        ok("prefiere el python del venv ya instalado", "Scripts\\python.exe" in con)
        ok("falla con un mensaje claro si no hay venv", "instalar-novagest.ps1" in con)
        ok("acepta -Puerto y lo pasa por PORT", "[int]$Puerto" in con and "$env:PORT" in con)

    # ------------------------------------------------------- 5) seguridad SAST
    print("\n  Sin código peligroso en deploy/")
    prohibidos = ["Invoke-Expression", "iex ", "DownloadString", "FromBase64String", "-EncodedCommand"]
    for clave, ruta in PS1.items():
        texto = textos.get(clave, "")
        if not texto:
            continue
        for patron in prohibidos:
            ok(f"{ruta.name} no usa «{patron.strip()}»", patron not in texto)

    bat = DEPLOY / "instalar.bat"
    if bat.is_file():
        contenido = bat.read_text(encoding="utf-8", errors="replace")
        ok("instalar.bat solo usa ASCII (la consola no muestra mojibake)",
           not re.search(r"[^\x00-\x7F]", contenido))
        ok("instalar.bat lanza instalar-novagest.ps1 con ExecutionPolicy Bypass",
           "instalar-novagest.ps1" in contenido and "ExecutionPolicy Bypass" in contenido)
        ok("instalar.bat espera al usuario (no se cierra la ventana)", "pause" in contenido)

    # --------------------------------------------------------- 6) hash falso
    print("\n  Lista de hash de Python")
    hashes = DEPLOY / "python-hashes.txt"
    if hashes.is_file():
        lineas = [
            l.strip() for l in hashes.read_text(encoding="utf-8").splitlines()
            if l.strip() and not l.strip().startswith("#")
        ]
        ok("documenta el formato y cómo obtener el hash",
           "certutil -hashfile" in hashes.read_text(encoding="utf-8"))
        ok("no inventa hashes (todas las líneas son SHA-256 válidos)",
           all(re.fullmatch(r"[0-9a-fA-F]{64}\s+\S+", l) for l in lineas),
           str(lineas[:2]))

    # ----------------------------------------------------------- 7) el manual
    print("\n  Manual (docs/INSTALACION.md)")
    if MANUAL.is_file():
        manual = MANUAL.read_text(encoding="utf-8")
        ok("tiene la sección «Instalador de Windows (S-04)»", "## Instalador de Windows (S-04)" in manual)
        ok("está en el índice", "[Instalador de Windows (S-04)]" in manual)
        ok("menciona instalar.bat", "instalar.bat" in manual)
        ok("menciona instalar-novagest.ps1", "instalar-novagest.ps1" in manual)
        ok("explica los cinco pasos", all(f"| {n} ·" in manual for n in range(1, 6)))
        ok("documenta -Desinstalar", "-Desinstalar" in manual)
        ok("documenta -Puerto", "-Puerto" in manual)
        ok("avisa de que data\\ no se borra", "data" in manual and "NO" in manual)
        ok("apunta a la prueba automática", "tools/test_instalador.py" in manual)

    # ------------------------------------------------------------- 8) el CI
    print("\n  Integración continua")
    if CI.is_file():
        ci = CI.read_text(encoding="utf-8")
        ok("el CI ejecuta tools/test_instalador.py", "tools/test_instalador.py" in ci)
    if PANEL.is_file():
        panel = PANEL.read_text(encoding="utf-8-sig")
        ok("test_panel_control.ps1 analiza la sintaxis de los guiones S-04",
           "$guionesS04" in panel and "deploy/instalar-novagest.ps1" in panel)
        ok("test_panel_control.ps1 comprueba también su BOM",
           panel.count("$guionesS04") >= 2)

    print()
    if fallos:
        print(f"✖ {fallos} fallo(s) de {pruebas}:")
        return 1
    print(f"{pruebas}/{pruebas} comprobaciones correctas · instalador de Windows (S-04)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
