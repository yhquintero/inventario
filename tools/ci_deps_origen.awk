# Diagnóstico del CI (Android): busca la ARISTA que introduce una versión nueva, es decir,
# un nodo pedido explícitamente en la versión vigilada (Compose 1.9.0 / lifecycle 2.10.0)
# cuyo padre NO está en esa versión. Imprime la cadena desde la dependencia directa.
#   gradle :app:dependencies --configuration debugRuntimeClasspath > deps.log
#   awk -f tools/ci_deps_origen.awk deps.log
BEGIN {
  if (patron == "") patron = "^androidx\\.(compose|lifecycle)[^ ]*:(1\\.9\\.0|2\\.10\\.0)( |$)"
  if (padre_nuevo == "") padre_nuevo = "(:|-> )(1\\.9\\.0|2\\.10\\.0)( |$)"
  n = 0
}
{
  if (match($0, /[+\\]--- /)) {
    nivel = (RSTART - 1) / 5
    nodo = substr($0, RSTART + 5)
    pila[nivel] = nodo
    if (nodo ~ patron && nodo !~ /\((c|\*)\)/ && nivel > 0 && pila[nivel - 1] !~ padre_nuevo) {
      cadena = pila[0]
      for (i = 1; i <= nivel; i++) cadena = cadena " > " pila[i]
      if (!(cadena in visto)) { visto[cadena] = 1; print cadena; if (++n >= 30) exit }
    }
    if (nivel == 0 && nodo ~ /-> (1\.9\.0|2\.10\.0)/ && !(nodo in top)) { top[nodo] = 1; print "DIRECTA: " nodo }
  }
}
