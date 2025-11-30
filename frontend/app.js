const API_BASE = "/api/acquisitions";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("acquisition-form");
  const btnClear = document.getElementById("btn-clear");
  const tableBody = document.querySelector("#acquisitions-table tbody");
  const emptyMessage = document.getElementById("empty-message");

  const unidadSelect = document.getElementById("unidad");
  const tipoSelect = document.getElementById("tipo");
  const cantidadInput = document.getElementById("cantidad");
  const valorUnitarioInput = document.getElementById("valorUnitario");
  const valorTotalInput = document.getElementById("valorTotal");

  // Filtros
  const filterUnidad = document.getElementById("filter-unidad");
  const filterTipo = document.getElementById("filter-tipo");
  const filterProveedor = document.getElementById("filter-proveedor");
  const filterEstado = document.getElementById("filter-estado");
  const filterFechaDesde = document.getElementById("filter-fecha-desde");
  const filterFechaHasta = document.getElementById("filter-fecha-hasta");
  const btnApplyFilters = document.getElementById("btn-apply-filters");
  const btnClearFilters = document.getElementById("btn-clear-filters");

  // Modal historial
  const modalBackdrop = document.getElementById("history-modal-backdrop");
  const btnCloseHistory = document.getElementById("btn-close-history");
  const historyList = document.getElementById("history-list");

  // Cargar catálogos y datos iniciales
  loadCatalogs().then(loadAcquisitions);

  // Recalcular valor total cuando cambian cantidad o valor unitario
  cantidadInput.addEventListener("input", updateValorTotal);
  valorUnitarioInput.addEventListener("input", updateValorTotal);

  function updateValorTotal() {
    const cantidad = parseFloat(cantidadInput.value) || 0;
    const unitario = parseFloat(valorUnitarioInput.value) || 0;
    const total = cantidad * unitario;
    valorTotalInput.value = total ? total.toFixed(2) : "";
  }

  // Submit form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = getFormData();
    if (!payload) return;

    try {
      const idHidden = document.getElementById("acq-id").value;
      if (idHidden) {
        await fetch(`${API_BASE}/${idHidden}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      clearForm();
      await loadAcquisitions();
    } catch (err) {
      alert("Error al guardar la adquisición");
      console.error(err);
    }
  });

  btnClear.addEventListener("click", () => {
    clearForm();
  });

  // Filtros
  btnApplyFilters.addEventListener("click", () => loadAcquisitions());
  btnClearFilters.addEventListener("click", () => {
    filterUnidad.value = "";
    filterTipo.value = "";
    filterProveedor.value = "";
    filterEstado.value = "";
    filterFechaDesde.value = "";
    filterFechaHasta.value = "";
    loadAcquisitions();
  });

  // Modal historial
  btnCloseHistory.addEventListener("click", hideHistoryModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) hideHistoryModal();
  });

  async function loadCatalogs() {
    try {
      const res = await fetch("/api/catalogs");
      const catalogs = await res.json();

      fillSelect(unidadSelect, catalogs.unidadesAdministrativas || []);
      fillSelect(tipoSelect, catalogs.tiposBienServicio || []);
    } catch (err) {
      console.error("Error cargando catálogos", err);
    }
  }

  function fillSelect(select, options) {
    // El primer option "Seleccione..." ya está en el HTML
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
  }

  function getFiltersQuery() {
    const params = new URLSearchParams();
    if (filterUnidad.value) params.append("unidad", filterUnidad.value);
    if (filterTipo.value) params.append("tipo", filterTipo.value);
    if (filterProveedor.value) params.append("proveedor", filterProveedor.value);
    if (filterEstado.value) params.append("estado", filterEstado.value);
    if (filterFechaDesde.value) params.append("fechaDesde", filterFechaDesde.value);
    if (filterFechaHasta.value) params.append("fechaHasta", filterFechaHasta.value);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  async function loadAcquisitions() {
    try {
      const response = await fetch(API_BASE + getFiltersQuery());
      const data = await response.json();
      renderTable(data);
    } catch (err) {
      console.error(err);
      alert("Error al cargar adquisiciones");
    }
  }

  function renderTable(list) {
    tableBody.innerHTML = "";
    if (!list || list.length === 0) {
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    list.forEach((acq) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${acq.unidad}</td>
        <td>${acq.tipo}</td>
        <td>${acq.proveedor}</td>
        <td>${acq.fechaAdquisicion}</td>
        <td class="text-right">${acq.valorTotal.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</td>
        <td>
          <span class="tag ${acq.activo ? "tag-success" : "tag-muted"}">
            ${acq.activo ? "ACTIVO" : "INACTIVO"}
          </span>
        </td>
        <td class="col-actions"></td>
      `;

      const actionsTd = tr.querySelector("td:last-child");

      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.className = "btn btn-small btn-secondary";
      btnEdit.addEventListener("click", () => fillForm(acq));

      const btnToggle = document.createElement("button");
      btnToggle.textContent = acq.activo ? "Desactivar" : "Activar";
      btnToggle.className = "btn btn-small";
      btnToggle.style.background = acq.activo ? "#c0392b" : "#00a896";
      btnToggle.style.borderColor = "transparent";
      btnToggle.style.color = "#fff";
      btnToggle.addEventListener("click", () => toggleStatus(acq.id, !acq.activo));

      const btnHistory = document.createElement("button");
      btnHistory.textContent = "Historial";
      btnHistory.className = "btn btn-small btn-ghost";
      btnHistory.addEventListener("click", () => showHistory(acq.id));

      actionsTd.appendChild(btnEdit);
      actionsTd.appendChild(btnToggle);
      actionsTd.appendChild(btnHistory);

      tableBody.appendChild(tr);
    });
  }

  function getFormData() {
    const presupuesto = parseFloat(document.getElementById("presupuesto").value);
    const unidad = unidadSelect.value;
    const tipo = tipoSelect.value;
    const cantidad = parseFloat(cantidadInput.value);
    const valorUnitario = parseFloat(valorUnitarioInput.value);
    const fechaAdquisicion = document.getElementById("fecha").value;
    const proveedor = document.getElementById("proveedor").value.trim();
    const documentacion = document.getElementById("documentacion").value.trim();

    if (!unidad || !tipo || !proveedor || !fechaAdquisicion) {
      alert("Por favor complete todos los campos obligatorios.");
      return null;
    }

    if (isNaN(presupuesto) || isNaN(cantidad) || isNaN(valorUnitario)) {
      alert("Presupuesto, cantidad y valor unitario deben ser numéricos.");
      return null;
    }

    if (cantidad <= 0 || valorUnitario < 0) {
      alert("Cantidad y valor unitario deben ser mayores o iguales a 0.");
      return null;
    }

    const valorTotal = cantidad * valorUnitario;

    return {
      presupuesto,
      unidad,
      tipo,
      cantidad,
      valorUnitario,
      valorTotal,
      fechaAdquisicion,
      proveedor,
      documentacion,
    };
  }

  function clearForm() {
    document.getElementById("acq-id").value = "";
    document.getElementById("presupuesto").value = "";
    unidadSelect.value = "";
    tipoSelect.value = "";
    cantidadInput.value = "";
    valorUnitarioInput.value = "";
    valorTotalInput.value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("proveedor").value = "";
    document.getElementById("documentacion").value = "";
    document.getElementById("btn-save").textContent = "Guardar";
  }

  function fillForm(acq) {
    document.getElementById("acq-id").value = acq.id;
    document.getElementById("presupuesto").value = acq.presupuesto;
    unidadSelect.value = acq.unidad;
    tipoSelect.value = acq.tipo;
    cantidadInput.value = acq.cantidad;
    valorUnitarioInput.value = acq.valorUnitario;
    valorTotalInput.value = acq.valorTotal.toFixed(2);
    document.getElementById("fecha").value = acq.fechaAdquisicion;
    document.getElementById("proveedor").value = acq.proveedor;
    document.getElementById("documentacion").value = acq.documentacion || "";
    document.getElementById("btn-save").textContent = "Actualizar";
  }

  async function toggleStatus(id, activo) {
    try {
      await fetch(`${API_BASE}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      await loadAcquisitions();
    } catch (err) {
      console.error(err);
      alert("Error al cambiar el estado");
    }
  }

  async function showHistory(id) {
    historyList.innerHTML = "<li>Cargando historial...</li>";
    modalBackdrop.classList.add("visible");
    try {
      const response = await fetch(`${API_BASE}/${id}/history`);
      const items = await response.json();
      if (!items || items.length === 0) {
        historyList.innerHTML = "<li>Sin historial registrado.</li>";
        return;
      }
      historyList.innerHTML = "";
      items.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${h.action}</strong> - ${new Date(h.timestamp).toLocaleString("es-CO")}<br/>
          <span style="color:#555">Usuario: sistema (prueba técnica)</span><br/>
          <small>Resumen: ${h.summary}</small>
        `;
        historyList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<li>Error al cargar el historial.</li>";
    }
  }

  function hideHistoryModal() {
    modalBackdrop.classList.remove("visible");
  }
});
