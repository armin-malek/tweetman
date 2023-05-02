const { default: axios } = require("axios");
const cron = require("node-cron");
const { prisma } = require("./db");
const moment = require("moment");

cron.schedule(
  "* * * * *",
  async () => {
    console.log("running a task every minute");

    try {
      //await axios.get("");
      let searchTerms = await prisma.searchTerms.findMany();
      //searchTerms = searchTerms.filter((x)=> moment().diff(x.lastFetch))
      //   await prisma.searchTerms.updateMany({
      //     data: { lastFetch: moment().toISOString() },
      //   });

      searchTerms = searchTerms.filter(
        (x) => moment().diff(x.lastFetch, "seconds") > 5 * 60
      );
      console.log("searchTerms", searchTerms);

      for (let searchTerm of searchTerms) {
        const response = await axios.get(
          `https://twitter.com/i/api/2/search/adaptive.json?tweet_mode=extended&include_entities=true&include_user_entities=true&simple_quoted_tweet=true&query_source=typeahead_click&count=20&requestContext=launch&pc=1&spelling_corrections=1&include_ext_edit_control=true&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Cvibe`,
          {
            params: { q: searchTerm.text },
            headers: {
              authorization:
                "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
              "x-guest-token": "1647601497797013504",
              "x-twitter-client-language": "en",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
            },
          }
        );

        console.log("data", response.data);
      }
    } catch (err) {
      console.log("err", err);
      console.log("code", err.response.status);
    }
  },
  { runOnInit: true }
);
/*
async function main() {
  
}
main();
*/
