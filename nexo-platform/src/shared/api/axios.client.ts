import axios from 'axios';

const edgeFunctionsUrl =
  import.meta.env.VITE_SUPABASE_URL?.replace('.co', '.functions.supabase.co') ||
  'http://localhost:54321/functions/v1';

export const axiosClient = axios.create({
  baseURL: edgeFunctionsUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
