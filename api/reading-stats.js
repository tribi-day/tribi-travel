export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const token = process.env.NOTION_TOKEN;
  const dbId = '61542799ff2c48049614b6d467d1f3c0';
  const year = req.query.year || new Date().getFullYear().toString();

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
          property: '연도',
          title: { equals: year },
        },
      }),
    });
    const data = await r.json();
    const page = (data.results || [])[0];
    if (!page) return res.status(404).json({ error: 'No data for this year' });

    const p = page.properties;
    const get = (key, type) => {
      const prop = p[key];
      if (!prop) return null;
      if (type === 'number') return prop.number ?? null;
      if (type === 'formula_number') return prop.formula?.number ?? null;
      if (type === 'formula_string') return prop.formula?.string ?? null;
      if (type === 'rollup_number') return prop.rollup?.number ?? null;
      if (type === 'rollup_array') return prop.rollup?.array ?? [];
      return null;
    };

    res.status(200).json({
      year,
      목표권수: get('목표 독서 권수', 'number'),
      달성도: get('목표독서량 달성도', 'formula_number'),
      fictionTotal: get('fiction total', 'rollup_number'),
      fictionPage: get('fiction page', 'rollup_number'),
      fiction5stars: get('fiction 5 stars', 'formula_number'),
      nonfictionTotal: get('nonfiction total', 'rollup_number'),
      nonfictionPage: get('nonfiction page', 'rollup_number'),
      nonfiction5stars: get('nonfiction 5 stars', 'formula_number'),
      bestMonth: get('독서 젤많이읽은달', 'formula_string'),
      bestMonthCount: get('독서 젤많이읽은수', 'formula_number'),
      message: get('message', 'formula_string'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
