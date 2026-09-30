(() => {
const api = window.FridgeChef;

const state = {
  recipes: [],
  mode: "idle",
};

function matchTone(recipe) {
  const missingCount = recipe.missing ? recipe.missing.length : 0;
  if (recipe.matchPercent === 100) return "match-full";
  if (missingCount <= 2) return "match-close";
  return "match-low";
}

function titleCase(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function applyFilters(recipes) {
  const cuisine = document.getElementById("filter-cuisine")?.value || "";
  const maxTime = document.getElementById("filter-time")?.value || "";
  const difficulty = document.getElementById("filter-difficulty")?.value || "";

  return recipes.filter((recipe) => {
    if (cuisine && recipe.cuisine !== cuisine) return false;
    if (difficulty && recipe.difficulty !== difficulty) return false;
    if (maxTime && recipe.cookTime > Number(maxTime)) return false;
    return true;
  });
}

function showPanel(name) {
  const grid = document.getElementById("results-grid");
  const empty = document.getElementById("results-empty");
  const error = document.getElementById("results-error");
  if (grid) grid.hidden = name !== "grid";
  if (empty) empty.hidden = name !== "empty";
  if (error) error.hidden = name !== "error";
}

function renderSkeletons() {
  const grid = document.getElementById("results-grid");
  const template = document.getElementById("skeleton-card-template");
  if (!grid || !template) return;
  grid.replaceChildren();
  for (let i = 0; i < 6; i += 1) {
    grid.append(template.content.cloneNode(true));
  }
  showPanel("grid");
}

function renderCards(recipes) {
  const grid = document.getElementById("results-grid");
  const template = document.getElementById("recipe-card-template");
  const empty = document.getElementById("results-empty");
  if (!grid || !template) return;

  const featuredId = sessionStorage.getItem("fridgechef.featuredId");
  const filtered = applyFilters(recipes).slice().sort((a, b) => {
    if (featuredId) {
      if (a.id === featuredId && b.id !== featuredId) return -1;
      if (b.id === featuredId && a.id !== featuredId) return 1;
    }
    const percentA = a.matchPercent ?? 0;
    const percentB = b.matchPercent ?? 0;
    if (percentB !== percentA) return percentB - percentA;
    return a.name.localeCompare(b.name);
  });

  if (!filtered.length) {
    grid.replaceChildren();
    if (empty) {
      empty.hidden = false;
      empty.querySelector("h2").textContent =
        recipes.length ? "No recipes match these filters" : "No matching recipes yet";
      empty.querySelector("p").textContent = recipes.length
        ? "Try clearing a filter or adding another ingredient."
        : "Select ingredients, click Find recipes, or try Random recipes for one complete dish.";
    }
    showPanel("empty");
    return;
  }

  grid.replaceChildren();
  filtered.forEach((recipe) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".recipe-card");
    const link = node.querySelector(".recipe-card-link");
    const image = node.querySelector("img");
    const title = node.querySelector("h3");
    const time = node.querySelector(".badge.time");
    const difficulty = node.querySelector(".badge.difficulty");
    const bar = node.querySelector(".match-bar");
    const label = node.querySelector(".match-label");

    link.href = `/recipe.html?id=${encodeURIComponent(recipe.id)}`;
    image.src = recipe.image;
    image.alt = recipe.name;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    title.textContent = recipe.name;
    time.textContent = `${recipe.cookTime} min`;
    difficulty.textContent = titleCase(recipe.difficulty);
    difficulty.classList.add(recipe.difficulty);

    if (featuredId && recipe.id === featuredId) {
      card.classList.add("is-featured");
    }

    if (typeof recipe.matchPercent === "number") {
      card.style.setProperty("--percent", `${recipe.matchPercent}%`);
      bar.classList.add(matchTone(recipe));
      const missingCount = recipe.missing ? recipe.missing.length : 0;
      label.textContent = missingCount
        ? `${recipe.matchPercent}% match · ${missingCount} missing`
        : `${recipe.matchPercent}% match`;
      if (featuredId && recipe.id === featuredId) {
        label.textContent += " · surprise pick";
      }
    } else {
      card.style.setProperty("--percent", "0%");
      bar.hidden = true;
      label.textContent = `${titleCase(recipe.cuisine)} · ${recipe.servings} servings`;
    }

    grid.append(node);
  });

  showPanel("grid");
}

async function renderRecent() {
  const grid = document.getElementById("recent-grid");
  const empty = document.getElementById("recent-empty");
  const template = document.getElementById("recipe-card-template");
  if (!grid || !template) return;

  const ids = api.getRecentIds();
  if (!ids.length) {
    grid.hidden = true;
    grid.replaceChildren();
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Recipes you open on this device appear here.";
    }
    return;
  }

  try {
    const all = await api.getRecipes();
    const byId = new Map(all.map((recipe) => [recipe.id, recipe]));
    const recipes = ids.map((id) => byId.get(id)).filter(Boolean);
    grid.replaceChildren();
    recipes.forEach((recipe) => {
      const node = template.content.cloneNode(true);
      const link = node.querySelector(".recipe-card-link");
      const image = node.querySelector("img");
      const title = node.querySelector("h3");
      const time = node.querySelector(".badge.time");
      const difficulty = node.querySelector(".badge.difficulty");
      const bar = node.querySelector(".match-bar");
      const label = node.querySelector(".match-label");
      link.href = `/recipe.html?id=${encodeURIComponent(recipe.id)}`;
      image.src = recipe.image;
      image.alt = recipe.name;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      title.textContent = recipe.name;
      time.textContent = `${recipe.cookTime} min`;
      difficulty.textContent = titleCase(recipe.difficulty);
      difficulty.classList.add(recipe.difficulty);
      if (bar) bar.hidden = true;
      label.textContent = "Viewed on this device";
      grid.append(node);
    });
    grid.hidden = false;
    if (empty) empty.hidden = true;
  } catch (error) {
    if (empty) {
      empty.hidden = false;
      empty.textContent = error.message;
    }
  }
}

function renderCurrent() {
  if (state.mode === "loading") return;
  if (state.mode === "error") {
    showPanel("error");
    return;
  }
  renderCards(state.recipes);
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("results-grid");
  if (!grid) return;

  document.getElementById("filter-cuisine")?.addEventListener("change", renderCurrent);
  document.getElementById("filter-time")?.addEventListener("change", renderCurrent);
  document.getElementById("filter-difficulty")?.addEventListener("change", renderCurrent);

  document.getElementById("browse-all")?.addEventListener("click", async () => {
    sessionStorage.removeItem("fridgechef.featuredId");
    document.dispatchEvent(new CustomEvent("fridgechef:match-start"));
    try {
      const recipes = await api.getRecipes();
      state.recipes = recipes;
      state.mode = "ready";
      renderCurrent();
    } catch (error) {
      state.mode = "error";
      document.getElementById("results-error")?.querySelector("p") &&
        (document.getElementById("results-error").querySelector("p").textContent =
          error.message);
      showPanel("error");
      api.showToast(error.message);
    }
  });

  document.addEventListener("fridgechef:match-start", () => {
    state.mode = "loading";
    renderSkeletons();
  });

  document.addEventListener("fridgechef:match-success", (event) => {
    state.recipes = event.detail || [];
    state.mode = "ready";
    renderCurrent();
  });

  document.addEventListener("fridgechef:match-empty", () => {
    state.recipes = [];
    state.mode = "ready";
    renderCurrent();
  });

  document.addEventListener("fridgechef:match-error", (event) => {
    state.mode = "error";
    const error = document.getElementById("results-error");
    if (error) {
      error.querySelector("p").textContent = event.detail || "Something went wrong.";
    }
    showPanel("error");
  });

  renderCurrent();
  renderRecent();
  if (location.hash === "#recent") {
    document.getElementById("recent")?.scrollIntoView();
  }
});
})();
