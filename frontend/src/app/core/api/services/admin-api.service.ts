import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeatureFlag, Technician } from '../api.types';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private http: HttpClient) {}

  getDashboard(): Observable<{
    total_users: number;
    bookings_today: number;
    bookings_month: number;
    revenue_today: number;
    revenue_month: number;
    pending_bookings: number;
  }> {
    return this.http.get<any>('/admin/dashboard');
  }

  getAnalytics(params: { date_from?: string; date_to?: string } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.date_from) p = p.set('date_from', params.date_from);
    if (params.date_to) p = p.set('date_to', params.date_to);
    return this.http.get<any>('/admin/analytics', { params: p });
  }

  exportCsv(params: { date_from?: string; date_to?: string } = {}): Observable<Blob> {
    let p = new HttpParams();
    if (params.date_from) p = p.set('date_from', params.date_from);
    if (params.date_to) p = p.set('date_to', params.date_to);
    return this.http.get('/admin/analytics/export', { params: p, responseType: 'blob' });
  }

  getAuditLogs(params: object = {}): Observable<any> {
    return this.http.get<any>('/admin/audit-logs', { params: params as HttpParams });
  }

  getFeatureFlags(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>('/feature-flags');
  }

  updateFeatureFlag(id: string, data: Partial<FeatureFlag>): Observable<FeatureFlag> {
    return this.http.put<FeatureFlag>(`/feature-flags/${id}`, data);
  }

  getTechnicians(): Observable<any> {
    return this.http.get<any>('/technicians');
  }

  getWorkload(date: string): Observable<any[]> {
    return this.http.get<any[]>(`/technicians/workload?date=${date}`);
  }
}
