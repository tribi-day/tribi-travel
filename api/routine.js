export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.NOTION_TOKEN;
  const parentPageId = '3724852b4d7e8062a4aec0dfaf65e81b'; // "2026" 페이지

  // year, month 쿼리로 받되 기본은 오늘 날짜
  const now = new Date();
  const year = req.query.year || now.getFullYear();
  const month = parseInt(req.query.month || (now.getMonth() + 1));

  try {
    // 1. "2026" 페이지 하위에서 이번 달 실행/계획 DB 찾기
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `${year}년 ${month}월 루틴`,
        filter: { property: 'object', value: 'database' },
      }),
    });
    const searchData = await searchRes.json();
    const results = searchData.results || [];

    const execDb = results.find(r =>
      r.title?.[0]?.plain_text?.includes(`${year}년 ${month}월 루틴 실행`)
    );
    const planDb = results.find(r =>
      r.title?.[0]?.plain_text?.includes(`${year}년 ${month}월 루틴 계획`)
    );

    if (!execDb || !planDb) {
      return res.status(404).json({ error: `${year}년 ${month}월 DB를 찾을 수 없어요`, found: results.map(r => r.title?.[0]?.plain_text) });
    }

    // 2. 계획 DB에서 루틴별 달성도 가져오기
    const planRes = await fetch(`https://api.notion.com/v1/databases/${planDb.id}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const planData = await planRes.json();
    const routines = (planData.results || []).map(page => {
      const p = page.properties;
      const name = p['루틴']?.title?.[0]?.plain_text || '';
      const formula = p['달성도']?.formula;
      let pct = null;
      if (formula?.type === 'number') pct = formula.number;
      return { name, pct };
    });

    // 3. 실행 DB에서 이번 달 체크 현황 요약 (오늘 기준 진행률)
    const execRes = await fetch(`https://api.notion.com/v1/databases/${execDb.id}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: '날짜', direction: 'descending' }],
        page_size: 1,
      }),
    });
    const execData = await execRes.json();
    const latest = (execData.results || [])[0];
    let todayInfo = null;
    if (latest) {
      const p = latest.properties;
      todayInfo = {
        date: p['날짜']?.date?.start || '',
        emoji: p['일별 진행도']?.formula?.string || '',
      };
    }

    res.status(200).json({ year, month, routines, todayInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
