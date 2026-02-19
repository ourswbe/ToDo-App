const taskList = document.getElementById('task-list');
const message = document.getElementById('message');
const taskForm = document.getElementById('task-form');
const filters = document.getElementById('filters');

let currentFilter = 'all';

const setMessage = (text, isError = true) => {
  message.textContent = text;
  message.style.color = isError ? '#c53030' : '#2f855a';
};

const fetchTasks = async () => {
  const query = currentFilter === 'all' ? '' : `?status=${currentFilter}`;
  const response = await fetch(`/api/tasks${query}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to load tasks');
  }

  return response.json();
};

const createTaskItem = (task) => {
  const li = document.createElement('li');
  li.className = `task-item ${task.status === 'done' ? 'done' : ''}`;

  const info = document.createElement('div');

  const title = document.createElement('strong');
  title.className = 'task-title';
  title.textContent = task.title;

  const description = document.createElement('p');
  description.className = 'task-meta';
  description.textContent = task.description || 'No description';

  const createdAt = document.createElement('small');
  createdAt.textContent = `Created: ${new Date(task.createdAt).toLocaleString()}`;

  info.append(title, description, createdAt);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const toggleButton = document.createElement('button');
  toggleButton.textContent = task.status === 'done' ? 'Undo' : 'Done';
  toggleButton.addEventListener('click', async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' })
      }).then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to update task');
        }
      });

      setMessage('Task updated', false);
      await renderTasks();
    } catch (error) {
      setMessage(error.message);
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.className = 'danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to delete task');
        }
      });

      setMessage('Task deleted', false);
      await renderTasks();
    } catch (error) {
      setMessage(error.message);
    }
  });

  actions.append(toggleButton, deleteButton);
  li.append(info, actions);

  return li;
};

const renderTasks = async () => {
  try {
    const tasks = await fetchTasks();
    taskList.innerHTML = '';

    if (tasks.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No tasks found.';
      taskList.appendChild(empty);
      return;
    }

    tasks.forEach((task) => {
      taskList.appendChild(createTaskItem(task));
    });
  } catch (error) {
    setMessage(error.message);
  }
};

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const formData = new FormData(taskForm);
  const payload = {
    title: formData.get('title'),
    description: formData.get('description')
  };

  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Failed to create task');
    }

    taskForm.reset();
    setMessage('Task added', false);
    await renderTasks();
  } catch (error) {
    setMessage(error.message);
  }
});

filters.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) {
    return;
  }

  currentFilter = button.dataset.filter;
  Array.from(filters.querySelectorAll('button')).forEach((filterButton) => {
    filterButton.classList.toggle('active', filterButton.dataset.filter === currentFilter);
  });

  await renderTasks();
});

renderTasks();
