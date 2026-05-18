const fetch = require('node-fetch');

async function test() {
  const baseUrl = 'https://api.onekhusa.com/sandbox/v1';
  const clientId = 'sandbox_LIyf2Ra-7OPsaGd4uKcDeaCMIoSU-x_CRA';
  const clientSecret = '9snbDVkoGIz5-g_-IeaKK9DL9UZsDlJCD28gKEjTz9r87cuun8zP8xofhSr0';

  console.log('Testing /connect/token with urlencoded body');
  const tokenRes = await fetch(`${baseUrl.replace('/v1', '')}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  console.log('Status:', tokenRes.status);
  console.log('Body:', await tokenRes.text());
}

test();
