
// 비공개 프로필/관리자 세션 토큰을 모든 DB 요청 헤더에 실어 보내요. 권한 판단은 Supabase RLS가 해요.
function getBruteTokens(){
  const list = Object.values(getProfileTokens());
  const a = sessionStorage.getItem('bruteAdminToken');
  if(a) list.push(a);
  return list;
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: (url, opts = {})=>{
      const headers = new Headers(opts.headers || {});
      const tokens = getBruteTokens();
      if(tokens.length) headers.set('x-brute-tokens', tokens.join(','));
      return fetch(url, { ...opts, headers });
    }
  }
});
