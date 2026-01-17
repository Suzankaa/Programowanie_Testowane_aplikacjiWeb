import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface TodoItem {
  id: number;
  title: string;
  isDone: boolean;
  createdAt: string;
  dueAt?: string | null;
}

export interface CreateTodoRequest {
  title: string;
  dueAt?: string | null;
}

export interface UpdateTodoRequest {
  title?: string | null;
  isDone?: boolean | null;
  dueAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly baseUrl = 'http://localhost:5294/api/todos';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getTodos(): Observable<TodoItem[]> {
    return this.http.get<TodoItem[]>(this.baseUrl, { headers: this.authHeaders() });
  }

  createTodo(payload: CreateTodoRequest): Observable<TodoItem> {
    return this.http.post<TodoItem>(this.baseUrl, payload, { headers: this.authHeaders() });
  }

  updateTodo(id: number, payload: UpdateTodoRequest): Observable<TodoItem> {
    return this.http.put<TodoItem>(`${this.baseUrl}/${id}`, payload, { headers: this.authHeaders() });
  }

  deleteTodo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() });
  }

  private authHeaders(): Record<string, string> {
    const userId = this.authService.getUserId();
    return userId ? { 'X-User-Id': String(userId) } : {};
  }
}
