(() => {
const api = window.FridgeChef;

function titleCase(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderIngredients(recipe, selected) {
  const haveSet = new Set(selected.map(api.canonical));
  const list = document.getElementById("ingredient-list");
  list.replaceChildren();

  recipe.ingredients.forEach((ingredient) => {
    const row = document.createElement("li");
    const have = haveSet.has(api.canonical(ingredient.name));
    row.className = ingredient.optional
      ? "ing-optional"
      : have
        ? "ing-have"
        : "ing-missing";

    const name = document.createElement("span");
    name.textContent = titleCase(ingredient.name);

    const qty = document.createElement("small");
    qty.className = "small";
    qty.textContent = ingredient.optional
      ? `${ingredient.quantity} · optional`
      : have
        ? `${ingredient.quantity} · in your fridge`
        : `${ingredient.quantity} · missing`;

    row.append(name, qty);
    list.append(row);
  });
}

function renderSteps(steps) {
  const list = document.getElementById("step-list");
  list.replaceChildren();
  steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    list.append(item);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector(".recipe-page");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const error = document.getElementById("recipe-error");
  const content = document.getElementById("recipe-content");

  if (!id) {
    content.hidden = true;
    error.hidden = false;
    error.querySelector("p").textContent = "This recipe link is missing an id.";
    return;
  }

  try {
    const recipe = await api.getRecipe(id);
    document.title = `${recipe.name} — FridgeChef`;
    document.getElementById("recipe-title").textContent = recipe.name;
    const photo = document.getElementById("recipe-image");
    photo.src = recipe.image;
    photo.alt = recipe.name;
    photo.loading = "lazy";
    photo.referrerPolicy = "no-referrer";
    document.getElementById("recipe-cuisine").textContent = titleCase(recipe.cuisine);
    document.getElementById("recipe-time").textContent = `${recipe.cookTime} min`;
    const difficulty = document.getElementById("recipe-difficulty");
    difficulty.textContent = titleCase(recipe.difficulty);
    difficulty.classList.add(recipe.difficulty);
    document.getElementById("recipe-servings").textContent = `${recipe.servings} servings`;
    renderIngredients(recipe, api.getSavedIngredients());
    renderSteps(recipe.steps);
    api.recordRecent(recipe.id);
    content.hidden = false;
    error.hidden = true;
  } catch (err) {
    content.hidden = true;
    error.hidden = false;
    error.querySelector("p").textContent = err.message;
    api.showToast(err.message);
  }
});
})();
