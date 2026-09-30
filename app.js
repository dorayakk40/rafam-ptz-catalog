// ============================================
// ВСТАВЬТЕ СЮДА URL ВАШЕГО API
// ============================================
const API_URL = "https://script.google.com/macros/s/AKfycbzNAvisczP1sdu-TS_xaVs18QdBLyaUET1a7WLWncsdCKu5MKZa9YHp-U_Q58Ds0a6Fg/exec";

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Состояние
let catalog = [];
let filters = { gender: null, type: null, brand: null, group: null };
let searchQuery = "";
let sortMode = "default";

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
    card.innerHTML = `
      <img src="${item.photo || ''}" alt="${item.name}" onerror="this.style.display='none'">
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
    tg.sendData(JSON.stringify({
      action: "calc",
      aroma: item.name,
      brand: item.brand
    }));
    tg.close();
  };

  document.getElementById("modal").classList.remove("hidden");
}

// ============================================
// ФИЛЬТРЫ
// ============================================
function openFilterModal(filterKey) {
  const titles = { gender: "Пол", type: "Тип", brand: "Бренд", group: "Группа" };
  document.getElementById("filter-title").textContent = titles[filterKey];

  const options = [...new Set(catalog.map(a => {
    if (filterKey === "gender") return a.gender;
    if (filterKey === "type")   return a.type;
    if (filterKey === "brand")  return a.brand;
    if (filterKey === "group")  return a.groups;
    return null;
  }).flat().filter(Boolean))].sort();

  const container = document.getElementById("filter-options");
  container.innerHTML = "";
  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "filter-option";
    div.textContent = opt;
    div.onclick = () => {
      filters[filterKey] = opt;
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

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => openFilterModal(btn.dataset.filter));
});

document.getElementById("reset-filters").addEventListener("click", () => {
  filters = { gender: null, type: null, brand: null, group: null };
  searchQuery = "";
  document.getElementById("search").value = "";
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
