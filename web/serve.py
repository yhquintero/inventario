#!/usr/bin/env python3
"""Compatibilidad: arranca el servidor completo (API + Web). Ver server/cuadre_server.py."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server"))
from cuadre_server import main

if __name__ == "__main__":
    main()
