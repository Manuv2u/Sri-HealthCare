import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceArea } from '../api.types';

@Injectable({ providedIn: 'root' })
export class ServiceAreaApiService {
  constructor(private http: HttpClient) {}

  list(): Observable<ServiceArea[]> {
    const params = new HttpParams().set('active_only', 'true').set('page_size', '200');
    return this.http
      .get<{ items: ServiceArea[] }>('/service-areas', { params })
      .pipe(map(r => r.items));
  }

  notifyMe(pincode: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/service-areas/notify-me', { pincode });
  }
}
