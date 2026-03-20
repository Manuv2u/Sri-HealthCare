import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { baseUrlInterceptor } from './core/api/base-url.interceptor';
import { jwtInterceptor } from './core/api/jwt.interceptor';
import { refreshInterceptor } from './core/api/refresh.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([baseUrlInterceptor, jwtInterceptor, refreshInterceptor])),
    provideAnimations(),
  ],
};
