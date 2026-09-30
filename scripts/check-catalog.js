const fs = require("fs");
const path = require("path");
const matchService = require("../server/services/matchService");
const recipes = require("../server/data/recipes.json");
const ingredients = require("../server/data/ingredients.json");

function synonymKeys(filePath) {
  const text = fs.readFileSync(path.join(__dirname, filePath), "utf8");
  const block = text.split("const SYNONYMS = {")[1].split("};")[0];
  return [...block.matchAll(/"([^"]+)":/g)].map((match) => match[1]).sort();
}

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

const tomatoEggs = matchService.matchRecipes(recipes, [
  "egg",
  "tomato",
  "onion",
  "garlic",
]);
const top = tomatoEggs[0];
const tomatoOk = top && top.name === "Tomato Fried Eggs" && top.matchPercent === 100;

const problems = [];
const serverKeys = synonymKeys("../server/services/matchService.js").join(",");
const clientKeys = synonymKeys("../public/js/api.js").join(",");
if (serverKeys !== clientKeys) {
  problems.push("client SYNONYMS do not match server SYNONYMS");
}
if (missingOnGrid.length) {
  problems.push(`required names not on checkbox grid: ${missingOnGrid.join(", ")}`);
}
if (!tomatoOk) {
  problems.push(
    `egg+tomato+onion+garlic top is ${top ? `${top.name} ${top.matchPercent}%` : "empty"}`
  );
}
if (!recipes.length) problems.push("no recipes");

if (problems.length) {
  console.error("RED\n" + problems.join("\n"));
  process.exit(1);
}

console.log(
  `GREEN recipes=${recipes.length} ingredients=${checkboxValues.size} tomatoEggs=100%`
);