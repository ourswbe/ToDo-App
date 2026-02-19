# ToDo App (API + Web UI)

Мини fullstack-приложение ToDo в одном сервисе:

- Backend: Node.js + Express + SQLite
- Web UI: HTML/CSS/JS (без фреймворков)
- Docker-ready на порту `8080`

## Функции

### Модель Task

- `id` (автоинкремент)
- `title` (обязательное поле, 1–100 символов)
- `description` (опционально, до 500 символов)
- `status` (`todo` или `done`)
- `createdAt` (ISO datetime)

### API (`/api`)

- `POST /api/tasks` — создать задачу
- `GET /api/tasks` — список задач
- `GET /api/tasks?status=todo|done` — фильтр по статусу
- `GET /api/tasks/:id` — получить задачу
- `PUT /api/tasks/:id` — полностью обновить задачу
- `PATCH /api/tasks/:id` — частично обновить задачу
- `DELETE /api/tasks/:id` — удалить задачу

### UI

На `http://localhost:8080`:

- добавление задачи (title + description)
- список задач
- фильтры All / Todo / Done
- кнопки Done/Undo (через PATCH)
- кнопка Delete

## Локальный запуск (без Docker)

```bash
npm install
npm start
```

Открыть:

- UI: `http://localhost:8080`
- API: `http://localhost:8080/api/tasks`

## Docker

Сборка и запуск:

```bash
docker build -t todo-app .
docker run -p 8080:8080 todo-app
```

Альтернатива через compose:

```bash
docker compose up --build
```

## Примеры `curl`

### 1) Create task

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","description":"2 liters"}'
```

### 2) List tasks

```bash
curl http://localhost:8080/api/tasks
```

С фильтром:

```bash
curl "http://localhost:8080/api/tasks?status=done"
```

### 3) Patch done

```bash
curl -X PATCH http://localhost:8080/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

### 4) Delete

```bash
curl -X DELETE http://localhost:8080/api/tasks/1 -i
```

## Хранение данных

SQLite база автоматически создаётся при старте приложения.

- DB file: `data/todos.db`
- Таблица `tasks` создаётся через автоинициализацию.
