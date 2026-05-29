"use strict";

const API_URL = "https://jsonplaceholder.typicode.com/todos";
const TASK_LIMIT = 20;

const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const addTaskBtn = document.querySelector("#addTaskBtn");
const taskList = document.querySelector("#taskList");
const activeCount = document.querySelector("#activeCount");
const loader = document.querySelector("#loader");
const errorMessage = document.querySelector("#errorMessage");
const emptyMessage = document.querySelector("#emptyMessage");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.querySelector("#searchInput");

let tasks = [];
let currentFilter = "all";
let searchText = "";

document.addEventListener("DOMContentLoaded", function () {
    loadTasks();
});

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showError("Введіть текст завдання.");
        return;
    }

    addTask(title);
});

taskList.addEventListener("click", function (event) {
    const target = event.target;
    const taskItem = target.closest(".task-item");

    if (!taskItem) {
        return;
    }

    const taskId = Number(taskItem.dataset.id);

    if (target.classList.contains("task-delete")) {
        deleteTask(taskId);
    }

    if (target.classList.contains("task-checkbox")) {
        toggleTask(taskId, target.checked);
    }
});

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        currentFilter = button.dataset.filter;

        filterButtons.forEach(function (item) {
            item.classList.remove("active");
        });

        button.classList.add("active");
        renderTasks();
    });
});

searchInput.addEventListener("input", debounce(function (event) {
    searchText = event.target.value.trim().toLowerCase();
    renderTasks();
}, 300));

searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        searchInput.value = "";
        searchText = "";
        renderTasks();
    }
});

taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        taskInput.value = "";
    }
});

async function loadTasks() {
    showLoader();
    hideError();

    try {
        const response = await fetch(`${API_URL}?_limit=${TASK_LIMIT}`);

        if (!response.ok) {
            throw new Error(`Помилка HTTP: ${response.status}`);
        }

        tasks = await response.json();
        renderTasks();
    } catch (error) {
        showError("Не вдалося завантажити завдання. Спробуйте пізніше.");
        console.error("Помилка завантаження:", error);
    } finally {
        hideLoader();
    }
}

async function addTask(title) {
    showLoader();
    hideError();
    addTaskBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({
                title: title,
                completed: false,
                userId: 1
            })
        });

        if (!response.ok) {
            throw new Error(`Помилка HTTP: ${response.status}`);
        }

        const newTask = await response.json();

        const taskForPage = {
            id: Date.now(),
            title: newTask.title,
            completed: false,
            userId: newTask.userId
        };

        tasks.unshift(taskForPage);
        taskInput.value = "";
        renderTasks();
    } catch (error) {
        showError("Не вдалося створити завдання.");
        console.error("Помилка створення:", error);
    } finally {
        addTaskBtn.disabled = false;
        hideLoader();
    }
}

async function toggleTask(id, completed) {
    showLoader();
    hideError();

    const oldTasks = [...tasks];

    tasks = tasks.map(function (task) {
        if (task.id === id) {
            return {
                ...task,
                completed: completed
            };
        }

        return task;
    });

    renderTasks();

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({
                completed: completed
            })
        });

        if (!response.ok) {
            throw new Error(`Помилка HTTP: ${response.status}`);
        }
    } catch (error) {
        tasks = oldTasks;
        renderTasks();
        showError("Не вдалося оновити завдання.");
        console.error("Помилка оновлення:", error);
    } finally {
        hideLoader();
    }
}

async function deleteTask(id) {
    showLoader();
    hideError();

    const oldTasks = [...tasks];

    tasks = tasks.filter(function (task) {
        return task.id !== id;
    });

    renderTasks();

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`Помилка HTTP: ${response.status}`);
        }
    } catch (error) {
        tasks = oldTasks;
        renderTasks();
        showError("Не вдалося видалити завдання.");
        console.error("Помилка видалення:", error);
    } finally {
        hideLoader();
    }
}

function renderTasks() {
    taskList.innerHTML = "";

    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach(function (task) {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });

    updateActiveCount();
    toggleEmptyMessage(visibleTasks.length === 0);
}

function createTaskElement(task) {
    const li = document.createElement("li");
    li.classList.add("task-item");
    li.dataset.id = task.id;

    if (task.completed) {
        li.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.classList.add("task-checkbox");
    checkbox.setAttribute("aria-label", "Позначити завдання як виконане");

    const span = document.createElement("span");
    span.classList.add("task-title");
    span.textContent = task.title;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("task-delete");
    deleteButton.textContent = "Видалити";

    li.append(checkbox, span, deleteButton);

    return li;
}

function getVisibleTasks() {
    return tasks
        .filter(function (task) {
            if (currentFilter === "active") {
                return !task.completed;
            }

            if (currentFilter === "completed") {
                return task.completed;
            }

            return true;
        })
        .filter(function (task) {
            return task.title.toLowerCase().includes(searchText);
        });
}

function updateActiveCount() {
    const count = tasks.filter(function (task) {
        return !task.completed;
    }).length;

    activeCount.textContent = count;
}

function showLoader() {
    loader.classList.remove("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}

function toggleEmptyMessage(isVisible) {
    if (isVisible) {
        emptyMessage.classList.remove("hidden");
    } else {
        emptyMessage.classList.add("hidden");
    }
}

function debounce(callback, delay) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);

        timeoutId = setTimeout(function () {
            callback.apply(this, args);
        }, delay);
    };
}