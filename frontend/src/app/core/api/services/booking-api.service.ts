import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, PaginatedResponse } from '../api.types';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  constructor(private http: HttpClient) {}

  create(data: object): Observable<Booking> {
    return this.http.post<Booking>('/bookings', data);
  }

  list(params: { page?: number; page_size?: number } = {}): Observable<PaginatedResponse<Booking>> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    return this.http.get<PaginatedResponse<Booking>>('/bookings', { params: p });
  }

  get(id: string): Observable<Booking> {
    return this.http.get<Booking>(`/bookings/${id}`);
  }

  cancel(id: string, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`/bookings/${id}/cancel`, { reason });
  }

  reschedule(id: string, data: { slot_id: string; booking_date: string }): Observable<Booking> {
    return this.http.post<Booking>(`/bookings/${id}/reschedule`, data);
  }

  getMyAssigned(params: { page?: number; page_size?: number; status?: string } = {}): Observable<PaginatedResponse<Booking>> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    if (params.status) p = p.set('status', params.status);
    return this.http.get<PaginatedResponse<Booking>>('/bookings/my-assigned', { params: p });
  }

  updateStatus(id: string, bookingStatus: string): Observable<Booking> {
    return this.http.put<Booking>(`/bookings/${id}/status`, { status: bookingStatus });
  }

  addRemarks(id: string, notes: string): Observable<Booking> {
    return this.http.post<Booking>(`/bookings/${id}/remarks`, { notes });
  }
}
