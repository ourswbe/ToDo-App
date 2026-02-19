const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'todos.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const getQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });

const allQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });

const validateTitle = (title) => {
  if (typeof title !== 'string' || title.trim().length === 0) {
    return 'title is required';
  }
  if (title.trim().length > 100) {
    return 'title must be between 1 and 100 characters';
  }
  return null;
};

const validateDescription = (description) => {
  if (description === undefined || description === null) {
    return null;
  }
  if (typeof description !== 'string') {
    return 'description must be a string';
  }
  if (description.length > 500) {
    return 'description must be at most 500 characters';
  }
  return null;
};

const validateStatus = (status) => {
  if (status === undefined) {
    return null;
  }
  if (status !== 'todo' && status !== 'done') {
    return 'status must be either "todo" or "done"';
  }
  return null;
};

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/tasks', async (req, res) => {
  const { status } = req.query;
  const statusError = validateStatus(status);

  if (statusError) {
    res.status(400).json({ error: statusError });
    return;
  }

  const rows = status
    ? await allQuery('SELECT * FROM tasks WHERE status = ? ORDER BY id DESC', [status])
    : await allQuery('SELECT * FROM tasks ORDER BY id DESC');

  res.json(rows);
});

app.post('/api/tasks', async (req, res) => {
  const { title, description = '' } = req.body;

  const titleError = validateTitle(title);
  if (titleError) {
    res.status(400).json({ error: titleError });
    return;
  }

  const descriptionError = validateDescription(description);
  if (descriptionError) {
    res.status(400).json({ error: descriptionError });
    return;
  }

  const createdAt = new Date().toISOString();
  const cleanTitle = title.trim();

  const result = await runQuery(
    `INSERT INTO tasks (title, description, status, createdAt)
     VALUES (?, ?, 'todo', ?)`,
    [cleanTitle, description, createdAt]
  );

  const task = await getQuery('SELECT * FROM tasks WHERE id = ?', [result.id]);
  res.status(201).json(task);
});

app.get('/api/tasks/:id', async (req, res) => {
  const task = await getQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) {
    res.status(404).json({ error: 'task not found' });
    return;
  }

  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { title, description = '', status } = req.body;

  const titleError = validateTitle(title);
  if (titleError) {
    res.status(400).json({ error: titleError });
    return;
  }

  const descriptionError = validateDescription(description);
  if (descriptionError) {
    res.status(400).json({ error: descriptionError });
    return;
  }

  const statusError = validateStatus(status);
  if (statusError) {
    res.status(400).json({ error: statusError });
    return;
  }

  const updateResult = await runQuery(
    'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?',
    [title.trim(), description, status, req.params.id]
  );

  if (updateResult.changes === 0) {
    res.status(404).json({ error: 'task not found' });
    return;
  }

  const task = await getQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const allowedFields = ['title', 'description', 'status'];
  const fields = Object.keys(req.body);

  if (fields.length === 0) {
    res.status(400).json({ error: 'at least one field is required' });
    return;
  }

  const invalidField = fields.find((field) => !allowedFields.includes(field));
  if (invalidField) {
    res.status(400).json({ error: `invalid field: ${invalidField}` });
    return;
  }

  if (req.body.title !== undefined) {
    const titleError = validateTitle(req.body.title);
    if (titleError) {
      res.status(400).json({ error: titleError });
      return;
    }
  }

  if (req.body.description !== undefined) {
    const descriptionError = validateDescription(req.body.description);
    if (descriptionError) {
      res.status(400).json({ error: descriptionError });
      return;
    }
  }

  if (req.body.status !== undefined) {
    const statusError = validateStatus(req.body.status);
    if (statusError) {
      res.status(400).json({ error: statusError });
      return;
    }
  }

  const existingTask = await getQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!existingTask) {
    res.status(404).json({ error: 'task not found' });
    return;
  }

  const updatedTask = {
    title: req.body.title !== undefined ? req.body.title.trim() : existingTask.title,
    description: req.body.description !== undefined ? req.body.description : existingTask.description,
    status: req.body.status !== undefined ? req.body.status : existingTask.status
  };

  await runQuery(
    'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?',
    [updatedTask.title, updatedTask.description, updatedTask.status, req.params.id]
  );

  const task = await getQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const result = await runQuery('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  if (result.changes === 0) {
    res.status(404).json({ error: 'task not found' });
    return;
  }

  res.status(204).send();
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({ error: 'invalid JSON body' });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ error: 'internal server error' });
});

const initializeDb = async () => {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('todo', 'done')),
      createdAt TEXT NOT NULL
    )
  `);
};

initializeDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize DB:', error);
    process.exit(1);
  });
