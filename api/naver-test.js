export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const naverRes = await fetch(
      `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=3`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        },
      }
    );
    const data = await naverRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
