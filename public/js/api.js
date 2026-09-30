const USE_MOCK = false;
const STORAGE_KEY = "fridgechef.ingredients";

const SYNONYMS = {
  "scallion": "green onion",
  "spring onion": "green onion",
  "hanh la": "green onion",
  "hanh hoa": "green onion",
  "ca chua": "tomato",
  "trung": "egg",
  "trung ga": "egg",
  "coriander": "cilantro",
  "capsicum": "bell pepper",
  "aubergine": "eggplant",
  "courgette": "zucchini",
  "prawn": "shrimp",
  "minced beef": "ground beef",
  "mozzarella cheese": "mozzarella",
  "chicken breast": "chicken",
  "chicken thigh": "chicken",
  "green onion": "green onion",
  "garbanzo": "chickpea",
  "garbanzo bean": "chickpea",
  "chickpeas": "chickpea",
  "lentils": "lentil",
  "split pea": "peas",
  "green beans": "green bean",
  "lamb chop": "lamb",
  "turkey breast": "turkey",
  "mayo": "mayonnaise",
  "parmigiano": "parmesan",
  "parm": "parmesan",
  "calamari": "squid",
};

function stripDiacritics(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalize(value) {
  return stripDiacritics(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonical(name) {
  const key = normalize(name);
  return SYNONYMS[key] || key;
}

function matchRecipesLocal(recipes, userIngredients) {
  const haveSet = new Set((userIngredients || []).map(canonical).filter(Boolean));

  return recipes
    .map((recipe) => {
      const required = recipe.ingredients.filter((item) => !item.optional);
      const missing = required.filter((item) => !haveSet.has(canonical(item.name)));
      const haveCount = required.length - missing.length;
      const coverage = required.length === 0 ? 1 : haveCount / required.length;
      const score = coverage * 100 - missing.length * 5;
      return {
        ...recipe,
        matchPercent: Math.round(coverage * 100),
        missing,
        score,
      };
    })
    .filter((recipe) => recipe.matchPercent > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
      return a.name.localeCompare(b.name);
    });
}

async function request(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  } catch (error) {
    if (error.message) throw error;
    throw new Error("Network error. Please try again.");
  }
}

async function getMockData() {
  return request("/mock-data.json");
}

async function getIngredients() {
  if (USE_MOCK) {
    const data = await getMockData();
    return data.ingredients;
  }
  return request("/api/ingredients");
}

async function matchRecipes(ingredients) {
  if (USE_MOCK) {
    const data = await getMockData();
    return matchRecipesLocal(data.recipes, ingredients);
  }
  return request("/api/recipes/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });
}

async function getRecipe(id) {
  if (USE_MOCK) {
    const data = await getMockData();
    const recipe = data.recipes.find((item) => item.id === id);
    if (!recipe) throw new Error("Recipe not found.");
    return recipe;
  }
  return request(`/api/recipes/${encodeURIComponent(id)}`);
}

async function getRecipes(filters = {}) {
  if (USE_MOCK) {
    const data = await getMockData();
    return data.recipes.filter((recipe) => {
      if (filters.cuisine && recipe.cuisine !== filters.cuisine) return false;
      if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
      if (filters.maxTime && recipe.cookTime > Number(filters.maxTime)) return false;
      return true;
    });
  }

  const params = new URLSearchParams();
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.maxTime) params.set("maxTime", String(filters.maxTime));
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  const query = params.toString();
  return request(`/api/recipes${query ? `?${query}` : ""}`);
}

function showToast(message, type = "error") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `toast ${type}`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

function getSavedIngredients() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveIngredients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const RECENT_KEY = "fridgechef.recentIds";
const RECENT_MAX = 12;

function getRecentIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function recordRecent(id) {
  if (!id) return;
  const next = [id, ...getRecentIds().filter((item) => item !== id)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

window.FridgeChef = {
  USE_MOCK,
  canonical,
  getIngredients,
  matchRecipes,
  getRecipe,
  getRecipes,
  showToast,
  getSavedIngredients,
  saveIngredients,
  getRecentIds,
  recordRecent,
};
