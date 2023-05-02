require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const cron = require("node-cron");
const { configs } = require("./configs");
const { prisma } = require("../db");

setInterval(async () => {
  return;
  try {
    let posts = await prisma.posts.findMany({
      where: { isPosted: false, tweetUsersId: { gt: 0 } },
      include: { TweetUsers: true },
      take: 1,
      orderBy: { dateCreation: "asc" },
    });
    for (let post of posts) {
      console.log("post", post.id);
      await bot.telegram.sendMediaGroup(configs.chatId, [
        {
          type: "photo",
          media: { url: post.thumbUrl },
          caption: `"${post.TweetUsers.screenName}"\r\n------------\r\n${post.fullText}`,
        },
      ]);
      await prisma.posts.update({
        where: { id: post.id },
        data: { isPosted: true },
      });
    }
  } catch (err) {
    console.log(err);
  }
}, 5000);

bot.start(async (ctx) => {
  ctx.reply("hello again");
});
bot.hears("hey", async (ctx) => {
  await ctx.reply("hello");
});

bot.command("settings", async (ctx) => {
  return await ctx.reply(
    "this is text",
    Markup.keyboard([
      ["🔍Search terms", "⌛Scan interval"], // Row1 with 2 buttons
      [""], // Row2 with 2 buttons
    ])
      .oneTime()
      .resize()
  );
});

bot.launch().then(() => {
  console.log("Bot started");
});
console.log("go");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
