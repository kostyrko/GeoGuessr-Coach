import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  // Extension pages have no server rewrite for nested URLs; hash routing keeps
  // browser refreshes on index.html while preserving the selected screen.
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes, withHashLocation())],
};
