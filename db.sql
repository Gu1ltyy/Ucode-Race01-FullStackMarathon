USE ucode_web;

CREATE TABLE IF NOT EXISTS race01_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0
);