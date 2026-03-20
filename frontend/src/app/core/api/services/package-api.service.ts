import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Package, PaginatedResponse } from '../api.types';

@Injectable({ providedIn: 'root' })
export class PackageApiService {
  constructor(private http: HttpClient) {}

  list(): Observable<PaginatedResponse<Package>> {
    return this.http.get<PaginatedResponse<Package>>('/packages');
  }

  get(id: string): Observable<Package> {
    return this.http.get<Package>(`/packages/${id}`);
  }
}
