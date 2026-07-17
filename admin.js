const GITHUB_OWNER = "cccadyforwork-cloud";
const GITHUB_REPO = "Discount-";
const GITHUB_BRANCH = "main";
const DATA_PATH = "data/discount-records.json";
const PUBLIC_URL = "https://cccadyforwork-cloud.github.io/Discount-/";

const adminForm = document.querySelector("#adminForm");
const githubToken = document.querySelector("#githubToken");
const activityTitle = document.querySelector("#activityTitle");
const owner = document.querySelector("#owner");
const startDate = document.querySelector("#startDate");
const endDate = document.querySelector("#endDate");
const reason = document.querySelector("#reason");
const excelFile = document.querySelector("#excelFile");
const adminStatus = document.querySelector("#adminStatus");

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = excelFile.files?.[0];
  const token = githubToken.value.trim();
  const title = activityTitle.value.trim();
  const selectedOwner = owner.value;
  const selectedStart = startDate.value;
  const selectedEnd = endDate.value;

  if (!token || !title || !selectedOwner || !selectedStart || !selectedEnd || !file) {
    setStatus("请先填完整上传信息。", "error");
    return;
  }
  if (!validateDates(selectedStart, selectedEnd)) {
    setStatus("结束日期不能早于开始日期。", "error");
    endDate.focus();
    return;
  }

  try {
    setStatus("正在读取 Excel...", "working");
    const imported = await parseAmazonWorkbook(file);
    if (!imported.length) {
      setStatus("没有在 Excel 的“模板”工作表里找到 SKU 数据。", "error");
      return;
    }

    const records = imported.map((row) =>
      normalizeRecord({
        id: crypto.randomUUID(),
        activityTitle: title,
        owner: selectedOwner,
        sku: row.sku,
        productName: "",
        marketplace: "US",
        regularPrice: row.maxPrice || "",
        discountPrice: row.discountPrice,
        committedUnits: row.committedUnits,
        startDate: selectedStart,
        endDate: selectedEnd,
        reminderDays: 7,
        reason: reason.value,
        actionNeeded: "到期前确认恢复原价或续期",
        notes: "",
        amazonErrors: row.errors,
        amazonErrorDetails: row.errorDetails,
        closed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    setStatus(`已解析 ${records.length} 条，正在发布到公共网页...`, "working");
    await publishSharedData(token, {
      updatedAt: new Date().toISOString(),
      activityTitle: title,
      owner: selectedOwner,
      startDate: selectedStart,
      endDate: selectedEnd,
      records,
    });

    setStatus(`已提交 ${records.length} 条。公共网页通常会在 1-2 分钟内更新：${PUBLIC_URL}`, "success");
    excelFile.value = "";
  } catch (error) {
    console.error(error);
    setStatus(getErrorMessage(error), "error");
  }
});

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

async function publishSharedData(token, data) {
  const endpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`;
  const currentFile = await getCurrentDataFile(token, endpoint);
  const body = {
    message: `Update shared discount data ${data.updatedAt.slice(0, 10)}`,
    branch: GITHUB_BRANCH,
    content: toBase64(JSON.stringify(data, null, 2)),
  };

  if (currentFile?.sha) {
    body.sha = currentFile.sha;
  }

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: githubHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GitHub 发布失败：${response.status} ${await response.text()}`);
  }
}

async function getCurrentDataFile(token, endpoint) {
  const response = await fetch(`${endpoint}?ref=${GITHUB_BRANCH}`, {
    headers: githubHeaders(token),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`读取当前共享数据失败：${response.status} ${await response.text()}`);
  }
  return response.json();
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
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

function setStatus(message, type) {
  adminStatus.textContent = message;
  adminStatus.dataset.type = type;
}

function getErrorMessage(error) {
  const message = String(error?.message || error);
  if (message.includes("401") || message.includes("403")) {
    return "GitHub 拒绝发布。请确认令牌有这个仓库的 Contents 读写权限。";
  }
  return message;
}

function validateDates(fromISO, toISO) {
  return daysBetween(fromISO, toISO) >= 0;
}

function daysBetween(fromISO, toISO) {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to - from) / 86400000);
}

function numberOrBlank(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
