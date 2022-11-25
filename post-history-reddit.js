import './env.js';
import snoowrap from 'snoowrap';

/*
  1. Fill out nns Map key/value pairs.
  2. Fill out params.txt file with keys.
  3. Run with: cat params.txt | while read -r param; do node post-history-reddit.js $param; done
*/

const args = process.argv.slice(2);
const nanoNarrativesSubreddit = "NanoNarratives";
const nns = new Map([
  ["23/11/2022","The ‘Sit Here’ COVID stickers were deftly stripped off the train seats and placed on hands, faces and crotches by the gang of city-bound party-goers."],
  ["24/11/2022","The Indian myna birds harassed the larger magpie, weighed down as it was with a discarded slice of Wonder White from the asphalt of a school playground."]
]);

var redditConfig = {
  username: process.env.R_USERNAME,
  password: process.env.R_PASSWORD,
  clientId: process.env.R_CLIENT,
  clientSecret: process.env.R_SECRET,
}
const r = new snoowrap({
  userAgent: 'fd547db4-3227-429c-9ca5-34c23e07a60f',
  clientId: redditConfig.clientId,
  clientSecret: redditConfig.clientSecret,
  username: redditConfig.username,
  password: redditConfig.password,
})

// Reddit ---------------------------->

function publishReddit() {
  console.log(" Posting for " + args[0]);
  r.getSubreddit(nanoNarrativesSubreddit).submitSelfpost({
    title: args[0],
    text: nns.get(args[0]),
  })
}

function post() {
  publishReddit();
}

post();
