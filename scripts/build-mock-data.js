'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

try {
  const read = filename => JSON.parse(fs.readFileSync(path.join(root, 'server', 'data', filename), 'utf8'));
  const recipes = read('recipes.json');
  const ingredients = read('ingredients.json');
  if (!Array.isArray(recipes) || !recipes.length || !Array.isArray(ingredients) || !ingredients.length) {
    throw new Error('Both server/data catalogs must be nonempty JSON arrays');
  }
  const output = JSON.stringify({ recipes, ingredients }, null, 2) + '\n';
  fs.writeFileSync(path.join(root, 'mock-data.json'), output, 'utf8');
  console.log(`Built mock-data.json from ${recipes.length} recipes and ${ingredients.length} ingredients.`);
} catch (error) {
  console.error(`Could not build mock-data.json: ${error.message}`);
  process.exitCode = 1;
}
