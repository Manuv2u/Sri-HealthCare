import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LabBranch } from '../api.types';

@Injectable({ providedIn: 'root' })
export class LabBranchApiService {
  constructor(private http: HttpClient) {}

  list(): Observable<LabBranch[]> {
    return this.http
      .get<{ items: LabBranch[]; total: number; page: number; page_size: number }>('/lab-branches')
      .pipe(map(r => r.items));
  }
}
