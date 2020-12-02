--Up
CREATE TABLE Movies (
    id INTEGER PRIMARY KEY,
    movieTitle STRING UNIQUE,
    movieLength INTEGER,
    movieYear INTEGER,
    movieRating STRING
);

CREATE TABLE Users (
    id INTEGER PRIMARY KEY,
    email STRING UNIQUE,
    movieTitle STRING,
    username STRING,
    password STRING
);

CREATE TABLE Category (
    id INTEGER PRIMARY KEY,
    addCategory STRING,
    movieId INTEGER,
    FOREIGN KEY (movieId) REFERENCES Movies (id)
);

CREATE TABLE AuthTokens (
    id INTEGER PRIMARY KEY,
    token STRING,
    userId INTEGER,
    FOREIGN KEY (userId) REFERENCES Users (id)
);

-- Down
DROP TABLE Messages;
DROP TABLE Users;
DROP TABLE AuthTokens;
DROP TABLE Category;