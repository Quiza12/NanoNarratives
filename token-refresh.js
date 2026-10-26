import './env.js';
import fetch from 'node-fetch';

// Usage ---------------------------->
//
//   node tokens.js facebook <short-lived-user-token>   -> IG_UAT + FB_PAT
//   node tokens.js threads <short-lived-token>         -> THREADS_UAT + THREADS_USER_ID
//   node tokens.js threads-refresh                     -> new THREADS_UAT from the current one
//   node tokens.js check                               -> validity / expiry of what you have now
//
// To keep a token out of your shell history, pass it as SHORT_TOKEN instead:
//   SHORT_TOKEN=... node tokens.js facebook
//
// Env needed (in your local env file):
//   META_APP_ID, META_APP_SECRET   Meta app (Facebook / Instagram)
//   THREADS_APP_SECRET             App Dashboard > App settings > Basic > "Threads App secret"
//                                  (this is NOT the same as the main app secret)
//   FB_PAGE_ID                     which Page to pull the Page token for
//   IG_UAT, FB_PAT, THREADS_UAT    only for `check` / `threads-refresh`

const GRAPH = 'https://graph.facebook.com/v23.0';
const THREADS = 'https://graph.threads.net';
const DAY = 24 * 60 * 60;

// Helpers ---------------------------->

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in your env`);
  return value;
}

async function getJson(url, params) {
  const res = await fetch(`${url}?${new URLSearchParams(params)}`);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(JSON.stringify(body.error ?? body));
  return body;
}

function describeExpiry(unixSeconds) {
  if (!unixSeconds) return 'never';
  const left = Math.round((unixSeconds - Date.now() / 1000) / DAY);
  return `${new Date(unixSeconds * 1000).toISOString().slice(0, 10)} (${left} days left)`;
}

function emit(name, value, note) {
  console.log(`\n${name}=${value}`);
  if (note) console.log(`  ${note}`);
}

async function debugToken(token) {
  const { data } = await getJson(`${GRAPH}/debug_token`, {
    input_token: token,
    access_token: `${need('META_APP_ID')}|${need('META_APP_SECRET')}`,
  });
  return data;
}

async function printFacebookTokenInfo(label, token) {
  const info = await debugToken(token);
  console.log(`\n${label}: ${info.is_valid ? 'valid' : 'INVALID'}, type ${info.type}`);
  console.log(`  expires:     ${describeExpiry(info.expires_at)}`);
  if (info.data_access_expires_at) {
    console.log(`  data access: ${describeExpiry(info.data_access_expires_at)}`);
  }
  if (info.scopes?.length) console.log(`  scopes:      ${info.scopes.join(', ')}`);
}

// Commands ---------------------------->

// Facebook + Instagram: both use the same long-lived *user* token (IG_UAT);
// the Facebook Page token (FB_PAT) is then fetched with it.
async function facebook(shortToken) {
  console.log('Exchanging for a long-lived user token...');
  const long = await getJson(`${GRAPH}/oauth/access_token`, {
    grant_type: 'fb_exchange_token',
    client_id: need('META_APP_ID'),
    client_secret: need('META_APP_SECRET'),
    fb_exchange_token: shortToken,
  });
  emit('IG_UAT', long.access_token, 'Long-lived user token, used for Instagram posting');
  await printFacebookTokenInfo('IG_UAT', long.access_token);

  console.log('\nFetching Page token...');
  const pages = await getJson(`${GRAPH}/me/accounts`, {
    access_token: long.access_token,
    limit: 100,
  });

  const pageId = process.env.FB_PAGE_ID;
  const page = pages.data.find(p => p.id === pageId);
  if (!page) {
    console.error(pageId ? `No Page with id ${pageId} found.` : 'FB_PAGE_ID is not set.');
    console.error('Pages this token can manage:');
    pages.data.forEach(p => console.error(`  ${p.id}  ${p.name}`));
    process.exitCode = 1;
    return;
  }

  emit('FB_PAT', page.access_token, `Page token for "${page.name}"`);
  await printFacebookTokenInfo('FB_PAT', page.access_token);
}

async function threads(shortToken) {
  console.log('Exchanging for a long-lived Threads token...');
  const long = await getJson(`${THREADS}/access_token`, {
    grant_type: 'th_exchange_token',
    client_secret: need('THREADS_APP_SECRET'),
    access_token: shortToken,
  });
  emit('THREADS_UAT', long.access_token, `Expires in ${Math.round(long.expires_in / DAY)} days`);

  const me = await getJson(`${THREADS}/v1.0/me`, {
    fields: 'id,username',
    access_token: long.access_token,
  });
  emit('THREADS_USER_ID', me.id, `Account: @${me.username}`);
}

async function threadsRefresh() {
  console.log('Refreshing Threads token...');
  const refreshed = await getJson(`${THREADS}/refresh_access_token`, {
    grant_type: 'th_refresh_token',
    access_token: need('THREADS_UAT'),
  });
  emit('THREADS_UAT', refreshed.access_token, `Expires in ${Math.round(refreshed.expires_in / DAY)} days`);
}

async function check() {
  for (const name of ['IG_UAT', 'FB_PAT']) {
    if (process.env[name]) await printFacebookTokenInfo(name, process.env[name]);
    else console.log(`\n${name}: not set`);
  }

  if (process.env.THREADS_UAT) {
    try {
      const me = await getJson(`${THREADS}/v1.0/me`, {
        fields: 'id,username',
        access_token: process.env.THREADS_UAT,
      });
      console.log(`\nTHREADS_UAT: valid (@${me.username}). Threads doesn't report an expiry date,`);
      console.log('  so refresh it well inside 60 days of when it was last issued or refreshed.');
    } catch (err) {
      console.log(`\nTHREADS_UAT: INVALID - ${err.message}`);
    }
  } else {
    console.log('\nTHREADS_UAT: not set');
  }
}

// Start ---------------------------->

const [command, tokenArg] = process.argv.slice(2);
const shortToken = tokenArg ?? process.env.SHORT_TOKEN;

const commands = {
  facebook: () => facebook(shortToken ?? need('SHORT_TOKEN')),
  threads: () => threads(shortToken ?? need('SHORT_TOKEN')),
  'threads-refresh': threadsRefresh,
  check,
};

if (!commands[command]) {
  console.error('Usage: node tokens.js <facebook|threads|threads-refresh|check> [short-lived-token]');
  process.exit(1);
}

commands[command]().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});