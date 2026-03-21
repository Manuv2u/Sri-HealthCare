import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payment } from '../api.types';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  constructor(private http: HttpClient) {}

  initiate(booking_id: string, method: string): Observable<Payment> {
    return this.http.post<Payment>('/api/v1/payments/initiate', { booking_id, method });
  }

  getInvoice(paymentId: string): Observable<Blob> {
    return this.http.get(`/api/v1/payments/${paymentId}/invoice`, { responseType: 'blob' });
  }
}
