/* Schema */
const schema = {
  _id: "string", // Unique MongoDB identifier for the item

  id: "number", // General identifier (The Movie Database ID)
  item_type: "string", // Type of the item (e.g., movie or tvshow)
  is_active: "boolean", // Indicates if the item is currently active
  title: "string", // Title of the item
  original_title: "string", // Original title of the item

  directors: "object", // Directors' names
  genres: "object", // Genres' names
  image: "string", // URL to the item's image
  is_adult: "boolean", // Indicates if the title is flagged as adult content on IMDb
  certification: "string", // Age classification assigned by IMDb (e.g., G, PG-13, R)
  networks: "object", // Networks' names
  production_companies: "object", // Production Companies' names
  release_date: "string", // Release date of the item
  runtime: "number", // Runtime duration expressed in seconds
  tagline: "string", // Tagline of the item
  trailer: "string", // URL to the item's trailer

  episodes_details: [
    /*
     * To include this key in the response, add `episodes_details` to the `append_to_response` query parameter.
     * To filter episodes by one or more seasons, add the `filtered_seasons` query parameter with the desired seasons numbers.
     */
    {
      season: "number", // Season number of the episode
      episode: "number", // Episode number within the season
      title: "string", // Title of the episode
      description: "string", // Description of the episode
      id: "string", // IMDb specific identifier
      url: "string", // URL to the IMDb page
      release_date: "string", // Release date of the episode
      users_rating: "number", // Average rating given by IMDb users
      users_rating_count: "number", // Total number of ratings submitted by IMDb users
    },
  ],
  /*
   * To include this key in the response, add `last_episode` to the `append_to_response` query parameter.
   */
  last_episode: {
    /* Information related to the most recent episode */
    season: "number", // Season number of the most recent episode
    episode: "number", // Episode number for the most recent episode
    episode_type: "string", // Type of the most recent episode
    title: "string", // Title of the most recent episode
    description: "string", // Description of the most recent episode
    id: "string", // IMDb specific identifier for the most recent episode
    url: "string", // URL to the IMDb page of the most recent episode
    release_date: "string", // Release date of the most recent episode
    users_rating: "number", // Average rating given by IMDb users for the most recent episode
    users_rating_count: "number", // Total number of ratings submitted by IMDb users for the most recent episode
  },
  /*
   * To include this key in the response, add `next_episode` to the `append_to_response` query parameter.
   */
  next_episode: {
    /* Information related to the next episode to air */
    season: "number", // Season number of the next episode to air
    episode: "number", // Episode number for the next episode to air
    episode_type: "string", // Type of the next episode to air
    title: "string", // Title of the next episode to air
    description: "string", // Description of the next episode to air
    id: "string", // IMDb specific identifier for the next episode to air
    url: "string", // URL to the IMDb page of the next episode to air
    release_date: "string", // Release date of the next episode to air
    users_rating: "number", // Average rating given by IMDb users for the next episode to air
    users_rating_count: "number", // Total number of ratings submitted by IMDb users for the next episode to air
  },
  /*
   * To include this key in the response, add `highest_episode` to the `append_to_response` query parameter.
   */
  highest_episode: {
    /* Highest rated episode across all seasons */
    season: "number", // Season number of the highest-rated episode
    episode: "number", // Episode number of the highest-rated episode
    title: "string", // Title of the highest-rated episode
    description: "string", // Description of the highest-rated episode
    id: "string", // IMDb specific identifier for the highest-rated episode
    url: "string", // URL to the IMDb page of the highest-rated episode
    release_date: "string", // Release date of the highest-rated episode
    users_rating: "number", // Average rating given by IMDb users for the highest-rated episode
    users_rating_count: "number", // Total number of ratings submitted by IMDb users for the highest-rated episode
  },
  /*
   * To include this key in the response, add `lowest_episode` to the `append_to_response` query parameter.
   */
  lowest_episode: {
    /* Lowest rated episode across all seasons */
    season: "number", // Season number of the lowest-rated episode
    episode: "number", // Episode number of the lowest-rated episode
    title: "string", // Title of the lowest-rated episode
    description: "string", // Description of the lowest-rated episode
    id: "string", // IMDb specific identifier for the lowest-rated episode
    url: "string", // URL to the IMDb page of the lowest-rated episode
    release_date: "string", // Release date of the lowest-rated episode
    users_rating: "number", // Average rating given by IMDb users for the lowest-rated episode
    users_rating_count: "number", // Total number of ratings submitted by IMDb users for the lowest-rated episode
  },
  platforms_links: [
    {
      name: "string", // Name of the streaming platform
      link_url: "string", // URL to the streaming platform
    },
  ],
  seasons_number: "number", // Number of seasons available
  status: "string", // Current status of the item (e.g., ongoing, ended, etc.)

  allocine: {
    /* Information related to AlloCiné platform */
    id: "number", // AlloCiné specific identifier
    url: "string", // URL to the AlloCiné page
    users_rating: "number", // Average rating given by AlloCiné users
    users_rating_count: "number", // Total number of ratings submitted by AlloCiné users
    critics_rating: "number", // Average rating given by AlloCiné critics
    critics_rating_count: "number", // Total number of ratings submitted by AlloCiné critics
    critics_rating_details: [
      // To display this key, add `critics_rating_details` to the query parameter `append_to_response`
      {
        critic_name: "string", // Name of the critic
        critic_rating: "number", // Average rating given by the critic
      },
    ],
    popularity: "number", // Popularity score on AlloCiné
  },
  betaseries: {
    /* Information related to BetaSeries platform */
    id: "string", // BetaSeries specific identifier
    url: "string", // URL to the BetaSeries page
    users_rating: "number", // Average rating given by BetaSeries users
    users_rating_count: "number", // Total number of ratings submitted by BetaSeries users
  },
  imdb: {
    /* Information related to IMDb platform */
    id: "string", // IMDb specific identifier
    url: "string", // URL to the IMDb page
    users_rating: "number", // Average rating given by IMDb users
    users_rating_count: "number", // Total number of ratings submitted by IMDb users
    popularity: "number", // Popularity score on IMDb
    top_ranking: "number", // Position of the title in IMDb top charts
  },
  letterboxd: {
    /* Information related to Letterboxd platform */
    id: "string", // Letterboxd specific identifier
    url: "string", // URL to the Letterboxd page
    users_rating: "number", // Average rating given by Letterboxd users
    users_rating_count: "number", // Total number of ratings submitted by Letterboxd users
  },
  metacritic: {
    /* Information related to Metacritic platform */
    id: "string", // Metacritic specific identifier
    url: "string", // URL to the Metacritic page
    users_rating: "number", // Average rating given by Metacritic users
    users_rating_count: "number", // Total number of ratings submitted by Metacritic users
    critics_rating: "number", // Average rating given by Metacritic critics
    critics_rating_count: "number", // Total number of ratings submitted by Metacritic critics
    must_see: "boolean", // Whether the title has received the "Must-See" badge on Metacritic
  },
  rotten_tomatoes: {
    /* Information related to Rotten Tomatoes platform */
    id: "string", // Rotten Tomatoes specific identifier
    url: "string", // URL to the Rotten Tomatoes page
    users_rating: "number", // Average rating given by Rotten Tomatoes users
    users_rating_count: "number", // Total number of ratings submitted by Rotten Tomatoes users (calculated as liked + not liked votes)
    users_rating_liked_count: "number", // Total number of liked ratings submitted by Rotten Tomatoes users
    users_rating_not_liked_count: "number", // Total number of not liked ratings submitted by Rotten Tomatoes users
    users_certified: "boolean", // Has the item received the Rotten Tomatoes "Verified Audience" certification
    critics_rating: "number", // Average rating given by Rotten Tomatoes critics
    critics_rating_count: "number", // Total number of ratings submitted by Rotten Tomatoes critics
    critics_rating_liked_count: "number", // Total number of liked ratings submitted by Rotten Tomatoes critics
    critics_rating_not_liked_count: "number", // Total number of not liked ratings submitted by Rotten Tomatoes critics
    critics_certified: "boolean", // Has the item received the Rotten Tomatoes "Certified Fresh" status from critics
  },
  senscritique: {
    /* Information related to SensCritique platform */
    id: "number", // SensCritique specific identifier
    url: "string", // URL to the SensCritique page
    users_rating: "number", // Average rating given by SensCritique users
    users_rating_count: "number", // Total number of ratings submitted by SensCritique users
  },
  tmdb: {
    /* Information related to The Movie Database (TMDB) platform */
    id: "number", // TMDB specific identifier
    url: "string", // URL to the TMDB page
    users_rating: "number", // Average rating given by TMDB users
    users_rating_count: "number", // Total number of ratings submitted by TMDB users
  },
  trakt: {
    /* Information related to Trakt platform */
    id: "string", // Trakt specific identifier
    url: "string", // URL to the Trakt page
    users_rating: "number", // Average rating given by Trakt users
    users_rating_count: "number", // Total number of ratings submitted by Trakt users
  },
  tv_time: {
    /* Information related to TV Time platform */
    id: "number", // TV Time specific identifier
    url: "string", // URL to the TV Time page
    users_rating: "number", // Average rating given by TV Time users
  },
  thetvdb: {
    /* Information related to TheTVDB platform */
    id: "number", // TheTVDB specific identifier
    slug: "string", // Slug for the identifier on TheTVDB
    url: "string", // URL to TheTVDB page
  },

  mojo: {
    /* Information related to Box Office Mojo platform */
    rank: "number", // Ranking according to Box Office Mojo
    url: "string", // URL to the Box Office Mojo page
    lifetime_gross: "string", // Lifetime gross revenue (formatted as string with $)
  },

  updated_at: "string", // Timestamp of the last update

  popularity_average: "number", // Average popularity score across platforms (AlloCiné and IMDb)
  ratings_average: "number", // Average rating score across platforms (all)
};

module.exports = { schema };
