// ====== CONFIGURACIÓN INICIAL ======
const GEMINI_API_KEY = "TU_GEMINI_API_KEY";
const FOLDER_PARA_PROCESAR_ID = "TU_FOLDER_PARA_PROCESAR_ID";
const FOLDER_PROCESADAS_ID = "TU_FOLDER_PROCESADAS_ID";
const FOLDER_TICKETS_PROCESADOS_ID = "TU_FOLDER_TICKETS_PROCESADOS_ID";
// ===================================

/**
 * CONTROLADOR DE RUTAS WEB (doGet)
 * Administra qué interfaz cargar según la URL (?p=...)
 */
function doGet(e) {
  let pagina = e.parameter.p;
  let archivoHtml = "Menu"; // Página de inicio por defecto
  let titulo = "Cámara de Senadores - Panel Central";

  if (pagina === "chat") {
    archivoHtml = "Chat";
    titulo = "Asistente de Consultas IA";
  } else if (pagina === "operaciones") {
    archivoHtml = "Operaciones";
    titulo = "Panel de Operaciones y Escaneo";
  }

  return HtmlService.createTemplateFromFile(archivoHtml)
    .evaluate()
    .setTitle(titulo)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * EVITA LA PANTALLA EN BLANCO al regresar al menú
 */
function obtenerHtmlMenu() {
  return HtmlService.createTemplateFromFile("Menu").evaluate().getContent();
}

/**
 * FUNCIÓN AUXILIAR: Devuelve los enlaces dinámicos del sistema para el menú principal
 */
function obtenerConfiguracionSistema() {
  const urlBase = ScriptApp.getService().getUrl();
  const planillaUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const carpetaUrl = "https://drive.google.com/drive/folders/" + FOLDER_PARA_PROCESAR_ID;
  
  return {
    urlChat: urlBase + "?p=chat",
    urlOperaciones: urlBase + "?p=operaciones",
    urlMenu: urlBase,
    urlExcel: planillaUrl,
    urlCarpeta: carpetaUrl
  };
}

/**
 * SERVIDOR DEL CHATBOT: Procesa las preguntas cruzando datos del Sheets
 */
function procesarPreguntaWeb(pregunta) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const planillaFacturas = libro.getSheets()[0]; // Primera hoja (Facturas EDEMSA)
  const datosFacturas = planillaFacturas.getDataRange().getValues();
  
  let contextoTabla = "DATOS DE FACTURAS EDEMSA:\n" + JSON.stringify(datosFacturas);
  
  // Opcional: Si existe la hoja de tickets, también se le da contexto a la IA
  const planillaTickets = libro.getSheetByName("Tickets");
  if (planillaTickets) {
    const datosTickets = planillaTickets.getDataRange().getValues();
    contextoTabla += "\n\nDATOS DE TICKETS DE SUPERMERCADO:\n" + JSON.stringify(datosTickets);
  }
  
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
  const payload = {
    "contents": [{
      "parts": [{
        "text": "Actuá como un asistente analítico profesional de la Legislatura. Basándote en estos datos estructurados: " + contextoTabla + ". Respondé de forma clara, concisa, precisa y en lenguaje natural a la consulta: " + pregunta
      }]
    }],
    "generationConfig": { "temperature": 0.2 }
  };

  const opciones = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };

  try {
    const respuesta = UrlFetchApp.fetch(url, opciones);
    if (respuesta.getResponseCode() === 200) {
      const json = JSON.parse(respuesta.getContentText());
      return json.candidates[0].content.parts[0].text.trim();
    }
    return "Error en el servidor de IA.";
  } catch (error) { return "Error de conexión: " + error.toString(); }
}

/**
 * SERVIDOR DE DESPACHO: Recibe los datos del formulario web, procesa el archivo y manda el mail oficial
 */
function despacharOrdenCompraDesdeWeb(datosFormulario) {
  try {
    const correoReceptor = datosFormulario.correo;
    const nroOrden = datosFormulario.orden;
    const archivoRaw = datosFormulario.archivoBytes; 
    const nombreArchivo = datosFormulario.archivoNombre;

    const bytes = Utilities.base64Decode(archivoRaw.split(",")[1]);
    const adjuntoPDF = Utilities.newBlob(bytes, "application/pdf", nombreArchivo);

    const cuerpoHtml = `
      <p>Sr. Proveedor:</p>
      <p>Tengo el agrado de dirigirme a usted a los fines de notificarle la Orden de Compra N° <strong>${nroOrden}</strong>, que se adjunta al presente correo electrónico en formato PDF, con firma con certificado de clave pública de las autoridades responsables.</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Para hacerse efectiva la notificación, se requiere respuesta al presente correo electrónico con la frase “NOTIFICADO”, con nombre y apellido del receptor del correo electrónico.</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;En caso de no recibir respuesta a la presente notificación oficial en el término de 5 días hábiles, esta Dirección de Compras lo considerará notificado tácitamente, de acuerdo con el Art. 150 del Decreto 1000/2015, reglamentario de Ley 8706.</p>
      <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Datos para facturación: Honorable Cámara de Senadores de Mendoza, CUIT: 30-99926230-5, IVA Exento.</p>
      <p>Sin otro particular, le saludo atentamente.</p>
      <p>Saludos cordiales<br>
      <strong>Gastón Ifran</strong><br>
      Dir. de Habilitación,<br>
      Compras y Suministros<br>
      H. Cámara de Senadores<br>
      Tel: 4494802/3831/2617516817</p>
    `;

    MailApp.sendEmail({
      to: correoReceptor,
      subject: "Notificación Oficial - Orden de Compra N° " + nroOrden,
      htmlBody: cuerpoHtml,
      attachments: [adjuntoPDF]
    });

    return "¡Éxito! Orden de Compra N° " + nroOrden + " enviada correctamente a " + correoReceptor;
  } catch (error) { return "❌ Error en el servidor al enviar: " + error.toString(); }
}

/**
 * NUEVA FUNCIONALIDAD: Recibe el ticket (Foto o PDF) importado desde la web, extrae datos con IA, 
 * los guarda en la pestaña "Tickets" y archiva el documento.
 */
function procesarTicketDesdeWeb(datosTicket) {
  try {
    const archivoRaw = datosTicket.archivoBytes;
    const nombreArchivo = datosTicket.archivoNombre;
    const tipoMime = datosTicket.archivoMime;

    // 1. Decodificar el archivo e inicializar el Blob de Drive
    const partes = archivoRaw.split(",");
    const bytes = Utilities.base64Decode(partes[1]);
    const blobArchivo = Utilities.newBlob(bytes, tipoMime, nombreArchivo);

    // 2. Enviar el archivo a la API de Gemini 2.5 Flash de forma multimodal (Texto o Imagen)
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
    const payload = {
      "contents": [{
        "parts": [
          { "inlineData": { "mimeType": tipoMime, "data": partes[1] } },
          { "text": "Analizá esta imagen o documento de ticket de supermercado/compra menor y extraé los siguientes datos de forma obligatoria. REGLA ESTRICTA PARA EL DETALLE: En el campo 'detalle' NO devuelvas una lista, array u objeto; debés escribir un único string corto de texto (una sola línea) que resuma los principales artículos comprados (Ejemplo: 'Bombones, Agua mineral y otros'). Respondé ÚNICAMENTE con un objeto JSON estructurado puro de la siguiente manera: {\"supermercado\": \"\", \"cuit\": \"\", \"fecha\": \"\", \"detalle\": \"\", \"total\": 0}" }
        ]
      }],
      "generationConfig": { "responseMimeType": "application/json", "temperature": 0.1 }
    };

    const opciones = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
    const respuesta = UrlFetchApp.fetch(url, opciones);

    if (respuesta.getResponseCode() === 200) {
      const jsonRes = JSON.parse(respuesta.getContentText());
      const datosIA = JSON.parse(jsonRes.candidates[0].content.parts[0].text);

      // 3. Obtener o crear la hoja independiente para Tickets dentro del libro de Sheets
      const libro = SpreadsheetApp.getActiveSpreadsheet();
      let planillaTickets = libro.getSheetByName("Tickets");
      if (!planillaTickets) {
        planillaTickets = libro.insertSheet("Tickets");
        // Escribir cabeceras oficiales si la hoja es nueva
        planillaTickets.appendRow(["Archivo de Resguardo", "Razón Social", "CUIT Emisor", "Fecha de Emisión", "Detalle Resumido", "Monto Total"]);
        planillaTickets.getRange("A1:F1").setFontWeight("bold");
      }

      // 4. Volcar la fila estructurada en la hoja correspondiente
      planillaTickets.appendRow([
        nombreArchivo,
        datosIA.supermercado || "No detectado",
        datosIA.cuit || "No detectado",
        datosIA.fecha || "No detectada",
        datosIA.detalle || "Compra general",
        datosIA.total || 0
      ]);

      // 5. Almacenar físicamente el archivo en la carpeta "Tickets Procesados"
      const carpetaDestinoTickets = DriveApp.getFolderById(FOLDER_TICKETS_PROCESADOS_ID);
      carpetaDestinoTickets.createFile(blobArchivo);

      return "¡Éxito! Ticket de '" + (datosIA.supermercado || "Comercio") + "' por un total de $" + (datosIA.total || 0) + " procesado y archivado correctamente.";
    } else {
      return "❌ Error: La API de Google AI Studio no pudo interpretar el documento. Código: " + respuesta.getResponseCode();
    }
  } catch (error) {
    return "❌ Error crítico en el servidor de tickets: " + error.toString();
  }
}

/**
 * MOTOR AUTOMÁTICO DE FONDO (Vigila las facturas de EDEMSA de la carpeta cada 5 minutos)
 */
function procesarFacturasNuevas() {
  const carpetaOrigen = DriveApp.getFolderById(FOLDER_PARA_PROCESAR_ID);
  const carpetaDestino = DriveApp.getFolderById(FOLDER_PROCESADAS_ID);
  const archivos = carpetaOrigen.getFiles();
  const planilla = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const datosExisting = planilla.getDataRange().getValues();
  const archivosProcesados = datosExisting.map(fila => fila[0]);

  while (archivos.hasNext()) {
    const archivo = archivos.next();
    const nombreArchivo = archivo.getName();
    if (archivosProcesados.includes(nombreArchivo)) { archivo.moveTo(carpetaDestino); continue; }
    if (archivo.getMimeType() === "application/pdf") {
      try {
        const blob = archivo.getBlob();
        const datosExtraidos = llamarAGemini(blob);
        if (datosExtraidos) {
          planilla.appendRow([
            nombreArchivo, datosExtraidos.nic, datosExtraidos.titular,
            datosExtraidos.direccion, datosExtraidos.total, datosExtraidos.kwh
          ]);
          archivo.moveTo(carpetaDestino);
        }
      } catch (error) { Logger.log("Error: " + error.toString()); }
    }
  }
}

function llamarAGemini(pdfBlob) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
  const payload = {
    "contents": [{
      "parts": [
        { "inlineData": { "mimeType": "application/pdf", "data": Utilities.base64Encode(pdfBlob.getBytes()) } },
        { "text": "Analizá esta factura de EDEMSA y extraé los siguientes datos obligatoriamente. Respondé ÚNICAMENTE con un objeto JSON puro... {\"nic\": \"\", \"titular\": \"\", \"direccion\": \"\", \"total\": 0, \"kwh\": 0}" }
      ]
    }],
    "generationConfig": { "responseMimeType": "application/json" }
  };
  const opciones = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  const respuesta = UrlFetchApp.fetch(url, opciones);
  if (respuesta.getResponseCode() === 200) {
    const json = JSON.parse(respuesta.getContentText());
    return JSON.parse(json.candidates[0].content.parts[0].text);
  }
  return null;
}
