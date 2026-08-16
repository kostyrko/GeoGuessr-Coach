import { Component } from '@angular/core';

@Component({
  selector: 'app-overview-page',
  template: `
    <section class="page-header" aria-labelledby="overview-title">
      <p class="eyebrow">Personal improvement, locally stored</p>
      <h1 id="overview-title">Overview</h1>
      <p>Play GeoGuessr normally. This dashboard turns completed games into clear next steps.</p>
    </section>
    <section class="empty-hero" aria-labelledby="empty-games-title">
      <span class="empty-icon" aria-hidden="true">◎</span>
      <div>
        <h2 id="empty-games-title">No games analyzed yet</h2>
        <p>Play a supported GeoGuessr game. Completed rounds will appear here automatically.</p>
      </div>
      <a href="https://www.geoguessr.com/" target="_blank" rel="noreferrer"
        >Open GeoGuessr <span aria-hidden="true">↗</span></a
      >
    </section>
    <section class="dashboard-grid" aria-label="Dashboard empty states">
      <article class="card summary-card">
        <p class="card-label">Performance snapshot</p>
        <div class="metric-grid">
          <div><span>Recognition</span><strong>—</strong><small>No rounds yet</small></div>
          <div><span>Average score</span><strong>—</strong><small>No rounds yet</small></div>
          <div>
            <span>Rounds played</span><strong>0</strong><small>Waiting for a completed game</small>
          </div>
        </div>
      </article>
      <article class="card recommendation-card">
        <p class="card-label">Next practice</p>
        <h2>Not enough data yet</h2>
        <p>
          More completed rounds are needed before GeoGuessr Coach can make a reliable
          recommendation.
        </p>
        <span class="status-pill">Confidence: unavailable</span>
      </article>
      <article class="card map-card">
        <div class="card-heading">
          <p class="card-label">World proficiency</p>
          <span>Country level</span>
        </div>
        <div
          class="map-placeholder"
          role="img"
          aria-label="World proficiency map unavailable until games are collected"
        >
          <span aria-hidden="true">◌</span>
          <p>Map data will appear after completed rounds are analyzed.</p>
        </div>
      </article>
      <article class="card queue-card">
        <p class="card-label">Practice queue</p>
        <h2>Your queue is ready to grow</h2>
        <p>Play a few completed rounds to build your first country-level practice queue.</p>
      </article>
    </section>
  `,
  styleUrl: './pages.scss',
})
export class OverviewPageComponent {}
