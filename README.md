# IBA Launchpad

Public project showcase for the IBA CS builder community.

## Local

```powershell
npm install
npm run check
npm run build
npm run dev
```

## Runtime setup

The deployed app uses Vercel's Astro server adapter. GitHub App credentials are server-side environment variables only.

Required variables are listed in `.env.example`.

GitHub App callback:

`https://YOUR-DOMAIN/api/auth/github/callback`

The app uses GitHub user authorization for sign-in and real GitHub starring, and a GitHub App installation token for writing project/profile records into the Launchpad repository.

Students never need to fork the Launchpad repo or create pull requests. A submission is published as a repository file by the server, then Vercel rebuilds the site automatically.
