import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  userId: number;
  username: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:5294/api/auth';

  constructor(private readonly http: HttpClient) {}

  login(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => this.storeUser(response))
    );
  }

  register(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload).pipe(
      tap((response) => this.storeUser(response))
    );
  }

  logout(): void {
    localStorage.removeItem('todoUser');
  }

  getUser(): AuthResponse | null {
    const raw = localStorage.getItem('todoUser');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    return this.getUser()?.userId ?? null;
  }

  private storeUser(user: AuthResponse): void {
    localStorage.setItem('todoUser', JSON.stringify(user));
  }
}
