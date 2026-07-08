// Vercel serverless proxy for GitHub community API
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  var token = process.env.GH_TOKEN;
  var REPO = 'jhxjhx/jhx';
  var FILE = 'community-data.json';
  var API = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE;

  try {
    var result;
    if (req.method === 'GET') {
      var r = await fetch(API, { headers: { Authorization: 'Bearer ' + token } });
      result = await r.json();
    } else if (req.method === 'POST') {
      var body = req.body;
      var getRes = await fetch(API, { headers: { Authorization: 'Bearer ' + token } });
      var getJson = await getRes.json();
      var sha = getJson.sha;

      var putRes = await fetch(API, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'community update', content: body.content, sha: sha, branch: 'main' })
      });
      result = await putRes.json();
    }
    res.status(200).json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};