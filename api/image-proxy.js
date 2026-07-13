// 이미지를 서버에서 가져와 base64로 변환 (CORS 우회용)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=2592000, stale-while-revalidate'); // 30일 캐시

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(500).json({ error: 'fetch failed' });
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    res.status(200).json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
