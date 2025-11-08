# Implementation Checklist

Use this checklist to track your progress setting up global high scores.

## ☁️ Cloudflare Setup

- [ ] Create Cloudflare account (if needed)
- [ ] Create D1 database named `dontclosethis_scores`
- [ ] Run all SQL statements from `schema.sql` in D1 Console
- [ ] Verify tables exist: `SELECT * FROM high_scores LIMIT 1;`
- [ ] Create Worker named `dontclosethis-api`
- [ ] Copy `worker.js` code into Worker editor
- [ ] Update `ALLOWED_ORIGINS` in worker code with your domain(s)
- [ ] Save and deploy Worker
- [ ] Add D1 binding: Variable name `DB`, select your database
- [ ] Test health endpoint: `/api/health`
- [ ] Note your Worker URL: `https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev`

## 🧪 Testing

- [ ] Open `test-api.html` in browser
- [ ] Enter your Worker URL
- [ ] Test health check (should return `{"status": "ok"}`)
- [ ] Submit a test score
- [ ] Fetch scores (should see your test score)
- [ ] Verify score appears in D1 Console: `SELECT * FROM high_scores;`

## 📱 Frontend Integration

### Update HTML Files

- [ ] Add to `index.html` head: `<script src="api-client.js" defer></script>`
- [ ] Add to `game.html` head: `<script src="api-client.js" defer></script>`

### Update api-client.js

- [ ] Copy `api-client.js` to project root
- [ ] Update line 4 with your Worker URL:
  ```javascript
  const API_BASE_URL = 'https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev';
  ```

### Update index.js

- [ ] Replace `loadHighScores()` with version from `index-integration.js`
- [ ] Keep existing code as `loadLocalHighScores()` (fallback)
- [ ] Add API health check in `DOMContentLoaded` event

### Update game.js

- [ ] Update `saveHighScore()` to call `submitScoreToAPI()`
- [ ] Keep localStorage save as backup
- [ ] Optional: Add retry queue for offline submissions
- [ ] Optional: Show global rank in victory message

### Update styles.css (Optional)

- [ ] Add `.highlight-player` style for current player's score
- [ ] Add hover effects for leaderboard rows

## ✅ Verification

- [ ] Play the game and complete a level
- [ ] Check browser console - should see "Score submitted! Rank: #X"
- [ ] Open index page - should see your score in global leaderboard
- [ ] Try from different browser - should see same scores
- [ ] Test with network offline - should fall back to local scores
- [ ] Come back online - should load global scores again

## 🚀 Optional Enhancements

- [ ] Add custom domain: `api.yourdomain.com`
- [ ] Add Cloudflare Turnstile (CAPTCHA) to prevent bots
- [ ] Add analytics tracking
- [ ] Implement offline submission queue
- [ ] Show "Top 10" badge for high scorers
- [ ] Add global rank to victory message
- [ ] Create player stats page (best level, total attempts, etc.)

## 📊 Monitoring

- [ ] Check Worker logs regularly for errors
- [ ] Monitor D1 database size (should stay tiny)
- [ ] Set up Cloudflare email alerts for Worker errors
- [ ] Review top scores for suspicious/cheating activity

## 🔒 Security

- [ ] Verify CORS is working (test from unauthorized domain)
- [ ] Test rate limiting (submit many scores quickly)
- [ ] Try submitting invalid data (should be rejected)
- [ ] Test anti-cheat (submit impossible time like 1 second)
- [ ] Verify IP hashing (IPs should not be visible in database)

## 📝 Documentation

- [ ] Update README with Worker URL for team/contributors
- [ ] Document any custom modifications to worker code
- [ ] Add comments explaining integration changes
- [ ] Keep `cloudflare/` folder for future reference

---

## 🎉 Done!

When all boxes are checked, you have a fully functional global high score system!

**Next Steps:**
- Share your game and watch the leaderboard grow
- Monitor for any issues in Cloudflare logs
- Consider adding more features (achievements, stats, etc.)
- Celebrate your awesome game! 🎊
