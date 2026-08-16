import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  template: `<section class="page-header" aria-labelledby="page-title">
      <p class="eyebrow">{{ page.eyebrow }}</p>
      <h1 id="page-title">{{ page.title }}</h1>
      <p>{{ page.description }}</p>
    </section>
    <section class="empty-page" aria-labelledby="empty-title">
      <span aria-hidden="true">◌</span>
      <h2 id="empty-title">Nothing to show yet</h2>
      <p>{{ page.description }}</p>
      <a href="https://www.geoguessr.com/" target="_blank" rel="noreferrer"
        >Open GeoGuessr <span aria-hidden="true">↗</span></a
      >
    </section>`,
  styleUrl: './pages.scss',
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly page = this.route.snapshot.data as {
    description: string;
    eyebrow: string;
    title: string;
  };
}
