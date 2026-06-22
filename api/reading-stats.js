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
    // 디버그: 젤많이읽은달 raw 값 확인
    const debugProp = p['독서 젤많이읽은달'];
    console.log('debug:', JSON.stringify(debugProp));
    const arr = key => p[key]?.formula?.array ?? p[key]?.rollup?.array ?? [];

    // 월별 데이터 배열에서 최다 달 계산
    const monthCounts = arr('독서 젤많이읽은달').map(item =>
      typeof item === 'number' ? item : (item?.number ?? 0)
    );
    const maxCount = Math.max(...monthCounts, 0);
    const bestMonths = monthCounts
      .map((cnt, i) => cnt === maxCount && maxCount > 0 ? `${i+1}월` : null)
      .filter(Boolean)
      .join(', ');

    // 2. 책 표지 조회 (픽션 + 논픽션, 완독+읽는중)
    const fetchCovers = async (dbId, isFiction) => {
      const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            or: [
              { property: '현황', status: { equals: '완독' } },
              { property: '현황', status: { equals: '읽는 중' } },
            ]
          },
          page_size: 20,
        }),
      });
      const d = await r.json();
      return (d.results || []).map(pg => {
        const cover = pg.properties['책 표지']?.files?.[0]?.external?.url
          || pg.properties['책 표지']?.files?.[0]?.file?.url
          || null;
        return cover;
      }).filter(Boolean);
    };

    const [fictionCovers, nonfictionCovers] = await Promise.all([
      fetchCovers(fictionDbId, true),
      fetchCovers(nonfictionDbId, false),
    ]);

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
      bestMonth: bestMonths,
      bestMonthCount: maxCount,
      fictionCovers,
      nonfictionCovers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
