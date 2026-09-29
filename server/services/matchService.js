function matchRecipe(recipe, userIngredients) {
  const haveSet = new Set(userIngredients || []);
  const required = recipe.ingredients.filter((item) => !item.optional);
  const have = required.filter((item) => haveSet.has(item.name));
  const missing = required.filter((item) => !haveSet.has(item.name));
  const coverage = required.length === 0 ? 1 : have.length / required.length;
  const score = coverage * 100 - missing.length * 5;
 
  return {
    ...recipe,
    matchPercent: Math.round(coverage * 100),
    missing,
    score,
  };
}

function matchRecipes(recipes, userIngredients) {
  return recipes
    .map((recipe) => matchRecipe(recipe, userIngredients))
    .filter((recipe) => recipe.matchPercent > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
      return a.name.localeCompare(b.name);
    });
}






module.exports = {
  matchRecipe,
  matchRecipes,
};