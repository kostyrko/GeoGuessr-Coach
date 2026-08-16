import { Routes } from '@angular/router';

import { OverviewPageComponent } from './pages/overview-page.component';
import { HistoryPageComponent } from './pages/history-page.component';
import { PlaceholderPageComponent } from './pages/placeholder-page.component';
import { CountriesPageComponent } from './pages/countries-page.component';
import { CountryDetailPageComponent } from './pages/country-detail-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { component: OverviewPageComponent, path: 'overview', title: 'Overview · GeoGuessr Coach' },
  {
    component: PlaceholderPageComponent,
    data: {
      description:
        'Your country-level performance will appear here after completed games are saved.',
      eyebrow: 'Geographic overview',
      title: 'World Map',
    },
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
    component: PlaceholderPageComponent,
    data: {
      description:
        'Recommendations will be shown after enough completed rounds build a trustworthy profile.',
      eyebrow: 'Coaching',
      title: 'Practice',
    },
    path: 'practice',
    title: 'Practice · GeoGuessr Coach',
  },
  { component: HistoryPageComponent, path: 'history', title: 'History · GeoGuessr Coach' },
  {
    component: PlaceholderPageComponent,
    data: {
      description: 'Backup, restore, and data-management controls will live here.',
      eyebrow: 'Local-first controls',
      title: 'Settings',
    },
    path: 'settings',
    title: 'Settings · GeoGuessr Coach',
  },
  { path: '**', redirectTo: 'overview' },
];
