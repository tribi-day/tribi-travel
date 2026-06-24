export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.NOTION_TOKEN;
  const dbId = '8b015e0c4c2b4463a838c906c60b2cb3';

  // GET: 특정 월의 운동 기록
  if (req.method === 'GET') {
    const { year, month } = req.query;
    const y = parseInt(year || new Date().getFullYear());
    const m = parseInt(month || new Date().getMonth() + 1);
    const start = `${y}-${String(m).padStart(2,'0')}-01`;
    const end = `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`;

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
            and: [
              { property: '날짜', date: { on_or_after: start } },
              { property: '날짜', date: { on_or_before: end } },
            ]
          },
          sorts: [{ property: '날짜', direction: 'ascending' }],
        }),
      });
      const data = await r.json();
      const records = (data.results || []).map(page => {
        const p = page.properties;
        return {
          pageId: page.id,
          date: p['날짜']?.date?.start || '',
          type: p['운동 종류']?.select?.name || '',
          typeColor: p['운동 종류']?.select?.color || 'default',
          duration: p['운동 시간']?.number || null,
        };
      });
      return res.status(200).json(records);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: 운동 기록 추가
  if (req.method === 'POST') {
    const { date, type, duration } = req.body;
    try {
      const r = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            '이름': { title: [{ text: { content: type || '운동' } }] },
            '날짜': { date: { start: date } },
            ...(type ? { '운동 종류': { select: { name: type } } } : {}),
            ...(duration ? { '운동 시간': { number: duration } } : {}),
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

  res.status(405).json({ error: 'Method not allowed' });
}
