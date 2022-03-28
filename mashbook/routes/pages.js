const { triggerAsyncId } = require('async_hooks');
const { ServerlessApplicationRepository } = require('aws-sdk');
const { application, Router } = require('express');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const sharp = require("sharp");
const { setTimeout } = require('timers');
let date = Date.now();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

//use db
db.query('USE users', (err, result) => {
    if (err) throw err;
});


router.get('/', (req, res) => {

    //if user is logged in, redirect to newsfeed otherwise ask to login
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.render('index', {
                message: 'Please login to continue'
            });
        }
        else {
            res.redirect('/newsfeed');
        }
    }
    );
});

// register page get
router.get('/register', (req, res) => {
    res.render('register');
});

//show one post if clicked on
router.get('/post/:id', (req, res) => {
    //get comments for post from db
    db.query('SELECT * FROM comments WHERE contentId = ?', [req.params.id], (err, comment_result) => {
        if (err) throw err;
            
        db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {
            if (err) throw err;
            res.render('onePost', {content: result[0], comments: comment_result});
        
        });
    });
});
//show one mashup post if clicked on
router.get('/oneMashup/:id', (req, res) => {
    //get comments for post from db
    db.query('SELECT * FROM comments WHERE mashupId = ?', [req.params.id], (err, comment_result) => {
        if (err) throw err;
            
        db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
            if (err) throw err;
            res.render('oneMashup', {content: result[0], comments: comment_result});
        
        });
    });
});

// newsfeed page get
router.get('/newsfeed', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //render posts from database
            db.query("SELECT * FROM mashups WHERE userPosted != 'MashbookTeam' ORDER BY mashupId DESC;", (err, result) => {
                if (err) throw err;
                res.render('newsfeed', {
                    content: result
                });
            });

        }
    });
});

//weekly mashup page
router.get('/mashup', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //render posts from database
            db.query("SELECT * FROM mashups WHERE userPosted = 'MashbookTeam' ORDER BY mashupId DESC;", (err, result) => {
                if (err) throw err;
                res.render('mashup', { content: result, username: decoded.username });
                
            });

        }
    });
});

//log out and clear cookies so user does not have access to newsfeed
router.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/');
});

//profile page with username and bio
router.get('/profile', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //render newsfeed with content from db
            result = db.query("SELECT contentId, userPosted, path, datePosted FROM content WHERE userPosted = ? AND contentStatus = 'Active' UNION SELECT mashupId, userPosted, path, datePosted FROM mashups WHERE userPosted = ? AND mashupStatus = 'Active' ORDER BY `datePosted` DESC;", [decoded.username, decoded.username], (err, result) => {
                if (err) throw err;

          
                res.render('profilepage', { content: result, username: decoded.username });
            });
        }
    });
});


//view another users profile
router.get('/profile/:username', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //render profile page with content from db
            result = db.query("SELECT contentId, userPosted, path, datePosted FROM content WHERE userPosted = ? AND contentStatus = 'Active' UNION SELECT mashupId, userPosted, path, datePosted FROM mashups WHERE userPosted = ? AND mashupStatus = 'Active' ORDER BY `datePosted` DESC;", [req.params.username, req.params.username], (err, result) => {
                if (err) throw err;


                res.render('profilepage', { content: result, username: req.params.username });
            });
        }
    });
});



//settings page
router.get('/settings', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            res.render('settings');
        }
    });
});

//post page
router.get('/post', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            res.render('post');
        }
    });
});

//gallery view
router.get('/gallery/:id', (req, res) => {
    //get comments for post from db
    galleryId = req.params.id;
    db.query('SELECT * FROM content WHERE mashupId = ?  ORDER BY reactions DESC', [req.params.id], (err, content) => {
        if (err) throw err;
            
        db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, mashup) => {
            if (err) throw err;
            res.render('gallery', {mashup: mashup[0], content: content});
        
        });
    });
});

//post comment
router.post('/postComment/:id', (req, res) => {
    //get current date

    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //insert comment into db
            db.query("INSERT INTO comments (contentId, userCommented, comment, commentDate) VALUES (?, ?, ?, ?)", [req.params.id, decoded.username, req.body.comment, date], (err, result) => {
                if (err) throw err;
                res.redirect('/onemashup/' + req.params.id);
            });
        }
    });
});

//post comment
router.post('/postCommentMashup/:id', (req, res) => {
    //get current date

    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //insert comment into db
            db.query("INSERT INTO comments (mashupId, userCommented, comment, commentDate) VALUES (?, ?, ?, ?)", [req.params.id, decoded.username, req.body.comment, date], (err, result) => {
                if (err) throw err;
                res.redirect('/onemashup/' + req.params.id);
            });
        }
    });
});


router.get('/like/:id', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //if already liked, unlike
            db.query('SELECT * FROM likes WHERE contentId = ? AND userLiked = ?', [req.params.id, decoded.username], (err, result) => {
                if (err) throw err;

                if (result.length > 0) {
                    db.query('DELETE FROM likes WHERE contentId = ? AND userLiked = ?', [req.params.id, decoded.username], (err, result) => {
                        if (err) throw err;
                        res.redirect('/gallery/' + galleryId);
                    });

                    //decrease like count
                    db.query('UPDATE content SET reactions = reactions - 1 WHERE contentId = ?', [req.params.id], (err, result) => {
                        if (err) throw err;
                    });
                }

                else {

                    //increment like count
                    db.query('UPDATE content SET reactions = reactions + 1 WHERE contentId = ?', [req.params.id], (err, result) => {
                        if (err) throw err;
                        res.redirect('/gallery/' + galleryId);
                    });

                    //add user to likes table
                    db.query('INSERT INTO likes (contentId, userLiked) VALUES (?, ?)', [req.params.id, decoded.username], (err, result) => {
                        if (err) throw err;
                    });
                }
            });

        }
    });
});

//post to feed
router.post("/upload", async (req, res) => {
    //if no file is uploaded
    if (!req.files) {
        return res.render('post', {
            message: 'No file selected'
        });
    }

    //get the file
    const file = req.files.myFile;
    const path = "./public/uploads/" + date + file.name;
    const { mashupTitle, mashupDescription } = req.body;


    //connect to AWS
    const fs = require('fs');
    const AWS = require('aws-sdk');
    const threshold = 0.5;
    var nsfw = false;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'eu-west-2'
    });


    //save file locally
    file.mv(path, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
    });


    //check if file is safe
    const axios = require('axios');
    const FormData = require('form-data');

    data = new FormData();
    data.append('media', fs.createReadStream(path));
    data.append('workflow', 'wfl_bg7bUanHbgxAyWrUSluw4');
    data.append('api_user', '1048162863');
    data.append('api_secret', 'SMfANvuXJXSxzeq8KYfx');

    await axios({
        method: 'post',
        url: 'https://api.sightengine.com/1.0/check-workflow.json',
        data: data,
        headers: data.getHeaders()
    }).then(function (response) {

        if (response.data.summary.reject_prob > threshold) {
            console.log(response.data);
            nsfw = true;
        }

    }).catch(function (error) {

        // handle error
        if (error.response) console.log(error.response.data);
        else console.log(error.message);
    });

    //if not safe, delete file and redirect to post page
    if (nsfw) {
        fs.unlink(path, (err) => {
            if (err) throw err;
        });
        return res.render('post', {
            message: 'Inappropriate content detected. Please try again.'
        });
    }

    /*
    //if safe, upload to s3
    else {
        var params = {
            Bucket: "images-mashbook",
            Key: date + file.name,
            ContentType: file.type,
            ACL: 'bucket-owner-full-control',
            Body: fs.readFileSync(path)
        }

        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            if (data) {
                console.log('File uploaded successfully to S3.');
            }
        });
    }
    */

    //only allow jpg, jpeg, png
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/gif') {
        return res.render('post', {
            message: 'File type not allowed'
        });
    }

    //only allow files under 2MB
    if (file.size > 2000000) {
        return res.render('post', {
            message: 'File size too large'
        });
    }

    file.mv(path, (err) => {
        if (err) {
            console.log("Already exists");
        }
        //get logged in username
        jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/');
            }
            else {
                let curDate = new Date();
                let year = curDate.getFullYear();
                let month = curDate.getMonth() + 1;
                let day = curDate.getDate();
                let currentDate = year + "/" + month + "/" + day;

                //insert into content table
                result = db.query('INSERT INTO mashups (userPosted, datePosted, mashupTitle, mashupDescription, path) VALUES (?, ?, ?, ?, ?)', [decoded.username ,currentDate, mashupTitle, mashupDescription, "uploads/" + date + file.name, ""], (err, result) => {
                    if (err) throw err;

                    return res.redirect('/newsfeed');
                });

            }
        });
    });
});

//add to mashup page
router.get('/addtomashup/:id', (req, res) => {
    //redirect only if user is logged in
    mashupId = req.params.id;
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render newsfeed with content from db
            result = db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('addtomashup', { content: result })
            });
        }
    });
});
//add to mashup page
router.post('/addtomashup/:id', (req, res) => {

    //if no file is uploaded
    if (!req.files) {
        return res.render('/addtomashup/' + mashupId, {
            message: 'No file selected'
        });
    }
    
    //get the file
    const file = req.files.myFile;
    const path = "./public/uploads/" + date + file.name;
    const description = req.body.description;

    //connect to AWS
    const fs = require('fs');
    const AWS = require('aws-sdk');
    const threshold = 0.5;
    var nsfw = false;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'eu-west-2'
    });


    //save file locally
    file.mv(path, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    /*
    //check if file is safe
    const axios = require('axios');
    const FormData = require('form-data');
    data = new FormData();
    data.append('media', fs.createReadStream(path));
    data.append('workflow', 'wfl_bg7bUanHbgxAyWrUSluw4');
    data.append('api_user', '1048162863');
    data.append('api_secret', 'SMfANvuXJXSxzeq8KYfx');
    await axios({
        method: 'post',
        url: 'https://api.sightengine.com/1.0/check-workflow.json',
        data: data,
        headers: data.getHeaders()
    }).then(function (response) {
        if (response.data.summary.reject_prob > threshold) {
            console.log(response.data);
            nsfw = true;
        }
    }).catch(function (error) {
        // handle error
        if (error.response) console.log(error.response.data);
        else console.log(error.message);
    });
    //if not safe, delete file and redirect to post page
    if (nsfw) {
        fs.unlink(path, (err) => {
            if (err) throw err;
        });
        return res.render('/addtomashup/' + mashupId, {
            message: 'Inappropriate content detected. Please try again.'
        });
    }
    */
    /*
    //if safe, upload to s3
    else {
        var params = {
            Bucket: "images-mashbook",
            Key: date + file.name,
            ContentType: file.type,
            ACL: 'bucket-owner-full-control',
            Body: fs.readFileSync(path)
        }
        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            if (data) {
                console.log('File uploaded successfully to S3.');
            }
        });
    }
    */

    //only allow jpg, jpeg, png
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/gif') {
        return res.render('/addtomashup/' + mashupId, {
            message: 'File type not allowed'
        });
    }

    //only allow files under 2MB
    if (file.size > 2000000) {
        return res.render('post', {
            message: 'File size too large'
        });
    }

    file.mv(path, (err) => {
        if (err) {
            console.log("Already exists");
        }
        //get logged in username
        jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/');
            }
            else {

                //get master picture from id
                result = db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
                    if (err) throw err;

                    let masterPicture = result[0].path;
                    let secondaryPicture = path
                    let compositionType = req.body.sharpType

                    if(compositionType == "none")
                    {
                        result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [req.params.id, decoded.username , date, description, "uploads/" + secondaryPicture.split("/")[3]], (err, result) => {
                            if (err) throw err;
                            return res.redirect('../gallery/' + req.params.id);
                        });
                    }
                    else
                    {

                    
                    
                    //create image composition with sharp
                    sharp("./public/"+masterPicture)
                        .composite([
                            { input: secondaryPicture, blend: compositionType , opacity: 0.5 }
                        ])
                        .toFile('./public/uploads/mashup' + date + "-" + file.name, (err, info) => {
                            //if error notify user about file being too big
                            if (err){
                                console.log(err);
                                return res.redirect('/errorpage');
                            }
                            
                            else
                            {
                                //insert into content table
                                result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [mashupId, decoded.username , date, description, "uploads/mashup" + date+ "-" + file.name], (err, result) => {
                                    if (err) throw err;

                                    return res.redirect('../gallery/' + mashupId);
                                });
                            }
                        });
                    }

                });



            }
        });
    });
});
//add to mashup/ mashup content picture instead of the main
router.get('/mashit/:id', (req, res) => {
    //redirect only if user is logged in
    
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render newsfeed with content from db
            result = db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('mashit', { content: result })
            });
        }
    });
});
//add to mashup page
router.post('/mashit/:id', (req, res) => {
    contentId = req.params.id;
    const { mashupId } = req.body;
    //if no file is uploaded
    if (!req.files) {
        return res.render('/mashit/' + contentId, {
            message: 'No file selected'
        });
    }
    
    //get the file
    const file = req.files.myFile;
    const path = "./public/uploads/" + date + file.name;
    const description = req.body.description;

    //connect to AWS
    const fs = require('fs');
    const AWS = require('aws-sdk');
    const threshold = 0.5;
    var nsfw = false;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'eu-west-2'
    });


    //save file locally
    file.mv(path, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    /*
    //check if file is safe
    const axios = require('axios');
    const FormData = require('form-data');

    data = new FormData();
    data.append('media', fs.createReadStream(path));
    data.append('workflow', 'wfl_bg7bUanHbgxAyWrUSluw4');
    data.append('api_user', '1048162863');
    data.append('api_secret', 'SMfANvuXJXSxzeq8KYfx');

    await axios({
        method: 'post',
        url: 'https://api.sightengine.com/1.0/check-workflow.json',
        data: data,
        headers: data.getHeaders()
    }).then(function (response) {

        if (response.data.summary.reject_prob > threshold) {
            console.log(response.data);
            nsfw = true;
        }

    }).catch(function (error) {

        // handle error
        if (error.response) console.log(error.response.data);
        else console.log(error.message);
    });

    //if not safe, delete file and redirect to post page
    if (nsfw) {
        fs.unlink(path, (err) => {
            if (err) throw err;
        });
        return res.render('/addtomashup/' + mashupId, {
            message: 'Inappropriate content detected. Please try again.'
        });
    }
    */
    /*
    //if safe, upload to s3
    else {
        var params = {
            Bucket: "images-mashbook",
            Key: date + file.name,
            ContentType: file.type,
            ACL: 'bucket-owner-full-control',
            Body: fs.readFileSync(path)
        }

        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            if (data) {
                console.log('File uploaded successfully to S3.');
            }
        });
    }
    */

    //only allow jpg, jpeg, png
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/gif') {
        return res.render('/mashit/' + contentId, {
            message: 'File type not allowed'
        });
    }

    //only allow files under 2MB
    if (file.size > 2000000) {
        return res.render('post', {
            message: 'File size too large'
        });
    }

    file.mv(path, (err) => {
        if (err) {
            console.log("Already exists");
        }
        //get logged in username
        jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/');
            }
            else {

                //get master picture from id
                result = db.query('SELECT * FROM content WHERE contentId = ?', req.params.id, (err, result) => {
                    if (err) throw err;

                    let curDate3 = new Date();
                    let year3 = curDate3.getFullYear();
                    let month3 = curDate3.getMonth() + 1;
                    let day3 = curDate3.getDate();
                    let currentDate3 = year3 + "/" + month3 + "/" + day3;
                    let masterPicture2 = result[0].path;
                    let secondaryPicture2 = path
                    let compositionType2 = req.body.sharpType
                 

                    if(compositionType2 == "none")
                    {
                        result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [mashupId, decoded.username , currentDate3, description, "uploads/" + secondaryPicture2.split("/")[3]], (err, result) => {
                            if (err) throw err;
                            return res.redirect('../gallery/' + mashupId);
                        });
                    }
                    else
                    {

                    
                    
                    //create image composition with sharp
                    sharp("./public/"+masterPicture2)
                        .composite([
                            { input: secondaryPicture2, blend: compositionType2 , opacity: 0.5 }
                        ])
                        .toFile('./public/uploads/mashup' + date + "-" + file.name, (err, info) => {
                            //if error notify user about file being too big
                            if (err){
                                console.log(err);
                                return res.redirect('/errorpage');
                            }
                            
                            else
                            {
                                //insert into content table
                                result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [mashupId, decoded.username , currentDate3, description, "uploads/mashup" + date+ "-" + file.name], (err, result) => {
                                    if (err) throw err;

                                    return res.redirect('../gallery/' + mashupId);
                                });
                            }
                        });
                    }

                });



            }
        });
    });
});

//add to mashup page
router.post('/mashup/:id', (req, res) => {
    
    //if no file is uploaded
    if (!req.files) {
        return res.render('/mashup/' + mashupId, {
            message: 'No file selected'
        });
    }
    
    //get the file
    const file = req.files.myFile;
    const path = "./public/uploads/" + date + file.name;
    const description = req.body.description;

    //connect to AWS
    const fs = require('fs');
    const AWS = require('aws-sdk');
    const threshold = 0.5;
    var nsfw = false;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'eu-west-2'
    });


    //save file locally
    file.mv(path, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    /*
    //check if file is safe
    const axios = require('axios');
    const FormData = require('form-data');

    data = new FormData();
    data.append('media', fs.createReadStream(path));
    data.append('workflow', 'wfl_bg7bUanHbgxAyWrUSluw4');
    data.append('api_user', '1048162863');
    data.append('api_secret', 'SMfANvuXJXSxzeq8KYfx');

    await axios({
        method: 'post',
        url: 'https://api.sightengine.com/1.0/check-workflow.json',
        data: data,
        headers: data.getHeaders()
    }).then(function (response) {

        if (response.data.summary.reject_prob > threshold) {
            console.log(response.data);
            nsfw = true;
        }

    }).catch(function (error) {

        // handle error
        if (error.response) console.log(error.response.data);
        else console.log(error.message);
    });

    //if not safe, delete file and redirect to post page
    if (nsfw) {
        fs.unlink(path, (err) => {
            if (err) throw err;
        });
        return res.render('/addtomashup/' + mashupId, {
            message: 'Inappropriate content detected. Please try again.'
        });
    }
    */
    /*
    //if safe, upload to s3
    else {
        var params = {
            Bucket: "images-mashbook",
            Key: date + file.name,
            ContentType: file.type,
            ACL: 'bucket-owner-full-control',
            Body: fs.readFileSync(path)
        }

        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            if (data) {
                console.log('File uploaded successfully to S3.');
            }
        });
    }
    */

    //only allow jpg, jpeg, png
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/gif') {
        return res.render('/addtomashup/' + mashupId, {
            message: 'File type not allowed'
        });
    }

    //only allow files under 2MB
    if (file.size > 2000000) {
        return res.render('post', {
            message: 'File size too large'
        });
    }

    file.mv(path, (err) => {
        if (err) {
            console.log("Already exists");
        }
        //get logged in username
        jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/');
            }
            else {

                //get master picture from id
                result = db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
                    if (err) throw err;

                    let curDate2 = new Date();
                    let year2 = curDate2.getFullYear();
                    let month2 = curDate2.getMonth() + 1;
                    let day2 = curDate2.getDate();
                    let currentDate2 = year2 + "/" + month2 + "/" + day2;
                    let masterPicture = result[0].path;
                    let secondaryPicture = path
                    let compositionType = req.body.sharpType
                 

                    if(compositionType == "none")
                    {
                        result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [req.params.id, decoded.username , currentDate2, description, "uploads/" + secondaryPicture.split("/")[3]], (err, result) => {
                            if (err) throw err;
                            return res.redirect('../gallery/' + req.params.id);
                        });
                    }
                    else
                    {

                    
                    
                    //create image composition with sharp
                    sharp("./public/"+masterPicture)
                        .composite([
                            { input: secondaryPicture, blend: compositionType , opacity: 0.5 }
                        ])
                        .toFile('./public/uploads/mashup' + date + "-" + file.name, (err, info) => {
                            //if error notify user about file being too big
                            if (err){
                                console.log(err);
                                return res.redirect('/errorpage');
                            }
                            
                            else
                            {
                                //insert into content table
                                result = db.query('INSERT INTO content (mashupId, userPosted, datePosted, description, path) VALUES (?, ?, ?, ?, ?)', [mashupId, decoded.username , date, description, "uploads/mashup" + date+ "-" + file.name], (err, result) => {
                                    if (err) throw err;

                                    return res.redirect('../gallery/' + mashupId);
                                });
                            }
                        });
                    }

                });



            }
        });
    });
});



//error page
router.get('/errorpage', (req, res) => {
    res.render('errorpage', {
        message: 'File size too large'});
});

//edit content page
router.get('/editcontent/:id', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render newsfeed with content from db
            result = db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('editcontent', { content: result })
            });
        }
    });
});

//update edited content page
router.post('/editcontentpost/:id', async (req, res) => {

    //if no file is uploaded
    if (!req.files) {
        return res.render('post', {
            message: 'No file selected'
        });
    }

    //get the file
    const file = req.files.myFile;
    const path = "./public/uploads/" + date + file.name;
    const caption = req.body.caption;
    console.log(caption);

    //connect to AWS
    const fs = require('fs');
    const AWS = require('aws-sdk');
    const threshold = 0.5;
    var nsfw = false;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'eu-west-2'
    });


    //save file locally
    file.mv(path, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
    });


    //check if file is safe
    const axios = require('axios');
    const FormData = require('form-data');

    data = new FormData();
    data.append('media', fs.createReadStream(path));
    data.append('workflow', 'wfl_bg7bUanHbgxAyWrUSluw4');
    data.append('api_user', '1048162863');
    data.append('api_secret', 'SMfANvuXJXSxzeq8KYfx');

    await axios({
        method: 'post',
        url: 'https://api.sightengine.com/1.0/check-workflow.json',
        data: data,
        headers: data.getHeaders()
    }).then(function (response) {

        if (response.data.summary.reject_prob > threshold) {
            console.log(response.data);
            nsfw = true;
        }

    }).catch(function (error) {

        // handle error
        if (error.response) console.log(error.response.data);
        else console.log(error.message);
    });

    //if not safe, delete file and redirect to post page
    if (nsfw) {
        fs.unlink(path, (err) => {
            if (err) throw err;
        });
        return res.render('post', {
            message: 'Inappropriate content detected. Please try again.'
        });
    }

    /*
    //if safe, upload to s3
    else {
        var params = {
            Bucket: "images-mashbook",
            Key: date + file.name,
            ContentType: file.type,
            ACL: 'bucket-owner-full-control',
            Body: fs.readFileSync(path)
        }

        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            if (data) {
                console.log('File uploaded successfully to S3.');
            }
        });
    }
    */

    //only allow jpg, jpeg, png
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/gif') {
        return res.render('post', {
            message: 'File type not allowed'
        });
    }

    //only allow files under 2MB
    if (file.size > 2000000) {
        return res.render('post', {
            message: 'File size too large'
        });
    }

    file.mv(path, (err) => {
        if (err) {
            console.log("Already exists");
        }
        //get logged in username
        jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.redirect('/');
            }
            else {
                //insert into content table
                result = db.query('UPDATE content SET path = ? WHERE contentId = ?', ["uploads/" + date + file.name, req.params.id], (err, result) => {
                    if (!err) {
                        // Show updated content 
                        db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {

                            if (!err) {
                                res.render('../gallery/' + galleryId, { message: 'Image updated successfully.', content: result });
                            } else {
                                console.log(err);
                            }

                        });
                    }
                }
                );

            }
        });
    });
});


// delete content get 
router.get('/deletecontent/:id', (req, res) => {


    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        }
        else {
            //render item with the content ID from db
            result = db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('deletecontent', { content: result })
            });

        }
    });
});

// delete content post
router.post('/contentdeleted/:id', (req, res) => {

    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            res.render('newsfeed', { content: result, username: decoded.username });
            //Delete content
            result = db.query('DELETE FROM content WHERE contentId = ?', [req.params.id]);
            res.redirect('../newsfeed');

        }
    });
});

// Report content get 
router.get('/reportcontent/:id', (req, res) => {


    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        }
        else {
            //render item with the content ID from db
            result = db.query('SELECT * FROM content WHERE contentId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('reportcontent', { content: result })
            });

        }
    });
});

// delete content post
router.post('/contentreported/:id', (req, res) => {

    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            res.render('newsfeed', { content: result, username: decoded.username });
            //Report content
            result = db.query('UPDATE content SET contentFlagged = 1 WHERE contentId = ?', [req.params.id]);
            res.redirect('../gallery/' + galleryId);

        }
    });
});

// Moderation tools pages
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Admin dashboard page - flagged mashups
router.get('/admindashboard', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
             // mushup sql needs to go here
            result = db.query('SELECT * FROM mashups ORDER BY mashupStatus DESC, mashupStatus DESC', (err, result) => {

                if (err) throw err;
                res.render('admindashboard', { content: result })
            });
        }
    });
});

//Admin dashboard page - edit mashup get
router.get('/admineditmashup/:id', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render mashups from db
            result = db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('admineditmashup', { content: result })
            });
        }
    });
});
//Admin dashboard page - edit mashup, post form
router.post('/admineditmashup/:id', (req, res) => {
    const { mashupStatus, flagAnswer } = req.body;
    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render mashup from db
            result = db.query('SELECT * FROM mashups WHERE mashupId = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('admineditmashup', { content: result })
                                   
            
            //Update mashup
            result = db.query('UPDATE mashups SET mashupStatus = ?, mashupFlagged = ? WHERE mashupId = ?', [mashupStatus, flagAnswer, req.params.id]);

            res.redirect('../admindashboard');
            });

        }
    });
});

//Admin dashboard page - users
router.get('/adminusers', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            //render newsfeed with content from db
            result = db.query('SELECT * FROM users ORDER BY userStatus DESC', (err, result) => {

                if (err) throw err;
                res.render('adminusers', { content: result })
            });
        }
    });
});

//Admin dashboard page - edit users, get form per id
router.get('/adminedituser/:id', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render user from db
            result = db.query('SELECT * FROM users WHERE username = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('adminedituser', { content: result })
            });
        }
    });
});

//Admin dashboard page - edit users, post form
router.post('/adminedituser/:id', (req, res) => {
    const { password, userStatus } = req.body;
    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {
            
            //Report content
            result = db.query('UPDATE users SET password = ?, userStatus = ? WHERE username = ?', [password, userStatus, req.params.id]);

            res.redirect('../adminusers');

        }
    });
});

//Admin dashboard page - content
router.get('/admincontent', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render newsfeed with content from db
            result = db.query('SELECT * FROM content ORDER BY contentFlagged DESC, contentStatus DESC', (err, result) => {

                if (err) throw err;
                res.render('admincontent', { content: result })
            });
        }
    });
});

//Admin dashboard page - edit content
router.get('/admineditcontent/:id', (req, res) => {
    //redirect only if user is logged in
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render content from db
            result = db.query('SELECT * FROM content WHERE contentID = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                res.render('admineditcontent', { content: result })
            });
        }
    });
});

//Admin dashboard page - edit content, post form
router.post('/admineditcontent/:id', (req, res) => {
    const { contentStatus, flagAnswer } = req.body;
    //get logged in username
    jwt.verify(req.cookies.jwt, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.redirect('/');
        } else {

            //render content from db
            result = db.query('SELECT * FROM content WHERE contentID = ?', [req.params.id], (err, result) => {
                if (err) throw err;
                
                res.render('admineditcontent', { content: result })
            
            //Update content
            result = db.query('UPDATE content SET contentStatus = ?, contentFlagged = ? WHERE contentId = ?', [contentStatus, flagAnswer, req.params.id]);

            res.redirect('../admincontent');

        });

        }
    });
});
module.exports = router;