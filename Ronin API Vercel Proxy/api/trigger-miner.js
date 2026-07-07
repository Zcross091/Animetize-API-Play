module.exports = async (req, res) => {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { title, server, episode } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const GITHUB_PAT = process.env.GITHUB_PAT;
    
    if (!GITHUB_PAT) {
      console.error('GITHUB_PAT is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch('https://api.github.com/repos/Zcross091/Ronin-API/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'search-or-mine',
        client_payload: { 
          query: title,
          server: server || '1',
          episode: episode || ''
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to trigger miner', details: errorText });
    }

    return res.status(200).json({ success: true, message: 'Miner triggered successfully' });

  } catch (error) {
    console.error('Error triggering miner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
