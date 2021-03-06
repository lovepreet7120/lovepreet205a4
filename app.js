let express = require('express');
let handlebars  = require('express-handlebars');
let { Client } = require('pg');

let app = express();
let router = express.Router();

app.use(express.urlencoded({extended: true}));
app.engine('.hbs', handlebars.engine({extname: '.hbs'}));
app.set('view engine', '.hbs');
app.set('layouts', './static/layouts');
app.set('views', './static/');

app.use(express.static('static'));
app.use(router);

let port = process.env.PORT || 3000;

let client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})
client.connect()

router.get('/', (req, res) => {
  res.render('home')
});

router.get('/home', (req, res) => {
  res.render('home')
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { fullname: req.query.fullname, username: req.query.username })
});

router.get('/admin-dashboard', (req, res) => {
  res.render('admin-dashboard', { fullname: req.query.fullname, username: req.query.username })
})

router.get('/plans', (req, res) => {
  let query = {
    name: 'plans',
    text: 'SELECT * FROM plans'
  }
  
  client.query(query, (error, response) => {
    if (error) {
      console.log(error.stack)
    } else {
      res.render('cwh', { plans: [response.rows[0], response.rows[1], response.rows[2]] })  
    }
  })
});

router.get('/login', (req, res) => {
  res.render('login')
});

router.post('/login', (req, res) => {
  let data = {
    username: req.body.username,
    password: req.body.password,
    error_username: (req.body.username.trim() === "" || !/^[a-zA-Z0-9]+$/.test(req.body.username)) ? "Username must use a-z, A-Z, 0-9 only" : "",
    error_password: req.body.password.trim() === "" ? "Password cannot be empty" : ""
  }

  if(data.error_username.length > 0 || data.error_password.length > 0) {
    res.render('login', data)
  } else {
    let query = {
      name: 'user',
      text: `SELECT * FROM users WHERE username = $1 AND password = crypt($2, password)`,
      values: [data.username, data.password]
    }
    
    client.query(query, (error, response) => {
      if (error) {
        console.log(error.stack)
      } else {

        if(response.rowCount !== 0) {
          if(response.rows[0]['admin'] === 'true') {
            res.redirect('/admin-dashboard'+'?fullname='+response.rows[0]['fullname']+'&username='+response.rows[0]['username'])
          } else {
            res.redirect('/dashboard'+'?fullname='+response.rows[0]['fullname']+'&username='+response.rows[0]['username'])
          }
        }
        else {
          res.render('login', {
            error_password: "Invalid Username and/or Password"
          })
        }
      }
    })
  }
})

router.get('/registration', (req, res) => {
  res.render('registration')
});

router.post('/registration', (req, res) => {
  let data = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    company: req.body.company,
    position: req.body.position,
    phone: req.body.phone,
    admin: req.body.admin,
    error_name: (req.body.name.trim() === "" || !/^[a-zA-Z]+$/.test(req.body.name)) ? "Name contains a-z or A-Z only" : "",
    error_username: (req.body.username.trim() === "" || !/^[a-zA-Z0-9]+$/.test(req.body.username)) ? "Username must use a-z, A-Z, 0-9 only" : "",
    error_password: (req.body.password.trim() === "" || !/^([a-zA-Z0-9]){6,12}$/.test(req.body.password)) ? "Password length must be 6-12 with no special chars" : "",
    error_company: (req.body.company.trim() === "" || !/^([a-zA-Z0-9]){1,30}$/.test(req.body.company)) ? "Company name can be 1-30 chars long" : "",
    error_position: (req.body.position.trim() === "" || !/^([a-zA-Z0-9]){1,20}$/.test(req.body.position)) ? "Position can be 1-20 chars long" : "",
    error_phone: (req.body.phone.trim() === "" || !/^([0-9]){1,14}$/.test(req.body.phone)) ? "Phone can be 1-14 digits long" : ""
  }

  if(data.error_name.length > 0 || data.error_username.length > 0 || data.error_password.length > 0 || data.error_company.length > 0 || data.error_position.length > 0 || data.error_phone.length > 0) {
    res.render('registration', data)
  } else {
    let query = {
      name: 'register',
      text: `INSERT INTO users (fullname, username, password, company, position, phone, admin) VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6, $7)`,
      values: [data.name, data.username, data.password, data.company, data.position, data.phone, data.admin]
    }
    
    client.query(query, (error, response) => {
      if (error) {
        console.log(error.stack)
      } else {
        if(data.admin === 'true') {
          res.redirect('/admin-dashboard'+'?fullname='+data.name+'&username='+data.username)
        } else {
          res.redirect('/dashboard'+'?fullname='+data.name+'&username='+data.username)
        }
      }
    })
  }
});

app.listen(port, function () {
  console.log(`Listening at http://localhost:${port}`)
});