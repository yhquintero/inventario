# Diagnóstico del CI (Android): para cada dependencia pedida EXPLÍCITAMENTE en una
# versión concreta (por defecto Compose 1.9.0 o lifecycle 2.10.0), imprime la cadena
# de dependencias desde la dependencia directa del proyecto. Uso:
#   gradle :app:dependencies --configuration debugRuntimeClasspath > deps.log
#   awk -f tools/ci_deps_origen.awk deps.log
BEGIN { if (patron == "") patron = ":(1\\.9\\.0|2\\.10\\.0)( |$)"; n = 0 }
{
  if (match($0, /[+\\]--- /)) {
    nivel = (RSTART - 1) / 5
    nodo = substr($0, RSTART + 5)
    pila[nivel] = nodo
    if (nodo ~ patron && nodo !~ /->/ && nodo !~ /\((c|\*)\)/) {
      cadena = pila[0]
      for (i = 1; i <= nivel; i++) cadena = cadena " > " pila[i]
      if (!(cadena in visto)) { visto[cadena] = 1; print cadena; if (++n >= 30) exit }
    }
  }
}
