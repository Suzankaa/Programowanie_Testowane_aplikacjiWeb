import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthResponse } from './auth.service';
import { TodoItem, TodoService } from './todo.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  todos: TodoItem[] = [];
  newTitle = '';
  newDueDate = '';
  loading = false;
  error = '';
  authError = '';
  authMode: 'login' | 'register' = 'login';
  authUsername = '';
  authPassword = '';
  currentUser: AuthResponse | null = null;
  isEditOpen = false;
  editTarget: TodoItem | null = null;
  editTitle = '';
  editDueDate = '';

  constructor(
    private readonly todoService: TodoService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser) {
      this.loadTodos();
    }
  }

  get doneCount(): number {
    return this.todos.filter((todo) => todo.isDone).length;
  }

  get openCount(): number {
    return this.todos.filter((todo) => !todo.isDone).length;
  }

  loadTodos(): void {
    this.loading = true;
    this.error = '';

    this.todoService.getTodos().subscribe({
      next: (todos) => {
        this.todos = todos;
        this.loading = false;
      },
      error: () => {
        this.error = 'Nie moge pobrac listy. Sprawdz, czy API dziala.';
        this.loading = false;
      }
    });
  }

  switchAuthMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.authError = '';
  }

  submitAuth(): void {
    const username = this.authUsername.trim();
    const password = this.authPassword.trim();

    if (!username || !password) {
      this.authError = 'Podaj login i haslo.';
      return;
    }

    this.authError = '';
    const action = this.authMode === 'login'
      ? this.authService.login({ username, password })
      : this.authService.register({ username, password });

    action.subscribe({
      next: (user) => {
        this.currentUser = user;
        this.authUsername = '';
        this.authPassword = '';
        this.todos = [];
        this.loadTodos();
      },
      error: () => {
        this.authError = this.authMode === 'login'
          ? 'Nieprawidlowy login lub haslo.'
          : 'Nie udalo sie zarejestrowac.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.todos = [];
    this.newTitle = '';
    this.newDueDate = '';
  }

  addTodo(): void {
    if (!this.currentUser) {
      this.error = 'Zaloguj sie, aby dodawac zadania.';
      return;
    }

    const title = this.newTitle.trim();
    if (!title) {
      this.error = 'Podaj tytul zadania.';
      return;
    }

    const dueAt = this.newDueDate ? new Date(this.newDueDate).toISOString() : null;

    this.todoService.createTodo({ title, dueAt }).subscribe({
      next: (todo) => {
        this.todos = [todo, ...this.todos];
        this.newTitle = '';
        this.newDueDate = '';
        this.error = '';
      },
      error: () => {
        this.error = 'Nie udalo sie dodac zadania.';
      }
    });
  }

  toggleTodo(todo: TodoItem): void {
    if (!this.currentUser) {
      this.error = 'Zaloguj sie, aby edytowac zadania.';
      return;
    }

    this.todoService.updateTodo(todo.id, { isDone: !todo.isDone }).subscribe({
      next: (updated) => {
        this.todos = this.todos.map((item) => (item.id === updated.id ? updated : item));
      },
      error: () => {
        this.error = 'Nie udalo sie zaktualizowac zadania.';
      }
    });
  }

  deleteTodo(todo: TodoItem): void {
    if (!this.currentUser) {
      this.error = 'Zaloguj sie, aby usuwac zadania.';
      return;
    }

    this.todoService.deleteTodo(todo.id).subscribe({
      next: () => {
        this.todos = this.todos.filter((item) => item.id !== todo.id);
      },
      error: () => {
        this.error = 'Nie udalo sie usunac zadania.';
      }
    });
  }

  editTodo(todo: TodoItem): void {
    if (!this.currentUser) {
      this.error = 'Zaloguj sie, aby edytowac zadania.';
      return;
    }

    this.editTarget = todo;
    this.editTitle = todo.title;
    this.editDueDate = todo.dueAt ? this.toDateInputValue(todo.dueAt) : '';
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
    this.editTarget = null;
    this.editTitle = '';
    this.editDueDate = '';
  }

  saveEdit(): void {
    if (!this.editTarget) {
      return;
    }

    const title = this.editTitle.trim();
    if (!title) {
      this.error = 'Tytul nie moze byc pusty.';
      return;
    }

    const payload: { title: string; dueAt?: string } = { title };
    if (this.editDueDate) {
      payload.dueAt = new Date(this.editDueDate).toISOString();
    }

    this.todoService.updateTodo(this.editTarget.id, payload).subscribe({
      next: (updated) => {
        this.todos = this.todos.map((item) => (item.id === updated.id ? updated : item));
        this.error = '';
        this.closeEdit();
      },
      error: () => {
        this.error = 'Nie udalo sie zaktualizowac zadania.';
      }
    });
  }

  private toDateInputValue(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  }
}
