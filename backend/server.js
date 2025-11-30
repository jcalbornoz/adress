const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas de archivos
const DATA_FILE = path.join(__dirname, "data.json");

// Carga y persistencia en archivo JSON
function createDefaultDb() {
  return {
    acquisitions: [],
    histories: [],
    catalogs: {
      unidadesAdministrativas: [
        "Dirección General",
        "Subdirección de Gestión Financiera",
        "Oficina Asesora Jurídica",
        "Oficina de Tecnologías de la Información",
        "Subdirección de Aseguramiento",
        "Subdirección de Operación de Reconocimientos",
        "Oficina de Planeación",
        "Oficina de Control Interno"
      ],
      tiposBienServicio: [
        "Medicamentos",
        "Dispositivos médicos",
        "Equipos biomédicos",
        "Servicios de tecnología",
        "Servicios de consultoría",
        "Servicios de mantenimiento",
        "Papelería y suministros",
        "Servicios logísticos",
        "Licencias de software",
        "Servicios de capacitación"
      ]
    }
  };
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error leyendo data.json, se usará estructura por defecto:", err);
  }
  return createDefaultDb();
}

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando data.json:", err);
  }
}

let db = loadDb();

// Servir frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Utilidades
function validateAcquisition(body) {
  const requiredFields = [
    "presupuesto",
    "unidad",
    "tipo",
    "cantidad",
    "valorUnitario",
    "fechaAdquisicion",
    "proveedor",
  ];

  for (const f of requiredFields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return `El campo '${f}' es obligatorio.`;
    }
  }

  const numericFields = ["presupuesto", "cantidad", "valorUnitario"];
  for (const nf of numericFields) {
    if (isNaN(Number(body[nf]))) {
      return `El campo '${nf}' debe ser numérico.`;
    }
  }

  // Fecha válida
  if (isNaN(Date.parse(body.fechaAdquisicion))) {
    return "La fecha de adquisición no es válida.";
  }

  return null;
}

function addHistory(acquisitionId, action, summary) {
  db.histories.push({
    id: db.histories.length + 1,
    acquisitionId,
    action,
    summary,
    timestamp: new Date().toISOString(),
  });
  saveDb();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Endpoints de catálogos
app.get("/api/catalogs", (req, res) => {
  res.json(db.catalogs);
});

// Versión XML de catálogos (opcional, demostrativa)
app.get("/api/catalogs.xml", (req, res) => {
  const { unidadesAdministrativas, tiposBienServicio } = db.catalogs;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<catalogos>\n';

  xml += "  <unidadesAdministrativas>\n";
  unidadesAdministrativas.forEach((u) => {
    xml += `    <unidad>${escapeXml(u)}</unidad>\n`;
  });
  xml += "  </unidadesAdministrativas>\n";

  xml += "  <tiposBienServicio>\n";
  tiposBienServicio.forEach((t) => {
    xml += `    <tipo>${escapeXml(t)}</tipo>\n`;
  });
  xml += "  </tiposBienServicio>\n";

  xml += "</catalogos>";

  res.set("Content-Type", "application/xml");
  res.send(xml);
});

// Endpoints de adquisiciones

// GET /api/acquisitions - con filtros opcionales
app.get("/api/acquisitions", (req, res) => {
  const { unidad, tipo, proveedor, estado, fechaDesde, fechaHasta } = req.query;
  let result = [...db.acquisitions];

  if (unidad) {
    result = result.filter((a) =>
      a.unidad.toLowerCase().includes(unidad.toLowerCase())
    );
  }
  if (tipo) {
    result = result.filter((a) =>
      a.tipo.toLowerCase().includes(tipo.toLowerCase())
    );
  }
  if (proveedor) {
    result = result.filter((a) =>
      a.proveedor.toLowerCase().includes(proveedor.toLowerCase())
    );
  }
  if (estado === "ACTIVO") {
    result = result.filter((a) => a.activo);
  } else if (estado === "INACTIVO") {
    result = result.filter((a) => !a.activo);
  }
  if (fechaDesde) {
    result = result.filter((a) => a.fechaAdquisicion >= fechaDesde);
  }
  if (fechaHasta) {
    result = result.filter((a) => a.fechaAdquisicion <= fechaHasta);
  }

  res.json(result);
});

// GET /api/acquisitions/:id
app.get("/api/acquisitions/:id", (req, res) => {
  const id = Number(req.params.id);
  const acq = db.acquisitions.find((a) => a.id === id);
  if (!acq) return res.status(404).json({ error: "No encontrado" });
  res.json(acq);
});

// POST /api/acquisitions
app.post("/api/acquisitions", (req, res) => {
  const error = validateAcquisition(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  // Cálculo de valor total en backend
  const cantidad = Number(req.body.cantidad);
  const valorUnitario = Number(req.body.valorUnitario);
  const valorTotal = cantidad * valorUnitario;

  const newId = db.acquisitions.length > 0
    ? Math.max(...db.acquisitions.map((a) => a.id)) + 1
    : 1;

  const newAcq = {
    id: newId,
    presupuesto: Number(req.body.presupuesto),
    unidad: req.body.unidad.trim(),
    tipo: req.body.tipo.trim(),
    cantidad,
    valorUnitario,
    valorTotal,
    fechaAdquisicion: req.body.fechaAdquisicion,
    proveedor: req.body.proveedor.trim(),
    documentacion: (req.body.documentacion || "").trim(),
    activo: true,
  };

  db.acquisitions.push(newAcq);
  addHistory(newAcq.id, "CREADO", `Registro creado con proveedor ${newAcq.proveedor}`);
  saveDb();

  res.status(201).json(newAcq);
});

// PUT /api/acquisitions/:id
app.put("/api/acquisitions/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = db.acquisitions.findIndex((a) => a.id === id);
  if (index === -1) return res.status(404).json({ error: "No encontrado" });

  const error = validateAcquisition(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const cantidad = Number(req.body.cantidad);
  const valorUnitario = Number(req.body.valorUnitario);
  const valorTotal = cantidad * valorUnitario;

  const current = db.acquisitions[index];
  const updated = {
    ...current,
    presupuesto: Number(req.body.presupuesto),
    unidad: req.body.unidad.trim(),
    tipo: req.body.tipo.trim(),
    cantidad,
    valorUnitario,
    valorTotal,
    fechaAdquisicion: req.body.fechaAdquisicion,
    proveedor: req.body.proveedor.trim(),
    documentacion: (req.body.documentacion || "").trim(),
  };

  db.acquisitions[index] = updated;
  addHistory(id, "ACTUALIZADO", "Campos de la adquisición actualizados");
  saveDb();

  res.json(updated);
});

// PATCH /api/acquisitions/:id/status { activo: true|false }
app.patch("/api/acquisitions/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const acq = db.acquisitions.find((a) => a.id === id);
  if (!acq) return res.status(404).json({ error: "No encontrado" });

  const { activo } = req.body;
  if (typeof activo !== "boolean") {
    return res.status(400).json({ error: "Debe enviar el campo 'activo' booleano" });
  }

  acq.activo = activo;
  addHistory(id, "ESTADO", `Estado cambiado a ${activo ? "ACTIVO" : "INACTIVO"}`);
  saveDb();
  res.json(acq);
});

// GET /api/acquisitions/:id/history
app.get("/api/acquisitions/:id/history", (req, res) => {
  const id = Number(req.params.id);
  const acq = db.acquisitions.find((a) => a.id === id);
  if (!acq) return res.status(404).json({ error: "No encontrado" });

  const history = db.histories.filter((h) => h.acquisitionId === id);
  res.json(history);
});

// Fallback: devolver index.html (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
