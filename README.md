# TweetMan

## TweetMan is designed to scrape Twitter posts and repost them on Telegram

# Prerequisites

1. [Nodejs (at least version 16)](https://nodejs.org)</br>
   verify correct version is installed by running
   ```
   node -v
   ```
2. [PM2](https://pm2.keymetrics.io/)

# Setup

1. rename the "example.env" file to ".env" and fill in the required values
2. run the following commands. </br>

```
npm install
npx prisma db push
```

# Run it with PM2

1. to start the Scraper run:

```
pm2 start scraper.js
```

2. to start the Telegram Bot run:

```
pm2 start ./tgbot/bot.js
```
