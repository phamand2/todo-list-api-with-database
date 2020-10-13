const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./models')
const es6Renderer = require('express-es6-template-engine')
const bcrypt = require('bcrypt')
const morgan = require('morgan')
const logger = morgan('tiny')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);


app.use(cookieParser()); 
const store = new SequelizeStore({db: db.sequelize})

app.use(session({
   secret: 'secret', // used to sign the cookie
   resave: false, // update session even w/ no changes
   saveUninitialized: true, // always create a session
   store: store,
  cookie: {
     secure: false, // true: only accept https req’s
     maxAge: 2592000, // time in seconds
  },
  })
)
store.sync()



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('./public'));
app.use(logger)

app.engine('html', es6Renderer);
app.set('views', 'templates');
app.set('view engine', 'html');

app.get('/register', (req,res) => {
  res.render('register', {
    locals: {
      title: 'Register',
      error: null
    },
    partials: {
      head: '/partials/head'
    }
  })
})

app.post('/register', (req,res)=>{
  const { email, password } = req.body;
  if(!email || !password){
    res.render('/register', {
      locals: {
        error: 'Please submit all required fields'
      }
    })
    return
  }
  bcrypt.hash(password, 10, (err,hash) => {
    db.User.create({
      email,
      password: hash
    })
    .then((result)=>{
      res.redirect('/login')
    })
  })
})

app.get('/login', (req,res) => {
  res.render('login', {
    locals: {
      title: 'Login',
      error: null
    },
    partials: {
      head: '/partials/head'
    }
  })
})

app.post('/login', (req,res)=>{
  const {email, password} = req.body;
  if(!email || !password){
    res.render('/login', {
      locals: {
        error: 'Please submit all required fields'
      }
    })
    return
  }
  db.User.findOne({
    where: {email},
  })
  .then((user)=>{
    bcrypt.compare(password, user.password, (err, match)=>{
      if(match){
        res.send('YOU LOGGED IN')
      } else {
        res.send('NOPE, WRONG PASSWORD')
      }
    })
  })
})

// GET /api/todos
app.get('/api/todos', (req, res) => {
  db.Todo.findAll()
  .then((todos) =>{
    res.json(todos)
  })
  .catch((error) => {
    console.error(error)
    res.status(500).json({error: 'A Database error occurred'})
  })
});

// GET /api/todos/:id
app.get('/api/todos/:id', (req, res) => {
  const {id} = req.params
  db.Todo.findByPk(id)
  .then((todo) => {
    if(!todo){
      res.status(404).json({error: `Could not find Todo with id: ${id}`});
      return

    }
    res.json(todo)
  })
  .catch((error) => {
    console.error(error)
    res.status(500).json({error: 'A Database error occurred'})
  })

})

// POST /api/todos
app.post('/api/todos', (req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }

  db.Todo.create({
    name: req.body.name
  })
  .then((newTodo) => {
    res.json(newTodo);
  })
  .catch((error) =>{
    console.error(error)
    res.status(500).json({error: "No database"})
  })
});

// PUT /api/todos/:id
app.put('/api/todos/:id', (req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }
  const {id} = req.params
  db.Todo.findByPk(id)
  .then((todo) => {
    if (!todo) {
      res.status(404).json({error: `Could not find Todo with id: ${id}`})
      return;
    }
    todo.name = req.body.name;
    todo.save()
    res.json(todo);
  })
  .catch((error)=>{
    console.log(error)
    res.status(500).json({error: "A database error occurred"})
  })

});

// DELETE /api/todos/:id
app.delete('/api/todos/:id', (req, res) => {
  db.Todo.destroy({
    where: {
      id: req.params.id
    }
  })
  .then((deleted) => {
    if (deleted === 0) {
      res.status(404).json({error: `Could not find Todo with id: ${id}`})
    }
    res.status(204).json()
  })
  .catch((error)=>{
    console.log(error)
    res.status(500).json({error: "A database error occurred"})
  })
});

app.listen(3000, function () {
  console.log('Todo List API is now listening on port 3000...');
});
