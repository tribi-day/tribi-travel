export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // 카카오로 먼저 검색
    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` } }
    );
    const kakaoData = await kakaoRes.json();
    const books = kakaoData.documents || [];

    // 각 책마다 ISBN으로 네이버 상세 API 조회해서 페이지 수 가져오기
    const merged = await Promise.all(books.map(async book => {
      // ISBN13 추출 (isbn 필드에 10자리, 13자리 두 개 있을 수 있음)
      const isbnParts = (book.isbn || '').trim().split(' ');
      const isbn13 = isbnParts.find(i => i.length === 13) || isbnParts[0];

      if (!isbn13) return { ...book, page: null };

      try {
        const naverRes = await fetch(
          `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn13}`,
          {
            headers: {
              'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
              'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
            },
          }
        );
        const naverData = await naverRes.json();
        const item = (naverData.items || [])[0];
        // 네이버 고화질 이미지로 교체, page는 API 미제공
        const naverImage = item?.image || null;
        return { ...book, thumbnail: naverImage || book.thumbnail, page: null };
      } catch {
        return { ...book, page: null };
      }
    }));

    res.status(200).json({ documents: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
