import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly navigation = [
    { icon: '⌂', label: 'Overview', path: '/overview' },
    { icon: '◉', label: 'World Map', path: '/world-map' },
    { icon: '▤', label: 'Countries', path: '/countries' },
    { icon: '↗', label: 'Practice', path: '/practice' },
    { icon: '◷', label: 'History', path: '/history' },
    { icon: '⚙', label: 'Settings', path: '/settings' },
  ];

  protected refreshDashboard(): void {
    window.location.reload();
  }
}
