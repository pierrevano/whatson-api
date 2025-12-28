const sortEpisodes = (episodes) =>
  episodes.sort((a, b) => {
    const seasonA = Number.isFinite(a?.season)
      ? a.season
      : Number.MAX_SAFE_INTEGER;
    const seasonB = Number.isFinite(b?.season)
      ? b.season
      : Number.MAX_SAFE_INTEGER;

    if (seasonA !== seasonB) return seasonA - seasonB;

    const episodeA = Number.isFinite(a?.episode)
      ? a.episode
      : Number.MAX_SAFE_INTEGER;
    const episodeB = Number.isFinite(b?.episode)
      ? b.episode
      : Number.MAX_SAFE_INTEGER;

    return episodeA - episodeB;
  });

module.exports = { sortEpisodes };
