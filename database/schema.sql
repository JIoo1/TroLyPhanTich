CREATE DATABASE IF NOT EXISTS ba_chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ba_chatbot;

CREATE TABLE IF NOT EXISTS ba_session (
  session_id VARCHAR(50) PRIMARY KEY,
  customer_id INT NULL,
  project_id VARCHAR(100) NOT NULL DEFAULT 'default',
  requirements_state LONGTEXT NULL,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'BUSINESS_GOAL',
  completion INT NOT NULL DEFAULT 0,
  ready_for_report TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  version INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ba_message (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(50) NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  suggestions LONGTEXT NULL,
  meta LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message_session (session_id, id),
  CONSTRAINT fk_message_session FOREIGN KEY (session_id) REFERENCES ba_session(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ba_requirement (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(50) NOT NULL,
  requirement_code VARCHAR(30) NOT NULL,
  category VARCHAR(50) NULL,
  content TEXT NOT NULL,
  source VARCHAR(50) NULL,
  status VARCHAR(50) NULL,
  confidence DECIMAL(4,3) NULL,
  actor VARCHAR(100) NULL,
  evidence TEXT NULL,
  message_id BIGINT NULL,
  UNIQUE KEY uq_requirement (session_id, requirement_code),
  CONSTRAINT fk_requirement_session FOREIGN KEY (session_id) REFERENCES ba_session(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_requirement_message FOREIGN KEY (message_id) REFERENCES ba_message(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ba_report (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(50) NOT NULL,
  format VARCHAR(10) NOT NULL,
  file_path VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_session (session_id),
  CONSTRAINT fk_report_session FOREIGN KEY (session_id) REFERENCES ba_session(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
