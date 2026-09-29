'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const root = path.resolve(__dirname, '..');
const imageDirectory = path.join(root, 'public', 'img');
const groups = { Proteins: 14, Vegetables: 26, Herbs: 10, Dairy: 8, Grains: 10, Sauces: 14, Pantry: 13, Fruit: 10 };
const cuisines = { American: 6, Italian: 4, Chinese: 4, Mediterranean: 4, Vietnamese: 3, Mexican: 3, Indian: 3, Japanese: 3, Korean: 2, Thai: 2, French: 2 };
const difficulties = { easy: 25, medium: 10, hard: 1 };
const expectedIds = new Set(Array.from({ length: 36 }, (_, i) => `r${String(i + 1).padStart(3, '0')}`));
const idPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const errors = [];
const fail = (location, message) => errors.push(`${location}: ${message}`);
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('vi').trim().replace(/\s+/gu, ' ');
const text = value => typeof value === 'string' && normalize(value).length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function readJson(relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  } catch (error) {
    fail(relative, `could not read JSON (${error.message})`);
    return null;
  }
}

function catalog(value, location, count) {
  if (!Array.isArray(value)) {
    fail(location, 'must be a JSON array');
    return [];
  }
  if (value.length !== count) fail(location, `expected ${count} entries, found ${value.length}`);
  return value;
}

function countGroups(items, field, expected, location) {
  for (const [name, count] of Object.entries(expected)) {
    const actual = items.filter(item => record(item) && item[field] === name).length;
    if (actual !== count) fail(location, `${field} ${name}: expected ${count}, found ${actual}`);
  }
}

function unique(map, key, location) {
  if (map.has(key)) fail(location, `duplicate value ${JSON.stringify(key)} (also at ${map.get(key)})`);
  else map.set(key, location);
}

// Inspect JPEG markers and dimensions; this does not decompress every image pixel.
function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) {
    throw new Error('must be a JPEG with SOI/EOI markers, not a renamed PNG');
  }
  const frames = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  let dimensions;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error('invalid JPEG marker');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0 || marker === 0xd8 || marker === 0xd9 || offset + 2 > bytes.length) {
      throw new Error('unexpected or truncated JPEG marker');
    }
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('truncated JPEG segment');
    if (frames.has(marker)) {
      if (length < 8) throw new Error('truncated JPEG frame');
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      const components = bytes[offset + 7];
      if (!width || !height || !components || length !== 8 + 3 * components || !bytes[offset + 2] || bytes[offset + 2] > 16) {
        throw new Error('invalid JPEG dimensions or frame settings');
      }
      dimensions = { width, height, components };
    }
    if (marker === 0xda) {
      const components = bytes[offset + 2];
      if (!dimensions || length < 6 || !components || components > dimensions.components || length !== 6 + 2 * components || offset + length >= bytes.length - 2) {
        throw new Error('missing or invalid JPEG scan');
      }
      return dimensions;
    }
    offset += length;
  }
  throw new Error('JPEG frame or scan not found');
}

function checkImage(recipe, location) {
  if (!expectedIds.has(recipe.id) || recipe.image !== `/img/${recipe.id}.jpg`) {
    fail(location, 'must be /img/<recipe-id>.jpg with the same r001–r036 ID');
    return;
  }
  const filename = path.join(imageDirectory, `${recipe.id}.jpg`);
  try {
    if (!fs.statSync(filename).isFile()) throw new Error('must be a regular file');
    const relative = path.relative(fs.realpathSync(imageDirectory), fs.realpathSync(filename));
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('image escapes public/img through a symbolic link');
    }
    jpegDimensions(fs.readFileSync(filename));
  } catch (error) {
    fail(location, `could not validate image (${error.message})`);
  }
}

const sourceIngredients = readJson('server/data/ingredients.json');
const sourceRecipes = readJson('server/data/recipes.json');
const ingredients = catalog(sourceIngredients, 'server/data/ingredients.json', Object.values(groups).reduce((a, b) => a + b, 0));
const recipes = catalog(sourceRecipes, 'server/data/recipes.json', 36);
const ingredientIds = new Map();
const ingredientNames = new Map();
const tokens = new Map();

ingredients.forEach((ingredient, index) => {
  const location = `server/data/ingredients.json[${index}]`;
  if (!record(ingredient)) return fail(location, 'must be an object');
  if (typeof ingredient.id !== 'string' || !idPattern.test(ingredient.id)) fail(`${location}.id`, 'must be a lowercase snake_case ID');
  else unique(ingredientIds, ingredient.id, `${location}.id`);
  if (!text(ingredient.name)) fail(`${location}.name`, 'must be a nonempty string');
  else unique(ingredientNames, normalize(ingredient.name), `${location}.name`);
  if (typeof ingredient.category !== 'string' || !Object.hasOwn(groups, ingredient.category)) fail(`${location}.category`, `must be one of ${Object.keys(groups).join(', ')}`);
  if (!Array.isArray(ingredient.aliases)) fail(`${location}.aliases`, 'must be an array of nonempty strings');
  const fields = [['id', ingredient.id], ['name', ingredient.name]];
  if (Array.isArray(ingredient.aliases)) ingredient.aliases.forEach((alias, i) => {
    if (!text(alias)) fail(`${location}.aliases[${i}]`, 'must be a nonempty string');
    fields.push([`aliases[${i}]`, alias]);
  });
  for (const [field, value] of fields) {
    if (!text(value)) continue;
    const key = normalize(value);
    const previous = tokens.get(key);
    if (previous && previous.index !== index) fail(`${location}.${field}`, `ambiguous token ${JSON.stringify(value)} also belongs to ${previous.location}`);
    else if (!previous) tokens.set(key, { index, location: `${location}.${field}` });
  }
});

const recipeIds = new Map();
const recipeNames = new Map();
const usedIds = new Set();
recipes.forEach((recipe, index) => {
  const location = `server/data/recipes.json[${index}]`;
  if (!record(recipe)) return fail(location, 'must be an object');
  if (!expectedIds.has(recipe.id)) fail(`${location}.id`, 'must be one of r001–r036');
  else unique(recipeIds, recipe.id, `${location}.id`);
  if (!text(recipe.name)) fail(`${location}.name`, 'must be a nonempty string');
  else unique(recipeNames, normalize(recipe.name), `${location}.name`);
  if (!text(recipe.description)) fail(`${location}.description`, 'must be a nonempty string');
  if (typeof recipe.cuisine !== 'string' || !Object.hasOwn(cuisines, recipe.cuisine)) fail(`${location}.cuisine`, `must be one of ${Object.keys(cuisines).join(', ')}`);
  if (typeof recipe.difficulty !== 'string' || !Object.hasOwn(difficulties, recipe.difficulty)) fail(`${location}.difficulty`, 'must be easy, medium, or hard');
  for (const field of ['cookingTime', 'servings']) {
    if (!Number.isSafeInteger(recipe[field]) || recipe[field] <= 0) fail(`${location}.${field}`, 'must be a positive safe integer');
  }
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    fail(`${location}.ingredients`, 'must be a nonempty array of ingredient objects');
  } else {
    const seen = new Map();
    recipe.ingredients.forEach((item, i) => {
      const field = `${location}.ingredients[${i}]`;
      if (!record(item)) return fail(field, 'must be an object');
      if (typeof item.id !== 'string' || !idPattern.test(item.id)) fail(`${field}.id`, 'must be a canonical snake_case ingredient ID');
      else {
        unique(seen, item.id, `${field}.id`);
        if (!ingredientIds.has(item.id)) fail(`${field}.id`, `unknown ingredient ${JSON.stringify(item.id)}`);
        usedIds.add(item.id);
      }
      if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) fail(`${field}.quantity`, 'must be a positive finite number');
      if (!text(item.unit)) fail(`${field}.unit`, 'must be a nonempty string');
      if (typeof item.optional !== 'boolean') fail(`${field}.optional`, 'must be a boolean');
    });
    if (!recipe.ingredients.some(item => record(item) && item.optional === false)) fail(`${location}.ingredients`, 'must contain at least one required ingredient (optional: false)');
  }
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    fail(`${location}.instructions`, 'must be a nonempty array of steps');
  } else recipe.instructions.forEach((step, i) => {
    if (!text(step)) fail(`${location}.instructions[${i}]`, 'must be a nonempty string');
  });
  checkImage(recipe, `${location}.image`);
});

for (const id of expectedIds) if (!recipeIds.has(id)) fail('server/data/recipes.json', `missing recipe ${id}`);
countGroups(ingredients, 'category', groups, 'server/data/ingredients.json');
countGroups(recipes, 'cuisine', cuisines, 'server/data/recipes.json');
countGroups(recipes, 'difficulty', difficulties, 'server/data/recipes.json');
const mock = readJson('mock-data.json');
if (!record(mock) || !isDeepStrictEqual(Object.keys(mock).sort(), ['ingredients', 'recipes'])) {
  fail('mock-data.json', 'must be an object containing only recipes and ingredients');
} else if (!isDeepStrictEqual(mock.recipes, sourceRecipes) || !isDeepStrictEqual(mock.ingredients, sourceIngredients)) {
  fail('mock-data.json', 'does not match server/data catalogs; run node scripts/build-mock-data.js');
}

if (errors.length) {
  console.error(`Catalog check failed with ${errors.length} error(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Catalog OK: ${recipes.length} recipes, ${ingredients.length} ingredients, ${tokens.size} normalized lookup tokens.`);
  console.log('Cuisine, difficulty and category counts, JPEG headers/dimensions, and mock-data.json verified.');
  console.log(`${ingredients.length - usedIds.size} ingredient(s) are available in the picker without a recipe yet.`);
}
