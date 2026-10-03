# Fuentes de las guías de exportación

Cada dato técnico publicado en `/exportar/<guía>` tiene que estar en esta tabla con su fuente. Lo que no tenga fuente pública confiable no se publica.

Reglas:
- **Ningún dato del ERP se publica.** El ERP se usa solo para revisar que la guía calce con la práctica real de ASLI, con un script de solo lectura fuera del repo que imprime agregados y nunca nombres de clientes.
- Los destinos se dicen como "cualquier parte del mundo". Los requisitos por mercado se mencionan en forma genérica.
- Lo marcado como **experiencia ASLI** sale de la operación diaria y no de una fuente publicada.

## Cerezas · `/exportar/cerezas`

Fuentes consultadas el 2 de octubre de 2026.

| # | Fuente | URL |
|---|---|---|
| 1 | Embajada de Chile en Tailandia (Minrel), *Inicio de la temporada de cerezas chilenas* (ene-2025) | https://www.chile.gob.cl/tailandia/noticias/inicio-de-la-temporada-de-cerezas-chilenas |
| 2 | Portalfrutícola, *Maule: la zona del cerezo chileno con una superficie de 27.817 hectáreas* (dic-2022), con datos del Catastro Frutícola CIREN-ODEPA 2021 | https://www.portalfruticola.com/?p=509424 |
| 3 | WFLO / Global Cold Chain Alliance, *Commodity Storage Manual: Cherries, Sweet and Tart* (rev. 2018, Dr. Jeff Brecht, Univ. de Florida) | https://www.gcca.org/system/files/WFLO-Commodity-Storage-Manual-2018Cherries_~_Sweet_%26_Tart%5B1%5D.pdf |
| 4 | Hapag-Lloyd, *Reefer Cargo Handling* | https://www.hapag-lloyd.com/content/dam/website/downloads/pdf/ReeferCargoHandling.pdf |
| 5 | ChileAtiende / SAG, *Emisión de certificado fitosanitario de exportación y reexportación* | https://www.chileatiende.gob.cl/fichas/2551-emision-de-certificado-fitosanitario-de-exportacion-y-reexportacion-de-productos-agricolas-y-forestales |
| 6 | Servicio Nacional de Aduanas, *Compendio de Normas, Anexo 35: DUS* | https://www.aduana.cl/anexo-35-documento-unico-de-salida-y-su-continuacion/aduana/2007-02-21/134024.html |
| 7 | MundoMarítimo, *Partió la certificación de masa bruta de contenedores (VGM)*, norma SOLAS de la OMI | https://mundomaritimo.cl/noticias/partio-certificacion-de-masa-bruta-de-contenedores-en-san-vicente-terminal-internacional-svti |
| 8 | Maersk Chile, *Shipping to and from Chile* (exportación y ventanas de stacking) | https://www.maersk.com/es-mx/local-information/latin-america/chile/export |
| 9 | UC Davis Postharvest Technology Center, *Cherry (Sweet): Recommendations for Maintaining Postharvest Quality* (óptimo -0,5 ± 0,5 °C) | https://postharvest.ucdavis.edu/node/5231 |

| Dato publicado | Fuente |
|---|---|
| Se comercializa de mediados de noviembre a mediados de enero; peak entre Navidad y el Año Nuevo lunar | 1 |
| 45,9 % de la superficie de cerezo de Chile está en el Maule | 2 |
| Enfriar a entre -1 y 0 °C, idealmente dentro de 4 horas (30–32 °F en la fuente); hidroenfriado habitual; ayuda al pedicelo | 3 |
| Temperatura de viaje -1 a 0 °C (óptimo -0,5 ± 0,5 °C); humedad 90–95 % | 9, 3 |
| Atmósfera controlada 3–10 % O₂ y 10–15 % CO₂ | 3 |
| Vida útil: 2 semanas en aire, 3 con bolsa, 4–6 en atmósfera controlada | 3 |
| La bolsa de atmósfera modificada suma al menos una semana; abrirla al sacar de frío en destino | 3 |
| Errores: enfriado tardío, manejo brusco (pitting), humedad baja (pedicelo) | 3 |
| Setear temperatura, humedad y ventilación antes de encender la unidad; espacios libres ≤ 5 % del piso | 4 |
| Certificado fitosanitario: lo emite el SAG, acredita requisitos del país de destino, se pide en el Sistema Multipuerto | 5 |
| DUS: lo presenta el despachador (agente de aduana), en aceptación a trámite y legalización | 6 |
| Sin VGM informado a tiempo, la naviera no embarca el contenedor | 7 |
| Cada naviera fija su ventana de stacking en el puerto | 8 |
| Documentos que no coinciden (factura, fitosanitario, DUS, BL) generan observaciones | experiencia ASLI |

**Ojo con la fuente 3:** su tabla dice "30 to 31°F (-1.1 to 0.6°C)", pero 31 °F son -0,6 °C. Al documento le falta el signo menos. No se usa ese +0,6; la temperatura publicada sale de la fuente 9.

**Revisión contra el ERP (2026-10-02, no publicada):** en los embarques de cereza fresca, la temperatura de seteo está dentro del rango de la fuente 3, el peak de zarpes es diciembre, con noviembre y enero a los lados, el contenedor es reefer de 40 pies y la atmósfera controlada se usa en una parte de los embarques. La ventilación usada no tiene fuente pública, así que la guía no da un valor.
