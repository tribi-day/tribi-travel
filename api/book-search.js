export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query, isbn } = req.query;

  // ISBN으로 페이지 수 단독 조회
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
      return res.status(200).json({
        page: item?.page ? parseInt(item.page) : null,
        image: item?.image || null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // 카카오로 제목 검색
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
