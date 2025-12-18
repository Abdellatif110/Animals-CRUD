-- Create 'cats' table
CREATE TABLE IF NOT EXISTS cats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);

-- Create 'dogs' table
CREATE TABLE IF NOT EXISTS dogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);

-- Create 'mouses' table
CREATE TABLE IF NOT EXISTS mouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);
