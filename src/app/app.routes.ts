import { Routes } from '@angular/router';

import { OverviewPageComponent } from './pages/overview-page.component';
import { HistoryPageComponent } from './pages/history-page.component';
import { PlaceholderPageComponent } from './pages/placeholder-page.component';
import { CountriesPageComponent } from './pages/countries-page.component';
import { CountryDetailPageComponent } from './pages/country-detail-page.component';
import { PracticePageComponent } from './pages/practice-page.component';
import { SettingsPageComponent } from './pages/settings-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { component: OverviewPageComponent, path: 'overview', title: 'Overview · GeoGuessr Coach' },
  {
    loadComponent: () =>
      import('./pages/world-map-page.component').then((module) => module.WorldMapPageComponent),
    path: 'world-map',
    title: 'World Map · GeoGuessr Coach',
  },
  {
    component: CountriesPageComponent,
    path: 'countries',
    title: 'Countries · GeoGuessr Coach',
  },
  {
    component: CountryDetailPageComponent,
    path: 'countries/:countryCode',
    title: 'Country Detail · GeoGuessr Coach',
  },
  {
    component: PracticePageComponent,
    path: 'practice',
    title: 'Practice · GeoGuessr Coach',
  },
  { component: HistoryPageComponent, path: 'history', title: 'History · GeoGuessr Coach' },
  {
    component: SettingsPageComponent,
    path: 'settings',
    title: 'Settings · GeoGuessr Coach',
  },
  { path: '**', redirectTo: 'overview' },
];
