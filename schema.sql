-- Create 'cats' table
CREATE TABLE IF NOT EXISTS cats (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);

-- Create 'dogs' table
CREATE TABLE IF NOT EXISTS dogs (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);

-- Create 'mouses' table
CREATE TABLE IF NOT EXISTS mouses (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  img TEXT
);

-- Create 'users' table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
