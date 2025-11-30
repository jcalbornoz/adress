# Prueba Técnica ADRES – Gestión de Adquisiciones

Aplicación web para la gestión de **requerimientos de adquisiciones** (bienes y servicios), con:

- Creación, consulta, modificación y activación/desactivación de registros.
- Filtros por unidad, tipo, proveedor, fecha y estado.
- Registro y visualización de **historial de cambios**.
- Almacenamiento persistente en archivo **JSON** (`backend/data.json`).

## Tecnologías

- **Frontend**: HTML, CSS y JavaScript puro.
- **Backend**: Node.js + Express.
- **Almacenamiento**: Archivo JSON en disco.

## Estructura

```text
frontend/
  index.html
  styles.css
  app.js
backend/
  package.json
  server.js
  data.json (se crea automáticamente si no existe)
```

## Requisitos previos

- Node.js 18+ instalado.

## Instrucciones de ejecución

1. decargar el  proyecto del git de forma local.
2. Instalar dependencias del backend:

   ```bash
   cd backend
   npm install
   ```

3. Iniciar el servidor:

   ```bash
   npm start
   ```

4. Abrir el navegador en:

   - http://localhost:3000

El servidor Express sirve directamente la aplicación web contenida en `frontend`.

## Catálogos

Los catálogos de:

- **Unidades Administrativas**
- **Tipos de Bien o Servicio**

se mantienen en `data.json` dentro del nodo `catalogs` y se exponen a través de:

- `GET /api/catalogs` (JSON)
- `GET /api/catalogs.xml` (XML, para demostración)

El frontend consume `GET /api/catalogs` para poblar los combos.

## Endpoints principales

- `GET /api/acquisitions`  
  Lista adquisiciones. Soporta filtros por query string:
  - `unidad`, `tipo`, `proveedor`, `estado` (`ACTIVO`/`INACTIVO`), `fechaDesde`, `fechaHasta`.

- `POST /api/acquisitions`  
  Crea una nueva adquisición. Campos requeridos (el backend calcula `valorTotal` como `cantidad * valorUnitario`):

  - `presupuesto`, `unidad`, `tipo`, `cantidad`, `valorUnitario`,
    `fechaAdquisicion`, `proveedor`, `documentacion` (opcional).

- `GET /api/acquisitions/:id`  
  Obtiene una adquisición por id.

- `PUT /api/acquisitions/:id`  
  Actualiza la adquisición (y recalcula `valorTotal`).

- `PATCH /api/acquisitions/:id/status`  
  Cambia el estado activo/inactivo. Body:
  - `{ "activo": true | false }`

- `GET /api/acquisitions/:id/history`  
  Devuelve el historial de cambios de la adquisición.

## Validaciones y lógica de negocio

- Todos los campos obligatorios deben venir informados.
- `presupuesto`, `cantidad`, `valorUnitario` deben ser numéricos.
- `fechaAdquisicion` debe ser una fecha válida.
- El **Valor Total** no se digita: se calcula siempre como `cantidad * valorUnitario` tanto en el frontend (para mostrar al usuario) como en el backend (para garantizar integridad).
- Se registra un evento en el historial en:
  - Creación
  - Actualización
  - Cambio de estado

