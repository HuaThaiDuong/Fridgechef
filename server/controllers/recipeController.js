const matchService = require("../services/matchService");
const recipes = require("../data/recipes.json");
const ingredients = require("../data/ingredients.json");

function getIngredients(req, res) {
  res.json(ingredients);
}

function matchRecipes(req, res) {
  const list = req.body && req.body.ingredients;

  if (!Array.isArray(list) || list.some((item) => typeof item !== "string")) {
    return res.status(400).json({
      error: "Body must be { ingredients: string[] }.",
    });
  }

  res.json(matchService.matchRecipes(recipes, list));
}

function getRecipeById(req, res) {
  const recipe = recipes.find((item) => item.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found." });
  }
  res.json(recipe);
}

function listRecipes(req, res) {
  const { cuisine, maxTime, difficulty } = req.query;

  if (maxTime !== undefined && maxTime !== "" && Number.isNaN(Number(maxTime))) {
    return res.status(400).json({ error: "maxTime must be a number." });
  }

  if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({
      error: "difficulty must be easy, medium, or hard.",
    });
  }

  res.json(
    matchService.filterRecipes(recipes, {
      cuisine,
      maxTime: maxTime === undefined || maxTime === "" ? undefined : Number(maxTime),
      difficulty,
    })
  );
}

module.exports = {
  getIngredients,
  matchRecipes,
  getRecipeById,
  listRecipes,
};