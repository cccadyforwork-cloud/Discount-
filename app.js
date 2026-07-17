const STORAGE_KEY = "discount-action-ledger:v1";
const SHARED_DATA_URL = "./data/discount-records.json";
const VIEWER_MODE = location.hostname.endsWith("github.io") || document.body.dataset.mode === "viewer";

const form = document.querySelector("#discountForm");
const rowsEl = document.querySelector("#recordRows");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const ownerFilter = document.querySelector("#ownerFilter");
const statusFilter = document.querySelector("#statusFilter");
const pageSizeSelect = document.querySelector("#pageSize");
const pageInfo = document.querySelector("#pageInfo");
const pageIndicator = document.querySelector("#pageIndicator");
const prevPageButton = document.querySelector("#prevPage");
const nextPageButton = document.querySelector("#nextPage");
const excelInput = document.querySelector("#excelInput");
const importTools = document.querySelector("#importTools");
const importTitle = document.querySelector("#importTitle");
const importOwner = document.querySelector("#importOwner");
const importStart = document.querySelector("#importStart");
const importEnd = document.querySelector("#importEnd");
const importReason = document.querySelector("#importReason");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const detailDialog = document.querySelector("#detailDialog");
const detailTitle = document.querySelector("#detailTitle");
const detailList = document.querySelector("#detailList");
const alertStrip = document.querySelector("#alertStrip");

const today = new Date();
const todayISO = toISODate(today);

let records = [];
let currentPage = 1;

document.querySelector("#todayText").textContent = todayISO;
form.elements.startDate.value = todayISO;
form.elements.endDate.value = toISODate(addDays(today, 29));
configureMode();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const record = normalizeRecord({
    id: crypto.randomUUID(),
    activityTitle: data.get("activityTitle"),
    owner: data.get("owner"),
    sku: data.get("sku"),
    productName: data.get("productName"),
    marketplace: data.get("marketplace"),
    regularPrice: data.get("regularPrice"),
    discountPrice: data.get("discountPrice"),
    committedUnits: data.get("committedUnits"),
    startDate: data.get("startDate"),
    endDate: data.get("endDate"),
    reminderDays: data.get("reminderDays"),
    reason: data.get("reason"),
    actionNeeded: data.get("actionNeeded"),
    notes: data.get("notes"),
    amazonErrors: "",
    amazonErrorDetails: "",
    closed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!validateDates(record.startDate, record.endDate)) {
    alert("结束日期不能早于开始日期。");
    return;
  }

  records.unshift(record);
  saveRecords();
  form.reset();
  form.elements.marketplace.value = "US";
  form.elements.reason.value = "价格折扣活动";
  form.elements.reminderDays.value = "7";
  form.elements.startDate.value = todayISO;
  form.elements.endDate.value = toISODate(addDays(today, 29));
  render();
});

searchInput.addEventListener("input", () => {
  currentPage = 1;
  render();
});
statusFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
ownerFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
pageSizeSelect.addEventListener("change", () => {
  currentPage = 1;
  render();
});
prevPageButton.addEventListener("click", () => {
  currentPage = Math.max(1, currentPage - 1);
  render();
});
nextPageButton.addEventListener("click", () => {
  currentPage += 1;
  render();
});

excelInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const title = importTitle.value.trim();
  const owner = importOwner.value;
  const startDate = importStart.value;
  const endDate = importEnd.value;

  if (!title) {
    alert("请先填写这批活动的内部标题，再导入 Excel。");
    excelInput.value = "";
    importTitle.focus();
    return;
  }
  if (!owner) {
    alert("请先选择这批活动的负责人，再导入 Excel。");
    excelInput.value = "";
    importOwner.focus();
    return;
  }
  if (!startDate) {
    alert("请先选择这批价格折扣的开始日期，再导入 Excel。");
    excelInput.value = "";
    importStart.focus();
    return;
  }
  if (!endDate) {
    alert("请先选择这批价格折扣的结束日期，再导入 Excel。");
    excelInput.value = "";
    importEnd.focus();
    return;
  }
  if (!validateDates(startDate, endDate)) {
    alert("导入结束日期不能早于开始日期。");
    excelInput.value = "";
    importEnd.focus();
    return;
  }

  try {
    const imported = await parseAmazonWorkbook(file);
    if (!imported.length) {
      alert("没有在 Excel 的“模板”工作表里找到 SKU 数据。");
      return;
    }

    const additions = imported.map((row) =>
      normalizeRecord({
        id: crypto.randomUUID(),
        activityTitle: title,
        owner,
        sku: row.sku,
        productName: "",
        marketplace: "US",
        regularPrice: row.maxPrice || "",
        discountPrice: row.discountPrice,
        committedUnits: row.committedUnits,
        startDate,
        endDate,
        reminderDays: 7,
        reason: importReason.value,
        actionNeeded: "到期前确认恢复原价或续期",
        notes: "",
        amazonErrors: row.errors,
        amazonErrorDetails: row.errorDetails,
        closed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    records = [...additions, ...records];
    saveRecords();
    render();
    alert(`已导入 ${additions.length} 条折扣记录，内部标题：${title}，负责人：${owner}`);
  } catch (error) {
    console.error(error);
    alert("导入失败。请确认文件是亚马逊价格折扣 Excel，且浏览器能联网加载解析组件。");
  } finally {
    excelInput.value = "";
  }
});

rowsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const record = records.find((item) => item.id === button.dataset.id);
  if (!record) return;

  if (button.dataset.action === "detail") {
    showDetail(record);
  }

  if (button.dataset.action === "toggle") {
    record.closed = !record.closed;
    record.updatedAt = new Date().toISOString();
    saveRecords();
    render();
  }

  if (button.dataset.action === "delete" && confirm(`删除 ${record.sku} 这条折扣动作？`)) {
    records = records.filter((item) => item.id !== record.id);
    saveRecords();
    render();
  }
});

exportButton.addEventListener("click", () => {
  const sharedData = {
    updatedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([JSON.stringify(sharedData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "discount-records.json";
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", () => {
  if (!records.length) return;
  if (!confirm("确定清空所有本地折扣记录？这个操作不能撤销。")) return;
  records = [];
  saveRecords();
  render();
});

initializeRecords();

function render() {
  const visible = getFilteredRecords();
  const pageSize = Number(pageSizeSelect.value);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageRecords = visible.slice(pageStart, pageEnd);
  const enriched = records.map((record) => ({ ...record, status: getStatus(record) }));
  const active = enriched.filter((record) => record.status.key === "active").length;
  const expiring = enriched.filter((record) => record.status.key === "expiring").length;
  const expired = enriched.filter((record) => record.status.key === "expired").length;
  const valueTotal = enriched
    .filter((record) => !record.closed)
    .reduce((sum, record) => sum + number(record.discountPrice) * number(record.committedUnits || 1), 0);

  document.querySelector("#activeCount").textContent = active;
  document.querySelector("#expiringCount").textContent = expiring;
  document.querySelector("#expiredCount").textContent = expired;
  document.querySelector("#valueTotal").textContent = money(valueTotal);

  if (expired || expiring) {
    alertStrip.hidden = false;
    alertStrip.textContent = expired
      ? `有 ${expired} 条折扣已经过期未关闭，需要尽快处理。`
      : `有 ${expiring} 条折扣将在提醒窗口内到期。`;
  } else {
    alertStrip.hidden = true;
  }

  rowsEl.innerHTML = pageRecords.map(renderRow).join("");
  emptyState.hidden = pageRecords.length > 0;
  pageInfo.textContent = visible.length
    ? `显示 ${pageStart + 1}-${Math.min(pageEnd, visible.length)} 条，共 ${visible.length} 条`
    : "0 条记录";
  pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
}

function renderRow(record) {
  const status = getStatus(record);
  const errorText = record.amazonErrors ? escapeHTML(record.amazonErrors).replaceAll("\n", "<br />") : "-";
  const priceText = [
    record.regularPrice ? `<span class="muted">原 ${money(record.regularPrice)}</span>` : "",
    `<strong>${money(record.discountPrice)}</strong>`,
  ]
    .filter(Boolean)
    .join("<br />");

  return `
    <tr>
      <td><strong>${escapeHTML(record.activityTitle || "-")}</strong></td>
      <td><span class="status ${status.key}">${status.label}</span><div class="muted">${status.daysText}</div></td>
      <td>${escapeHTML(record.owner || "-")}</td>
      <td><div class="sku">${escapeHTML(record.sku)}</div><div class="muted">${escapeHTML(record.productName || record.marketplace || "")}</div></td>
      <td>${priceText}</td>
      <td>${escapeHTML(record.startDate)}<br /><span class="muted">至 ${escapeHTML(record.endDate)}</span></td>
      <td>${record.committedUnits || "-"}</td>
      <td>${escapeHTML(record.reason || "-")}</td>
      <td>${errorText}</td>
      <td>${renderRowActions(record)}</td>
    </tr>
  `;
}

function renderRowActions(record) {
  const sharedActions = `<button class="ghost" type="button" data-action="detail" data-id="${record.id}">详情</button>`;
  if (VIEWER_MODE) return `<div class="row-actions">${sharedActions}</div>`;

  return `
    <div class="row-actions">
      ${sharedActions}
      <button class="ghost" type="button" data-action="toggle" data-id="${record.id}">${record.closed ? "重开" : "关闭"}</button>
      <button class="ghost danger-text" type="button" data-action="delete" data-id="${record.id}">删</button>
    </div>
  `;
}

function getFilteredRecords() {
  const query = searchInput.value.trim().toLowerCase();
  const owner = ownerFilter.value;
  const filter = statusFilter.value;

  return records.filter((record) => {
    const status = getStatus(record);
    const haystack = [
      record.activityTitle,
      record.owner,
      record.sku,
      record.productName,
      record.reason,
      record.notes,
      record.amazonErrors,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus =
      filter === "all" ||
      status.key === filter ||
      (filter === "error" && Boolean(record.amazonErrors));
    const matchesOwner = owner === "all" || record.owner === owner;
    return matchesQuery && matchesOwner && matchesStatus;
  });
}

function getStatus(record) {
  if (record.amazonErrors) {
    return { key: "error", label: "有错误", daysText: "先处理亚马逊校验" };
  }
  if (record.closed) {
    return { key: "closed", label: "已关闭", daysText: "已处理" };
  }

  const startDiff = daysBetween(todayISO, record.startDate);
  const endDiff = daysBetween(todayISO, record.endDate);
  const reminderDays = number(record.reminderDays || 7);

  if (startDiff > 0) return { key: "planned", label: "未开始", daysText: `${startDiff} 天后开始` };
  if (endDiff < 0) return { key: "expired", label: "已过期", daysText: `过期 ${Math.abs(endDiff)} 天` };
  if (endDiff <= reminderDays) return { key: "expiring", label: "即将到期", daysText: `${endDiff} 天后结束` };
  return { key: "active", label: "进行中", daysText: `${endDiff} 天后结束` };
}

async function parseAmazonWorkbook(file) {
  if (!window.XLSX) {
    throw new Error("XLSX library was not loaded");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames.includes("模板") ? "模板" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  return rows
    .slice(2)
    .filter((row) => row[0])
    .map((row) => ({
      sku: String(row[0]).trim(),
      discountPrice: row[1],
      committedUnits: row[2],
      maxPrice: row[3],
      minPrice: row[4],
      errors: String(row[5] || "").trim(),
      errorDetails: String(row[6] || "").trim(),
    }));
}

function showDetail(record) {
  detailTitle.textContent = record.sku;
  const fields = [
    ["状态", getStatus(record).label],
    ["内部标题", record.activityTitle || "-"],
    ["负责人", record.owner || "-"],
    ["商品名", record.productName || "-"],
    ["站点", record.marketplace || "-"],
    ["调价前价格", record.regularPrice ? money(record.regularPrice) : "-"],
    ["折扣价", money(record.discountPrice)],
    ["参与数量", record.committedUnits || "-"],
    ["周期", `${record.startDate} 至 ${record.endDate}`],
    ["提醒", `提前 ${record.reminderDays || 7} 天`],
    ["原因", record.reason || "-"],
    ["到期动作", record.actionNeeded || "-"],
    ["备注", record.notes || "-"],
    ["亚马逊错误", record.amazonErrors || "-"],
    ["错误详情", record.amazonErrorDetails || "-"],
  ];

  detailList.innerHTML = fields
    .map(([label, value]) => `<dt>${escapeHTML(label)}</dt><dd>${escapeHTML(String(value))}</dd>`)
    .join("");
  detailDialog.showModal();
}

function normalizeRecord(record) {
  return {
    ...record,
    activityTitle: String(record.activityTitle || "").trim(),
    owner: String(record.owner || "").trim(),
    sku: String(record.sku || "").trim(),
    productName: String(record.productName || "").trim(),
    marketplace: String(record.marketplace || "US").trim(),
    regularPrice: numberOrBlank(record.regularPrice),
    discountPrice: numberOrBlank(record.discountPrice),
    committedUnits: numberOrBlank(record.committedUnits),
    reminderDays: numberOrBlank(record.reminderDays) || 7,
    reason: String(record.reason || "").trim(),
    actionNeeded: String(record.actionNeeded || "").trim(),
    notes: String(record.notes || "").trim(),
    amazonErrors: String(record.amazonErrors || "").trim(),
    amazonErrorDetails: String(record.amazonErrorDetails || "").trim(),
  };
}

async function initializeRecords() {
  records = await loadRecords();
  render();
}

async function loadRecords() {
  if (VIEWER_MODE) {
    return loadSharedRecords();
  }

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

async function loadSharedRecords() {
  try {
    const response = await fetch(`${SHARED_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    const sharedRecords = Array.isArray(data) ? data : data.records;
    return Array.isArray(sharedRecords) ? sharedRecords.map(normalizeRecord) : [];
  } catch (error) {
    console.error(error);
    alertStrip.hidden = false;
    alertStrip.textContent = "公共数据暂时读取失败，请稍后刷新。";
    return [];
  }
}

function saveRecords() {
  if (VIEWER_MODE) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function configureMode() {
  if (!VIEWER_MODE) return;

  document.querySelector(".form-panel")?.setAttribute("hidden", "");
  importTools.hidden = true;
  document.querySelector(".actions")?.setAttribute("hidden", "");
  document.querySelector(".import-heading p").textContent = "公共数据只读展示，由负责人统一上传更新。";
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toISODate(date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

function daysBetween(fromISO, toISO) {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to - from) / 86400000);
}

function validateDates(startDate, endDate) {
  return daysBetween(startDate, endDate) >= 0;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrBlank(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(number(value));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
