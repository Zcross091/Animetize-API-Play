fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '{ Media(search: "One Piece", type: ANIME) { episodes nextAiringEpisode { episode } } }'
  })
}).then(res => res.json()).then(res => console.log(JSON.stringify(res, null, 2)));
