const express = require("express");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const users = require("../services/userStore");

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const cookieName = "fridgechef_session";
const sessionDuration = 12 * 60 * 60 * 1000;
const scryptOptions = { N: 1 << 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const sessions = new Map();
const attempts = new Map();

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64, scryptOptions);
  return { salt: salt.toString("hex"), passwordHash: hash.toString("hex") };
}

async function verifyPassword(password, user) {
  const salt = user ? Buffer.from(user.salt, "hex") : Buffer.alloc(16);
  const expected = user ? Buffer.from(user.passwordHash, "hex") : Buffer.alloc(64);
  const actual = await scrypt(password, salt, 64, scryptOptions);
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected) && !!user;
}

function cookieOptions(req) {
  const forwardedHttps = req.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: req.secure || forwardedHttps || process.env.NODE_ENV === "production",
    path: "/",
  };
}

function sessionToken(req) {
  const cookie = (req.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token || "") ? token : null;
}

function currentSession(req) {
  const token = sessionToken(req);
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

async function requirePageAuth(req, res, next) {
  res.set("Cache-Control", "no-store");
  const session = currentSession(req);
  if (!session) return res.redirect(303, "/login.html");
  try {
    if (!users.getById(session.userId)) {
      return res.redirect(303, "/login.html");
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function issueSession(req, res, user) {
  const oldToken = sessionToken(req);
  if (oldToken) sessions.delete(oldToken);
  for (const [token, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(token);
  }
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionDuration });
  res.cookie(cookieName, token, cookieOptions(req));
}

function sameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host")) {
        return res.status(403).json({ error: "Cross-origin authentication is not allowed." });
      }
    } catch {
      return res.status(403).json({ error: "Invalid origin." });
    }
  }
  next();
}

function rateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt || attempt.expiresAt <= now) {
    attempts.set(key, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return next();
  }
  if (attempt.count >= 20) {
    res.set("Retry-After", String(Math.ceil((attempt.expiresAt - now) / 1000)));
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }
  attempt.count += 1;
  next();
}

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/signup", sameOrigin, rateLimit, async (req, res, next) => {
  const { username, email, password, repeatPassword } = req.body || {};
  const name = typeof username === "string" ? username.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!name || name.length > 50) {
    return res.status(400).json({ error: "Username must be 1 to 50 characters.", field: "username" });
  }
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Enter a valid email address.", field: "email" });
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 1024) {
    return res.status(400).json({ error: "Password must be at least 8 characters.", field: "password" });
  }
  if (password !== repeatPassword) {
    return res.status(400).json({ error: "Passwords must match.", field: "repeatPassword" });
  }

  try {
    const credentials = await hashPassword(password);
    const result = users.createUser(name, normalizedEmail, credentials);
    if (!result) return res.status(409).json({ error: "Email is already registered.", field: "email" });
    issueSession(req, res, result);
    return res.status(201).json({ user: publicUser(result) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", sameOrigin, rateLimit, async (req, res, next) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || typeof password !== "string" || Buffer.byteLength(password) > 1024) {
    return res.status(400).json({ error: "Enter your email and password." });
  }

  try {
    const user = users.getByEmail(normalizedEmail);
    if (!(await verifyPassword(password, user))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    issueSession(req, res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", async (req, res, next) => {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: "Not signed in." });
  try {
    const user = users.getById(session.userId);
    if (!user) return res.status(401).json({ error: "Not signed in." });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", sameOrigin, (req, res) => {
  const token = sessionToken(req);
  if (token) sessions.delete(token);
  res.clearCookie(cookieName, cookieOptions(req));
  res.status(204).end();
});

module.exports = router;
module.exports.requirePageAuth = requirePageAuth;
