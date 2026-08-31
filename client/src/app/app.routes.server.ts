import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'anime/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'character/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'groups/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
