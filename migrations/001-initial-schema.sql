--Author: Unique Ratliff
--Date: 11/26/2020
--Description: An interactive message board that allows for user
--    account functionality

-- Up
-- Run migration by creating table
CREATE TABLE Messages (
    id INTEGER PRIMARY KEY,
    authorId INTEGER,
    content STRING,
    FOREIGN KEY (authorId) REFERENCES Users (id)
);

CREATE TABLE Users (
    id INTEGER PRIMARY KEY,
    email STRING UNIQUE,
    username STRING,
    password STRING
);

CREATE TABLE AuthTokens (
    id INTEGER PRIMARY KEY,
    token STRING,
    userId INTEGER,
    FOREIGN KEY (userId) REFERENCES Users (id)
);


-- Down
--Undo migration by deleting table
DROP TABLE Messages;
DROP TABLE Users;
DROP TABLE AuthTokens;