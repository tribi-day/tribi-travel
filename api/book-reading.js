export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.NOTION_TOKEN;
  const fictionDbId = process.env.NOTION_FICTION_DB_ID;
  const nonfictionDbId = process.env.NOTION_NONFICTION_DB_ID;

  if (req.method === 'PATCH') {
    const { pageId, currentPage, finish, rating, totalPage } = req.body;

    // 완독 처리
    if (finish) {
      const today = new Date().toISOString().split('T')[0];
      try {
        const props = {
          '완독일': { date: { start: today } },
          '현황': { status: { name: '완독' } },
        };
        if (rating) props['별점'] = { select: { name: rating } };
        if (totalPage) props['현재 페이지'] = { number: totalPage };
        const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: props }),
        });
        const data = await r.json();
        if (r.ok) return res.status(200).json({ success: true });
        return res.status(500).json({ error: data.message });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // 현재 페이지 업데이트
    try {
      const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            '현재 페이지': { number: currentPage },
          },
        }),
      });
      const data = await r.json();
      if (r.ok) return res.status(200).json({ success: true });
      return res.status(500).json({ error: data.message });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 읽는 중인 책 목록
  if (req.method === 'GET') {
    try {
      const fetchBooks = async (dbId, isFiction) => {
        const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: {
              property: '현황',
              status: { equals: '읽는 중' },
            },
          }),
        });
        const data = await r.json();
        return (data.results || []).map(page => {
          const props = page.properties;
          const titleProp = isFiction ? props['name'] : props['제목'];
          const title = titleProp?.title?.[0]?.plain_text || '';
          const author = props['작가']?.rich_text?.[0]?.plain_text || '';
          const genre = isFiction
            ? (props['장르']?.multi_select || []).map(g => g.name).join(', ')
            : '';
          const cover = props['책 표지']?.files?.[0]?.external?.url
            || props['책 표지']?.files?.[0]?.file?.url
            || null;
          const totalPage = props['총 페이지']?.number || null;
          const currentPage = props['현재 페이지']?.number || 0;
          return { pageId: page.id, title, author, genre, cover, totalPage, currentPage };
        });
      };

      const [fiction, nonfiction] = await Promise.all([
        fetchBooks(fictionDbId, true),
        fetchBooks(nonfictionDbId, false),
      ]);

      // 총 페이지 많은 순 정렬
      const all = [...fiction, ...nonfiction].sort((a, b) => (b.totalPage || 0) - (a.totalPage || 0));
      return res.status(200).json(all);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
