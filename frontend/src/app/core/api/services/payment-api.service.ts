import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payment, BookingPayment, Refund } from '../api.types';

export interface MarkCashReceivedRequest {
  method: string;
  amount: number;
  received_at: string;
  notes?: string;
}

export interface RefundStatusUpdateRequest {
  status: 'approved' | 'completed' | 'failed';
  remarks?: string;
  transaction_reference?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  constructor(private http: HttpClient) {}

  initiate(booking_id: string, method: string): Observable<Payment> {
    return this.http.post<Payment>('/payments/initiate', { booking_id, method });
  }

  getInvoice(paymentId: string): Observable<Blob> {
    return this.http.get(`/payments/${paymentId}/invoice`, { responseType: 'blob' });
  }

  markCashReceived(paymentId: string, body: MarkCashReceivedRequest): Observable<BookingPayment> {
    return this.http.post<BookingPayment>(`/payments/${paymentId}/mark-paid`, body);
  }

  updateRefundStatus(refundId: string, body: RefundStatusUpdateRequest): Observable<Refund> {
    return this.http.put<Refund>(`/payments/refunds/${refundId}/status`, body);
  }
}
