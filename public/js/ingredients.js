(() => {
const api = window.FridgeChef;

const FEATURED_KEY = "fridgechef.featuredId";
const LAST_RANDOM_KEY = "fridgechef.lastRandomId";

function selectedValues() {
  return [...document.querySelectorAll(".ing-item input:checked")].map(
    (checkbox) => checkbox.value
  );
}

function updateSelectionUi() {
  const selected = selectedValues();
  const countEl = document.getElementById("selected-count");
  if (countEl) countEl.textContent = String(selected.length);
  api.saveIngredients(selected);
  document.querySelectorAll(".ing-item").forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("is-checked", Boolean(input && input.checked));
  });
}

function renderGroups(payload) {
  const form = document.getElementById("ingredient-form");
  const saved = new Set(api.getSavedIngredients());
  form.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = "ingredient-groups";

  payload.groups.forEach((group) => {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = group.label;

    const grid = document.createElement("div");
    grid.className = "ing-grid";

    group.ingredients.forEach((ingredient) => {
      const id = `ing-${ingredient.value.replace(/\s+/g, "-")}`;
      const label = document.createElement("label");
      label.className = "ing-item";
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.name = "ingredient";
      input.value = ingredient.value;
      input.checked = saved.has(ingredient.value);

      const text = document.createElement("span");
      text.textContent = ingredient.label;

      label.append(input, text);
      grid.append(label);
    });

    fieldset.append(legend, grid);
    wrap.append(fieldset);
  });

  form.append(wrap);
  updateSelectionUi();
}

function applyChecks(names) {
  const wanted = new Set(names);
  document.querySelectorAll(".ing-item input").forEach((input) => {
    input.checked = wanted.has(input.value);
  });
}

async function findRecipes(featuredId) {
  if (featuredId) {
    sessionStorage.setItem(FEATURED_KEY, featuredId);
  } else {
    sessionStorage.removeItem(FEATURED_KEY);
  }

  const selected = selectedValues();
  if (!selected.length) {
    api.showToast("Select at least one ingredient.");
    document.dispatchEvent(new CustomEvent("fridgechef:match-empty"));
    return;
  }

  document.dispatchEvent(new CustomEvent("fridgechef:match-start"));
  try {
    const results = await api.matchRecipes(selected);
    document.dispatchEvent(
      new CustomEvent("fridgechef:match-success", { detail: results })
    );
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    document.dispatchEvent(
      new CustomEvent("fridgechef:match-error", { detail: error.message })
    );
    api.showToast(error.message);
  }
}

async function randomFridge() {
  const button = document.getElementById("random-fridge");
  if (button) button.disabled = true;
  try {
    const recipes = await api.getRecipes();
    if (!recipes.length) {
      api.showToast("No recipes to pick from.");
      return;
    }
    const lastId = sessionStorage.getItem(LAST_RANDOM_KEY);
    const pool = recipes.filter((recipe) => recipe.id !== lastId);
    const source = pool.length ? pool : recipes;
    const chosen = source[Math.floor(Math.random() * source.length)];
    sessionStorage.setItem(LAST_RANDOM_KEY, chosen.id);
    applyChecks(
      chosen.ingredients
        .filter((item) => !item.optional)
        .map((item) => item.name)
    );
    updateSelectionUi();
    api.showToast(`Random recipe: ${chosen.name}. Matching now.`, "success");
    await findRecipes(chosen.id);
  } catch (error) {
    api.showToast(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("ingredient-form");
  if (!form) return;

  try {
    renderGroups(await api.getIngredients());
  } catch (error) {
    api.showToast(error.message);
  }

  form.addEventListener("change", updateSelectionUi);

  document.getElementById("find-recipes")?.addEventListener("click", () => findRecipes());
  document.getElementById("random-fridge")?.addEventListener("click", randomFridge);

  const modal = document.getElementById("clear-modal");
  document.getElementById("clear-all")?.addEventListener("click", () => {
    modal?.showModal();
  });
  document.getElementById("cancel-clear")?.addEventListener("click", () => {
    modal?.close();
  });
  document.getElementById("confirm-clear")?.addEventListener("click", () => {
    document.querySelectorAll(".ing-item input").forEach((input) => {
      input.checked = false;
    });
    updateSelectionUi();
    modal?.close();
  });
});
})();
