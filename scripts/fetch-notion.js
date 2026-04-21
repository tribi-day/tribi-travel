const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DB_ID = process.env.NOTION_DB_ID;

async function fetchAll() {
  let allResults = [];
  let cursor = undefined;

  while (true) {
    const body = {
      sorts: [{ property: 'date', direction: 'descending' }],
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    allResults = allResults.concat(data.results);
    console.log(`Fetched ${allResults.length} photos so far...`);

    if (!data.has_more) break;
    cursor = data.next_cursor;
  }

  const photos = allResults.map(page => {
    const props = page.properties;
    return {
      file: props.file?.url || null,
      city: props.city?.rich_text?.[0]?.plain_text || '',
      country: props.country?.rich_text?.[0]?.plain_text || '',
      lat: props.lat?.number || 0,
      lng: props.lng?.number || 0,
      tags: props.tags?.multi_select?.map(t => t.name) || [],
      date: props.date?.date?.start || '',
      instagram: props.instagram?.url || null,
    };
  });

  const outPath = path.join(__dirname, '../photos.json');
  fs.writeFileSync(outPath, JSON.stringify(photos, null, 2));
  console.log(`Done! Saved ${photos.length} photos to public/photos.json`);
}

fetchAll().catch(err => {
  console.error(err);
  process.exit(1);
});
