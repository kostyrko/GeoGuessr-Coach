import { Routes } from '@angular/router';

import { OverviewPageComponent } from './pages/overview-page.component';
import { PlaceholderPageComponent } from './pages/placeholder-page.component';

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
    component: PlaceholderPageComponent,
    data: {
      description: 'Country metrics need completed, resolved rounds before they can be calculated.',
      eyebrow: 'Performance',
      title: 'Countries',
    },
    path: 'countries',
    title: 'Countries · GeoGuessr Coach',
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
  {
    component: PlaceholderPageComponent,
    data: {
      description: 'Your saved games and individual rounds will appear here automatically.',
      eyebrow: 'Local gameplay data',
      title: 'History',
    },
    path: 'history',
    title: 'History · GeoGuessr Coach',
  },
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
