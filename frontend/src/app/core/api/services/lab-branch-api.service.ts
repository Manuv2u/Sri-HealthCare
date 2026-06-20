import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LabBranch } from '../api.types';

interface LabBranchListResponse { items: LabBranch[]; total: number; page: number; page_size: number; }

@Injectable({ providedIn: 'root' })
export class LabBranchApiService {
  constructor(private http: HttpClient) {}

  list(): Observable<LabBranch[]> {
    return this.http.get<LabBranchListResponse>('/lab-branches').pipe(
      map((r: LabBranchListResponse) => r.items)
    );
  }

  listAdmin(page = 1, pageSize = 50): Observable<LabBranch[]> {
    return this.http.get<LabBranchListResponse>(`/lab-branches?page=${page}&page_size=${pageSize}&include_inactive=true`).pipe(
      map((r: LabBranchListResponse) => r.items)
    );
  }

  create(data: Partial<LabBranch>): Observable<LabBranch> {
    return this.http.post<LabBranch>('/lab-branches', data);
  }

  update(id: string, data: Partial<LabBranch>): Observable<LabBranch> {
    return this.http.put<LabBranch>(`/lab-branches/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/lab-branches/${id}`);
  }
}
