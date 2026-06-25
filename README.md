\# 🏛️ Sistema Integrado de Gestión — H. Cámara de Senadores de Mendoza



Sistema web construido sobre \*\*Google Apps Script\*\* para la automatización de procesos administrativos: procesamiento de facturas EDEMSA con IA, escaneo inteligente de tickets de caja chica, despacho oficial de órdenes de compra y un asistente de consultas en lenguaje natural.



\---



\## 📋 Índice



\- \[Arquitectura del sistema](#arquitectura-del-sistema)

\- \[Requisitos previos](#requisitos-previos)

\- \[Paso 1 — Configurar Google Drive](#paso-1--configurar-google-drive)

\- \[Paso 2 — Crear la planilla de Google Sheets](#paso-2--crear-la-planilla-de-google-sheets)

\- \[Paso 3 — Configurar el proyecto de Apps Script](#paso-3--configurar-el-proyecto-de-apps-script)

\- \[Paso 4 — Cargar los archivos del repositorio](#paso-4--cargar-los-archivos-del-repositorio)

\- \[Paso 5 — Configurar las constantes del sistema](#paso-5--configurar-las-constantes-del-sistema)

\- \[Paso 6 — Obtener la API Key de Google Gemini](#paso-6--obtener-la-api-key-de-google-gemini)

\- \[Paso 7 — Desplegar la aplicación web](#paso-7--desplegar-la-aplicación-web)

\- \[Paso 8 — Configurar el trigger automático](#paso-8--configurar-el-trigger-automático)

\- \[Módulos del sistema](#módulos-del-sistema)

\- \[Estructura de las hojas de cálculo](#estructura-de-las-hojas-de-cálculo)

\- \[Solución de problemas](#solución-de-problemas)



\---



\## Arquitectura del sistema



```

Google Drive (PDFs EDEMSA)

&#x20;       │

&#x20;       ▼ (trigger cada 5 min)

&#x20;  Código.gs  ──►  API Gemini 2.5 Flash

&#x20;       │

&#x20;       ▼

&#x20;Google Sheets ◄──── Asistente IA (Chat.html)

&#x20;       │

&#x20; Apps Script

&#x20; Web App URL

&#x20;    ├── Menu.html        → Panel central de navegación

&#x20;    ├── Chat.html        → Asistente de consultas en lenguaje natural

&#x20;    └── Operaciones.html → Órdenes de compra + Escaneo de tickets

```



\*\*Stack:\*\* Google Apps Script · HTML/CSS/JS · Google Gemini 2.5 Flash API · Google Drive · Gmail · Google Sheets



\---



\## Requisitos previos



\- Cuenta de Google con Google Workspace (o cuenta personal con acceso a Drive, Sheets y Gmail).

\- API Key de Google AI Studio (Gemini). Ver \[Paso 6](#paso-6--obtener-la-api-key-de-google-gemini).

\- Acceso a \[script.google.com](https://script.google.com).



\---



\## Paso 1 — Configurar Google Drive



Necesitás crear \*\*tres carpetas\*\* en Google Drive. Anotá el ID de cada una (es la parte final de la URL cuando la abrís: `https://drive.google.com/drive/folders/`\*\*`ESTE\_ES\_EL\_ID`\*\*).



| Carpeta | Propósito | Constante en el código |

|---|---|---|

| `EDEMSA - Por Procesar` | Aquí se depositan los PDFs de facturas nuevas | `FOLDER\_PARA\_PROCESAR\_ID` |

| `EDEMSA - Procesadas` | El sistema mueve los PDFs ya procesados aquí | `FOLDER\_PROCESADAS\_ID` |

| `Tickets Procesados` | Archiva los tickets de supermercado escaneados | `FOLDER\_TICKETS\_PROCESADOS\_ID` |



\*\*Cómo crear una carpeta y obtener su ID:\*\*

1\. Abrí \[Google Drive](https://drive.google.com).

2\. Clic en \*\*+ Nuevo → Carpeta\*\*, ponele el nombre y confirmá.

3\. Hacé doble clic para abrirla; el ID es lo que aparece al final de la URL del navegador.



\---



\## Paso 2 — Crear la planilla de Google Sheets



1\. Abrí \[Google Sheets](https://sheets.google.com) y creá una planilla nueva.

2\. Renombrá la primera hoja como \*\*`Facturas`\*\* (haciendo doble clic en la pestaña).

3\. Agregá manualmente las cabeceras en la fila 1:



| A | B | C | D | E | F |

|---|---|---|---|---|---|

| Archivo | NIC | Titular | Dirección | Total ($) | Consumo (kWh) |



4\. Dejá la segunda hoja para los tickets; el sistema la crea automáticamente con el nombre \*\*`Tickets`\*\* la primera vez que procesás un ticket.



> ⚠️ \*\*Importante:\*\* Este archivo de Sheets debe estar abierto (o al menos ser el que tenés activo) cuando vinculés el proyecto de Apps Script. El script usa `SpreadsheetApp.getActiveSpreadsheet()`.



\---



\## Paso 3 — Configurar el proyecto de Apps Script



1\. Desde la planilla de Google Sheets que acabás de crear, ir a \*\*Extensiones → Apps Script\*\*. Esto crea un proyecto vinculado automáticamente al Sheets.

2\. Se abrirá el editor de Apps Script en una nueva pestaña.

3\. Borrá el contenido por defecto del archivo `Código.gs`.



\---



\## Paso 4 — Cargar los archivos del repositorio



El proyecto necesita \*\*4 archivos\*\*: uno `.gs` y tres `.html`.



\### 4.1 — Pegar el código principal



Copiá el contenido de `Código.gs` de este repositorio y pegalo en el archivo `Código.gs` del editor de Apps Script.



\### 4.2 — Agregar los archivos HTML



Para cada uno de los tres archivos HTML (`Menu.html`, `Chat.html`, `Operaciones.html`):



1\. En el editor de Apps Script, hacé clic en el ícono \*\*+\*\* (junto a "Archivos") → \*\*HTML\*\*.

2\. Nombrá el archivo exactamente igual que el del repositorio (sin la extensión `.html`, el editor la agrega solo).

3\. Copiá y pegá el contenido correspondiente.



Al terminar, tu panel de archivos debe verse así:



```

📄 Código.gs

📄 Chat.html

📄 Menu.html

📄 Operaciones.html

```



\---



\## Paso 5 — Configurar las constantes del sistema



Abrí `Código.gs` y editá las 4 constantes del bloque inicial:



```javascript

// ====== CONFIGURACIÓN INICIAL ======

const GEMINI\_API\_KEY          = "TU\_GEMINI\_API\_KEY";           // Ver Paso 6

const FOLDER\_PARA\_PROCESAR\_ID = "ID\_CARPETA\_POR\_PROCESAR";    // Ver Paso 1

const FOLDER\_PROCESADAS\_ID    = "ID\_CARPETA\_PROCESADAS";       // Ver Paso 1

const FOLDER\_TICKETS\_PROCESADOS\_ID = "ID\_CARPETA\_TICKETS";    // Ver Paso 1

// ===================================

```



Reemplazá cada valor entre comillas con los datos reales que obtuviste en los pasos anteriores.



\---



\## Paso 6 — Obtener la API Key de Google Gemini



1\. Ingresá a \[Google AI Studio](https://aistudio.google.com/app/apikey).

2\. Hacé clic en \*\*Create API Key\*\*.

3\. Seleccioná el proyecto de Google Cloud asociado (puede ser el mismo del Apps Script) o creá uno nuevo.

4\. Copiá la API Key generada y pegala en la constante `GEMINI\_API\_KEY` del Paso 5.



> 🔑 \*\*Seguridad:\*\* No subas la API Key al repositorio. Para uso en producción, almacenala en las \*\*Propiedades del Script\*\* en lugar de hardcodearla:

> - En el editor, ir a \*\*Proyecto → Propiedades del proyecto → Propiedades del script\*\*.

> - Agregar una propiedad: clave `GEMINI\_API\_KEY`, valor tu key.

> - En el código, reemplazar la constante por: `const GEMINI\_API\_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI\_API\_KEY');`



\---



\## Paso 7 — Desplegar la aplicación web



1\. En el editor de Apps Script, hacé clic en \*\*Implementar → Nueva implementación\*\*.

2\. Hacé clic en el ícono de engranaje ⚙️ → \*\*Aplicación web\*\*.

3\. Completá la configuración:

&#x20;  - \*\*Descripción:\*\* `v1.0 - Sistema Cámara de Senadores`

&#x20;  - \*\*Ejecutar como:\*\* `Yo (tu cuenta de Google)`

&#x20;  - \*\*Quién puede acceder:\*\* `Cualquier persona de tu organización` (o `Cualquier persona` si lo necesitás público)

4\. Hacé clic en \*\*Implementar\*\*.

5\. La primera vez te pedirá \*\*autorizar permisos\*\*. Revisalos y aceptalos (el sistema necesita acceso a Drive, Gmail, Sheets y conexión externa para la API de Gemini).

6\. Copiá la \*\*URL de la aplicación web\*\* generada. Esa es la URL del sistema.



> 🔄 \*\*Para actualizar\*\* el sistema después de modificar el código: ir a \*\*Implementar → Gestionar implementaciones → ✏️ Editar → Versión nueva → Implementar\*\*.



\---



\## Paso 8 — Configurar el trigger automático



El motor de procesamiento de facturas EDEMSA necesita un disparador para ejecutarse periódicamente.



1\. En el editor de Apps Script, ir a \*\*Activadores\*\* (ícono de reloj en el panel izquierdo, o desde \*\*Proyecto → Activadores\*\*).

2\. Hacer clic en \*\*+ Agregar activador\*\* (botón azul, esquina inferior derecha).

3\. Configurar así:



| Campo | Valor |

|---|---|

| Función a ejecutar | `procesarFacturasNuevas` |

| Implementación a ejecutar | `HEAD (último guardado)` |

| Fuente del evento | `Basado en tiempo` |

| Tipo de activador de tiempo | `Temporizador por minutos` |

| Intervalo | `Cada 5 minutos` |



4\. Hacer clic en \*\*Guardar\*\*.



El sistema ahora revisará automáticamente la carpeta "Por Procesar" cada 5 minutos y volcará los datos extraídos al Sheets.



\---



\## Módulos del sistema



\### 🤖 Asistente IA de Consultas (`Chat.html`)

Permite realizar preguntas en lenguaje natural sobre los datos de las hojas de cálculo. El sistema toma el contenido completo del Sheets como contexto y se lo envía a Gemini para generar respuestas precisas.



\*\*Ejemplos de consultas:\*\*

\- "¿Cuánto debe pagar el NIC 3114058?"

\- "¿Cuál es el consumo total en kWh del mes?"

\- "Listame todos los titulares de la calle San Martín"



\### 📧 Despacho de Órdenes de Compra (`Operaciones.html` — Módulo 1)

Formulario para enviar la notificación oficial a proveedores con el PDF de la orden adjunto. El cuerpo del correo incluye el texto legal estandarizado de la Dirección de Compras.



\### 📷 Escaneo Inteligente de Tickets (`Operaciones.html` — Módulo 2)

Permite cargar una foto (JPEG/PNG) o PDF de un ticket de supermercado. Gemini extrae automáticamente: razón social, CUIT, fecha, detalle resumido y monto total. Los datos se guardan en la hoja `Tickets` y el archivo queda archivado en Drive.



\### ⚙️ Motor de Facturas EDEMSA (`procesarFacturasNuevas`)

Función de fondo que corre cada 5 minutos. Detecta PDFs nuevos en la carpeta de entrada, extrae NIC, titular, dirección, total y kWh usando Gemini, los agrega al Sheets y mueve el archivo a la carpeta de procesados.



\---



\## Estructura de las hojas de cálculo



\### Hoja 1: `Facturas` (creada manualmente)



| Columna A | Columna B | Columna C | Columna D | Columna E | Columna F |

|---|---|---|---|---|---|

| Archivo | NIC | Titular | Dirección | Total ($) | Consumo (kWh) |



\### Hoja 2: `Tickets` (creada automáticamente por el sistema)



| Columna A | Columna B | Columna C | Columna D | Columna E | Columna F |

|---|---|---|---|---|---|

| Archivo de Resguardo | Razón Social | CUIT Emisor | Fecha de Emisión | Detalle Resumido | Monto Total |



\---



\## Solución de problemas



\*\*El sistema muestra "Error de comunicación con el Sheets central"\*\*

Verificá que la API Key de Gemini sea válida y que no haya expirado. Revisá los logs en Apps Script: \*\*Ejecutar → Ver registros (Ctrl+Enter)\*\*.



\*\*Los PDFs de facturas no se procesan automáticamente\*\*

Confirmá que el trigger esté activo (\*\*Activadores\*\* en el panel izquierdo) y que los IDs de carpeta en las constantes sean correctos. Ejecutá `procesarFacturasNuevas` manualmente desde el editor para ver si hay errores en los logs.



\*\*La app pide autorización cada vez\*\*

Esto no debería pasar una vez desplegada. Si ocurre, reimplementá la aplicación web desde \*\*Implementar → Gestionar implementaciones\*\*.



\*\*El correo de la Orden de Compra no llega\*\*

Verificá que el correo del receptor esté bien escrito y que tu cuenta de Google no tenga restricciones de envío de Gmail. Los errores se muestran en el log de la terminal del módulo de operaciones.



\*\*Error al procesar un ticket: "La API no pudo interpretar el documento"\*\*

Asegurate de subir imágenes nítidas (buena iluminación, sin movimiento). Los PDFs funcionan mejor que las fotos para documentos de texto. El modelo Gemini 2.5 Flash admite JPEG, PNG y PDF.



\---
