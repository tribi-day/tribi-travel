export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { book, type } = req.body;

  const dbId =
    type === 'fiction'
      ? process.env.NOTION_FICTION_DB_ID
      : process.env.NOTION_NONFICTION_DB_ID;

  const titlePropName = type === 'fiction' ? 'name' : '제목';

  const properties = {
    [titlePropName]: {
      title: [{ text: { content: book.title || '' } }],
    },
    작가: {
      rich_text: [{ text: { content: (book.authors || []).join(', ') } }],
    },
출판사: {
  select: { name: book.publisher || '' },
},
  };

  if (book.thumbnail) {
    properties['책 표지'] = {
      files: [
        {
          name: 'cover',
          type: 'external',
          external: { url: book.thumbnail },
        },
      ],
    };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
        cover: book.thumbnail
          ? { type: 'external', external: { url: book.thumbnail } }
          : undefined,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ success: true, url: data.url });
    } else {
      res.status(500).json({ error: data.message, details: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
