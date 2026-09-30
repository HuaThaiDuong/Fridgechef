const matchService = require("../server/services/matchService");
const recipes = require("../server/data/recipes.json");
const ingredients = require("../server/data/ingredients.json");

const checkboxValues = new Set(
  ingredients.groups.flatMap((group) => group.ingredients.map((item) => item.value))
);
const checkboxCanon = new Set([...checkboxValues].map(matchService.canonical));

const missingOnGrid = [];
recipes.forEach((recipe) => {
  recipe.ingredients
    .filter((item) => !item.optional)
    .forEach((item) => {
      const key = matchService.canonical(item.name);
      if (!checkboxCanon.has(key) && !checkboxValues.has(item.name)) {
        missingOnGrid.push(`${recipe.id}:${item.name}`);
      }
    });
});

const problems = [];
if (missingOnGrid.length) {
  problems.push(`required names not on checkbox grid: ${missingOnGrid.join(", ")}`);
}
if (!recipes.length) problems.push("no recipes");

if (problems.length) {
  console.error("RED\n" + problems.join("\n"));
  process.exit(1);
}

console.log(`GREEN recipes=${recipes.length} ingredients=${checkboxValues.size}`);