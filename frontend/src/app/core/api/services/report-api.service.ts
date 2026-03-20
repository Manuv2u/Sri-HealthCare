import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse, Report } from '../api.types';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  constructor(private http: HttpClient) {}

  list(params: { page?: number; page_size?: number } = {}): Observable<PaginatedResponse<Report>> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    return this.http.get<PaginatedResponse<Report>>('/reports', { params: p });
  }

  getDownloadUrl(id: string): Observable<{ download_url: string }> {
    return this.http.get<{ download_url: string }>(`/reports/${id}/download-url`);
  }

  upload(bookingId: string, file: File): Observable<Report> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Report>(`/reports/upload?booking_id=${bookingId}`, form);
  }
}
