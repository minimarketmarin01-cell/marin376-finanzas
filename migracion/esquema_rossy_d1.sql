CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE salary_tramos (id INTEGER PRIMARY KEY, label TEXT NOT NULL, from_date TEXT NOT NULL, to_date TEXT NOT NULL, monto INTEGER NOT NULL, fuente TEXT NOT NULL, sort_order INTEGER NOT NULL);
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, checked INTEGER NOT NULL, description TEXT NOT NULL, sort_order INTEGER NOT NULL);
CREATE TABLE payments (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id TEXT NOT NULL REFERENCES categories(id), fecha TEXT NOT NULL, monto INTEGER NOT NULL, nota TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_payments_category ON payments(category_id);
