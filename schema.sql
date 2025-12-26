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

-- Create 'sessions' table for express-mysql-session
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT(11) UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
);

-- Create 'adoption_requests' table
CREATE TABLE IF NOT EXISTS adoption_requests (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  animal_id INTEGER NOT NULL,
  animal_type TEXT NOT NULL,
  user_email TEXT NOT NULL,
  adopter_name TEXT NOT NULL,
  adopter_phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
