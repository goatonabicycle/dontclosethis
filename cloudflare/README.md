# Global High Scores for "Don't Close This"

This folder contains everything you need to set up a **global, cloud-based high score system** using Cloudflare's free tier.

## 📁 Files in this Folder

| File | Purpose |
|------|---------|
| `SETUP.md` | **START HERE** - Complete step-by-step setup guide using Cloudflare dashboard |
| `worker.js` | Cloudflare Worker API code (paste into dashboard) |
| `schema.sql` | Database schema for D1 (run in Cloudflare console) |
| `index-integration.js` | Code snippets to add to your `index.js` |
| `game-integration.js` | Code snippets to add to your `game.js` |

## 🚀 Quick Start

1. **Read `SETUP.md`** - Follow the step-by-step guide (no CLI needed!)
2. **Copy `worker.js`** to Cloudflare Workers dashboard
3. **Run `schema.sql`** statements in D1 Console
4. **Add `api-client.js`** to your HTML files
5. **Update your JS files** using the integration code

## ✨ Features

### What You Get:
- ✅ **Global leaderboard** - All players see the same scores
- ✅ **Real-time updates** - Scores appear immediately after submission
- ✅ **Offline support** - Falls back to localStorage if API is down
- ✅ **Loading states** - Shows "Loading..." while fetching
- ✅ **Player highlighting** - Your score is highlighted on the leaderboard
- ✅ **Rank tracking** - See your global rank after completing the game
- ✅ **Statistics** - Total players, total scores submitted
- ✅ **Top 10 badge** - Special message if you make top 10

### Security:
- ✅ **Origin validation** - Only your domain can submit scores
- ✅ **Rate limiting** - Prevents spam submissions
- ✅ **Input validation** - All data is validated before saving
- ✅ **Anti-cheat** - Impossibly fast times are rejected
- ✅ **Privacy** - IP addresses are hashed, not stored
- ✅ **SQL injection prevention** - Uses prepared statements

## 📊 How It Works

```
┌─────────────────┐
│  Your Browser   │
│  (game.html)    │
└────────┬────────┘
         │
         │ 1. Submit score
         │ POST /api/scores
         │
         ▼
┌─────────────────────────┐
│  Cloudflare Worker      │
│  (Edge Network)         │
│  - Validate input       │
│  - Check rate limits    │
│  - Save to database     │
└────────┬────────────────┘
         │
         │ 2. Store in D1
         │
         ▼
┌─────────────────────────┐
│  D1 Database            │
│  (SQL Storage)          │
│  - high_scores table    │
│  - Indexed queries      │
└─────────────────────────┘
         │
         │ 3. Fetch leaderboard
         │ GET /api/scores
         │
         ▼
┌─────────────────┐
│  All Players    │
│  See Same Board │
└─────────────────┘
```

## 🎯 API Endpoints

### POST `/api/scores` - Submit Score
```json
Request:
{
  "playerName": "ALICE",
  "level": 13,
  "timeElapsed": 245,
  "sessionId": "uuid-here"
}

Response:
{
  "success": true,
  "rank": 42,
  "isTopTen": false,
  "message": "Score saved!"
}
```

### GET `/api/scores` - Get Leaderboard
```
Query: ?limit=10&playerName=ALICE

Response:
{
  "globalTop": [
    { "rank": 1, "playerName": "ALICE", "level": 13, "timeElapsed": 180 },
    ...
  ],
  "playerRank": {
    "rank": 42,
    "playerName": "ALICE",
    "level": 12,
    "timeElapsed": 300
  },
  "stats": {
    "totalPlayers": 1234,
    "totalScores": 5678
  }
}
```

### GET `/api/health` - Health Check
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## 💰 Costs (Cloudflare Free Tier)

| Resource | Free Tier | Your Usage | Cost |
|----------|-----------|------------|------|
| Workers Requests | 100k/day | ~1k/day | $0 |
| D1 Reads | 5M/day | ~10k/day | $0 |
| D1 Writes | 100k/day | ~1k/day | $0 |
| D1 Storage | 5GB | <1MB | $0 |
| Bandwidth | Unlimited | - | $0 |

**Total: $0/month** (unless you go viral! 🚀)

## 🔒 Security Best Practices

### Already Implemented:
1. ✅ CORS validation (only your domain allowed)
2. ✅ Input sanitization (XSS prevention)
3. ✅ SQL injection prevention (prepared statements)
4. ✅ Rate limiting (per IP)
5. ✅ Anti-cheat timing checks
6. ✅ Session tracking

### Recommended Additions:
1. **Cloudflare Turnstile** (free CAPTCHA) - Add to submission form
2. **Custom domain** - Use `api.yourdomain.com` instead of `*.workers.dev`
3. **Request signing** - HMAC signatures for extra security
4. **Analytics** - Track API usage, popular levels, etc.

## 🐛 Troubleshooting

### "Origin not allowed"
- Check `ALLOWED_ORIGINS` in `worker.js` includes your domain
- Redeploy worker after changes

### "Failed to fetch"
- Check network tab in browser DevTools
- Verify Worker URL is correct in `api-client.js`
- Check CORS headers in response

### Database errors
- Make sure all SQL statements from `schema.sql` ran successfully
- Verify D1 binding is named exactly `DB`
- Check Worker logs for error details

### Scores not appearing
- Check browser console for errors
- Verify API health: `yourworker.workers.dev/api/health`
- Try submitting a test score manually (see `SETUP.md`)

## 📈 Monitoring

### View Logs:
1. Go to Cloudflare dashboard
2. Workers & Pages > Your Worker
3. Click "Logs" tab
4. See real-time requests, errors, console.log

### View Database:
1. Workers & Pages > D1 > Your Database
2. Click "Console" tab
3. Run queries:
   ```sql
   -- See all scores
   SELECT * FROM high_scores ORDER BY level DESC, time_elapsed ASC LIMIT 20;

   -- Count total players
   SELECT COUNT(DISTINCT player_name) FROM high_scores;

   -- Average time per level
   SELECT level, AVG(time_elapsed) as avg_time
   FROM high_scores
   GROUP BY level
   ORDER BY level;
   ```

## 🎨 Optional Enhancements

### 1. Real-time Updates (Advanced)
Use Cloudflare Durable Objects to push live updates to all connected players when someone beats a top score.

### 2. Rich Statistics
Track and display:
- Most difficult level (highest failure rate)
- Average completion time per level
- Player progression (how far most players get)
- Geographic distribution (country flags)

### 3. Achievements System
- "Speed Demon" - Complete game in under 2 minutes
- "Persistent" - Fail 100 times but keep trying
- "Perfect Run" - No deaths

### 4. Social Features
- Share score on Twitter
- Challenge friends with a link
- Weekly tournaments

## 📚 Further Reading

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Workers KV for Caching](https://developers.cloudflare.com/kv/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)

## 🆘 Need Help?

1. Check `SETUP.md` troubleshooting section
2. Review Worker logs in dashboard
3. Test API endpoints manually (curl or Postman)
4. Check browser console for errors
5. Cloudflare Community Discord: https://discord.cloudflare.com

---

**Ready to get started?** Open `SETUP.md` and follow the step-by-step guide! 🚀
