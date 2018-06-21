// ./server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const User = require('./users/UserModel.js');

const server = express();
const secret = "toss me, but don't tell the elf!"; //moved it here since multiple functions would use the same secret

const corsOptions = {
  // origin: 'http://localhost:3000', // allow only the React application to connect
  credentials: true, // sets the Access-Control-Allow-Credentials CORS header
};

server.use(express.json());
server.use(cors(corsOptions));

server.post('/api/register', (req, res) => {
  User.create(req.body)
    .then(user => {
      const token = generateToken(user);

      res.status(201).json({ username: user.username, token });
    })
    .catch(err => res.status(500).json(err));
});

server.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username })
    .then(user => {
      if (user) {
        user
          .validatePassword(password)
          .then(passwordsMatch => {
            if (passwordsMatch) {
              // generate token
              const token = generateToken(user); //this is synchronous

              // send token to the client
              res.status(200).json({ message: `welcome ${username}!`, token });
            } else {
              res.status(401).send('invalid credentials');
            }
          })
          .catch(err => {
            res.send('error comparing passwords');
          });
      } else {
        res.status(401).send('invalid credentials');
      }
    })
    .catch(err => {
      res.send(err);
    });
});

function generateToken(user) {
  const options = {
    expiresIn: '1h',
  };
  const payload = { name: user.username, race: user.race };

  // sign the token
  return jwt.sign(payload, secret, options);
}

function restricted(req, res, next) {
  const token = req.headers.authorization;

  if (token) { //token authentication on server side
    jwt.verify(token, secret, (err, decodedToken) => {
      console.log(decodedToken);
      if(err){
        return res
          .status(401)
          .json({ message: 'you shall not pass! not decoded' });
      }

      next();
    });
  } else {
    res.status(401).json({ message: 'you shall not pass! no token' });
  }
}

server.get('/api/users', restricted, (req, res) => {
  User.find({})
    .select('username')
    .then(users => {
      res.status(200).json(users);
    })
    .catch(err => {
      return res.status(500).json(err);
    });
});

const port = process.env.PORT || 5000;
mongoose
  .connect('mongodb://localhost/cs10jwt')
  .then(() => {
    console.log('\n=== Connected to MongoDB ===');
    server.listen(port, (req, res) => {
      console.log(`\n=== API up on port ${port} ===\n`);
    });
  })
  .catch(err =>
    console.log('\n=== Error connecting to MongoDb, is it running? ===\n', err)
  );
