const express = require("express");
const controller = require("../controllers/recipeController");

const router = express.Router();

router.get("/ingredients", controller.getIngredients);
router.post("/recipes/match", controller.matchRecipes);
router.get("/recipes", controller.listRecipes);
router.get("/recipes/:id", controller.getRecipeById);

module.exports = router;