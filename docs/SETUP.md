# IBA Launchpad setup

## 1. Create the repository

Create a **public** repository named `launchpad` inside `IBA-Launchpad`. Leave it completely empty. Do not initialize README, .gitignore, or license.

## 2. GitHub App

Create a GitHub App owned by the `IBA-Launchpad` organization.

Use:

- Homepage: your Vercel URL
- Callback: `https://YOUR-DOMAIN.vercel.app/api/auth/github/callback`
- Setup: `https://YOUR-DOMAIN.vercel.app/api/github/setup`
- Request user authorization (OAuth): ON
- Installation: Any account
- Repository permissions: Contents = Read and write; Metadata = Read-only
- User permissions: Starring = Read and write
- Webhooks: OFF for v1

Install the App on the `IBA-Launchpad` organization and select only the `launchpad` repository.

Generate a private key.

## 3. Vercel environment variables

Set:

`GITHUB_APP_ID`
`GITHUB_CLIENT_ID`
`GITHUB_CLIENT_SECRET`
`GITHUB_PRIVATE_KEY`
`GITHUB_INSTALLATION_ID`
`GITHUB_ORG=IBA-Launchpad`
`GITHUB_REPO=launchpad`
`SESSION_SECRET`

`SESSION_SECRET` must be random and at least 32 characters.

The private key may contain actual newlines or literal `\\n`; the code accepts both.

## 4. Installation ID

After the app is installed, GitHub redirects to `/api/github/setup`. Copy the displayed `installation_id` into Vercel as `GITHUB_INSTALLATION_ID`, then redeploy.

## 5. Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Do not commit `.env`.

## 6. Developer Program

Once the GitHub App is actually using the GitHub API, register the app/account for the GitHub Developer Program. GitHub documents that registered members building an app with the GitHub API receive the Developer Program Member badge on their profile.
