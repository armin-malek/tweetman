require("dotenv").config();
// const puppeteer = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const { sleep } = require("./function");
const { prisma } = require("./db");
const moment = require("moment");

const SEARCH_COOLDOWN = parseInt(process.env.SEARCH_COOLDOWN);

(async () => {
  // Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      //"--incognito"
      "--proxy-server=127.0.0.1:2081",
    ],
  });
  console.log("browser launched");
  const page = await browser.newPage();
  page.setCookie({
    name: "auth_token",
    value: process.env.AUTH_TOKEN,
    domain: ".twitter.com",
    path: "/",
  });

  await doScrape(browser);
})();

async function doScrape(browser) {
  console.log("doScrape");
  let page;
  try {
    const searchTerms = await prisma.searchTerms.findMany({
      orderBy: { id: "asc" },
    });
    let searchTerm;
    for (let item of searchTerms) {
      if (
        !item.lastFetch ||
        moment(item.lastFetch)
          .add(SEARCH_COOLDOWN, "seconds")
          .isBefore(moment())
      ) {
        searchTerm = item;
        break;
      }
    }
    console.log("searchTerm", searchTerm);

    if (!searchTerm) {
      reRun(browser);
      return;
    }
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto("https://twitter.com/explore");
    console.log("navigated");
    await page.waitForSelector(`input[placeholder="Search Twitter"]`);
    await sleep(2000);

    console.log("loaded");

    await page.click(`input[placeholder="Search Twitter"]`);
    console.log("clicked");

    await page.type(`input[placeholder="Search Twitter"]`, searchTerm.text, {
      delay: 50,
    });

    await sleep(500);

    await page.keyboard.press("Enter");

    const response = await page.waitForResponse((response) =>
      response
        .url()
        .startsWith("https://twitter.com/i/api/2/search/adaptive.json")
    );
    if (!response.ok()) {
      console.log("faild", searchTerm.text);
      reRun(browser);
      return;
    }
    let json = JSON.parse(await response.text());

    let tweets = [];
    Object.keys(json.globalObjects.tweets).map((x) => {
      let user =
        json.globalObjects.users[json.globalObjects.tweets[x].user_id_str];
      tweets.push({
        id: x,
        full_text: json.globalObjects.tweets[x].full_text,
        hashTags: json.globalObjects.tweets[x].entities?.hashtags?.map(
          (tag) => tag.text
        ),
        medias: json.globalObjects.tweets[x].extended_entities?.media?.map(
          (media) => ({
            thumb: media?.media_url_https,
            type: media?.type,
            tweetUrl: media?.url,
          })
        ),
        user: {
          name: user.name,
          screen_name: user.screen_name,
          user_id: user.id_str,
        },
      });
    });
    console.log("tweets", tweets.length);

    for (let tweet of tweets) {
      await prisma.posts.upsert({
        where: { messageID: tweet.id },
        update: {},
        create: {
          messageID: tweet.id,
          fullText: tweet.full_text,
          isPosted: false,
          dateCreation: moment().toISOString(),
          mediaType: tweet.medias ? tweet.medias[0]?.type : undefined,
          thumbUrl: tweet.medias ? tweet.medias[0]?.thumb : undefined,
          tweetUrl: tweet.medias ? tweet.medias[0]?.tweetUrl : undefined,
          TweetUsers: {
            connectOrCreate: {
              where: { userID: tweet.user.user_id },
              create: {
                userID: tweet.user.user_id,
                name: tweet.user.name,
                screenName: tweet.user.screen_name,
              },
            },
          },
        },
      });
    }

    await prisma.searchTerms.update({
      where: { id: searchTerm.id },
      data: { lastFetch: moment().toISOString() },
    });

    reRun(browser);
  } catch (err) {
    console.log(err);
    page?.close();
  }
}

function reRun(browser) {
  setTimeout(() => {
    doScrape(browser);
  }, 10000);
}
