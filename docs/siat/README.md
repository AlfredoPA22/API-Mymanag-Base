# Anexo Técnico SIN Bolivia — Facturación Electrónica

Documento oficial descargado de `www.impuestos.gob.bo` (título interno: "RND Nº 101800000026 — Anexo Técnico I y II — Facturación Electrónica", 21/nov/2018). Aunque el número de RND en el encabezado es el de 2018, los códigos de modalidad/ambiente coinciden exactamente con los que muestra el portal SIAT en 2026 (RND 102100000011) — parece ser la versión vigente del anexo, reeditada.

Archivos:
- `anexo-tecnico-i-ii-facturacion-electronica.pdf` — PDF original (16 páginas).
- `anexo-tecnico-i-ii-texto-extraido.txt` — texto extraído con `pdf-parse` (algunas tablas se desordenan en la extracción, pero el contenido de texto es completo).

## Hallazgos clave

### Modalidad de la empresa: COMPUTARIZADA EN LÍNEA
**No requiere firma digital** (Anexo I, línea ~124): *"Para la modalidad de Facturación Computarizada en Línea, los anteriores esquemas pueden ser aplicados sin tomar en cuenta el firmado de los Documentos Fiscales Electrónicos emitidos."* — se usa hash/huella en vez de certificado.

### Algoritmo de generación del CUF (Código Único de Factura)
Concatenar los siguientes campos numéricos, con ceros a la izquierda hasta completar el largo exacto (total 47 dígitos):

| Campo | Descripción | Longitud |
|---|---|---|
| NIT (Emisor) | NIT del contribuyente | 13 |
| FECHA/HORA (Emisión) | `yyyymmddhhmmssmmm` | 17 |
| SUCURSAL | 0=Casa Matriz, 1=Sucursal 1, ... | 4 |
| MODALIDAD | 1=Electrónica, **2=Computarizada**, 3=Portal Web, 4=Prevalorado Electrónico | 1 |
| TIPOEMISION | 0=Online, 1=Offline | 1 |
| CÓDIGO DOCUMENTO FISCAL | 1=Factura, 2=Nota Débito/Crédito, 3=Nota Fiscal, 4=Documento Equivalente | 1 |
| TIPO DOCUMENTO SECTOR | 1=Factura Estándar ... 22=Boleto Aéreo (22 valores, ver texto extraído línea ~247) | 2 |
| NRO FACTURA | Número de factura | 8 |

= 47 dígitos → agregar 1 dígito autoverificador calculado en **Base 11** (48 dígitos total) → codificar el string resultante en **Base 16** → ese es el CUF final.

### Formato de archivos
- XML versión 1.0 UTF-8.
- Cifrado: algoritmo **SHA2**.
- Firma (solo si aplica firma digital): estándar **XML-Dsig**.
- Validación: contra archivo **XSD** (no incluido en este anexo — se publica aparte en la web del SIN).
- Compresión de un documento: **GZIP**.
- Envío de varios documentos: formato **.TAR**.

### Servicios web — Modalidad Computarizada en Línea (texto extraído línea ~2553)
Métodos con sus campos completos de entrada/salida y códigos de error/mensaje:
- `VALIDACIÓN FACTURA COMPUTARIZADA`
- `RECEPCIÓN ANULACIÓN FACTURA COMPUTARIZADA`
- `VALIDACIÓN ANULACIÓN FACTURA COMPUTARIZADA`
- `RECEPCIÓN NOTA CRÉDITO/DÉBITO COMPUTARIZADA`
- `VALIDACIÓN NOTAS CRÉDITO/DÉBITO COMPUTARIZADA`
- `RECEPCIÓN ANULACIÓN NOTA DÉBITO/CRÉDITO COMPUTARIZADA`
- `VALIDACIÓN ANULACIÓN NOTA CRÉDITO/DÉBITO COMPUTARIZADA`

(Nota: estos métodos "de anexo" no calzan 1:1 con los nombres de operación vistos en el WSDL real de `ServicioFacturacionCompraVenta` — `recepcionFactura`, `anulacionFactura`, etc. — hay que mapear conceptualmente cuál wsdl-operation corresponde a cuál método del anexo antes de implementar.)

### QR
Los documentos fiscales (Computarizada, Electrónica Web, Electrónica por Ciclos) deben llevar un código QR con los campos separados por `|` (pipe). El detalle exacto de los campos del QR no se extrajo limpio del PDF (tabla desordenada en la extracción de texto) — revisar el PDF original página 14 directamente si se necesita el orden exacto.

### Pendiente / no resuelto en este documento
- El **XSD real** de la Factura (estructura completa de detalle/ítems, cliente, actividad económica) no está en este anexo — se publica aparte en la web del SIN, aún no localizado.
- El **orden exacto de campos del código QR** (tabla se desordenó en la extracción — revisar PDF pág. 14).
- Confirmar si el anexo tiene una versión más reciente específica de la RND 102100000011 (este documento cita RND 101800000026 de 2018 en el encabezado).

### Esquema de interoperabilidad — Facturación Computarizada en Línea (portal SIAT, sección "Códigos de Autorización")
Confirma y detalla el flujo de 8 pasos entre Emisor y SIN:
1. Emisor (con CUIS vigente) solicita CUFD (código de 24h) al SIN.
2. SIN valida y devuelve el CUFD + dirección de sucursal/casa matriz.
3. Emisor usa el CUFD para generar el XML de la Factura, calcula el hash, y lo envía al SIN.
4. SIN valida la cabecera de recepción:
   - a) Proceso individual en línea, correcto → devuelve **código de recepción**, estado **"recibido"**.
   - b) Proceso por paquete/contingencia o masivo, correcto → devuelve código de recepción (sin estado final aún).
   - c) Con errores → devuelve lista de códigos/mensajes de error para corrección y reenvío.
5. (Opcional) el emisor imprime la factura/nota C-D para el cliente.
6. Si la emisión es por paquete de contingencia o masiva, el SIN valida el contenido: a) registra/consolida si no hay errores; b) si hay errores, acepta las facturas correctas y rechaza las que tienen error (con excepción: NIT válido/no validado previamente puede enviarse con código de excepción para no ser rechazado).
7. El emisor usa el código de recepción para pedir la validación final — **solo aplica si la emisión fue por paquete de contingencia o masiva** (el proceso individual en línea ya queda resuelto en el paso 4a).
8. SIN devuelve el resultado de esa validación; si hay observaciones, se corrigen y se reenvía.

### Códigos de autorización — catálogo completo (no solo CUIS/CUFD/CUF)
| Código | Descripción | ¿Aplica a nuestra modalidad (Computarizada en Línea)? |
|---|---|---|
| **CUIS** | Código Único de Inicio de Sistemas — vincula sistema+credenciales+contribuyente+sucursal(+punto de venta opcional). Vigencia 365 días. Se obtiene con Token. | Sí — Etapa I |
| **CUFD** | Código Único de Facturación Diaria — vigencia 24h, requiere Token. | Sí — se usa en Etapa II (Sincronización) y en emisión real (fase futura) |
| **CUF** | Código Único de Factura — se autogenera al emitir cada factura (algoritmo Base 11 + Base 16, ya documentado arriba). | Sí — fase futura (emisión) |
| CAED | Código de Autorización para Emisión de Documentos Fiscales — modalidades Manual y Prevalorada Preimpresa. | No — no usamos Manual/Prevalorada |
| CAFC | Código Autorización Facturas Contingencia — impresión/emisión de facturas manuales de contingencia. | No, salvo que en el futuro se soporte contingencia impresa |
| Número de Autorización | Generado automáticamente para modalidad Computarizada SFV. | Dato a tener presente para Registro de Compras/Ventas (ver nota abajo) |

**Nota importante para la fase futura (Registro de Compras/Ventas)**: en los registros obligatorios (excepto Registro de Compras y Ventas o aplicativos SIAT/Mis Facturas) donde se pide el "Número de Autorización", cuando las facturas consignan Códigos de Autorización emitidos en modalidad Electrónica en Línea, Computarizada en Línea, Portal Web en Línea o Manual vigente, debe registrarse el valor **99** en ese campo.
