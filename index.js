/* 
Author: Unique Ratliff
Date: 11/26/2020
Description: An interactive message board that allows for user
    account functionality
 */

import express from 'express';
import exphbs from 'express-handlebars';
import bcrypt, { compare } from 'bcrypt';
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
var searchMovie;
var movieID;


app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

//Middleware functions
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(__dirname + '/static'));
app.use('/img', express.static(__dirname + '/img'));

app.use(async (req, res, next) =>{
    const { userToken } = req.cookies;
    if(!userToken) {return next();}
    try{
        const user = await searchUserFromAuthToken(userToken);
        req.user = user;
    } catch (e) { return next(e); }
    next()
})

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
    res.render('home',  { user: req.user });
});

app.get("/about", (req, res) => {
    res.render('about');
});

app.get("/categories", (req, res) => {
    res.render('categories');
});

//Not Finished /addCategory
/*app.get('/addCategory', async (req, res) =>{
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
})
*/

app.get("/team-bio", (req, res) => {
    res.render('team-bio');
});

/*app.get("/movies", (req, res) => {
    res.render('movies');
});*/

app.get("/account", (req, res) => {
    res.render('account');
});

//Read messages from database
app.get("/addmovie", async (req, res) => {
    console.log("something")
    // const db = await dbPromise;
    // const movies = await db.all(
    //     `SELECT
    //     id,
    //     movieTitle,
    //     movieLength,
    //     movieYear,
    //     movieRating
    //     FROM Movies`
    // );
    res.render("addmovie", {user: req.user});
});

app.get("/movieAdded", async (req, res) =>{
    const db = await dbPromise;
    if(searchMovie.id){
        const movies = await db.get('SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE id=?', searchMovie.id);
        console.log("moive id added", movies);
        res.render("movieAdded", {movies});
    }
    else {
        res.render("movieAdded");
    }
})

app.get("/addCate", async (req, res) => {
    res.render("addCate", {user: req.user});
    // //res.render('addCate');
    // const db = await dbPromise;
    // const movies = await db.get('SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE movieTitle=?', searchMovie);
    // console.log("movie1", movieID)
    // const category = await db.all(
    //     `SELECT
    //         addCategory,
    //         movieId
    //     FROM Category WHERE movieId=?`
    // );
    // console.log('category', category);
    // res.render("addCate", {category, movies});
});

app.get("/register", (req, res) => {
    // if(req.user) {
    //     return res.redirect('/register');
    // }
    res.render('register');
});

app.get("/login", (req, res) => {
    if(req.user) {
        return res.redirect('/');
    }
    res.render('home');
});

app.get('/logout', (req, res) =>{
    res.clearCookie('userToken');
    res.redirect('/');
})

app.get("/movies", async (req, res) =>{
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
    res.render("movies", {movies});
});

app.get('/searchMovie', async (req, res) =>{
    console.log("movie input", searchMovie)
    const db = await dbPromise;
    const movies = await db.get(`
    SELECT 
        movieTitle,
        movieYear,
        movieLength,
        movieRating
    FROM Movies WHERE id=?`, searchMovie.id);
    console.log("movie is", movies)
    res.render('searchMovie', {movies})
})

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
            const token = await grantAuthToken(user.id);
            console.log('user registered', user);
            res.cookie('userToken', token);
            res.redirect('/');
        }
        catch (e) { return res.render('register', {error: e}, console.log(e)); }//if something goes wrong during registration, error is passed.
    }
    else {res.render('register', {error: 'ERROR: Passwords did not match, please try again.'})}
})

app.post('/login', async (req, res) =>{
    const db = await dbPromise;
    const {
        email,
        password
    } = req.body;

    try{
        //checks users email if in the database
        const existingUser = await db.get('SELECT * FROM Users WHERE email=?', email);
        if(!existingUser) { throw 'Incorrect Login Credentials: Please try again.'; }
        //checks users password by decrpting hash from database
        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        if(!passwordMatch) { throw 'Incorrect Login Credentials: Please try again.'; }

        //if user has correct email and password it is grant access through grantAccess function in auth.js
        const token = await grantAuthToken(existingUser.id);
        res.cookie('userToken', token);
        res.redirect('/');
    } catch (e) { return res.render('home', { error: e }); }
})

//allows user to post movies if they are logged in.
app.post('/addmovie', async (req, res) =>{
    console.log("in add movie");
    const db = await dbPromise;
    try{
        console.log("in add movie 2");
        //insert movies into the movies table in database.
        await db.run('INSERT INTO Movies (movieTitle, movieLength, movieYear, movieRating) VALUES (?, ?, ?, ?);', req.body.movieTitle, req.body.movieLength, req.body.movieYear, req.body.movieRating);
        searchMovie = await db.get('SELECT id FROM Movies WHERE movieTitle=?', req.body.movieTitle);
        res.redirect('movieAdded');
    }
    catch (e) {return res.render('addmovie', {error: "Movie already in database. Please try another movie.", user: req.user}); }
})

/*app.post("/login", async (req, res) => {
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
});*/

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

app.post('/addCate', async (req, res) =>{
    if (!req.user) {return res.redirect('/')}
    const db = await dbPromise;
    movieID = await db.get('SELECT id FROM Movies WHERE MovieTitle=?', searchMovie);
    console.log("movie ID", movieID)
    try{
        const test = await db.run('INSERT INTO Category (addCategory, movieId) VALUES (?, ?);', req.body.addCategory, movieID.id)
        console.log("test", movieID);
        console.log("test 2", test);
        res.redirect('/addCate');
    } catch (e) {return res.render('addCate', {error: e, user: req.user}); }
})

app.post('/movies', async (req, res) =>{
    const db = await dbPromise;
    try{
        searchMovie = await db.get(`SELECT
            id
        FROM Movies WHERE movieTitle=?`, req.body.movieTitle);
        console.log("movie checked", searchMovie);
        res.redirect('/searchMovie');
    } catch (e) {return res.render('movies', {error: e});}
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