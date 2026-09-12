# IBA Launchpad

Launchpad is the public project archive for the IBA CS builder community.

## Architecture

- Astro server application
- Vercel deployment
- GitHub App for writing Launchpad content into `IBA-Launchpad/launchpad`
- GitHub App web authorization for one-time sign-in
- GitHub REST API for public repository metadata and star counts
- Local filesystem writes during development, so project/profile changes can be tested without pushing
- Public project data stored as Markdown in `src/content/projects`

## GitHub stars

Launchpad shows live public GitHub star counts and sends users to the real GitHub repository to star it. It does not ask the Launchpad GitHub App for permission to modify arbitrary third-party repositories.

GitHub's user access tokens for GitHub Apps are limited to resources accessible by both the user and the app. That makes direct starring of arbitrary student repositories a poor fit for a minimal-permission Launchpad GitHub App. See GitHub's REST API documentation for the required Starring permission and resource-access rules.

## Local development

Copy `.env.example` to `.env` and fill in your GitHub App values.

For the App private key on Windows, prefer:

```env
GITHUB_PRIVATE_KEY_PATH=D:/launchpad/github-app.pem
```

Keep the PEM outside the repository or ensure it is ignored by `.gitignore`.

Then:

```powershell
npm install
npm run check
npm run build
npm run dev
```

Open `http://localhost:4321`.

## Important production variables

```text
GITHUB_APP_ID
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_PRIVATE_KEY
GITHUB_INSTALLATION_ID
GITHUB_ORG=IBA-Launchpad
GITHUB_REPO=launchpad
SESSION_SECRET
```

The GitHub App must have at least:

- Repository: Metadata read
- Repository: Contents read/write

Install it on `IBA-Launchpad/launchpad`.

Callback URLs:

```text
https://iba-launchpad.vercel.app/api/auth/github/callback
http://localhost:4321/api/auth/github/callback
```
