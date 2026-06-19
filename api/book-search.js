export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query, isbn } = req.query;

  // ISBN으로 네이버 이미지 단독 조회 (책 선택 시)
  if (isbn) {
    try {
      const naverRes = await fetch(
        `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}`,
        {
          headers: {
            'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
          },
        }
      );
      const naverData = await naverRes.json();
      const item = (naverData.items || [])[0];
      return res.status(200).json({ image: item?.image || null });
    } catch (err) {
      return res.status(200).json({ image: null });
    }
  }

  // 제목으로 카카오 검색
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` } }
    );
    const kakaoData = await kakaoRes.json();
    res.status(200).json({ documents: kakaoData.documents || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
