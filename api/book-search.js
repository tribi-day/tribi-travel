export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}`,
        },
      }
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
