export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;

  if (!token || !dbId) {
    return res.status(500).json({ error: 'Missing env variables' });
  }

  try {
    let allResults = [];
    let cursor = undefined;

    while (true) {
      const body = {
        sorts: [{ property: 'date', direction: 'descending' }],
      };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      allResults = allResults.concat(data.results);

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

    res.status(200).json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
