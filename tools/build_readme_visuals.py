#!/usr/bin/env python3
"""Compone el hero del README y la galería usando capturas existentes.

Requiere ImageMagick (`convert`, `composite`). No inventa pantallas: escala las
capturas de docs/assets/capturas y les da una presentación tipográfica coherente.
"""
from pathlib import Path
import atexit, shutil, subprocess, tempfile
ROOT=Path(__file__).resolve().parents[1]; ASSETS=ROOT/'docs/assets'; CAP=ASSETS/'capturas'; TMP=Path(tempfile.mkdtemp(prefix='ng-readme-'))
atexit.register(shutil.rmtree, TMP, ignore_errors=True)
C='convert'; COMP='composite'; FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def run(*a): subprocess.run(a,check=True)
def shot(src,out,size): run(C,str(src),'-filter','Lanczos','-resize',size+'^','-gravity','center','-extent',size,'-bordercolor','#f8faff','-border','7',str(out))
def shadow(src,out): run(C,str(src),'(', '+clone','-background','#020617','-shadow','60x18+0+18',')','+swap','-background','none','-layers','merge','+repage',str(out))
# Hero panel stack from authentic product screenshots.
panel=TMP/'panel.png'; sale=TMP/'sale.png'; shot(CAP/'panel.png',panel,'950x594'); shot(CAP/'venta-rapida.png',sale,'620x388')
panel_sh=TMP/'panel-shadow.png'; sale_sh=TMP/'sale-shadow.png'; shadow(panel,panel_sh); shadow(sale,sale_sh)
hero=TMP/'hero.png'
run(C,'-size','1600x900','gradient:#101a3b-#0a2438','-fill','#112c4a','-draw','circle 1510,110 1510,600','-fill','#10233c','-draw','circle 36,860 36,500','-stroke','#28436855','-strokewidth','1','-draw','line 0,755 1600,755','-stroke','#18355255','-draw','line 0,788 1600,788',
 '-gravity','northwest','-font',BOLD,'-fill','#ffffff','-pointsize','54','-annotate','+160+77','NovaGest',
 '-font',BOLD,'-fill','#4dd7cf','-pointsize','17','-annotate','+82+185','INVENTARIO  ·  VENTAS  ·  CAJA  ·  FINANZAS',
 '-font',BOLD,'-fill','#ffffff','-pointsize','48','-annotate','+80+278','Tu negocio,','-annotate','+80+342','bajo control.',
 '-font',FONT,'-fill','#d8e2f3','-pointsize','23','-annotate','+82+420','Stock, venta y caja','-annotate','+82+456','en una sola operación.',
 '-font',FONT,'-fill','#aebbd4','-pointsize','18','-annotate','+82+515','Web  ·  Android  ·  servidor propio',
 '-fill','#142849','-stroke','#325271','-strokewidth','1','-draw','roundrectangle 78,590 488,654 20,20','-stroke','none','-font',BOLD,'-fill','#d9f4f1','-pointsize','16','-annotate','+103+612','Funciona también sin conexión',
 '-font',FONT,'-fill','#8da2bd','-pointsize','14','-annotate','+82+820','Capturas de la aplicación  ·  datos de demostración',str(hero))
run(COMP,'-geometry','+540+82',str(panel_sh),str(hero),str(hero)); run(COMP,'-geometry','+890+460',str(sale_sh),str(hero),str(hero))
logo=TMP/'logo.png'; run(C,str(ROOT/'brand/novagest-icon.png'),'-resize','62x62',str(logo)); run(COMP,'-geometry','+78+70',str(logo),str(hero),str(hero))
run(C,str(hero),'-depth','8','-strip','-define','png:compression-level=9',str(ASSETS/'novagest-hero.png'))
# Gallery with consistent screenshot cards and captions.
canvas=TMP/'gallery.png'
run(C,'-size','1920x1080','gradient:#f8faff-#edf2fa','-gravity','northwest','-font',BOLD,'-fill','#17213f','-pointsize','40','-annotate','+68+28','NovaGest  ·  Operación diaria, de un vistazo','-font',FONT,'-fill','#596781','-pointsize','19','-annotate','+70+78','Capturas de la aplicación  ·  datos de demostración  ·  tema claro y oscuro','-fill','#4f46e5','-draw','roundrectangle 1577,52 1850,100 24,24','-font',BOLD,'-fill','#ffffff','-pointsize','15','-annotate','+1602+66','EDICIÓN NEBULA',str(canvas))
items=[('panel.png','Panel · control diario','Ventas, caja, stock y accesos directos'),('venta-rapida.png','Venta rápida · punto de venta','Escáner, catálogo y carrito de compra'),('inventario.png','Inventario multialmacén','Existencias, precios, costos y categorías'),('cuadre-diario.png','Cuadre diario de caja','Fondos, gastos y resultado del día'),('analisis-y-metas.png','Análisis y metas','Indicadores, tendencias y márgenes'),('panel-oscuro.png','Modo oscuro','La misma operación con tema alternativo')]
positions=[(65,145),(675,145),(1285,145),(65,595),(675,595),(1285,595)]
for i,((filename,title,subtitle),(x,y)) in enumerate(zip(items,positions)):
 card=TMP/f'card-{i}.png'; capture=TMP/f'capture-{i}.png'; shot(CAP/filename,capture,'530x331')
 run(C,'-size','570x425','xc:#ffffff','-stroke','#dce4f0','-strokewidth','2','-fill','#ffffff','-draw','roundrectangle 1,1 568,423 18,18',str(card))
 run(COMP,'-geometry','+13+12',str(capture),str(card),str(card))
 texted=TMP/f'card-text-{i}.png'; run(C,str(card),'-gravity','northwest','-font',BOLD,'-fill','#18213e','-pointsize','20','-annotate','+18+373',title,'-font',FONT,'-fill','#63708a','-pointsize','14','-annotate','+18+400',subtitle,str(texted)); card=texted
 run(COMP,'-geometry',f'+{x}+{y}',str(card),str(canvas),str(canvas))
run(C,str(canvas),'-depth','8','-strip','-define','png:compression-level=9',str(CAP/'galeria-novagest.png'))
print('Actualizados docs/assets/novagest-hero.png y docs/assets/capturas/galeria-novagest.png')
