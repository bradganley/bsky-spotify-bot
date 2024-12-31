import 'dotenv/config';           
import fs from 'fs';
import Parser from 'rss-parser';
import { AtpAgent } from '@atproto/api';

const {
  BSKY_HANDLE,      
  BSKY_APP_PASS,    
  RSS_FEED_URL,     
  CHECK_INTERVAL,   
} = process.env;

if (!BSKY_HANDLE || !BSKY_APP_PASS || !RSS_FEED_URL || !CHECK_INTERVAL) {
  throw new Error("You forgot something.");
}

const PROCESSED_ENTRIES_FILE = '/state/processed_entries.txt'; 

const bskyAgent = new AtpAgent({ service: 'https://bsky.social' });

async function loginToBluesky() {
  // login 
  await bskyAgent.login({ identifier: BSKY_HANDLE, password: BSKY_APP_PASS });
  console.log(`Logged as ${BSKY_HANDLE}. God help us.`);
}

function loadProcessedEntries(): Set<string> {
  try {
    const data = fs.readFileSync(PROCESSED_ENTRIES_FILE, 'utf8');
    return new Set(data.split('\n').filter(Boolean));
  } catch (err) {
    return new Set();
  }
}

function saveProcessedEntries(entries: Set<string>) {
  fs.writeFileSync(PROCESSED_ENTRIES_FILE, [...entries].join('\n'), 'utf8');
}

async function checkItems() {
  console.log("Checking for new shit...");

  const processedEntries = loadProcessedEntries();
  const parser = new Parser();
  const feed = await parser.parseURL(RSS_FEED_URL!);

  for (const entry of feed.items) {
    const entryUrl = entry.link || '';
    if (!entryUrl) continue;  // skip if no link

    if (processedEntries.has(entryUrl)) {
      continue;
    }

    const title = entry.title || '(No title)';
    const author = entry.author || '';
    console.log(`Found: ${title}`);

    // Give it a shot, dingus
    try {
      await bskyAgent.post({
        text: `${title} by ${author}\n${entryUrl}`,
          embed: {
            $type: 'app.bsky.embed.external',
            external: {
              uri: entryUrl,
              title: title,
              description: author
            }
          }
      });
      console.log("Posted");
    } catch (err) {
      console.error("lol That shit didn't work at all:", err);
    }
    // Mark the entry as processed
    processedEntries.add(entryUrl);
  }

  // Save the updated set
  saveProcessedEntries(processedEntries);

  console.log(`Sleeping for ${CHECK_INTERVAL} seconds...\n`);
}

async function main() {
  try {
    await loginToBluesky();
  } catch (err) {
    console.error("Failed to login to Bluesky:", err);
    process.exit(1);
  }

  // Check RIGHT FUCKING NOW
  await checkItems();

  setInterval(() => {
    checkItems().catch(console.error);
  }, parseInt(CHECK_INTERVAL!, 10) * 1000);
}

main().catch(console.error);
//              _         _
//  __   ___.--'_`.     .'_`--.___   __
// ( _`.'. -   'o` )   ( 'o`   - .`.'_ )
// _\.'_'      _.-'     `-._      `_`./_
//( \`. )    //\`         '/\\    ( .'/ )
// \_`-'`---'\\__,       ,__//`---'`-'_/
//  \`        `-\         /-'        '/
//   `                               '
// If you contribute, these two frogs will fall in love. 
// Please contribute if you believe frogs can learn to love