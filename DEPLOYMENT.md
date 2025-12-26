# Deployment Guide

This application is built with React + Vite and uses Supabase for the backend.

## Prerequisites

- Node.js installed locally.
- A Supabase project set up.

## Build and Deploy

### 1. Environment Variables

Create a `.env` file in the root directory (or set these in your hosting provider's dashboard) with the following keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 2. Build

Run the following command to create a production build:

```bash
npm run build
```

This will generate a `dist` directory containing the static files.

### 3. Hosting Options

#### Netlify
1.  Log in to Netlify.
2.  "Add new site" -> "Import from existing project".
3.  Connect to your Git repository.
4.  Build settings:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
5.  Add your Environment Variables in "Site settings" -> "Build & deploy" -> "Environment".

#### Vercel
1.  Log in to Vercel.
2.  "Add New..." -> "Project".
3.  Import your Git repository.
4.  Vercel should auto-detect Vite. check settings:
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  Add Environment Variables in the "Environment Variables" section.

#### Manual
You can serve the `dist` folder using any static file server, e.g., `serve`:

```bash
npm install -g serve
serve -s dist
```
