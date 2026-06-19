export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 채식주의자 ISBN13
  const isbn = '9788936434595';

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
    const data = await naverRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
