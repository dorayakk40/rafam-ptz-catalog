// ============================================
// URL API
// ============================================
const API_URL = "https://script.google.com/macros/s/AKfycbxG1MNpZgZnKPK0Lw2TG9hvmrn6-Ma7Gy8Qknih_3tN962-aW3D7DNNSLeC6jfRxW-FsQ/exec";

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Состояние
let catalog = [];
let filters = { gender: null, type: null, brand: null, group: null };
let searchQuery = "";
let sortMode = "default";
let onlyInStock = false;
let onlyNew = false;

// ============================================
// ЗАГРУЗКА
// ============================================
async function loadCatalog() {
  try {
    const response = await fetch(API_URL + "?callback=jsonpCallback");
    const text = await response.text();
    const result = JSON.parse(text.replace(/^jsonpCallback\(/, "").replace(/\);?$/, ""));
    if (result.status === "ok") {
      catalog = result.data;
      renderCatalog();
    }
  } catch (e) {
    console.error("Ошибка загрузки:", e);
    document.getElementById("catalog").innerHTML = "<p>Ошибка загрузки каталога</p>";
  }
}

// ============================================
// ФИЛЬТРЫ + СОРТИРОВКА
// ============================================
function applyFilters() {
  let list = [...catalog];
  if (onlyInStock) list = list.filter(a => a.inStock === true);
  if (onlyNew)     list = list.filter(a => a.isNew === true);
  if (filters.gender) list = list.filter(a => a.gender === filters.gender);
  if (filters.type)   list = list.filter(a => a.type === filters.type);
  if (filters.brand)  list = list.filter(a => a.brand === filters.brand);
  if (filters.group)  list = list.filter(a => a.groups.includes(filters.group));

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(a => {
      const text = [a.name, a.brand, a.topNotes, a.middleNotes, a.baseNotes, a.composition]
        .join(" ").toLowerCase();
      return text.includes(q);
    });
  }

  if (sortMode === "name-asc")   list.sort((a,b) => a.name.localeCompare(b.name));
  if (sortMode === "name-desc")  list.sort((a,b) => b.name.localeCompare(a.name));
  if (sortMode === "brand-asc")  list.sort((a,b) => a.brand.localeCompare(b.brand));
  if (sortMode === "brand-desc") list.sort((a,b) => b.brand.localeCompare(a.brand));

  return list;
}

// ============================================
// ОТРИСОВКА
// ============================================
function renderCatalog() {
  const list = applyFilters();
  const container = document.getElementById("catalog");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>Ничего не найдено</p>";
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    let badges = "";
    if (!item.inStock) badges += `<div class="card-badge">Нет в наличии</div>`;
    if (item.isNew)    badges += `<div class="card-badge badge-new">Новинка</div>`;
    card.innerHTML = `
      <div class="card-photo-wrapper">
        <img src="${item.photo || ''}" alt="${item.name}" onerror="this.style.display='none'">
        ${badges}
      </div>
      <div class="card-info">
        <div class="card-name">${item.name}</div>
        <div class="card-brand">${item.brand}</div>
      </div>
    `;
    card.addEventListener("click", () => openModal(item));
    container.appendChild(card);
  });
}

// ============================================
// ДЕТАЛЬНАЯ КАРТОЧКА
// ============================================
function openModal(item) {
  document.getElementById("modal-photo").src = item.photo || "";
  document.getElementById("modal-name").textContent = item.name;
  document.getElementById("modal-brand").textContent = item.brand;
  document.getElementById("modal-type").textContent = "Тип: " + item.type;
  document.getElementById("modal-gender").textContent = "Пол: " + item.gender;

  const stockEl = document.getElementById("modal-stock");
  if (stockEl) {
    stockEl.textContent = item.inStock ? "✅ В наличии" : "❌ Нет в наличии";
    stockEl.style.color = item.inStock ? "#2e7d32" : "#c62828";
  }

  let notesHtml = "";
  if (item.topNotes || item.middleNotes || item.baseNotes) {
    notesHtml = "<b>Пирамида нот</b><br>";
    if (item.topNotes)    notesHtml += "🔹 Верхние: " + item.topNotes + "<br>";
    if (item.middleNotes) notesHtml += "🔸 Средние: " + item.middleNotes + "<br>";
    if (item.baseNotes)   notesHtml += "🔻 Базовые: " + item.baseNotes + "<br>";
  } else if (item.composition) {
    notesHtml = "<b>Композиция:</b> " + item.composition;
  }
  document.getElementById("modal-notes").innerHTML = notesHtml;

  document.getElementById("modal-groups").innerHTML =
    item.groups.length > 0 ? "<b>Группа:</b> " + item.groups.join(" · ") : "";

  document.getElementById("calc-btn").onclick = () => {
    const url = "calc.html?aroma=" + encodeURIComponent(item.name) +
                "&brand=" + encodeURIComponent(item.brand);
    tg.openLink(window.location.origin + window.location.pathname.replace(/index\.html$/, "") + url);
  };

  document.getElementById("modal").classList.remove("hidden");
}

// ============================================
// ФИЛЬТРЫ
// ============================================
function openFilterModal(filterKey) {
  const titles = { gender: "Пол", type: "Тип", brand: "Бренд", group: "Группа" };
  document.getElementById("filter-title").textContent = titles[filterKey];

  let baseList = [...catalog];
  if (onlyInStock) baseList = baseList.filter(a => a.inStock === true);
  if (onlyNew)     baseList = baseList.filter(a => a.isNew === true);

  if (filterKey === "brand") {
    if (filters.type) baseList = baseList.filter(a => a.type === filters.type);
    if (filters.gender) baseList = baseList.filter(a => a.gender === filters.gender);
  }
  if (filterKey === "group" && filters.type) {
    baseList = baseList.filter(a => a.type === filters.type);
  }

  let options;
  if (filterKey === "gender") options = [...new Set(baseList.map(a => a.gender).filter(Boolean))];
  else if (filterKey === "type") options = [...new Set(baseList.map(a => a.type).filter(Boolean))];
  else if (filterKey === "brand") options = [...new Set(baseList.map(a => a.brand).filter(Boolean))];
  else if (filterKey === "group") options = [...new Set(baseList.flatMap(a => a.groups).filter(Boolean))];
  options = options.sort();

  const container = document.getElementById("filter-options");
  container.innerHTML = "";
  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "filter-option";
    div.textContent = opt;
    div.onclick = () => {
      filters[filterKey] = opt;
      if (filterKey === "type") {
        if (filters.brand && !catalog.some(a => a.type === opt && a.brand === filters.brand)) filters.brand = null;
        if (filters.group && !catalog.some(a => a.type === opt && a.groups.includes(filters.group))) filters.group = null;
      }
      document.getElementById("filter-modal").classList.add("hidden");
      renderCatalog();
    };
    container.appendChild(div);
  });

  document.getElementById("filter-modal").classList.remove("hidden");
}

// ============================================
// СОБЫТИЯ
// ============================================
document.getElementById("search").addEventListener("input", e => {
  searchQuery = e.target.value;
  renderCatalog();
});

document.getElementById("sort-select").addEventListener("change", e => {
  sortMode = e.target.value;
  renderCatalog();
});

document.querySelectorAll(".filter-btn[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => openFilterModal(btn.dataset.filter));
});

document.getElementById("in-stock-toggle").addEventListener("click", function() {
  onlyInStock = !onlyInStock;
  this.classList.toggle("active", onlyInStock);
  renderCatalog();
});

document.getElementById("new-toggle").addEventListener("click", function() {
  onlyNew = !onlyNew;
  this.classList.toggle("active", onlyNew);
  renderCatalog();
});

document.getElementById("reset-filters").addEventListener("click", () => {
  filters = { gender: null, type: null, brand: null, group: null };
  searchQuery = "";
  onlyInStock = false;
  onlyNew = false;
  document.getElementById("search").value = "";
  document.getElementById("in-stock-toggle").classList.remove("active");
  document.getElementById("new-toggle").classList.remove("active");
  renderCatalog();
});

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("filter-close").addEventListener("click", () => {
  document.getElementById("filter-modal").classList.add("hidden");
});

// ============================================
// СТАРТ
// ============================================
loadCatalog();
