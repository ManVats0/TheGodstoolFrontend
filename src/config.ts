// Addresses of our two services. Set VITE_API_URL (Python service) and VITE_AUTH_URL (Node service) in Railway;
// the defaults here are for running on your own computer.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
export const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:4000'
