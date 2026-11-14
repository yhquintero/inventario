#!/usr/bin/env python3
"""Restablece la contraseña de un usuario directamente en la base de datos.

Herramienta de emergencia para el operador de la instalación (quien tiene acceso
al servidor y al archivo de datos). Sirve cuando el administrador olvidó su
contraseña y tampoco recuerda la respuesta de la pregunta de recuperación del
flujo normal (POST /api/recover), o cuando no hay acceso a la interfaz web.

Lee DATA_DIR (por defecto `data/`), ubica la base de datos igual que el
servidor (`data/novagest.db`, o `data/cuadre.db` en instalaciones antiguas),
valida la política de contraseñas del servidor y reemplaza el hash pbkdf2 del
usuario indicado. Registra la operación en el registro de auditoría encadenado.

Ejemplos:
    DATA_DIR=/var/lib/novagest python3 tools/reset_password.py --user admin --password NuevaClave123!
    NOVAGEST_ADMIN_PW='NuevaClave123!' python3 tools/reset_password.py --user admin --password-stdin
    python3 tools/reset_password.py --user admin --interactive

Seguridad: la contraseña nunca se imprime por pantalla ni se guarda en logs.
"""
import argparse
import getpass
import os
import sys

parser = argparse.ArgumentParser(description="Restablecimiento directo de contraseña en la base de datos de NovaGest.")
parser.add_argument("--data-dir", default=os.environ.get("DATA_DIR", "data"),
                    help="Directorio de datos del servidor (por defecto: data).")
parser.add_argument("--user", required=True, help="Nombre de usuario a restablecer (p. ej. admin).")
group = parser.add_mutually_exclusive_group()
group.add_argument("--password", help="Nueva contraseña (visible en el shell; prefiera las otras opciones).")
group.add_argument("--password-stdin", action="store_true", help="Leer la nueva contraseña de la entrada estándar.")
group.add_argument("--interactive", action="store_true", help="Leer la nueva contraseña de forma oculta desde la terminal.")
args = parser.parse_args()

# DATA_DIR debe fijarse ANTES de importar novagest_server: DB_PATH se resuelve en la importación.
os.environ["DATA_DIR"] = args.data_dir

sys.path.insert(0, str(os.path.join(os.path.dirname(__file__), "..", "server")))
import novagest_server as s  # noqa: E402

# Asegura que existan las tablas (users, fails, audit…) en la base apuntada por
# DATA_DIR. init_db() es idempotente: CREATE TABLE IF NOT EXISTS, no borra nada.
s.init_db()


def leer_password():
    if args.password is not None:
        return args.password
    if args.password_stdin:
        return sys.stdin.read().strip()
    if args.interactive:
        return getpass.getpass(f"Nueva contraseña para {args.user}: ")
    if os.environ.get("NOVAGEST_ADMIN_PW"):
        return os.environ["NOVAGEST_ADMIN_PW"]
    sys.stderr.write("Falta la contraseña: use --password, --password-stdin, --interactive o NOVAGEST_ADMIN_PW.\n")
    return None


def main() -> int:
    pw = leer_password()
    if pw is None:
        return 2

    error = s.pw_policy(pw)
    if error:
        sys.stderr.write(f"Contraseña no válida: {error}\n")
        return 2

    row = s.q("SELECT id, username, active, role FROM users WHERE username=? COLLATE NOCASE",
              (args.user,), one=True)
    if not row:
        sys.stderr.write(f"No existe el usuario «{args.user}».\n")
        return 1
    if not row["active"]:
        sys.stderr.write(f"El usuario «{args.user}» está inactivo.\n")
        return 1

    s.q("UPDATE users SET pw_hash=?, pw_changed=? WHERE id=?",
        (s.hash_pw(pw), s.now(), row["id"]))
    # Desbloquea la cuenta por fallos de login, cualquiera que fuera la IP origen.
    s.q("DELETE FROM fails WHERE k LIKE ?", (f"{row['username'].lower()}|%",))
    s.audit(None, "PASSWORD_RESET",
            f"Restablecimiento directo de contraseña de «{row['username']}» (rol {row['role']}) "
            f"desde tools/reset_password.py",
            "herramienta")
    print(f"Contraseña restablecida para «{row['username']}» (rol {row['role']}). Ya puede iniciar sesión.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
