(() => {
  "use strict";

  const STORAGE_KEY = "amareshInvoiceGenerator.v1";
  const COUNTER_KEY = "amareshInvoiceGenerator.nextNumber.v1";
  const SERVICES = [
    "Tax Audit Fees FY 25-26",
    "Income Tax Returns FY 25-26",
    "Income Tax Notice FY 25-26"
  ];

  const $ = (id) => document.getElementById(id);
  const money = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);

  let currentInvoiceId = null;
  let assignedInvoiceNumber = null;
  let isSaved = false;

  function todayISO() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const date = new Date(`${iso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric"
    });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function readInvoices() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Could not read invoice history:", error);
      return [];
    }
  }

  function writeInvoices(invoices) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
      return true;
    } catch (error) {
      alert("Could not save invoice history. Your browser storage may be full or disabled.");
      console.error(error);
      return false;
    }
  }

  function getNextNumber() {
    const invoices = readInvoices();
    const highestSaved = invoices.reduce((max, invoice) => {
      const numeric = Number(String(invoice.invoiceNumber || "").replace(/\D/g, ""));
      return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
    }, 0);
    let storedNext = Number(localStorage.getItem(COUNTER_KEY));
    if (!Number.isFinite(storedNext) || storedNext < 1) storedNext = 1;
    return Math.max(storedNext, highestSaved + 1);
  }

  function reserveInvoiceNumber() {
    if (assignedInvoiceNumber) return assignedInvoiceNumber;
    const next = getNextNumber();
    assignedInvoiceNumber = String(next).padStart(8, "0");
    // Counter is advanced only when the invoice is saved successfully.
    return assignedInvoiceNumber;
  }

  function markUnsaved(message = "Unsaved changes") {
    isSaved = false;
    $("statusMessage").textContent = message;
    $("statusMessage").classList.remove("saved");
  }

  function markSaved(message = "Saved") {
    isSaved = true;
    $("statusMessage").textContent = message;
    $("statusMessage").classList.add("saved");
  }

  function addItemRow(item = {}) {
    const template = $("itemRowTemplate");
    const row = template.content.firstElementChild.cloneNode(true);
    const select = row.querySelector(".item-description");
    const customInput = row.querySelector(".custom-description");
    const price = row.querySelector(".item-price");
    const tax = row.querySelector(".item-tax");
    const qty = row.querySelector(".item-qty");

    const description = item.description || SERVICES[0];
    if (SERVICES.includes(description)) {
      select.value = description;
    } else if (description) {
      select.value = "Other";
      customInput.value = description;
      customInput.hidden = false;
    } else {
      select.value = SERVICES[0];
    }

    price.value = item.price ?? 0;
    tax.value = item.taxRate ?? 0;
    qty.value = item.quantity ?? 1;

    select.addEventListener("change", () => {
      customInput.hidden = select.value !== "Other";
      if (select.value !== "Other") customInput.value = "";
      updatePreview();
      markUnsaved();
      if (!customInput.hidden) customInput.focus();
    });
    [customInput, price, tax, qty].forEach((input) => {
      input.addEventListener("input", () => {
        updatePreview();
        markUnsaved();
      });
    });
    row.querySelector(".remove-item-btn").addEventListener("click", () => {
      row.remove();
      if (!$("itemsEditor").children.length) addItemRow();
      renumberPreviewItems();
      updatePreview();
      markUnsaved();
    });

    $("itemsEditor").appendChild(row);
    updatePreview();
  }

  function getItemDescription(row) {
    const select = row.querySelector(".item-description");
    if (select.value === "Other") return row.querySelector(".custom-description").value.trim();
    return select.value;
  }

  function collectItems() {
    return [...$("itemsEditor").querySelectorAll(".item-editor-row")].map((row) => {
      const price = Math.max(0, Number(row.querySelector(".item-price").value) || 0);
      const taxRate = Math.min(100, Math.max(0, Number(row.querySelector(".item-tax").value) || 0));
      const quantity = Math.max(0, Number(row.querySelector(".item-qty").value) || 0);
      const subtotal = price * quantity;
      const taxAmount = subtotal * taxRate / 100;
      return {
        description: getItemDescription(row),
        price,
        taxRate,
        quantity,
        subtotal,
        taxAmount,
        amount: subtotal + taxAmount
      };
    });
  }

  function collectFormData() {
    const items = collectItems();
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const discount = Math.max(0, Number($("discount").value) || 0);
    const total = Math.max(0, subtotal + taxTotal - discount);

    return {
      id: currentInvoiceId,
      invoiceNumber: assignedInvoiceNumber,
      date: $("invoiceDate").value,
      businessName: $("businessName").value.trim(),
      businessAddress: $("businessAddress").value.trim(),
      businessPhones: $("businessPhones").value.trim(),
      customerName: $("customerName").value.trim(),
      customerAddress: $("customerAddress").value.trim(),
      customerPhone: $("customerPhone").value.trim(),
      items,
      subtotal,
      taxTotal,
      discount,
      total,
      paymentStatus: $("paymentStatus").value,
      terms: $("terms").value.trim(),
      updatedAt: new Date().toISOString()
    };
  }

  function updatePreview() {
    const data = collectFormData();
    $("previewBusinessName").textContent = data.businessName || "Business name";
    $("previewBusinessAddress").textContent = data.businessAddress || "";
    $("previewBusinessPhones").textContent = data.businessPhones || "—";
    $("previewCustomerName").textContent = data.customerName || "Customer name";
    $("previewCustomerAddress").textContent = data.customerAddress || "";
    $("previewCustomerPhone").textContent = data.customerPhone || "—";
    $("previewInvoiceNumber").textContent = data.invoiceNumber || "Assigned when saved";
    $("previewInvoiceDate").textContent = formatDate(data.date);

    const tbody = $("previewItems");
    tbody.replaceChildren();
    data.items.forEach((item, index) => {
      const tr = document.createElement("tr");
      const values = [
        String(index + 1),
        item.description || "(Description required)",
        money(item.price),
        `${Number(item.taxRate.toFixed(2))}%`,
        money(item.amount)
      ];
      values.forEach((value, cellIndex) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (cellIndex >= 2) td.classList.add("number");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      const amount = $("itemsEditor").querySelectorAll(".item-editor-row")[index]?.querySelector(".item-amount");
      if (amount) amount.textContent = money(item.amount);
    });
    const total = data.total;
    $("previewTotal").textContent = money(total);
    const editorTotal = $("editorTotal");
    if (editorTotal) editorTotal.textContent = money(total);
  }

  function renumberPreviewItems() {
    updatePreview();
  }

  function validateInvoice(data) {
    if (!data.date) return "Please select an invoice date.";
    if (!data.customerName) return "Please enter the customer name.";
    if (!data.items.length) return "Please add at least one item.";
    if (data.items.some((item) => !item.description)) return 'Please enter a description for every item. For custom services, choose "Other" and type a description.';
    if (data.items.some((item) => item.quantity <= 0)) return "Every item must have a quantity greater than zero.";
    return "";
  }

  function saveInvoice() {
    let data = collectFormData();
    const validationError = validateInvoice(data);
    if (validationError) {
      alert(validationError);
      return false;
    }

    const invoices = readInvoices();
    const isEditingExisting = currentInvoiceId && invoices.some((invoice) => invoice.id === currentInvoiceId);

    if (!isEditingExisting) {
      // Assign a sequential number only for a new saved invoice.
      data.invoiceNumber = reserveInvoiceNumber();
      data.id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      data.createdAt = new Date().toISOString();
      invoices.push(data);
      if (!writeInvoices(invoices)) return false;
      currentInvoiceId = data.id;
      assignedInvoiceNumber = data.invoiceNumber;
      localStorage.setItem(COUNTER_KEY, String(Number(data.invoiceNumber) + 1));
    } else {
      const index = invoices.findIndex((invoice) => invoice.id === currentInvoiceId);
      data.id = currentInvoiceId;
      data.invoiceNumber = invoices[index].invoiceNumber;
      data.createdAt = invoices[index].createdAt;
      invoices[index] = data;
      if (!writeInvoices(invoices)) return false;
      assignedInvoiceNumber = data.invoiceNumber;
    }

    $("invoiceNumber").value = data.invoiceNumber;
    updatePreview();
    markSaved(`Saved invoice #${data.invoiceNumber}`);
    renderHistory();
    return true;
  }

  function loadInvoice(invoice) {
    currentInvoiceId = invoice.id;
    assignedInvoiceNumber = invoice.invoiceNumber;
    $("invoiceNumber").value = invoice.invoiceNumber || "";
    $("invoiceDate").value = invoice.date || todayISO();
    $("businessName").value = invoice.businessName || "AMARESH";
    $("businessAddress").value = invoice.businessAddress || "";
    $("businessPhones").value = invoice.businessPhones || "";
    $("customerName").value = invoice.customerName || "";
    $("customerAddress").value = invoice.customerAddress || "";
    $("customerPhone").value = invoice.customerPhone || "";
    $("discount").value = invoice.discount ?? 0;
    $("paymentStatus").value = invoice.paymentStatus || "Unpaid";
    $("terms").value = invoice.terms || "";
    $("itemsEditor").replaceChildren();
    (invoice.items || []).forEach((item) => addItemRow(item));
    if (!(invoice.items || []).length) addItemRow();
    updatePreview();
    markSaved(`Loaded invoice #${invoice.invoiceNumber}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newInvoice() {
    currentInvoiceId = null;
    assignedInvoiceNumber = null;
    $("invoiceNumber").value = "Assigned when saved";
    $("invoiceDate").value = todayISO();
    $("customerName").value = "";
    $("customerAddress").value = "";
    $("customerPhone").value = "";
    $("discount").value = "0";
    $("paymentStatus").value = "Unpaid";
    $("itemsEditor").replaceChildren();
    addItemRow();
    updatePreview();
    markUnsaved("New invoice — number assigned on save");
  }

  function deleteInvoice(id) {
    const invoices = readInvoices();
    const invoice = invoices.find((entry) => entry.id === id);
    if (!invoice) return;
    if (!confirm(`Delete invoice #${invoice.invoiceNumber}? This cannot be undone.`)) return;
    if (!writeInvoices(invoices.filter((entry) => entry.id !== id))) return;
    if (currentInvoiceId === id) newInvoice();
    renderHistory();
  }

  function renderHistory() {
    const query = $("historySearch").value.trim().toLowerCase();
    const invoices = readInvoices()
      .filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName} ${invoice.date}`.toLowerCase().includes(query))
      .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")));
    const list = $("historyList");
    list.replaceChildren();

    if (!invoices.length) {
      const empty = document.createElement("div");
      empty.className = "empty-history";
      empty.textContent = query ? "No matching invoices found." : "No saved invoices yet. Complete the details and click Save invoice.";
      list.appendChild(empty);
      return;
    }

    invoices.forEach((invoice) => {
      const row = document.createElement("div");
      row.className = "history-row";
      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `Invoice #${invoice.invoiceNumber} — ${invoice.customerName || "Unnamed customer"}`;
      const sub = document.createElement("small");
      sub.textContent = `${formatDate(invoice.date)} · ${invoice.paymentStatus || "Unpaid"}`;
      details.append(title, sub);

      const total = document.createElement("div");
      total.className = "history-total";
      total.textContent = money(Number(invoice.total) || 0);

      const actions = document.createElement("div");
      actions.className = "history-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open";
      open.addEventListener("click", () => loadInvoice(invoice));
      const print = document.createElement("button");
      print.type = "button";
      print.textContent = "Print";
      print.addEventListener("click", () => {
        loadInvoice(invoice);
        window.print();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteInvoice(invoice.id));
      actions.append(open, print, remove);
      row.append(details, total, actions);
      list.appendChild(row);
    });
  }

  function attachLiveUpdates() {
    [
      "invoiceDate", "businessName", "businessAddress", "businessPhones",
      "customerName", "customerAddress", "customerPhone", "discount",
      "paymentStatus", "terms"
    ].forEach((id) => {
      $(id).addEventListener("input", () => {
        updatePreview();
        markUnsaved();
      });
      $(id).addEventListener("change", () => {
        updatePreview();
        markUnsaved();
      });
    });
  }

  function init() {
    $("invoiceDate").value = todayISO();
    attachLiveUpdates();
    addItemRow();
    $("addItemBtn").addEventListener("click", () => {
      addItemRow();
      markUnsaved();
    });
    $("saveInvoiceBtn").addEventListener("click", saveInvoice);
    $("newInvoiceBtn").addEventListener("click", () => {
      const hasChanges = !isSaved && ($("customerName").value.trim() || collectItems().some((item) => item.price > 0 || item.description !== SERVICES[0]));
      if (hasChanges && !confirm("Start a new invoice? Unsaved changes will be lost.")) return;
      newInvoice();
    });
    $("printInvoiceBtn").addEventListener("click", () => {
      if (!isSaved) {
        const shouldSave = confirm("Save this invoice before printing so it receives an invoice number?");
        if (shouldSave && !saveInvoice()) return;
        if (!shouldSave) {
          alert("Save the invoice first to assign a unique invoice number.");
          return;
        }
      }
      window.print();
    });
    $("historySearch").addEventListener("input", renderHistory);
    updatePreview();
    renderHistory();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
