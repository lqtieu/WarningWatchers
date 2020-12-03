import express from "express";
import exphbs from "express-handlebars";
import bcrypt, { compare } from "bcrypt";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cookieParser from "cookie-parser";
import { grantAuthToken, searchUserFromAuthToken } from "./auth";

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

// ==== Middleware functions ====
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(__dirname + "/static"));
app.use("/img", express.static(__dirname + "/img"));

app.use(async (req, res, next) => {
    const { userToken } = req.cookies;
    if (!userToken) {
        return next();
    }
    try {
        const user = await searchUserFromAuthToken(userToken);
        req.user = user;
    } catch (e) {
        return next(e);
    }
    next();
});

// ==== HOME PAGE ====
app.get("/", async (req, res) => {
    //console.log("Display landing page");
    res.render("home", { user: req.user });
});

// ==== ACCOUNT PAGE & ACTIONS ====
app.get("/account", (req, res) => {
    //console.log("Display account page");
    res.render("account", { user: req.user });
});

// --- register.handlebars actions ---
app.get("/register", (req, res) => {
    //console.log("Display register page");
    res.render("register");
});

app.post("/register", async (req, res) => {
    //console.log("Registering user...");
    const db = await dbPromise;
    const { username, email, password, password2 } = req.body;
    if (password === password2) {
        // takes the password and hash it.
        const passwordHash = await bcrypt.hash(password, 10);

        try {
            //insert users info into database
            await db.run(
                "INSERT INTO Users (username, email, password) VALUES (?, ?, ?);",
                username,
                email,
                passwordHash
            );
            //keeps track of what user is registered in using cookies. also grants access to new user.
            const user = await db.get("SELECT id FROM Users WHERE email=?", email);
            const token = await grantAuthToken(user.id);
            console.log("user registered", user);
            res.cookie("userToken", token);
            res.redirect("/");
        } catch (e) {
            return res.render("register", { error: e }, console.log(e));
        } //if something goes wrong during registration, error is passed.
    } else {
        res.render("register", {
            error: "ERROR: Passwords did not match, please try again.",
        });
    }
});

// --- login actions ---
app.get("/login", (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("home");
});

app.post("/login", async (req, res) => {
    //console.log("Logging in user...");
    const db = await dbPromise;
    const { email, password } = req.body;

    try {
        //checks users email if in the database
        const existingUser = await db.get(
            "SELECT * FROM Users WHERE email=?",
            email
        );
        if (!existingUser) {
            throw "Incorrect Login Credentials: Please try again.";
        }
        //checks users password by decrpting hash from database
        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        if (!passwordMatch) {
            throw "Incorrect Login Credentials: Please try again.";
        }

        //if user has correct email and password it is grant access through grantAccess function in auth.js
        const token = await grantAuthToken(existingUser.id);
        res.cookie("userToken", token);
        res.redirect("/");
    } catch (e) {
        return res.render("home", { error: e });
    }
});

// --- logout actions ---
app.get("/logout", (req, res) => {
    res.clearCookie("userToken");
    res.redirect("/");
});

// ==== ABOUT PAGE ====
app.get("/about", (req, res) => {
    res.render("about",  { user: req.user });
});

app.post("/about", (req, res) => {
    res.redirect("about",  { user: req.user });
});

// ==== TEAM BIO PAGE ====
app.get("/team-bio", (req, res) => {
    res.render("team-bio");
});

// ==== MOVIES & MOVIE-RELATED PAGES ====
// --- Movies.handlebars actions ---
app.get("/movies", async (req, res) => {
    //console.log("Displaying Movies Page");
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
    res.render("movies", { movies });
});

app.post("/movies", async (req, res) => {
    //console.log("Searching for Movie...");
    const db = await dbPromise;
    try {
        searchMovie = await db.get(
            `SELECT
                    id
                FROM Movies WHERE movieTitle LIKE ?`,
            req.body.movieTitle
        );
        console.log("movie checked", searchMovie);
        res.redirect("/searchMovie");
    } catch (e) {
        return res.render("movies", { error: e });
    }
});

// --- searchMovie.handlebars actions ---
app.get("/searchMovie", async (req, res) => {
    console.log("movie input", searchMovie);
    const db = await dbPromise;
    if(searchMovie){
    const movies = await db.get(
            `SELECT 
                movieTitle,
                movieYear,
                movieLength,
                movieRating
            FROM Movies WHERE id=?`,
            searchMovie.id
    );
    const category = await db.all(
        `SELECT
            addCategory,
            movieId
        FROM Category WHERE movieId=?`, searchMovie.id
    );
    console.log("movie is", movies);
    res.render("searchMovie", { movies, category });}
});

app.get('/addCategory', async (req, res) =>{
    const db = await dbPromise;
    const movies = await db.get('SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE id=?', movieID);
    console.log("movie1", movieID)
    const category = await db.all(
        `SELECT
            addCategory,
            movieId
        FROM Category WHERE movieId=?`, movieID
    );
    console.log('category', category);
    res.render("addCategory", {category, movies});
})

    // --- addmovie.handlebars actions ---
    app.get("/addmovie", async (req, res) => {
        //console.log("Entered the addMovie Page")
        res.render("addmovie", { user: req.user });
    });
    app.post("/addmovie", async (req, res) => {
        //console.log("Adding a movie right now...");
        const db = await dbPromise;
        try {
            //insert movies into the movies table in database.
            await db.run(
            "INSERT INTO Movies (movieTitle, movieLength, movieYear, movieRating) VALUES (?, ?, ?, ?);",
            req.body.movieTitle,
            req.body.movieLength,
            req.body.movieYear,
            req.body.movieRating
            );
            searchMovie = await db.get(
            "SELECT id FROM Movies WHERE movieTitle=?",
            req.body.movieTitle
            );
            res.redirect("movieAdded");
        } catch (e) {
            return res.render("addmovie", {
            error: "Movie already in database. Please try another movie.",
            user: req.user,
            });
        }
    });

// --- movieAdded.handlebars actions ---
app.get("/movieAdded", async (req, res) => {
    //console.log("Added a movie!")
    const db = await dbPromise;
    if (searchMovie.id) {
        const movies = await db.get(
            "SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE id=?",
            searchMovie.id
        );
        console.log("moive id added", movies);
        res.render("movieAdded", { movies });
    } else {
        res.render("movieAdded");
    }
});

// ==== CATEGORY & CATEGORY-RELATED PAGES ====
    // --- categories.handlebars actions ---
    app.get("/categories", async (req, res) => {
        //console.log("Displaying Movies Page");
        const db = await dbPromise;


            console.log("findCate", searchMovie);
            console.log("find 2", searchMovie);
            if(searchMovie){
            const movies = await db.all(`
            SELECT
            movieTitle,
            movieLength,
            movieYear,
            movieRating
            FROM Movies WHERE cateID = ?`, searchMovie.id);
            console.log("movies", movies)}

            const category = await db.all(`
            SELECT addCategory FROM Category WHERE movieId = ?`, searchMovie);

            console.log("cates", category)
            res.render("categories", {category});
    });

    app.post("/categories", async (req, res) => {
        console.log("Searching for Movie...", req.body.addCategory);
        const db = await dbPromise;
        try {
            searchMovie = await db.all(
                `SELECT
                    id
                FROM Category WHERE addCategory LIKE ?`,
                req.body.addCategory
            );
            console.log("Category checked", searchMovie);
            res.redirect("/categories");
        } catch (e) {
            return res.render("categories", { error: "category not found. Please try again." });
        }
    });

    // --- addCate.handlebars actions ---
    app.get("/addCate", async (req, res) => {
        //console.log("Display addCate page")
        console.log("movie input", req.query.movieTitle);
        const db = await dbPromise;
        const movies = await db.get(
            `SELECT
                id, 
                movieTitle,
                movieYear,
                movieLength,
                movieRating
            FROM Movies WHERE movieTitle LIKE ?`,
            req.query.movieTitle
        );
    if(movies){
        movieID=movies.id;
        const category = await db.all(
            `SELECT
                addCategory,
                movieId
            FROM Category WHERE movieId=?`, movieID
        );
        console.log("something", category)
        res.render("addCate", {movies, category, user: req.user});
    } else {
    res.render("addCate", { movies, user: req.user });}
    });

    app.post("/addCate", async (req, res) => {
    //console.log("Adding a category...")
    if (!req.user) {
        return res.redirect("/");
    }
    const db = await dbPromise;
    try {
        //insert category into the  category table in database.
        await db.run(
            "INSERT INTO Category (id, addCategory, movieId) VALUES (?, ?, ?);",
            req.body.id,
            req.body.addCategory,
            req.body.moveId,
        );
        searchCategory = await db.get(
            "SELECT addCategory FROM Category WHERE addCategory=?",
            req.body.cate-name
        );
        res.redirect("/addCate");
    } catch (e) {
        return res.render("addmovie", {
            error: "Category is already in database.",
            user: req.user,
        });x
    }
});

app.post('/addCategory', async (req, res) =>{
    if (!req.user) {return res.redirect('/')}
    const db = await dbPromise;
    //movieID = await db.get('SELECT id FROM Movies WHERE MovieTitle=?', searchMovie);
    console.log("movie ID", movieID)
    try{
        const test = await db.run('INSERT INTO Category (addCategory, movieId) VALUES (?, ?);', req.body.addCategory, movieID)
        console.log("test", movieID);
        console.log("test 2", test);
        res.redirect('/addCategory');
    } catch (e) {return res.render('addCategory', {error: e, user: req.user}); }
})
// --- movieAdded.handlebars actions ---
app.get("/cateAdded", async (req, res) => {
    //console.log("Added a movie!")
    const db = await dbPromise;
    if (searchMovie.id) {
        const movies = await db.get(
            "SELECT movieTitle, movieLength, movieYear, movieRating FROM Movies WHERE id=?",
            searchMovie.id
        );
        console.log("movie id added", movies);
        res.render("cateAdded", { movies });
    } else {
        res.render("cateAdded");
    }
});

// --- searchMovie.handlebars actions ---
// FIX QUERY TO SEARCH FOR CATEGORIES
app.get("/searchCate", async (req, res) => {
    console.log("movie input", searchMovie);
    const db = await dbPromise;
    if(searchMovie){
    const movies = await db.get(
        `SELECT 
             movieTitle,
             movieYear,
             movieLength,
             movieRating
        FROM Movies WHERE id=?`,
        searchMovie.id
    );
    console.log("movie is", movies);
    res.render("searchCate", { movies });}
    else {return res.render("searchCate")}
});


//Gets access to database and runs migration
const setup = async () => {
    const db = await dbPromise;
    await db.migrate();

    app.listen(8000, () => {
        console.log("Listening on port 8080 @ http://localhost:8000");
    });
};

setup();
