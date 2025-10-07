# What's on? API

Companion to [What's on?](https://github.com/pierrevano/whatson)

---

⚠️ This API is currently running on Render's free tier. If you'd like to keep it active at all times, please consider making a small donation here: [buymeacoffee.com/pierreschelde](https://buymeacoffee.com/pierreschelde). For any additional feedback, you can also join the Discord server: https://discord.gg/VcRTbyea.

Note: A rate limit of `1000` requests per hour is in place to prevent abuse of the API. An API key can be requested on demand to remove this limit by contacting me at https://pierrevano.github.io.

---

## IDs files available below

- Movies: https://whatson-assets.vercel.app/films_ids.txt
- TV Shows: https://whatson-assets.vercel.app/series_ids.txt

---

This API provides information on movies and tvshows.

## Endpoints

### **GET /**

Retrieves detailed information about either a movie or a tvshow based on the provided query parameters.

#### Default sorting behavior

By default, when no query parameters are added (or when all are used), the results are sorted according to the following criteria:

1. Sort by Popularity: The items are first sorted by their calculated average popularity, with higher popularity values appearing first.
2. Sort by Ratings: Among items with the same popularity, sorting is then based on their average ratings, with higher ratings appearing first.
3. Sort by Title: If items have the same popularity and ratings, they are further sorted alphabetically by their title in ascending order.

- _If you want to sort by ratings only, you must set the popularity parameter to `none`._
- _You must have at least one popularity or one rating parameter to obtain results._

#### Active items

Active items are fetched from 2 different links:

1. For movies: https://www.allocine.fr/film/aucinema/
2. For tvshows: https://www.allocine.fr/series/top/

- _These 2 links are also used to fetch the AlloCiné popularity of each item._

> ```
> https://whatson-api.onrender.com/?ratings_filters=allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottentomatoes_critics,rottentomatoes_users,letterboxd_users,senscritique_users,tmdb_users,trakt_users,tvtime_users&popularity_filters=allocine_popularity,imdb_popularity&item_type=movie,tvshow&is_active=true,false&is_adult=true,false&must_see=true,false&users_certified=true,false&critics_certified=true,false&minimum_ratings=0,1,2,2.5,3,3.5,4,4.5&release_date=everything,new&seasons_number=1,2,3,4,5&status=canceled,ended,ongoing,pilot,unknown&directors=<string>&genres=<string>&platforms=<string>&networks=<string>&production_companies=<string>&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&filtered_seasons=<string>&runtime=<number>&page=<integer>&limit=<integer>
> ```

| Parameter            | Value                                                                                                                                                                                                               | Description                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| ratings_filters      | allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottentomatoes_critics,rottentomatoes_users,letterboxd_users,senscritique_users,tmdb_users,trakt_users,tvtime_users | Ratings filters source (or _all_ for every values)                                                        |
| popularity_filters   | allocine_popularity,imdb_popularity                                                                                                                                                                                 | Popularity filters source (or _none_ to disable it)                                                       |
| item_type            | movie,tvshow                                                                                                                                                                                                        | The type of the item (_movie_, _tvshow_ or both)                                                          |
| is_active            | true,false                                                                                                                                                                                                          | Is the item currently on screens (_true_, _false_ or both)                                                |
| is_adult             | true,false                                                                                                                                                                                                          | Is the item marked as adult content (_true_, _false_ or both)                                             |
| must_see             | true,false                                                                                                                                                                                                          | Is the item a Metacritic must see (_true_, _false_ or both)                                               |
| users_certified      | true,false                                                                                                                                                                                                          | Has the item received the Rotten Tomatoes "Verified Audience" certification (_true_, _false_ or both)     |
| critics_certified    | true,false                                                                                                                                                                                                          | Has the item received the Rotten Tomatoes "Certified Fresh" status from critics (_true_, _false_ or both) |
| minimum_ratings      | 0,1,2,2.5,3,3.5,4,4.5                                                                                                                                                                                               | Minimum ratings to return                                                                                 |
| release_date         | everything,new                                                                                                                                                                                                      | Should we return only new items or not                                                                    |
| runtime              | 1800,5400                                                                                                                                                                                                           | Filter items by runtime in seconds (one value for exact match or two values for an inclusive range)       |
| seasons_number       | 1,2,3,4,5                                                                                                                                                                                                           | Number of seasons (5 means 5+) (only valid for tvshows)                                                   |
| status               | canceled,ended,ongoing,pilot,unknown                                                                                                                                                                                | TV show's status (only valid for tvshows)                                                                 |
| directors            | _string_                                                                                                                                                                                                            | TV show's directors (only valid for tvshows; or all for every values)                                     |
| genres               | _string_                                                                                                                                                                                                            | TV show's genres (only valid for tvshows; or all for every values)                                        |
| platforms            | _string_                                                                                                                                                                                                            | TV show's platforms links (only valid for tvshows; or all for every values)                               |
| networks             | _string_                                                                                                                                                                                                            | TV show's networks (only valid for tvshows)                                                               |
| production_companies | _string_                                                                                                                                                                                                            | TV show's production companies                                                                            |
| append_to_response   | critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode                                                                                                                    | Should we return specific keys in the response                                                            |
| filtered_seasons     | _string_                                                                                                                                                                                                            | Filter episodes by one or more seasons                                                                    |
| page                 | _integer_                                                                                                                                                                                                           | Page number                                                                                               |
| limit                | _integer_                                                                                                                                                                                                           | Page items limit                                                                                          |

_For directors, genres, platforms, networks, and production companies, you can use the `^` and `$` regex delimiters to perform strict matching._

### Search

The query parameters provided below are solely for item search purposes and must be unique.

> ```
> https://whatson-api.onrender.com/?title=<string>&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&filtered_seasons=<string>
> ```

| Parameter          | Value                                                                                            | Description                                    |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| title              | _string_                                                                                         | Title of the movie or tvshow                   |
| allocineId         | _integer_                                                                                        | AlloCiné ID of the movie or tvshow             |
| betaseriesId       | _string_                                                                                         | BetaSeries ID of the movie or tvshow           |
| imdbId             | _string_                                                                                         | IMDb ID of the movie or tvshow                 |
| letterboxdId       | _string_                                                                                         | Letterboxd ID of the movie                     |
| metacriticId       | _string_                                                                                         | Metacritic ID of the movie or tvshow           |
| rottentomatoesId   | _string_                                                                                         | Rotten Tomatoes ID of the movie or tvshow      |
| senscritiqueId     | _integer_                                                                                        | SensCritique ID of the movie or tvshow         |
| tmdbId             | _integer_                                                                                        | The Movie Database ID of the movie or tvshow   |
| traktId            | _string_                                                                                         | Trakt ID of the movie or tvshow                |
| tvtimeId           | _integer_                                                                                        | TV Time ID of the tvshow                       |
| thetvdbId          | _integer_                                                                                        | TheTVDB ID of the movie or tvshow              |
| append_to_response | critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode | Should we return specific keys in the response |
| filtered_seasons   | _string_                                                                                         | Filter episodes by one or more seasons         |

#### Responses:

- `200` A successful response
- `400` Invalid query parameters were passed
- `404` No items have been found
- `500` Internal server error

---

### **GET /{item_type}/{id}**

Provides detailed information about specific item (movie or tvshow) by its type and unique identifier (TMDB ID).

> ```
> https://whatson-api.onrender.com/:item_type/:id?ratings_filters=allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottentomatoes_critics,rottentomatoes_users,letterboxd_users,senscritique_users,tmdb_users,trakt_users,tvtime_users&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode
> ```

| Parameter          | Value                                                                                                                                                                                                               | Description                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ratings_filters    | allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottentomatoes_critics,rottentomatoes_users,letterboxd_users,senscritique_users,tmdb_users,trakt_users,tvtime_users | Ratings filters source                         |
| append_to_response | critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode                                                                                                                    | Should we return specific keys in the response |

#### Responses:

- `200` A successful response
- `400` Invalid query parameters were passed
- `404` No items have been found
- `500` Internal server error

---

Example of an item returned:

```json
{
  "_id": "string", // Unique MongoDB identifier for the item

  "id": "number", // General identifier (The Movie Database ID)
  "item_type": "string", // Type of the item (e.g., movie or tvshow)
  "is_active": "boolean", // Indicates if the item is currently active
  "title": "string", // Title of the item
  "original_title": "string", // Original title of the item

  "directors": "object", // Directors' names
  "genres": "object", // Genres' names
  "image": "string", // URL to the item's image
  "is_adult": "boolean", // Indicates if the title is flagged as adult content on IMDb
  "networks": "object", // Networks' names
  "production_companies": "object", // Production Companies' names
  "release_date": "string", // Release date of the item
  "runtime": "number", // Runtime duration expressed in seconds
  "tagline": "string", // Tagline of the item
  "trailer": "string", // URL to the item's trailer

  "episodes_details": [
    /*
     * To include this key in the response, add `episodes_details` to the `append_to_response` query parameter.
     * To filter episodes by one or more seasons, add the `filtered_seasons` query parameter with the desired seasons numbers.
     */
    {
      "season": "number", // Season number of the episode
      "episode": "number", // Episode number within the season
      "title": "string", // Title of the episode
      "description": "string", // Description of the episode
      "id": "string", // IMDb specific identifier
      "url": "string", // URL to the IMDb page
      "release_date": "string", // Release date of the episode
      "users_rating": "number", // Average rating given by IMDb users
      "users_rating_count": "number" // Total number of ratings submitted by IMDb users
    }
  ],
  /*
   * To include this key in the response, add `last_episode` to the `append_to_response` query parameter.
   */
  "last_episode": {
    /* Information related to the most recent episode */
    "season": "number", // Season number of the most recent episode
    "episode": "number", // Episode number for the most recent episode
    "episode_type": "string", // Type of the most recent episode
    "title": "string", // Title of the most recent episode
    "description": "string", // Description of the most recent episode
    "id": "string", // IMDb specific identifier for the most recent episode
    "url": "string", // URL to the IMDb page of the most recent episode
    "release_date": "string", // Release date of the most recent episode
    "users_rating": "number", // Average rating given by IMDb users for the most recent episode
    "users_rating_count": "number" // Total number of ratings submitted by IMDb users for the most recent episode
  },
  /*
   * To include this key in the response, add `next_episode` to the `append_to_response` query parameter.
   */
  "next_episode": {
    /* Information related to the next episode to air */
    "season": "number", // Season number of the next episode to air
    "episode": "number", // Episode number for the next episode to air
    "episode_type": "string", // Type of the next episode to air
    "title": "string", // Title of the next episode to air
    "description": "string", // Description of the next episode to air
    "id": "string", // IMDb specific identifier for the next episode to air
    "url": "string", // URL to the IMDb page of the next episode to air
    "release_date": "string", // Release date of the next episode to air
    "users_rating": "number", // Average rating given by IMDb users for the next episode to air
    "users_rating_count": "number" // Total number of ratings submitted by IMDb users for the next episode to air
  },
  /*
   * To include this key in the response, add `highest_episode` to the `append_to_response` query parameter.
   */
  "highest_episode": {
    /* Highest rated episode across all seasons */
    "season": "number", // Season number of the highest-rated episode
    "episode": "number", // Episode number of the highest-rated episode
    "title": "string", // Title of the highest-rated episode
    "description": "string", // Description of the highest-rated episode
    "id": "string", // IMDb specific identifier for the highest-rated episode
    "url": "string", // URL to the IMDb page of the highest-rated episode
    "release_date": "string", // Release date of the highest-rated episode
    "users_rating": "number", // Average rating given by IMDb users for the highest-rated episode
    "users_rating_count": "number" // Total number of ratings submitted by IMDb users for the highest-rated episode
  },
  /*
   * To include this key in the response, add `lowest_episode` to the `append_to_response` query parameter.
   */
  "lowest_episode": {
    /* Lowest rated episode across all seasons */
    "season": "number", // Season number of the lowest-rated episode
    "episode": "number", // Episode number of the lowest-rated episode
    "title": "string", // Title of the lowest-rated episode
    "description": "string", // Description of the lowest-rated episode
    "id": "string", // IMDb specific identifier for the lowest-rated episode
    "url": "string", // URL to the IMDb page of the lowest-rated episode
    "release_date": "string", // Release date of the lowest-rated episode
    "users_rating": "number", // Average rating given by IMDb users for the lowest-rated episode
    "users_rating_count": "number" // Total number of ratings submitted by IMDb users for the lowest-rated episode
  },
  "platforms_links": [
    {
      "name": "string", // Name of the streaming platform
      "link_url": "string" // URL to the streaming platform
    }
  ],
  "seasons_number": "number", // Number of seasons available
  "status": "string", // Current status of the item (e.g., ongoing, ended, etc.)

  "allocine": {
    /* Information related to AlloCiné platform */
    "id": "number", // AlloCiné specific identifier
    "url": "string", // URL to the AlloCiné page
    "users_rating": "number", // Average rating given by AlloCiné users
    "users_rating_count": "number", // Total number of ratings submitted by AlloCiné users
    "critics_rating": "number", // Average rating given by AlloCiné critics
    "critics_rating_count": "number", // Total number of ratings submitted by AlloCiné critics
    "critics_rating_details": [
      // To display this key, add `critics_rating_details` to the query parameter `append_to_response`
      {
        "critic_name": "string", // Name of the critic
        "critic_rating": "number" // Average rating given by the critic
      }
    ],
    "popularity": "number" // Popularity score on AlloCiné
  },
  "betaseries": {
    /* Information related to BetaSeries platform */
    "id": "string", // BetaSeries specific identifier
    "url": "string", // URL to the BetaSeries page
    "users_rating": "number", // Average rating given by BetaSeries users
    "users_rating_count": "number" // Total number of ratings submitted by BetaSeries users
  },
  "imdb": {
    /* Information related to IMDb platform */
    "id": "string", // IMDb specific identifier
    "url": "string", // URL to the IMDb page
    "users_rating": "number", // Average rating given by IMDb users
    "users_rating_count": "number", // Total number of ratings submitted by IMDb users
    "popularity": "number", // Popularity score on IMDb
    "top_ranking": "number" // Position of the title in IMDb top charts when available
  },
  "letterboxd": {
    /* Information related to Letterboxd platform */
    "id": "string", // Letterboxd specific identifier
    "url": "string", // URL to the Letterboxd page
    "users_rating": "number", // Average rating given by Letterboxd users
    "users_rating_count": "number" // Total number of ratings submitted by Letterboxd users
  },
  "metacritic": {
    /* Information related to Metacritic platform */
    "id": "string", // Metacritic specific identifier
    "url": "string", // URL to the Metacritic page
    "users_rating": "number", // Average rating given by Metacritic users
    "users_rating_count": "number", // Total number of ratings submitted by Metacritic users
    "critics_rating": "number", // Average rating given by Metacritic critics
    "critics_rating_count": "number", // Total number of ratings submitted by Metacritic critics
    "must_see": "boolean" // Whether the title has received the "Must-See" badge on Metacritic
  },
  "rotten_tomatoes": {
    /* Information related to Rotten Tomatoes platform */
    "id": "string", // Rotten Tomatoes specific identifier
    "url": "string", // URL to the Rotten Tomatoes page
    "users_rating": "number", // Average rating given by Rotten Tomatoes users
    "users_certified": "boolean", // Has the item received the Rotten Tomatoes "Verified Audience" certification
    "critics_rating": "number", // Average rating given by Rotten Tomatoes critics
    "critics_rating_count": "number", // Total number of ratings submitted by Rotten Tomatoes critics
    "critics_rating_liked_count": "number", // Total number of liked ratings submitted by Rotten Tomatoes critics
    "critics_rating_not_liked_count": "number", // Total number of not liked ratings submitted by Rotten Tomatoes critics
    "critics_certified": "boolean" // Has the item received the Rotten Tomatoes "Certified Fresh" status from critics
  },
  "senscritique": {
    /* Information related to SensCritique platform */
    "id": "number", // SensCritique specific identifier
    "url": "string", // URL to the SensCritique page
    "users_rating": "number", // Average rating given by SensCritique users
    "users_rating_count": "number" // Total number of ratings submitted by SensCritique users
  },
  "tmdb": {
    /* Information related to The Movie Database (TMDB) platform */
    "id": "number", // TMDB specific identifier
    "url": "string", // URL to the TMDB page
    "users_rating": "number", // Average rating given by TMDB users
    "users_rating_count": "number" // Total number of ratings submitted by TMDB users
  },
  "trakt": {
    /* Information related to Trakt platform */
    "id": "string", // Trakt specific identifier
    "url": "string", // URL to the Trakt page
    "users_rating": "number", // Average rating given by Trakt users
    "users_rating_count": "number" // Total number of ratings submitted by Trakt users
  },
  "tv_time": {
    /* Information related to TV Time platform */
    "id": "number", // TV Time specific identifier
    "url": "string", // URL to the TV Time page
    "users_rating": "number" // Average rating given by TV Time users
  },
  "thetvdb": {
    /* Information related to TheTVDB platform */
    "id": "number", // TheTVDB specific identifier
    "slug": "string", // Slug for the identifier on TheTVDB
    "url": "string" // URL to TheTVDB page
  },

  "mojo": {
    /* Information related to Box Office Mojo platform */
    "rank": "number", // Ranking according to Box Office Mojo
    "url": "string", // URL to the Box Office Mojo page
    "lifetime_gross": "string" // Lifetime gross revenue (formatted as string with $)
  },

  "updated_at": "string", // Timestamp of the last update

  "popularity_average": "number", // Average popularity score across platforms (AlloCiné and IMDb)
  "ratings_average": "number" // Average rating score across platforms (all)
}
```

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
