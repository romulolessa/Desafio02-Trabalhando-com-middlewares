const express = require('express');
const cors = require('cors');
const {validate, v4: uuidv4} = require('uuid')

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(req, res, next) {
    const { username } = req.headers

    const user = users.find(user => user.username === username)
    
    if(!user) {
      return  res.status(404).json({error: "User not found"}) 
    }
    req.user = user
    req.username = username
    return next()
}

function checksCreateTodosUserAvailability(req, res, next) {
  const { username } = req.headers

  const user = users.find(user => user.username === username)

  if(user.todos.length < 10 || user.pro === true){
    next()
  } else{
    return res.status(403).json({ 
      error: 'user has exceeded the todo limits of the free plan' 
    });
  }
}
// Completo
function checksTodoExists(req, res, next) {
  const { username } = req.headers
  const { id } = req.params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const user = users.find(user => user.username === username)
  const todos = user.todos
  const todo = todos.find(todo => todo.id === id)

  if(!user && uuidRegex.test(!id) && !todo ){
    return res.status(400).json({ 
      error: 'user or todo validation error' 
    });
  }
  req
    .todo = todo
    .user = user
  return next()
}

function findUserById(req, res, next) {
    const { id } = req.params
    const user = users.find(user => user.id === id)

    if(!user){
      res.status(404).json({error: "User id not found"}) 
    } else {
      req.user = user 
      return next()
    }
}

app.post('/users', (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return res.status(201).json(user);
});
app.get('/users/:id', findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.patch('/users/:id/pro', findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return res.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return res.json(user);
});
app.get('/todos', checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (req, res) => {
  const { title, deadline } = req.body;
  const { user } = req;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return res.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (req, res) => {
  const { todo } = req;

  todo.done = true;

  return res.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (req, res) => {
  const { user, todo } = req;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return res.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};