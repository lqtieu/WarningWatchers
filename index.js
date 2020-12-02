/* 
Author: Unique Ratliff
Date: 11/26/2020
Description: An interactive message board that allows for user
    account functionality
 */

import express from 'express';
import exphbs from 'express-handlebars';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cookieParser from 'cookie-parser';
import { grantAuthToken, searchUserFromAuthToken } from './auth';

//Load database file upon first running the code
export const dbPromise = open({
    filename: "data.db",
    driver: sqlite3.Database,
});

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

//Middleware functions
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(__dirname + '/static'));
app.use('/img', express.static(__dirname + '/img'));

app.use(async (req, res, next) => {
    const { authToken } = req.cookies;
    if(!authToken) {
        //Need to make sure it returns out of it and call next so it moves on
        return next();
    }

    try {
    const user = await searchUserFromAuthToken(authToken);
    req.user = user;
    } 
    catch (e){
        next(e);
    }
    next();
});

// old .get("/") before jacob's file
/*(app.get("/", async (req, res) => {
    const db = await dbPromise;
    //Select every message and matches them to a user record
    //then selects from the combine record the id, content, and username from each record
    const messages = await db.all(`SELECT
        Messages.id,
        Messages.content,
        Users.username as authorName
    FROM Messages LEFT JOIN Users WHERE Messages.authorId = Users.id`);
    res.render("home", { messages: messages, user: req.user });
});*/

//Invoked everytime someone hits webpage
app.get("/", async (req, res) =>{
    res.render('home');
});

app.get("/about", (req, res) => {
    res.render('about');
});

app.get("/categories", (req, res) => {
    res.render('categories');
});

app.get("/team-bio", (req, res) => {
    res.render('team-bio');
});

app.get("/movies", (req, res) => {
    res.render('movies');
});

app.get("/account", (req, res) => {
    res.render('account');
});

//Read messages from database
app.get("/addmovie", async (req, res) => {
    console.log("Retrieved Movie");
    const db = await dbPromise;
    const movies = await db.all(
        `SELECT
        id,
        movieTitle,
        movieLength,
        movieYear,
        movieRating
        FROM Movies`
    );
    res.render("home", {movies, user: req.user});
});

app.get("/requests", async (req, res) => {
    //res.render('requests');
    const db = await dbPromise;
    const movies = await db.get('SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE movieTitle=?', searchMovie);
    console.log("movie1", movieID)
    const category = await db.all(
        `SELECT
            addCategory,
            movieId
        FROM Category WHERE movieId=?`, movieID.id
    );
    console.log('category', category);
    res.render("requests", {category, movies});
});

app.get("/register", (req, res) => {
    if(req.user) {
        return res.redirect('/');
    }
    res.render('register');
});

app.get("/login", (req, res) => {
    if(req.user) {
        return res.redirect('/');
    }
    res.render('login');
});

app.get("/logout", (req, res) => {
    if(req.user && req.cookies.authToken) {
        res.clearCookie('authToken');
        res.redirect('/');
    }
    else{
    res.redirect('/login');
    }
});

app.post("/register", async (req, res) => {
    const db = await dbPromise;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const passwordHash = await bcrypt.hash(password, 10);
    try{
        await db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?);',
        username,
        email,
        passwordHash
        )
        const user = await db.get('SELECT id FROM Users WHERE email=?', email);
        const token = await grantAuthToken(user.id);
        res.cookie('authToken', token);
        res.redirect('/');
    }
    catch (e) {
        return res.render('register', {error: e})
    }
});

app.post("/login", async (req, res) => {
    const db = await dbPromise;
    const email = req.body.email;
    const password = req.body.password;

    try{
       const existingUser = await db.get("SELECT * FROM Users WHERE email=?", email);
       if (!existingUser) {
           throw 'Incorrect login';
       }
       //compare passwords
       const passwordMatch = await bcrypt.compare(password, existingUser.password);
       if (!passwordMatch) {
           throw 'Incorrect login';
       }
       const token = await grantAuthToken(existingUser.id);
       res.cookie('authToken', token);
       res.redirect('/');
    }
    catch (e) {
        return res.render('login', {error: e})
    }
});

//Writes messages to database
/*app.post("/message", async (req, res) => {
    if (!req.user){
        res.status(401);
        return res.send('must be loggin in to post messages')
    }
    const db = await dbPromise;
    await db.run('INSERT INTO Messages (content, authorId) VALUES (?, ?);', 
    req.body.message, req.user.id);

    res.redirect('/');
}); */

app.post('/addCategory', async (req, res) =>{
    if (!req.user) {return res.redirect('/')}
    const db = await dbPromise;
    movieID = await db.get('SELECT id FROM Movies WHERE MovieTitle=?', searchMovie);
    console.log("movie ID", movieID)
    try{
        const test = await db.run('INSERT INTO Category (addCategory, movieId) VALUES (?, ?);', req.body.addCategory, movieID.id)
        console.log("test", movieID);
        console.log("test 2", test);
        res.redirect('/addCategory');
    } catch (e) {return res.render('addCategory', {error: e, user: req.user}); }
})

//Gets access to database and runs migration
const setup = async () => {
    const db = await dbPromise;
    await db.migrate();
    
    app.listen(8000, () => {
        console.log("Listening on port 8080 @ http://localhost:8000");
    });
};

setup();