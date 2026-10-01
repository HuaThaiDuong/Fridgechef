const API_URL = "http://localhost:3000/api/recipes/match";
const BODY = JSON.stringify({ ingredients: ["egg", "tomato", "onion", "garlic"] });
const USERS = 50;       
const DURATION = 10000; 

async function user(latencies, stopAt) {
  let errors = 0;
  while (Date.now() < stopAt) {
    const start = performance.now();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: BODY,
      });
      await res.text();
      if (res.ok) latencies.push(performance.now() - start);
      else errors += 1;
    } catch {
      errors += 1;
    }
  }
  return errors;
}

async function run() {
  const latencies = [];
  const stopAt = Date.now() + DURATION;
  const errors = await Promise.all(Array.from({ length: USERS }, () => user(latencies, stopAt)));

  if (!latencies.length) {
    console.log("Is the server running? U have to npm start");
    return;
  }

  latencies.sort((a, b) => a - b);
  const pick = (p) => latencies[Math.floor((latencies.length - 1) * p)].toFixed(1);
  const avg = latencies.reduce((sum, x) => sum + x, 0) / latencies.length;

  console.log(`Users: ${USERS}, duration: ${DURATION / 1000}s`);
  console.log(`Requests: ${latencies.length} (${(latencies.length / (DURATION / 1000)).toFixed(0)} req/s)`);
  console.log(`Latency avg: ${avg.toFixed(1)} ms, p50: ${pick(0.5)} ms, p99: ${pick(0.99)} ms`);
  console.log(`Errors: ${errors.reduce((a, b) => a + b, 0)}`);
}

run();
