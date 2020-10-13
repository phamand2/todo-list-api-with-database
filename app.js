const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./models')
const es6Renderer = require('express-es6-template-engine')
const bcrypt = require('bcrypt')
const morgan = require('morgan')
const logger = morgan('tiny')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const store = new SequelizeStore({ db: db.sequelize })

app.use(cookieParser()); 

app.use(
  session({
    secret: 'secret', // used to sign the cookie
    resave: false, // update session even w/ no changes
    saveUninitialized: true, // always create a session
    store: store,
  })
  );
  store.sync()
  
  
  app.use((req,res,next)=>{
    console.log('=====USER======')
    console.log(req.session.user)
    console.log('=====++++======')
    next()
  })
  

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('./public'));
app.use(logger)

app.engine('html', es6Renderer);
app.set('views', 'templates');
app.set('view engine', 'html');

function checkAuth(req,res,next){
  if (req.session.user) {
    next()
  } else {
    res.redirect('/login');
  }
}

app.get('/', checkAuth, (req,res)=>{
  res.render('index', {
    locals: {
      user: req.session.user
    }
  });
})


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
        req.session.user = user;
        res.redirect('/');
      } else {
        res.render('/login', {
          locals: {
            error: 'Incorrect password. Please try again.'
          }
        })
      }
      return;
    })
  })
})

app.get('/logout',(req,res) => {
  req.session.user = null;
  res.redirect('/login')
})

app.use('/api*', checkAuth)

// GET /api/todos
app.get('/api/todos', (req, res) => {
  db.Todo.findAll({
    where: {
      UserId: req.session.user.id
    }
  })
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
  db.Todo.findOne({
    where: {
      id:id,
      UserId: req.session.user.id
    }
  })
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
    name: req.body.name,
    UserId: req.session.user.id
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
  const {id} = req.params
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }
  db.Todo.findOne({
    where: {
      id: id,
      UserId: req.session.user.id
    }
  })
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
  const {id} = req.params
  db.Todo.destroy({
    where: {
      id: req.params.id,
      UserId: req.session.user.id
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

app.patch('/api/todos/:id/check', (req,res)=>{
  const {id} = req.params
  db.Todo.findOne({
    where: {
      id: id,
      UserId: req.session.user.id
    }
  })
  .then((todo) => {
    if (!todo) {
      res.status(404).json({error: `Could not find Todo with id: ${id}`})
      return
    }
    todo.complete = !todo.complete
    todo.save()
    res.json(todo)
  })
})


app.listen(3000, function () {
  console.log('Todo List API is now listening on port 3000...');
});
