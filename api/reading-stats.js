export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.NOTION_TOKEN;
  const dbId = '61542799ff2c48049614b6d467d1f3c0';
  const fictionDbId = process.env.NOTION_FICTION_DB_ID;
  const nonfictionDbId = process.env.NOTION_NONFICTION_DB_ID;
  const year = req.query.year || new Date().getFullYear().toString();

  try {
    // 1. 스탯 DB 조회
    const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: '연도', title: { equals: year } },
      }),
    });
    const data = await r.json();
    const page = (data.results || [])[0];
    if (!page) return res.status(404).json({ error: 'No data for this year' });

    const p = page.properties;
    const num = key => p[key]?.number ?? p[key]?.formula?.number ?? p[key]?.rollup?.number ?? null;
    // 책 달 메세지 - 노션 스타일 태그 제거
    const rawMsg = p['책 달 메세지']?.formula?.string || '';
    const bestMonthMsg = rawMsg.replace(/​/g, '').replace(/[-*~_`]/g, '').trim();

    const arr = key => p[key]?.formula?.array ?? p[key]?.rollup?.array ?? [];

    // 월별 데이터 - formula string "0,0,1,..." 파싱
    const monthStr = p['독서 젤많이읽은달']?.formula?.string || '';
    const monthCounts = monthStr.split(',').map(s => parseInt(s.trim()) || 0);
    const maxCount = Math.max(...monthCounts, 0);
    const bestMonths = monthCounts
      .map((cnt, i) => cnt === maxCount && maxCount > 0 ? `${i+1}월` : null)
      .filter(Boolean)
      .join(', ');
    const bestMonthCountNum = num('독서 젤많이읽은수');

    // 2. 책 표지 조회 (픽션 + 논픽션, 완독+읽는중)
    const fetchBooks = async (dbId) => {
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
              {
                or: [
                  { property: '현황', status: { equals: '완독' } },
                  { property: '현황', status: { equals: '읽는 중' } },
                ]
              },
              {
                property: '연도',
                relation: { contains: '24cf7517c6504fe298553ad1f6ffae86' },
              }
            ]
          },
          page_size: 50,
        }),
      });
      const d = await r.json();
      return (d.results || []).map(pg => {
        const cover = pg.properties['책 표지']?.files?.[0]?.external?.url
          || pg.properties['책 표지']?.files?.[0]?.file?.url
          || null;
        const date = pg.properties['완독일']?.date?.start || null;
        const titleProp = pg.properties['name'] || pg.properties['제목'];
        const title = titleProp?.title?.[0]?.plain_text || '';
        const author = pg.properties['작가']?.rich_text?.[0]?.plain_text || '';
        return { cover, date, title, author };
      });
    };

    const [fictionBooks, nonfictionBooks] = await Promise.all([
      fetchBooks(fictionDbId),
      fetchBooks(nonfictionDbId),
    ]);
    const fictionCovers = fictionBooks.filter(b => b.cover).map(b => ({ url: b.cover, title: b.title, author: b.author, date: b.date }));
    const nonfictionCovers = nonfictionBooks.filter(b => b.cover).map(b => ({ url: b.cover, title: b.title, author: b.author, date: b.date }));

    // 월별 집계로 베스트 달 계산
    const allBooks = [...fictionBooks, ...nonfictionBooks];
    const monthTally = new Array(12).fill(0);
    allBooks.forEach(b => {
      if (b.date) {
        const m = new Date(b.date).getMonth(); // 0-indexed
        monthTally[m]++;
      }
    });
    const calcMaxCount = Math.max(...monthTally, 0);
    const calcBestMonths = monthTally
      .map((cnt, i) => cnt === calcMaxCount && calcMaxCount > 0 ? `${i+1}월` : null)
      .filter(Boolean)
      .join(', ');

    res.status(200).json({
      year,
      목표권수: num('목표 독서 권수'),
      달성도: num('목표독서량 달성도'),
      fictionTotal: num('fiction total'),
      fictionPage: num('fiction page'),
      fiction5stars: num('fiction 5 stars'),
      nonfictionTotal: num('nonfiction total'),
      nonfictionPage: num('nonfiction page'),
      nonfiction5stars: num('nonfiction 5 stars'),
      bestMonth: calcBestMonths || bestMonths,
      bestMonthMsg,
      bestMonthCount: calcMaxCount || maxCount,
      fictionCovers,
      nonfictionCovers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
