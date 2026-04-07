import axios from 'axios';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
);

axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;
