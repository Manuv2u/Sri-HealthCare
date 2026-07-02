import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeatureFlag, Technician } from '../api.types';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private http: HttpClient) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard(): Observable<any> {
    return this.http.get<any>('/admin/dashboard');
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(params: { page?: number; page_size?: number; q?: string; role?: string; is_active?: string } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.page)      p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    if (params.q)         p = p.set('q', params.q);
    if (params.role)      p = p.set('role', params.role);
    if (params.is_active !== undefined && params.is_active !== '') p = p.set('is_active', params.is_active);
    return this.http.get<any>('/admin/users', { params: p });
  }

  getUserStats(): Observable<any> {
    return this.http.get<any>('/admin/users/stats');
  }

  activateUser(id: string): Observable<any> {
    return this.http.patch<any>(`/admin/users/${id}/activate`, {});
  }

  deactivateUser(id: string): Observable<any> {
    return this.http.patch<any>(`/admin/users/${id}/deactivate`, {});
  }

  changeUserRole(id: string, newRole: 'user' | 'technician'): Observable<any> {
    return this.http.patch<any>(`/admin/users/${id}/change-role`, { new_role: newRole });
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics(params: { date_from?: string; date_to?: string } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.date_from) p = p.set('date_from', params.date_from);
    if (params.date_to)   p = p.set('date_to', params.date_to);
    return this.http.get<any>('/admin/analytics', { params: p });
  }

  exportCsv(params: { date_from?: string; date_to?: string } = {}): Observable<Blob> {
    let p = new HttpParams();
    if (params.date_from) p = p.set('date_from', params.date_from);
    if (params.date_to)   p = p.set('date_to', params.date_to);
    return this.http.get('/admin/analytics/export', { params: p, responseType: 'blob' });
  }

  getAuditLogs(params: Record<string, any> = {}): Observable<any> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p = p.set(k, v); });
    return this.http.get<any>('/admin/audit-logs', { params: p });
  }

  // ── Feature flags ──────────────────────────────────────────────────────────
  getFeatureFlags(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>('/feature-flags');
  }

  updateFeatureFlag(id: string, data: Partial<FeatureFlag>): Observable<FeatureFlag> {
    return this.http.put<FeatureFlag>(`/feature-flags/${id}`, data);
  }

  // ── Technicians ────────────────────────────────────────────────────────────
  getTechnicians(): Observable<any> {
    return this.http.get<any>('/technicians');
  }

  createTechnician(data: Partial<Technician>): Observable<Technician> {
    return this.http.post<Technician>('/technicians', data);
  }

  createTechnicianAccount(data: { name: string; phone: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>('/technicians/create-account', data);
  }

  updateTechnician(id: string, data: Partial<Technician>): Observable<Technician> {
    return this.http.put<Technician>(`/technicians/${id}`, data);
  }

  deleteTechnician(id: string): Observable<void> {
    return this.http.delete<void>(`/technicians/${id}`);
  }

  getWorkload(date: string): Observable<any[]> {
    return this.http.get<any[]>(`/technicians/workload?date=${date}`);
  }

  // ── Booking assignment ───────────────────────────────────────────────────────
  assignTechnician(technicianId: string, bookingId: string): Observable<any> {
    return this.http.post<any>(`/technicians/${technicianId}/assign`, { booking_id: bookingId });
  }

  autoAssignTechnician(bookingId: string): Observable<any> {
    return this.http.post<any>(`/bookings/${bookingId}/auto-assign`, {});
  }
}
