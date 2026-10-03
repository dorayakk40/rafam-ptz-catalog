// ============================================
// URL API (тот же, что и для Telegram)
// ============================================
const API_URL = "https://script.google.com/macros/s/AKfycbxG1MNpZgZnKPK0Lw2TG9hvmrn6-Ma7Gy8Qknih_3tN962-aW3D7DNNSLeC6jfRxW-FsQ/exec";

// ============================================
// ИНИЦИАЛИЗАЦИЯ VK BRIDGE
// ============================================
if (window.vkBridge) {
  vkBridge.send('VKWebAppInit');
}

// ============================================
// СОСТОЯНИЕ
// ============================================
let catalog = [];
let aromas = [];
let bottles = [];
let filters = { gender: null, type: null, brand: null, group: null };
let searchQuery = "";
let sortMode = "default";
let onlyInStock = false;
let onlyNew = false;
let onlyDiscount = false;

let selectedAroma = null;
let selectedBottle = null;

// ============================================
// ВКЛАДКИ
// ============================================
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + tab).classList.add("active");
    if (tab === "calc" && aromas.length === 0) loadCalcData();
  });
});

function switchToCalc(aromaName, brandName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelector('[data-tab="calc"]').classList.add("active");
  document.getElementById("tab-calc").classList.add("active");
  if (aromas.length === 0) loadCalcData(aromaName, brandName);
  else setCalcValues(aromaName, brandName);
}

// ============================================
// ЗАГРУЗКА КАТАЛОГА
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
// ФИЛЬТРЫ
// ============================================
function applyFilters() {
  let list = [...catalog];
  if (onlyInStock)  list = list.filter(a => a.inStock === true);
  if (onlyNew)      list = list.filter(a => a.isNew === true);
  if (onlyDiscount) list = list.filter(a => a.discount > 0);
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
    if (item.discount > 0) badges += `<div class="card-badge badge-sale">−${item.discount}%</div>`;
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
  stockEl.textContent = item.inStock ? "✅ В наличии" : "❌ Нет в наличии";
  stockEl.style.color = item.inStock ? "#2e7d32" : "#c62828";

  const discountEl = document.getElementById("modal-discount");
  if (discountEl) {
    if (item.discount > 0) {
      discountEl.textContent = `🔥 Скидка ${item.discount}%`;
      discountEl.style.display = "block";
    } else {
      discountEl.style.display = "none";
    }
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
    document.getElementById("modal").classList.add("hidden");
    switchToCalc(item.name, item.brand);
  };

  document.getElementById("modal").classList.remove("hidden");
}

// ============================================
// ФИЛЬТРЫ (модалка)
// ============================================
function openFilterModal(filterKey) {
  const titles = { gender: "Пол", type: "Тип", brand: "Бренд", group: "Группа" };
  document.getElementById("filter-title").textContent = titles[filterKey];

  let baseList = [...catalog];
  if (onlyInStock)  baseList = baseList.filter(a => a.inStock === true);
  if (onlyNew)      baseList = baseList.filter(a => a.isNew === true);
  if (onlyDiscount) baseList = baseList.filter(a => a.discount > 0);

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

document.getElementById("discount-toggle").addEventListener("click", function() {
  onlyDiscount = !onlyDiscount;
  this.classList.toggle("active", onlyDiscount);
  renderCatalog();
});

document.getElementById("reset-filters").addEventListener("click", () => {
  filters = { gender: null, type: null, brand: null, group: null };
  searchQuery = "";
  onlyInStock = false;
  onlyNew = false;
  onlyDiscount = false;
  document.getElementById("search").value = "";
  document.getElementById("in-stock-toggle").classList.remove("active");
  document.getElementById("new-toggle").classList.remove("active");
  document.getElementById("discount-toggle").classList.remove("active");
  renderCatalog();
});

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("filter-close").addEventListener("click", () => {
  document.getElementById("filter-modal").classList.add("hidden");
});

// ============================================
// КАЛЬКУЛЯТОР
// ============================================
let calcLoaded = false;

async function loadCalcData(preAroma, preBrand) {
  if (calcLoaded) {
    if (preAroma && preBrand) setCalcValues(preAroma, preBrand);
    return;
  }
  try {
    const response = await fetch(API_URL + "?type=calc&callback=jsonpCallback");
    const text = await response.text();
    const result = JSON.parse(text.replace(/^jsonpCallback\(/, "").replace(/\);?$/, ""));
    if (result.status === "ok") {
      aromas = result.data.aromas || [];
      bottles = result.data.bottles || [];
      calcLoaded = true;
      document.getElementById("calc-loader").style.display = "none";
      document.getElementById("calc-form").style.display = "block";
      document.getElementById("calc-empty").style.display = "block";
      initBrandsCalc();
      if (preAroma && preBrand) setCalcValues(preAroma, preBrand);
    }
  } catch (e) {
    console.error("Ошибка загрузки калькулятора:", e);
    document.getElementById("calc-loader").textContent = "Ошибка загрузки данных";
  }
}

function initBrandsCalc() {
  const brands = [...new Set(aromas.map(a => a.brand))].sort();
  const select = document.getElementById("brand-select");
  select.innerHTML = '<option value="">Выберите бренд</option>';
  brands.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b; opt.textContent = b;
    select.appendChild(opt);
  });
}

function setCalcValues(aromaName, brandName) {
  document.getElementById("brand-select").value = brandName;
  onBrandChange();
  document.getElementById("aroma-select").value = aromaName;
  onAromaChange();
}

document.getElementById("brand-select").addEventListener("change", onBrandChange);

function onBrandChange() {
  const brand = document.getElementById("brand-select").value;
  const aromaSelect = document.getElementById("aroma-select");
  aromaSelect.innerHTML = '<option value="">Выберите аромат</option>';
  if (!brand) { aromaSelect.disabled = true; resetBelow("aroma"); return; }
  const list = aromas.filter(a => a.brand === brand);
  list.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.name; opt.textContent = a.name;
    aromaSelect.appendChild(opt);
  });
  aromaSelect.disabled = false;
  resetBelow("aroma");
}

document.getElementById("aroma-select").addEventListener("change", onAromaChange);

function onAromaChange() {
  const brand = document.getElementById("brand-select").value;
  const name = document.getElementById("aroma-select").value;
  selectedAroma = aromas.find(a => a.brand === brand && a.name === name);
  const formatSelect = document.getElementById("format-select");
  formatSelect.disabled = !selectedAroma;
  if (selectedAroma) formatSelect.value = "";
  resetBelow("format");
}

document.getElementById("format-select").addEventListener("change", onFormatChange);

function onFormatChange() {
  const format = document.getElementById("format-select").value;
  const volumeSelect = document.getElementById("volume-select");
  volumeSelect.innerHTML = '<option value="">Выберите объём</option>';
  if (!format) { volumeSelect.disabled = true; resetBelow("volume"); return; }
  const volumes = [...new Set(bottles.filter(b => b.format === format).map(b => b.volume))];
  volumes.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v + " мл";
    volumeSelect.appendChild(opt);
  });
  volumeSelect.disabled = false;
  resetBelow("volume");
}

document.getElementById("volume-select").addEventListener("change", onVolumeChange);

function onVolumeChange() {
  const format = document.getElementById("format-select").value;
  const volume = document.getElementById("volume-select").value;
  const container = document.getElementById("view-options");
  container.innerHTML = "";
  if (!volume) { resetBelow("view"); return; }
  
  const views = bottles.filter(b => b.format === format && b.volume === volume);
  views.forEach(b => {
    const div = document.createElement("div");
    div.className = "view-option";
    if (!b.inStock) div.classList.add("view-option-disabled");
    
    let stockBadge = "";
    if (!b.inStock) stockBadge = `<div class="view-badge">Нет в наличии</div>`;
    
    div.innerHTML = `
      <div class="view-photo-wrapper">
        ${b.photo ? `<img src="${b.photo}" alt="${b.view}" onerror="this.style.display='none'">` : ''}
        ${stockBadge}
      </div>
      <div class="view-option-name">${b.view}</div>
    `;
    
    if (b.inStock) {
      div.onclick = () => {
        document.querySelectorAll(".view-option").forEach(v => v.classList.remove("active"));
        div.classList.add("active");
        selectedBottle = b;
        calculateCalc();
      };
    }
    
    container.appendChild(div);
  });
  
  resetResult();
}

function resetBelow(level) {
  if (level === "aroma") {
    document.getElementById("format-select").value = "";
    document.getElementById("format-select").disabled = true;
  }
  if (level === "aroma" || level === "format") {
    document.getElementById("volume-select").innerHTML = '<option value="">Сначала выберите формат</option>';
    document.getElementById("volume-select").disabled = true;
  }
  if (level !== "view") {
    document.getElementById("view-options").innerHTML = "";
  }
  resetResult();
}

function resetResult() {
  document.getElementById("calc-result").style.display = "none";
  if (document.getElementById("calc-form").style.display !== "none") {
    document.getElementById("calc-empty").style.display = "block";
  }
}

function calculateCalc() {
  if (!selectedAroma || !selectedBottle) return;
  const format = document.getElementById("format-select").value;
  const volume = parseFloat(document.getElementById("volume-select").value);
  let oilMl;
  if (format === "Масло") oilMl = volume;
  else if (format === "Духи") oilMl = volume / 2;
  else if (format === "В машину") oilMl = volume * 0.3;
  else oilMl = volume;
  
  const oilCost = Math.round(oilMl * selectedAroma.pricePerMl);
  const total = oilCost + selectedBottle.price;
  
  const aromaData = catalog.find(a => a.name === selectedAroma.name);
  const discount = aromaData ? aromaData.discount : 0;
  let finalTotal = total;
  if (discount > 0) {
    finalTotal = Math.round(total * (100 - discount) / 100);
  }
  
  document.getElementById("result-price").textContent = finalTotal + " ₽";
  
  let detailsHtml = 
    `${selectedAroma.brand} — ${selectedAroma.name}<br>` +
    `Формат: ${format}, объём: ${volume} мл<br>` +
    `Флакон: ${selectedBottle.view}`;
  
  if (discount > 0) {
    detailsHtml += `<br><br><span style="text-decoration: line-through; opacity: 0.7;">${total} ₽</span> ` +
                   `<b>Скидка ${discount}%</b>`;
  }
  
  document.getElementById("result-details").innerHTML = detailsHtml;
  document.getElementById("calc-result").style.display = "block";
  document.getElementById("calc-empty").style.display = "none";
}

// ============================================
// СТАРТ
// ============================================
loadCatalog();
