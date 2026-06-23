export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.NOTION_TOKEN;
  const dbId = '3814852b4d7e8016ab94dd664d076865';

  // PATCH: 상태 업데이트
  if (req.method === 'PATCH') {
    const { pageId, status } = req.body;
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
            '상태': { status: { name: status } },
            ...(status === '완료' ? { '완료 날짜': { date: { start: new Date().toISOString().split('T')[0] } } } : {}),
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

  // GET: 할일 목록
  if (req.method === 'GET') {
    try {
      const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: '완료 날짜',
            date: { is_empty: true },
          },
          sorts: [{ property: '분류', direction: 'ascending' }],
        }),
      });
      const data = await r.json();
      const todos = (data.results || []).map(page => {
        const p = page.properties;
        return {
          pageId: page.id,
          title: p['할 일']?.title?.[0]?.plain_text || '',
          category: p['분류']?.select?.name || '',
          categoryColor: p['분류']?.select?.color || '',
          status: p['상태']?.status?.name || '',
        };
      });
      return res.status(200).json(todos);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
