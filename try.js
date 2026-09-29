const m = require("./server/services/matchService");
const recipes = require("./server/data/recipes.json");
const r001 = recipes.find((r) => r.id === "r001");

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? "OK  " : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(actual)}`);
}

const one = m.matchRecipe(r001, ["egg", "tomato"]);
check("r001 matchPercent", one.matchPercent, 50);
check("r001 score", one.score, 40);
check("r001 missing", one.missing.map((i) => i.name), ["onion", "garlic"]);
check("du 4 nguyen lieu = 100%", m.matchRecipe(r001, ["egg", "tomato", "onion", "garlic"]).matchPercent, 100);

console.log(r001.ingredients);