function stripDiacritics(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalize(value) {
  return stripDiacritics(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SYNONYMS = {
  "scallion": "green onion",
  "spring onion": "green onion",
  "hanh la": "green onion",
  "hanh hoa": "green onion",
  "ca chua": "tomato",
  "trung": "egg",
  "trung ga": "egg",
  "coriander": "cilantro",
  "capsicum": "bell pepper",
  "aubergine": "eggplant",
  "courgette": "zucchini",
  "prawn": "shrimp",
  "minced beef": "ground beef",
  "mozzarella cheese": "mozzarella",
  "chicken breast": "chicken",
  "chicken thigh": "chicken",
  "green onion": "green onion",
  "garbanzo": "chickpea",
  "garbanzo bean": "chickpea",
  "chickpeas": "chickpea",
  "lentils": "lentil",
  "split pea": "peas",
  "green beans": "green bean",
  "lamb chop": "lamb",
  "turkey breast": "turkey",
  "mayo": "mayonnaise",
  "parmigiano": "parmesan",
  "parm": "parmesan",
  "calamari": "squid",
};

function canonical(name) {
  const key = normalize(name);
  return SYNONYMS[key] || key;
}

function matchRecipe(recipe, haveSet) {
  const required = recipe.ingredients.filter((item) => !item.optional);
  const missing = required.filter((item) => !haveSet.has(canonical(item.name)));
  const haveCount = required.length - missing.length;
  const coverage = required.length === 0 ? 1 : haveCount / required.length;
  const score = coverage * 100 - missing.length * 5;

  return {
    ...recipe,
    matchPercent: Math.round(coverage * 100),
    missing,
    score,
  };
}

function matchRecipes(recipes, userIngredients) {
  const haveSet = new Set((userIngredients || []).map(canonical).filter(Boolean));
  return recipes
    .map((recipe) => matchRecipe(recipe, haveSet))
    .filter((recipe) => recipe.matchPercent > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
      return a.name.localeCompare(b.name);
    });
}

function filterRecipes(recipes, { cuisine, maxTime, difficulty } = {}) {
  return recipes.filter((recipe) => {
    if (cuisine && recipe.cuisine !== cuisine) return false;
    if (difficulty && recipe.difficulty !== difficulty) return false;
    if (maxTime !== undefined && maxTime !== null && maxTime !== "") {
      if (recipe.cookTime > Number(maxTime)) return false;
    }
    return true;
  });
}





module.exports = {
  normalize,
  canonical,
  matchRecipe,
  matchRecipes,
  filterRecipes,
};