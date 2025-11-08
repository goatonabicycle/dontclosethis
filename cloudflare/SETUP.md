# Cloudflare Setup Guide - Don't Close This Global High Scores

This guide walks you through setting up the global high scores API using **only the Cloudflare dashboard** (no CLI required).

## Prerequisites

1. A Cloudflare account (free tier is fine)
2. Your game hosted somewhere with a domain (GitHub Pages, Cloudflare Pages, etc.)

---

## Step 1: Create D1 Database

1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages** in the left sidebar
3. Click the **D1** tab
4. Click **Create Database**
5. Name it: `dontclosethis_scores`
6. Click **Create**

### Initialize Database Schema

1. Click on your newly created database
2. Click the **Console** tab
3. Copy each SQL statement from `schema.sql` and run them **one at a time**:
   - First: `CREATE TABLE IF NOT EXISTS high_scores...`
   - Then: `CREATE INDEX IF NOT EXISTS idx_level_time...`
   - Then: `CREATE INDEX IF NOT EXISTS idx_player...`
   - Continue for all CREATE statements
4. Verify tables exist by running: `SELECT * FROM high_scores LIMIT 1;`

---

## Step 2: Create Cloudflare Worker

1. Go back to **Workers & Pages** > **Overview**
2. Click **Create Application**
3. Select **Create Worker**
4. Name it: `dontclosethis-api`
5. Click **Deploy**
6. Once deployed, click **Edit Code**

### Upload Worker Code

1. Delete all existing code in the editor
2. Open `worker.js` from this folder
3. **IMPORTANT**: Update line 21-25 with your actual domain(s):
   ```javascript
   ALLOWED_ORIGINS: [
     'http://localhost:3000',        // For local testing
     'https://your-actual-domain.com', // Your production domain
   ],
   ```
4. Copy the entire `worker.js` file
5. Paste it into the Cloudflare editor
6. Click **Save and Deploy**

---

## Step 3: Bind Database to Worker

1. Go to your Worker page (Workers & Pages > dontclosethis-api)
2. Click **Settings** tab
3. Click **Variables and Secrets** in the left menu
4. Scroll to **D1 Database Bindings** section
5. Click **Add binding**
6. Set:
   - **Variable name**: `DB`
   - **D1 database**: Select `dontclosethis_scores`
7. Click **Save**
8. Click **Deploy** to apply changes

---

## Step 4: Test Your API

### Get Your Worker URL

Your worker URL will be: `https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev`

Find it on your Worker's page under "Preview".

### Test Health Endpoint

Open in browser:
```
https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Test Submit Score (using curl or Postman)

```bash
curl -X POST https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev/api/scores \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "playerName": "TEST",
    "level": 5,
    "timeElapsed": 100,
    "sessionId": "test-session-123"
  }'
```

Should return:
```json
{
  "success": true,
  "rank": 1,
  "isTopTen": true,
  "message": "🎉 You made the top 10!"
}
```

### Test Get Scores

Open in browser:
```
https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev/api/scores?limit=10
```

Should return:
```json
{
  "globalTop": [
    {
      "rank": 1,
      "playerName": "TEST",
      "level": 5,
      "timeElapsed": 100
    }
  ],
  "playerRank": null,
  "stats": {
    "totalPlayers": 1,
    "totalScores": 1
  }
}
```

---

## Step 5: Update Frontend Code

See `api-client.js` for the frontend integration code you'll need to add to your project.

**Update the API URL** in `api-client.js` line 4:
```javascript
const API_BASE_URL = 'https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev';
```

---

## Step 6: Configure CORS (Important!)

In `worker.js`, you **must** update `ALLOWED_ORIGINS` with your actual domain:

```javascript
ALLOWED_ORIGINS: [
  'http://localhost:3000',              // Local testing
  'http://127.0.0.1:3000',              // Local testing alternative
  'https://your-game.pages.dev',        // If using Cloudflare Pages
  'https://yourdomain.com',             // Your custom domain
  'https://www.yourdomain.com',         // WWW variant
],
```

This prevents other websites from submitting fake scores to your API.

---

## Troubleshooting

### "Origin not allowed" error
- Check that your domain is listed in `ALLOWED_ORIGINS` in `worker.js`
- Make sure to include the protocol (`https://` or `http://`)
- Redeploy the worker after making changes

### "Failed to save score" error
- Check that the D1 database binding is set up correctly
- Variable name must be exactly `DB`
- Verify the database exists and has tables (run a SELECT query in Console)

### Database errors
- Make sure all CREATE TABLE and CREATE INDEX statements ran successfully
- Check for typos in column names
- Verify indexes exist: `SELECT * FROM sqlite_master WHERE type='index';`

### Worker not updating
- After editing code, you must click **Save and Deploy**
- Changes to Variables/Bindings require a separate **Deploy** button click
- Clear your browser cache or test in incognito mode

---

## Monitoring & Logs

1. Go to your Worker page
2. Click **Logs** tab (or **Logs (Real-time)** in newer dashboard)
3. You'll see all requests, errors, and console.log outputs
4. Use this to debug issues in production

---

## Costs (Free Tier Limits)

- **Workers**: 100,000 requests/day FREE
- **D1**: 5GB storage, 5 million reads/day, 100,000 writes/day FREE
- **Bandwidth**: Unlimited on Workers

For this game, you should stay well within free limits unless you go viral! 🚀

---

## Optional: Custom Domain

Instead of `*.workers.dev`, you can use your own domain:

1. Add your domain to Cloudflare (if not already)
2. Go to Worker > Settings > Triggers
3. Click **Add Custom Domain**
4. Enter: `api.yourdomain.com`
5. Cloudflare will automatically create DNS records

Then use: `https://api.yourdomain.com/api/scores`

---

## Security Notes

✅ **Already Implemented:**
- Origin validation (CORS)
- IP hashing (privacy)
- Input validation
- SQL injection prevention (prepared statements)
- Anti-cheat timing checks

⚠️ **Consider Adding:**
- Cloudflare Turnstile (free CAPTCHA) for submission form
- Rate limiting per session/IP (requires KV namespace)
- Request signing with HMAC (more advanced)

---

## Need Help?

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- D1 Documentation: https://developers.cloudflare.com/d1/
- Community Discord: https://discord.cloudflare.com
