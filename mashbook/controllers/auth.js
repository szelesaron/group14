const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

db.query('USE users', (err, result) => {
    if (err) throw err;
});


exports.register = (req, res) => {
    const { username, account_type, email, password, password_confirm } = req.body;
    //username cannot be longer than 20 characters
    if (username.length > 20)
    {
        return res.render('register', {
            message: 'Username cannot be longer than 20 characters'
        });
    }
    //password cannot be longer than 20 characters
    else if (password.length > 20 || password.length < 8)
    {
        return res.render('register', {
            message: 'Password length needs to be between 8 and 20 characters'
        });

    }

    //password must contain at least one number and uppercase and lowercase letters
    if (!password.match(/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])/))
    {
        return res.render('register', {
            message: 'Password must contain at least one number and uppercase and lowercase letters'
        });

    }


    //check if email or username is already in use and passwords match
    db.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], async (err, result) => {
        if (err) throw err;
        if (result.length > 0)
        {
            //check if username is already in use
            if (result[0].username === username)
            {
                return res.render('register', {
                    message: 'Username is already in use'
                });
            }

            //check if email is already in use
            if (result[0].email === email)
            {
                return res.render('register', {
                    message: 'Email is already in use'
                });
            }
        }
        else if (password !== password_confirm)
        {
            return res.render('register', {
                message: 'Passwords do not match'
                });
        }
        
        //hashing asynchronously
        let hashed_password = await bcrypt.hash(password, 8);

        //inserting into db
        db.query("INSERT INTO users (username, accountType, email, password) VALUES (?, ?, ?, ?)", [username, account_type, email, hashed_password], (err, result) => {
            if (err) throw err;
            return res.redirect('/');
        });
})};


exports.login = (req, res) => {
    const { username, password } = req.query;

    //backdoor for testing
    if (username === 'admin' && password === 'admin')
    {
        //create token with username
        const token = jwt.sign({ username : username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true });
        res.redirect('/newsfeed');
    }

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, result) => {
        if (err) throw err;
    
        if (result.length > 0)
        {
            let user = result[0];
            let isPasswordMatch = await bcrypt.compare(password, user.password);
            if (isPasswordMatch)
            {

                let token = jwt.sign({ username: username}, process.env.JWT_SECRET, { expiresIn: "1h" });
                res.cookie('jwt', token, { httpOnly: true });
                res.redirect('/newsfeed');
            }
            else
            {
                return res.render('index', {
                    message: 'Incorrect password'
                    });
            }
        }
        else
        {
            return res.render('index', {
                message: 'username not found'
                });
        }
    });
};