export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // 카카오 검색
    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` } }
    );
    const kakaoData = await kakaoRes.json();
    const books = kakaoData.documents || [];

    // 네이버 검색 (페이지 수 보완용)
    const naverRes = await fetch(
      `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=10`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        },
      }
    );
    const naverData = await naverRes.json();
    const naverBooks = naverData.items || [];

    // ISBN으로 카카오↔네이버 매칭해서 페이지 수 보완
    const merged = books.map(book => {
      const kakaoIsbn = (book.isbn || '').replace(/\s/g, '');
      const naverMatch = naverBooks.find(nb => {
        const naverIsbn = (nb.isbn || '').replace(/\s/g, '');
        return naverIsbn && kakaoIsbn && (
          naverIsbn.includes(kakaoIsbn) ||
          kakaoIsbn.includes(naverIsbn)
        );
      });
      return {
        ...book,
        page: naverMatch?.page ? parseInt(naverMatch.page) : null,
      };
    });
console.log('naver response:', JSON.stringify(naverData));
    res.status(200).json({ documents: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
