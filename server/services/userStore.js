const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const databaseFile = process.env.AUTH_DB_FILE || path.join(__dirname, "../data/users.sqlite");

if (databaseFile !== ":memory:") {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
}

const isNewDatabase = databaseFile !== ":memory:" && !fs.existsSync(databaseFile);
const db = new DatabaseSync(databaseFile);
if (isNewDatabase) fs.chmodSync(databaseFile, 0o600);
db.exec("PRAGMA busy_timeout = 5000");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

const getByEmail = db.prepare(`
  SELECT id, username, email, salt, password_hash AS passwordHash
  FROM users WHERE email = ?
`);
const getById = db.prepare(`
  SELECT id, username, email, salt, password_hash AS passwordHash
  FROM users WHERE id = ?
`);
const insertUser = db.prepare(`
  INSERT INTO users (id, username, email, salt, password_hash)
  VALUES (?, ?, ?, ?, ?)
`);

function createUser(username, email, credentials) {
  const user = { id: crypto.randomUUID(), username, email, ...credentials };
  try {
    insertUser.run(user.id, user.username, user.email, user.salt, user.passwordHash);
    return user;
  } catch (error) {
    if (error.code === "ERR_SQLITE_ERROR" && /UNIQUE constraint failed: users\.email/.test(error.message)) {
      return null;
    }
    throw error;
  }
}

module.exports = {
  getByEmail: (email) => getByEmail.get(email),
  getById: (id) => getById.get(id),
  createUser,
  close: () => db.close(),
};
