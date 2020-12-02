/*
Author:Melendrez, Jacob
Date: Nov 26 2020.
*/
import express from 'express';
import exphbs from "express-handlebars";
import bcrypt, { compare } from 'bcrypt';
import sqlite3 from 'sqlite3';
import { open } from "sqlite";
import cookieParser from 'cookie-parser';
import { grantAccess, findUser } from './auth';

//creates the database with the tables
export const dbPromise = open({
    filename: "data.db",
    driver: sqlite3.Database,
})

const app = express();
var searchMovie;
var movieID;

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

//uses cookies to check if the user is logged in
app.use(async (req, res, next) =>{
    const { userToken } = req.cookies;
    if(!userToken) {return next();}
    try{
        const user = await findUser(userToken);
        req.user = user;
    } catch (e) { return next(e); }
    next()
})

//if the user is logged in, then user can't access the registeration form.
app.get('/register', (req, res) =>{
    if(req.user){ return res.redirect('/'); }
    res.render('register');
})

//if the user is logged in, then user can't access the log in form.
app.get('/login', (req, res) =>{
    if(req.user){ return res.redirect('/'); }
    res.render('login');
})

//logs out the user when they are logged in
app.get('/logout', (req, res) =>{
    res.clearCookie('userToken');
    res.redirect('/');
})

app.get('/listMovies', async (req, res) =>{
    const db = await dbPromise;
    const movies = await db.all('SELECT movieTitle, movieLength, movieRating, movieYear FROM Movies');
    res.render("listMovies", {movies, user: req.user});
})

app.get('/search', async (req, res) =>{
    searchMovie=req.query.movieTitle
    console.log('search', searchMovie);
    const db = await dbPromise;
    movieID = await db.get('SELECT id FROM Movies where movieTitle=?', searchMovie);
    console.log("movie ID", movieID)
    const movies = await db.get('SELECT movieTitle, movieLength, movieRating, movieYear FROM Movies WHERE movieTitle=?',searchMovie);
    if (movieID)
    {
        const category = await db.all(
            `SELECT
                addCategory,
                movieId
            FROM Category WHERE movieId=?`, movieID.id
        );
        res.render("search", {movies, category, user: req.user});
    }
    else{
    res.render("search", {movies, user: req.user});}
})

//retrieves movies from the database.
app.get("/", async (req, res) =>{
    console.log("somthing");
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

app.get('/addCategory', async (req, res) =>{
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
    res.render("addCategory", {category, movies});
})

//allows the user to insert there info, hash their password and allows them to login
app.post('/register', async (req, res) =>{
    const db = await dbPromise;
    const {
        username,
        email,
        password,
        password2
    } = req.body;
    if(password===password2)
    {
        // takes the password and hash it.
        const passwordHash = await bcrypt.hash(password, 10);

        try{
            //insert users info into database
            await db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?);',
                username,
                email,
                passwordHash
            );
            //keeps track of what user is registered in using cookies. also grants access to new user.
            const user = await db.get('SELECT id FROM Users WHERE email=?', email);
            const token = await grantAccess(user.id);
            res.cookie('userToken', token);
            res.redirect('/');
        }
        catch (e) { return res.render('register', {error: e}); }//if something goes wrong during registration, error is passed.
    }
    else {res.render('register', {error: 'password do not match'})}
})

//logs in user using email and password.
app.post('/login', async (req, res) =>{
    const db = await dbPromise;
    const {
        email,
        password
    } = req.body;

    try{
        //checks users email if in the database
        const existingUser = await db.get('SELECT * FROM Users WHERE email=?', email);
        if(!existingUser) { throw 'incorrect login'; }

        //checks users password by decrpting hash from database
        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        if(!passwordMatch) { throw 'incorrect login'; }

        //if user has correct email and password it is grant access through grantAccess function in auth.js
        const token = await grantAccess(existingUser.id);
        res.cookie('userToken', token);
        res.redirect('/');
    } catch (e) { return res.render('login', { error: e }); }
})

//allows user to post movies if they are logged in.
app.post('/movies', async (req, res) =>{
    const db = await dbPromise;
    try{
        //insert movies into the movies table in database.
        await db.run('INSERT INTO Movies (movieTitle, movieLength, movieYear, movieRating) VALUES (?, ?, ?, ?);', req.body.movieTitle, req.body.movieLength, req.body.movieYear, req.body.movieRating);
        res.redirect('/');
    }
    catch (e) {return res.render('home', {error: e, user: req.user}); }
})

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

//reads databases and set the url to localhost:8080
const setup = async () => {
    const db = await dbPromise;
    await db.migrate();

    app.listen(8080, () =>{
        console.log("listening on http://localhost:8080");
    });
}

setup();//calls setup function