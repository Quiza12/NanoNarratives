import graph from 'fbgraph';
import Twitter from 'twitter';
import fs from 'fs';
import { promisify } from 'util';
import { parse } from 'csv-parse';
import './env.js';
import fetch from 'node-fetch';
import snoowrap from 'snoowrap';
import nodemailer from 'nodemailer';

// Mode ---------------------------->

// true  = read secrets from process.env (your local env.js)
// false = read secrets passed as command line args by GitHub Actions
const LOCAL = false;

// Order must match the order of the args in the GitHub Actions workflow
const ARG_ORDER = [
  'CONSUMER_KEY',        // 1
  'CONSUMER_SECRET',     // 2
  'ACCESS_TOKEN_KEY',    // 3
  'ACCESS_TOKEN_SECRET', // 4
  'IG_UAT',              // 5
  'IG_USER_ID',          // 6
  'M_INTEGRATION_TOKEN', // 7
  'R_USERNAME',          // 8
  'R_PASSWORD',          // 9
  'R_CLIENT',            // 10
  'R_SECRET',            // 11
  'FB_PAT',              // 12
  'FB_PAGE_ID',          // 13
  'E_USERNAME',          // 14
  'E_PASSWORD',          // 15
  'THREADS_UAT',         // 16
  'THREADS_USER_ID',     // 17
];

const args = process.argv.slice(2);
const cfg = LOCAL
  ? process.env
  : Object.fromEntries(ARG_ORDER.map((name, i) => [name, args[i]]));

// Config ---------------------------->

// Local runs default to everything off so testing never posts by accident;
// flip on just the one you're testing. Scheduled runs use the live set.
const enabled = LOCAL
  ? {
      instagram: false,
      facebook: false,
      reddit: false,
      threads: true,
      twitter: false,
      medium: false,
      email: false,
    }
  : {
      instagram: true,
      facebook: true,
      reddit: true,
      threads: true,
      twitter: false,
      medium: false,
      email: true,
    };

const IMAGE_BASE = 'https://raw.githubusercontent.com/Quiza12/NanoNarratives/master/images/';
const THREADS_BASE = 'https://graph.threads.net/v1.0';
const THREADS_CHAR_LIMIT = 500;
const THREADS_TOPIC_TAG = 'Author Threads'; // one tag per post; no periods or ampersands
const TWITTER_CHAR_LIMIT = 280;
const DATE_OVERRIDE = null; // e.g. '02/04/2026' (dd/mm/yyyy)

const graphOptions = {
  timeout: 30000,
  pool: { maxSockets: Infinity },
  headers: { connection: 'keep-alive' },
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const graphPost = promisify(graph.setOptions(graphOptions).post.bind(graph));
const graphGet = promisify(graph.setOptions(graphOptions).get.bind(graph));

// General ---------------------------->

function getToday() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();

  const caption = DATE_OVERRIDE ?? `${dd}/${mm}/${yyyy}`;
  const [d, m, y] = caption.split('/');

  return { caption, imageName: `${d}${m}${y}` };
}

function findNarrative(date) {
  return new Promise((resolve, reject) => {
    let narrative = null;
    fs.createReadStream('./nn.csv')
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => { if (row[0] === date) narrative = row[1]; })
      .on('error', reject)
      .on('end', () => resolve(narrative));
  });
}

async function buildContext() {
  const { caption, imageName } = getToday();
  const narrative = await findNarrative(caption);
  if (!narrative) throw new Error(`No narrative found in nn.csv for ${caption}`);

  return {
    caption,
    narrative,
    imageUrl: `${IMAGE_BASE}${imageName}.jpg`,
  };
}

// Posters: each takes the shared context and returns a promise ---------------------------->

async function postInstagram({ caption, imageUrl }) {
  graph.setAccessToken(cfg.IG_UAT);
  const userId = cfg.IG_USER_ID;

  const container = await graphPost(
    `${userId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}`
  );
  if (!container.id) throw new Error('Media container not created: ' + JSON.stringify(container));

  // Poll until the container is ready to publish
  const maxRetries = 10;
  const delayMs = 2000;
  let status = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await sleep(delayMs);
    const poll = await graphGet(`${container.id}?fields=status_code`);
    status = poll.status_code;
    console.log(`  Container status (attempt ${attempt}): ${status}`);

    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error('Media container status: ' + status);
  }
  if (status !== 'FINISHED') throw new Error('Media container not ready after polling');

  await graphPost(`${userId}/media_publish?creation_id=${container.id}`);
}

async function postFacebook({ caption, imageUrl }) {
  graph.setAccessToken(cfg.FB_PAT);

  await graphPost(
    `${cfg.FB_PAGE_ID}/photos?url=${encodeURIComponent(imageUrl)}&message=${encodeURIComponent(caption)}`
  );
}

async function postReddit({ caption, narrative }) {
  const r = new snoowrap({
    userAgent: 'fd547db4-3227-429c-9ca5-34c23e07a60f',
    clientId: cfg.R_CLIENT,
    clientSecret: cfg.R_SECRET,
    username: cfg.R_USERNAME,
    password: cfg.R_PASSWORD,
  });

  await r.getSubreddit('NanoNarratives').submitSelfpost({
    title: caption,
    text: narrative,
  });
}

async function postThreads({ caption, narrative }) {
  const text = `${caption} - ${narrative}`;
  if (text.length > THREADS_CHAR_LIMIT) {
    throw new Error(`Post is ${text.length} chars; Threads limit is ${THREADS_CHAR_LIMIT}`);
  }

  const userId = cfg.THREADS_USER_ID;
  const token = cfg.THREADS_UAT;

  const createRes = await fetch(`${THREADS_BASE}/${userId}/threads`, {
    method: 'POST',
    body: new URLSearchParams({
      media_type: 'TEXT',
      text,
      topic_tag: THREADS_TOPIC_TAG,
      access_token: token,
    }),
  });
  const container = await createRes.json();
  if (!container.id) throw new Error('Container failed: ' + JSON.stringify(container));

  await sleep(5000); // text posts process quickly; images need ~30s

  const pubRes = await fetch(`${THREADS_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  });
  const pub = await pubRes.json();
  if (!pub.id) throw new Error('Publish failed: ' + JSON.stringify(pub));
}

async function postTwitter({ narrative }) {
  if (narrative.length > TWITTER_CHAR_LIMIT) {
    throw new Error('Tweet too long, need to manually post twice');
  }

  const client = new Twitter({
    consumer_key: cfg.CONSUMER_KEY,
    consumer_secret: cfg.CONSUMER_SECRET,
    access_token_key: cfg.ACCESS_TOKEN_KEY,
    access_token_secret: cfg.ACCESS_TOKEN_SECRET,
  });

  await client.post('statuses/update', { status: narrative });
}

async function postMedium({ caption, narrative }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + cfg.M_INTEGRATION_TOKEN,
    cookie: 'clientId=mq',
  };

  const me = await (await fetch('https://api.medium.com/v1/me', { headers })).json();
  const pubs = await (await fetch(`https://api.medium.com/v1/users/${me.data.id}/publications`, { headers })).json();
  const publication = pubs.data.find(p => p.name === 'The Quintessential Q');
  if (!publication) throw new Error('Medium publication not found');

  const res = await fetch(`https://api.medium.com/v1/publications/${publication.id}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `${caption}`,
      contentFormat: 'markdown',
      content: `# Nano Narrative - ${caption}\n${narrative}`,
      tags: ['Nano Narratives', 'Flash Fiction', 'Short Story', 'Writing'],
      publishStatus: 'public',
      notifyFollowers: true,
    }),
  });
  if (!res.ok) throw new Error('Medium publish failed: ' + res.status);
}

// Registry: add a new platform by adding one line here ---------------------------->

const posters = [
  { name: 'Instagram', enabled: enabled.instagram, post: postInstagram },
  { name: 'Twitter',   enabled: enabled.twitter,   post: postTwitter },
  { name: 'Medium',    enabled: enabled.medium,    post: postMedium },
  { name: 'Reddit',    enabled: enabled.reddit,    post: postReddit },
  { name: 'Facebook',  enabled: enabled.facebook,  post: postFacebook },
  { name: 'Threads',   enabled: enabled.threads,   post: postThreads },
];

async function runPosters(ctx) {
  const results = [];

  for (const { name, enabled, post } of posters) {
    if (!enabled) {
      console.log(`Skipping ${name}...`);
      continue;
    }

    console.log(`Publishing on ${name}...`);
    try {
      await post(ctx);
      console.log('  Published!');
      results.push({ name, ok: true });
    } catch (err) {
      console.error(`  Not published to ${name}:`, err.message ?? err);
      results.push({ name, ok: false });
    }
  }

  return results;
}

// Email ---------------------------->

async function sendEmail({ caption, narrative }, results) {
  if (!enabled.email) return;

  console.log('Sending email to Mum and Dad...');

  const transporter = nodemailer.createTransport({
    host: 'smtp.purelymail.com',
    port: 465,
    auth: { user: cfg.E_USERNAME, pass: cfg.E_PASSWORD },
  });

  const statusRows = results
    .map(r => `<p style="text-align: center; font-size: 14px;">${r.ok ? '✅' : '❌'} ${r.name}</p>`)
    .join('\n');

  try {
    await transporter.sendMail({
      from: 'me@matthewquerzoli.com',
      bcc: [
        'Quiza12@live.com',
        'querzolix5@gmail.com',
        'david@qloans.net.au',
        'hilton@orkinbrown.co.za',
        'chloe@orkinbrown.co.za',
      ],
      subject: `Nano Narrative - ${caption}`,
      html: `
        <p style="text-align: center; font-size: 16px;">${narrative}</p>
        <hr>
        ${statusRows}
        <p style="text-align: center; font-size: 14px;">Posted manually on TikTok and Substack.</p>
        <hr>
        <p style="text-align:center; font-size: 14px;">Nano Narratives across the web: </p>
        <p style="text-align:center; font-size: 14px;">
          <a href="https://www.instagram.com/nanonarratives/">Instagram</a>
          | <a href="https://www.facebook.com/NanoNarratives">Facebook</a>
          | <a href="https://medium.com/the-quintessential-q/tagged/nano-narratives">Medium</a>
          | <a href="https://www.threads.net/@nanonarratives">Threads</a>
          | <a href="https://www.reddit.com/r/NanoNarratives/">Reddit</a>
          | <a href="https://www.substack.com/@nanonarratives">Substack</a>
          | <a href="https://www.tiktok.com/@narrativesnano">Tiktok</a>
        </p>
        <p style="text-align:center; font-size: 14px;">Forever and always a <a href="https://www.matthewquerzoli.com">Matthew Querzoli</a> project.</p>
      `,
    });
    console.log('  Sent!');
  } catch (err) {
    console.error('  Email not sent:', err);
  }
}

// Start ---------------------------->

async function main() {
  console.log(`\n--Nano Narratives Poster (${LOCAL ? 'local' : 'scheduled'})--\n`);

  const ctx = await buildContext();
  console.log(`Posting for ${ctx.caption}\n`);

  const results = await runPosters(ctx);
  await sendEmail(ctx, results);

  if (results.some(r => !r.ok)) process.exit(1); // so GitHub Actions flags the failure
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});