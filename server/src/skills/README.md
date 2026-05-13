---
name: express-api
description: Build production-grade REST APIs with Node.js and Express. Use this skill whenever the user wants to create or improve an Express server, define REST routes, connect to a database, add authentication, handle file uploads, write middleware, or structure a Node.js backend. Trigger for requests like "build an Express API", "add a route", "connect to MongoDB/Postgres", "add JWT auth", "set up middleware", or any task where the deliverable is Node/Express backend code. Also trigger when the user is building a full-stack app with React and needs the backend layer.
---

# Express API Development Skill

Produce clean, idiomatic, production-ready Express APIs. Follow REST conventions, structure code for maintainability, and handle errors consistently.

## Project Setup

```bash
mkdir my-api && cd my-api
npm init -y
npm install express cors dotenv helmet morgan
npm install -D nodemon
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

For TypeScript:
```bash
npm install -D typescript ts-node @types/express @types/node nodemon
```

## Project Structure

```
src/
  index.js          ← server bootstrap (port, listen)
  app.js            ← Express app config (middleware, routes)
  routes/
    users.js
    auth.js
  controllers/
    userController.js
  middleware/
    auth.js
    errorHandler.js
    validate.js
  services/
    userService.js  ← business logic
  models/           ← DB schemas / ORM models
  config/
    db.js
.env
```

**Separation rule**: routes define the URL + HTTP verb → controllers orchestrate request/response → services contain business logic and DB calls.

## App Bootstrap

```js
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler (must be last)
app.use(require('./middleware/errorHandler'));

module.exports = app;
```

```js
// src/index.js
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
});
```

## REST Route Design

```js
// routes/users.js
const router = require('express').Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateUser } = require('../middleware/validate');

router.get('/',           authenticate, getUsers);
router.get('/:id',        authenticate, getUserById);
router.post('/',          validateUser, createUser);
router.put('/:id',        authenticate, validateUser, updateUser);
router.delete('/:id',     authenticate, deleteUser);

module.exports = router;
```

**REST conventions**:
- `GET /resources` → list
- `GET /resources/:id` → single item
- `POST /resources` → create (201 response)
- `PUT /resources/:id` → full replace; `PATCH` for partial update
- `DELETE /resources/:id` → delete (204 response)

## Controllers

```js
// controllers/userController.js
const userService = require('../services/userService');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.findAll(req.query);
    res.json({ data: users });
  } catch (err) {
    next(err); // passes to global error handler
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
};
```

## Error Handling

Consistent error middleware — always add this last in `app.js`:

```js
// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

Create a reusable error class:
```js
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
// Usage: throw new AppError('User not found', 404);
```

## Validation

Use **Zod** (or **Joi**) to validate request bodies:

```js
// middleware/validate.js
const { z } = require('zod');

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

exports.validateUser = (req, res, next) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  req.body = result.data; // sanitized
  next();
};
```

## Authentication (JWT)

```bash
npm install jsonwebtoken bcryptjs
```

```js
// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

Login route:
```js
// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};
```

## Database Integration

### MongoDB (Mongoose)
```bash
npm install mongoose
```
```js
// config/db.js
const mongoose = require('mongoose');
exports.connectDB = () => mongoose.connect(process.env.MONGO_URI);

// models/User.js
const { Schema, model } = require('mongoose');
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: String
}, { timestamps: true });
module.exports = model('User', userSchema);
```

### PostgreSQL (Prisma ORM — recommended)
```bash
npm install prisma @prisma/client
npx prisma init
```
```prisma
// prisma/schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
}
```
```bash
npx prisma migrate dev --name init
```
```js
// config/db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.connectDB = async () => { await prisma.$connect(); return prisma; };
exports.prisma = prisma;
```

## Environment Variables

Minimum `.env`:
```
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-here

# Pick one:
MONGO_URI=mongodb://localhost:27017/myapp
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
```

Always add `.env` to `.gitignore`.

## File Uploads

```bash
npm install multer
```
```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/avatar', authenticate, upload.single('file'), (req, res) => {
  res.json({ path: req.file.path });
});
```

## Testing

Use **Jest** + **Supertest**:
```bash
npm install -D jest supertest
```
```js
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/users', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
```

## Full-Stack Integration Notes

When paired with a React frontend (see `react-development` skill):
- All routes live under `/api/` prefix so Vite proxy can forward cleanly
- Return consistent JSON shapes: `{ data: ... }` for success, `{ error: "..." }` for failures
- Set CORS `origin` to the Vite dev server URL (`http://localhost:5173`) in development
- For production, serve the React build from Express or deploy separately and configure CORS accordingly:
  ```js
  // Serve React build from Express (monorepo):
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
  ```
- Auth: return a JWT on login; React stores it in memory or a context and sends it as `Authorization: Bearer <token>` on subsequent requests