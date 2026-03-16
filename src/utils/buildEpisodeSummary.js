/**
 * Creates the episode object used across episode-related responses.
 * @param {object} episode
 * @param {number|null} episode.season
 * @param {number|null} episode.episode
 * @param {string|null} episode.title
 * @param {string|null} episode.description
 * @param {string|null} episode.id
 * @param {string|null} episode.url
 * @param {string|null} episode.release_date
 * @param {number|null} episode.users_rating
 * @param {number|null} episode.users_rating_count
 * @returns {{
 *   season: number|null,
 *   episode: number|null,
 *   title: string|null,
 *   description: string|null,
 *   id: string|null,
 *   url: string|null,
 *   release_date: string|null,
 *   users_rating: number|null,
 *   users_rating_count: number|null,
 * }}
 */
const buildEpisodeSummary = ({
  season,
  episode,
  title,
  description,
  id,
  url,
  release_date,
  users_rating,
  users_rating_count,
}) => ({
  season,
  episode,
  title,
  description,
  id,
  url,
  release_date,
  users_rating,
  users_rating_count,
});

module.exports = { buildEpisodeSummary };
