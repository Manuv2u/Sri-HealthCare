import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceArea } from '../api.types';

@Injectable({ providedIn: 'root' })
export class ServiceAreaApiService {
  constructor(private http: HttpClient) {}

  list(): Observable<ServiceArea[]> {
    return this.http.get<ServiceArea[]>('/service-areas');
  }

  notifyMe(pincode: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/service-areas/notify-me', { pincode });
  }
}
