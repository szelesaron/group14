//packages
const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './.env' });

//start app
const app = express();



//make db connection with env file
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

//create db and connect
db.query('CREATE DATABASE IF NOT EXISTS users', (err, result) => {
    if (err) throw err;
});

db.query('USE users', (err, result) => {
    if (err) throw err;
});

//create table
let create_table = 
"CREATE TABLE IF NOT EXISTS users (username VARCHAR(20)  PRIMARY KEY NOT NULL, accountType varchar(20) NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL,  userStatus varchar(256) NOT NULL DEFAULT 'Active')";
db.query(create_table, (err, result) => {
    if (err) throw err;
});

//create table for newsfeed
let create_table_newsfeed = 
"CREATE TABLE IF NOT EXISTS content (contentId INT(11) PRIMARY KEY NOT NULL AUTO_INCREMENT, mashupId int(11) NOT NULL, description VARCHAR(50) NOT NULL ,userPosted VARCHAR(100) NOT NULL, datePosted DATE NOT NULL, path VARCHAR(255) NOT NULL, reactions int(5) NOT NULL, contentStatus varchar(256) NOT NULL DEFAULT 'Active', contentFlagged int(1) NOT NULL DEFAULT 0)";
db.query(create_table_newsfeed, (err, result) => {
    if (err) throw err;
});

//create table for newsfeed
let create_table_mashups = 
"CREATE TABLE IF NOT EXISTS mashups (mashupId int(11)PRIMARY KEY NOT NULL AUTO_INCREMENT, userPosted varchar(100) NOT NULL, datePosted date NOT NULL, mashupTitle varchar(255) NOT NULL, mashupDescription longtext NOT NULL, reactions int(5) NOT NULL, path varchar(255) NOT NULL, mashupStatus varchar(255) NOT NULL DEFAULT 'Active', mashupFlagged int(1) NOT NULL)";
db.query(create_table_mashups, (err, result) => {
    if (err) throw err;
});

//create table for likes
let create_table_likes =
"CREATE TABLE IF NOT EXISTS likes (likeId INT(11) PRIMARY KEY NOT NULL AUTO_INCREMENT, contentId INT(11) NOT NULL , userLiked VARCHAR(100) NOT NULL)";
db.query(create_table_likes, (err, result) => {
    if (err) throw err;
});

//create table for comments
let create_table_comments =
"CREATE TABLE IF NOT EXISTS comments (commentId INT(11) PRIMARY KEY NOT NULL AUTO_INCREMENT, contentId INT(11) NOT NULL , userCommented VARCHAR(100) NOT NULL, comment VARCHAR(255) NOT NULL, commentDate DATE NOT NULL)";
db.query(create_table_comments, (err, result) => {
    if (err) throw err;
});

//insert into newsfeed
var sql_insert = "INSERT INTO content (contentId, mashupId, description, userPosted, datePosted, path, reactions) VALUES ?";
var values = [
    [1, 1, 'image1' ,'Lukasz','2022-01-12', "uploads/mona.jpg\r\n", 10],
    [2, 1, 'image2' ,'Aron', '2021-01-12', "uploads/mona.jpg\r\n", 15],
    [3, 1, 'image3' ,'Andrew', '2022-02-02', "uploads/mona.jpg\r\n", 30]
];

db.query(sql_insert, [values], (err, res) => {
    if (err) console.log("Content already inserted");
});

//insert into mashups
var sql_insert_mashup = "INSERT INTO mashups (mashupId, userPosted, datePosted, mashupTitle, mashupDescription, reactions, path, mashupStatus, mashupFlagged) VALUES ?";
var values2 = [
    [1, 'test', '2022-01-12','Mona Collaboration ', 'Who can come up with the best mona upgrade?', 0, 'uploads/mona.jpg', 'Active', 0],
    [2, 'MashbookTeam', '2022-01-12','Mashup Our Logo', 'Can you improve our Mashbook Logo?', 0, 'images/favi.png', 'Active', 0],
    
];

db.query(sql_insert_mashup, [values2], (err, res) => {
    if (err) console.log("Mushup already inserted");
});





//set static folder
const public = path.join(__dirname, './public');
app.use(express.static(public));

//parse URL encoded data - enables data grab from forms
app.use(express.json()) // for json
app.use(express.urlencoded({ extended: true })) // for form data
var cookies = require("cookie-parser");
app.use(cookies());

//set viewengine
app.set('view engine', 'hbs');

//file upload
const fileUpload = require("express-fileupload");
app.use(fileUpload());


//set routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));



app.listen(3000, () => {
    console.log("Server started on 3000.");
});
