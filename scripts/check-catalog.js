const recipes = require("../server/data/recipes.json");

const problems = [];
if (!recipes.length) problems.push("no recipes");

if (problems.length) {
  console.error("RED\n" + problems.join("\n"));
  process.exit(1);
}

console.log(`GREEN recipes=${recipes.length}`);