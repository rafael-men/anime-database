export const API_BASE = 'http://localhost:3000';
export const ANILIST_API_BASE = 'https://graphql.anilist.co';

export function resolveAssetUrl(path?: string | null): string | null {
   if (!path) {
      return null;
   }

   if (/^(https?:|data:|blob:)/i.test(path)) {
      return path;
   }

   return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const API_ROUTES = {
   auth: {
      login: `${API_BASE}/auth/login`,
      register: `${API_BASE}/auth/register`,
   },
   users: {
      profile: (id: string) => `${API_BASE}/users/${id}`,
      favorites: (id: string) => `${API_BASE}/users/${id}/favorites`,
      favorite: (id: string, animeId: number) => `${API_BASE}/users/${id}/favorites/${animeId}`,
      reviews: (id: string) => `${API_BASE}/users/${id}/reviews`,
      updateProfile: (id: string) => `${API_BASE}/users/${id}/profile`,
      avatar: (id: string) => `${API_BASE}/users/${id}/avatar`,
      kinCount: (characterId: number) => `${API_BASE}/users/kin-count/${characterId}`,
   },
   anime: {
      graphql: `${ANILIST_API_BASE}`,
   },
   reviews: {
      byAnime: (animeId: number) => `${API_BASE}/reviews/anime/${animeId}`,
      create: (userId: string) => `${API_ROUTES.users.reviews(userId)}`,
   },
   groups: {
      base: `${API_BASE}/groups`,
      byId: (id: string) => `${API_BASE}/groups/${id}`,
      items: (id: string) => `${API_BASE}/groups/${id}/items`,
   },
   watchlist: {
      base: `${API_BASE}/watchlist`,
      byId: (id: string) => `${API_BASE}/watchlist/${id}`,
   },
};