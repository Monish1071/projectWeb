CREATE DATABASE vit_maintenance;

USE vit_maintenance;

CREATE TABLE students (
    reg_no VARCHAR(20) PRIMARY KEY,
    password VARCHAR(255) NOT NULL
);

INSERT INTO students (reg_no, password) VALUES
('23BCE0705', 'p123'),
('23BCE0806', 'p456'),
('23BCE0907', 'p789');
