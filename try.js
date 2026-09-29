const m = require("./server/services/matchService");
const recipes = require("./server/data/recipes.json");
 
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? "OK  " : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(actual)}`);
}
 
const names = (list) => list.map((r) => r.name);
 
check("khong loc = du 36 mon", m.filterRecipes(recipes).length, 36);
check("maxTime rong = khong loc", m.filterRecipes(recipes, { maxTime: "" }).length, 36);
check("cuisine vietnamese", names(m.filterRecipes(recipes, { cuisine: "vietnamese" })),
  ["Tomato Fried Eggs", "Chicken Pho", "Garlic Noodles"]);
check("vietnamese + easy", names(m.filterRecipes(recipes, { cuisine: "vietnamese", difficulty: "easy" })),
  ["Tomato Fried Eggs", "Garlic Noodles"]);
check("easy + toi da 15 phut", m.filterRecipes(recipes, { difficulty: "easy", maxTime: 15 }).length, 7);
check("maxTime dang chuoi '15'", m.filterRecipes(recipes, { difficulty: "easy", maxTime: "15" }).length, 7);
 