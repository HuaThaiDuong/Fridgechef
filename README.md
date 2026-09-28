# FridgeChef

<img src="public/favicon.svg" alt="FridgeChef logo" width="48" height="48">

Tick the ingredients you already have. FridgeChef ranks recipes by how well they match, lists what you're missing, and walks you through each dish step by step.

API details are in [`API.md`](API.md). A function-to-file map is in [`NOTES.md`](NOTES.md).

---

## Part 1 — Project Overview & Setup

### What the app does

You open your fridge, check off whatever is inside, and FridgeChef tells you what you can cook. Each recipe gets a match score based on how many of its required ingredients you have. A 100 % card means you're ready to go; anything lower shows exactly which items you still need.

We picked Node.js and Express because the course covers them, the runtime handles JSON natively, and two npm packages (`express`, `cors`) are enough to serve both the API and the static pages. No build step, no transpiler — you run `npm start` and the thing works.

### Files in this part

| # | File | Role |
|---|------|------|
| 1 | `package.json` | Project name, three scripts (`start`, `dev`, `test`), two runtime dependencies (`express`, `cors`), one dev dependency (`nodemon`). Requires Node ≥ 18. |
| 2 | `package-lock.json` | Locks every dependency version so `npm install` produces the same `node_modules/` on any machine. |
| 3 | `.gitignore` | Keeps `node_modules/`, `.env`, log files, and editor folders out of the repo. |

### Why Node.js and Express

The project runs for four weeks. Node reads and returns JSON without any conversion layer, and Express adds routing with almost no configuration. That keeps the backend small enough to explain in a presentation without skipping parts. Adding a database or a framework like React would have cost time we didn't have and wouldn't change how the matching algorithm works.

### Running the project

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
|---------|--------------|
| `npm start` | Runs Express on port 3000 |
| `npm run dev` | Same, but nodemon restarts the server when you edit files in `server/` |
| `npm test` | Runs `scripts/check-catalog.js` — checks ingredient coverage, synonym parity, and a smoke test |

### Requirements

- Node.js 18 or newer
- A browser

There is no database. Recipes and ingredients live in JSON files that the server reads on startup.
