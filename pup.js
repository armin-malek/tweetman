// import puppeteer from "puppeteer";
const puppeteer = require("puppeteer");
const fs = require("fs");
const { sleep } = require("./function");
const { prisma } = require("./db");
const moment = require("moment/moment");
(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  await page.goto("https://twitter.com/");
  console.log("navigated");
  await page.waitForSelector(`input[placeholder="Search Twitter"]`);
  await sleep(2000);
  /*
  await page.waitForFunction(
    'document.querySelector("body").innerText.includes("Trends for you")'
  );
  */
  console.log("loaded");

  await page.click(`input[placeholder="Search Twitter"]`);
  console.log("clicked");

  await page.type(`input[placeholder="Search Twitter"]`, "#FIFA", {
    delay: 50,
  });

  await page.keyboard.press("Enter");

  // await page.waitForResponse(
  //   "https://twitter.com/i/api/2/search/adaptive.json"
  // );
  const response = await page.waitForResponse((response) =>
    response
      .url()
      .startsWith("https://twitter.com/i/api/2/search/adaptive.json")
  );
  if (!response.ok()) {
    console.log("faild");
    return;
  }
  let json = JSON.parse(await response.text());
  //console.log("response", json);

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
        mediaType: tweet.medias[0]?.type || undefined,
        thumbUrl: tweet.medias[0]?.thumb || undefined,
        tweetUrl: tweet.medias[0]?.tweetUrl || undefined,
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
  fs.promises.writeFile("./tweets.json", JSON.stringify(tweets));
  fs.promises.writeFile("./resp.json", JSON.stringify(json));

  /*
  // Type into search box
  await page.type(".search-box__input", "automate beyond recorder");

  // Wait and click on first result
  const searchResultSelector = ".search-box__link";
  await page.waitForSelector(searchResultSelector);
  await page.click(searchResultSelector);

  // Locate the full title with a unique string
  const textSelector = await page.waitForSelector(
    "text/Customize and automate"
  );
  const fullTitle = await textSelector.evaluate((el) => el.textContent);

  // Print the full title
  console.log('The title of this blog post is "%s".', fullTitle);
  await browser.close();
  */
})();
