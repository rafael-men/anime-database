export const API_BASE = 'http://localhost:3000';
export const ANILIST_API_BASE = 'https://graphql.anilist.co';

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
   },
   anime: {
      graphql: `${ANILIST_API_BASE}`,
      translate: (text: string) =>
         `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`,
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