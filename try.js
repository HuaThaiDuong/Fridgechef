const m = require("./server/services/matchService");
const recipes = require("./server/data/recipes.json");
 
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? "OK  " : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(actual)}`);
}

check("normalize", m.normalize("  Cà   Chua! "), "ca chua");
check("normalize chu đ", m.normalize("Đậu phụ"), "dau phu");
check("normalize null", m.normalize(null), "");
 
check("canonical tieng Viet", m.canonical("Hành Lá"), "green onion");
check("canonical viet hoa", m.canonical("SCALLION"), "green onion");
check("canonical khong co trong bang", m.canonical("Egg"), "egg");
 
const vi = m.matchRecipes(recipes, ["Cà Chua", "Trứng"]);
check("tieng Viet co dau van khop", vi.length, 16);
check("giong het ket qua tieng Anh", vi.map((r) => r.id), m.matchRecipes(recipes, ["egg", "tomato"]).map((r) => r.id));