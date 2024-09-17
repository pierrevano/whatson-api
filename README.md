# What's on? API

Companion to [What's on?](https://github.com/pierrevano/whatson)

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

_If you want to sort by ratings only, you must set the popularity parameter to `none`._
_You must have at least one popularity or one rating parameter to obtain results._

#### Active items

Active items are fetched from 2 different links:

1. For movies: https://www.allocine.fr/film/aucinema
2. For tvshows: https://www.allocine.fr/series/top

_These 2 links are also used to fetch the AlloCiné popularity of each item._

> ```
> https://whatson-api.onrender.com/?popularity_filters=allocine_popularity,imdb_popularity&ratings_filters=allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users&item_type=movie,tvshow&minimum_ratings=0,1,2,2.5,3,3.5,4,4.5&seasons_number=1,2,3,4,5&status=canceled,ended,ongoing,pilot,unknown&is_active=true,false&critics_rating_details=<boolean>&episodes_details=<boolean>&page=<integer>&limit=<integer>
> ```

| Parameter              | Value                                                                                                                                                                                 | Description                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| popularity_filters     | allocine_popularity,imdb_popularity                                                                                                                                                   | Popularity filters source (or _none_ to disable it)        |
| ratings_filters        | allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users | Ratings filters source (or _all_ for every values)         |
| item_type              | movie,tvshow                                                                                                                                                                          | The type of the item (_movie_, _tvshow_ or both)           |
| minimum_ratings        | 0,1,2,2.5,3,3.5,4,4.5                                                                                                                                                                 | Minimum ratings to return                                  |
| seasons_number         | 1,2,3,4,5                                                                                                                                                                             | Number of seasons (5 means 5+) (only valid for tvshows)    |
| status                 | canceled,ended,ongoing,pilot,unknown                                                                                                                                                  | TV show's status (only valid for tvshows)                  |
| is_active              | true,false                                                                                                                                                                            | Is the item currently on screens (_true_, _false_ or both) |
| critics_rating_details | _boolean_                                                                                                                                                                             | Should we return critics_rating_details in the response    |
| episodes_details       | _boolean_                                                                                                                                                                             | Should we return episodes_details in the response          |
| page                   | _integer_                                                                                                                                                                             | Page number                                                |
| limit                  | _integer_                                                                                                                                                                             | Page items limit                                           |

### Search

The query parameters provided below are solely for item search purposes and must be unique.

> ```
> https://whatson-api.onrender.com/?title=<string>
> ```

| Parameter        | Value     | Description                                  |
| ---------------- | --------- | -------------------------------------------- |
| title            | _string_  | Title of the movie or tvshow                 |
| allocineId       | _integer_ | AlloCiné ID of the movie or tvshow           |
| betaseriesId     | _string_  | BetaSeries ID of the movie or tvshow         |
| imdbId           | _string_  | IMDb ID of the movie or tvshow               |
| letterboxdId     | _string_  | Letterboxd ID of the movie                   |
| metacriticId     | _string_  | Metacritic ID of the movie or tvshow         |
| rottentomatoesId | _string_  | Rotten Tomatoes ID of the movie or tvshow    |
| senscritiqueId   | _integer_ | SensCritique ID of the movie or tvshow       |
| tmdbId           | _integer_ | The Movie Database ID of the movie or tvshow |
| traktId          | _string_  | Trakt ID of the movie or tvshow              |

#### Responses:

- `200` A successful response
- `404` No items have been found
- `500` Internal server error

---

### **GET /{item_type}/{id}**

Provides detailed information about specific item (movie or tvshow) by its type and unique identifier (TMDB ID).

> ```
> https://whatson-api.onrender.com/:item_type/:id?ratings_filters=allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users&critics_rating_details=<boolean>&episodes_details=<boolean>
> ```

| Parameter              | Value                                                                                                                                                                                 | Description                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| ratings_filters        | allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users | Ratings filters source                                  |
| critics_rating_details | _boolean_                                                                                                                                                                             | Should we return critics_rating_details in the response |
| episodes_details       | _boolean_                                                                                                                                                                             | Should we return episodes_details in the response       |

#### Responses:

- `200` A successful response
- `404` No items have been found
- `500` Internal server error

---

Example of an item returned:

```json
{
  "_id": "string", // Unique MongoDB identifier for the item
  "allocine": {
    /* Information related to AlloCiné platform */
    "id": "number", // AlloCiné specific identifier
    "url": "string", // URL to the AlloCiné page
    "users_rating": "number", // Rating given by AlloCiné users
    "critics_rating": "number", // Rating given by AlloCiné critics
    "critics_number": "number", // Number of AlloCiné critics who rated
    "critics_rating_details": [
      // To display this key, add the query parameter `critics_rating_details=true`
      {
        "critic_name": "string", // Name of the critic
        "critic_rating": "number" // Rating given by the critic
      }
    ],
    "popularity": "number" // Popularity score on AlloCiné
  },
  "betaseries": {
    /* Information related to BetaSeries platform */
    "id": "string", // BetaSeries specific identifier
    "url": "string", // URL to the BetaSeries page
    "users_rating": "number" // Rating given by BetaSeries users
  },
  "id": "number", // General identifier (The Movie Database ID)
  "image": "string", // URL to the item's image
  "imdb": {
    /* Information related to IMDb platform */
    "id": "string", // IMDb specific identifier
    "url": "string", // URL to the IMDb page
    "users_rating": "number", // Rating given by IMDb users
    "popularity": "number" // Popularity score on IMDb
  },
  "is_active": "boolean", // Indicates if the item is currently active
  "item_type": "string", // Type of the item (e.g., movie or tvshow)
  "platforms_links": [
    {
      "name": "string", // Name of the streaming platform
      "link_url": "string" // URL to the streaming platform
    }
  ],
  "release_date": "string", // Release date of the item
  "seasons_number": "number", // Number of seasons available
  "episodes_details": [
    // To display this key, add the query parameter `episodes_details=true`
    {
      "season": "number", // Season number of the episode
      "episode": "number", // Episode number within the season
      "title": "string", // Title of the episode
      "id": "string", // IMDb specific identifier
      "url": "string", // URL to the IMDb page
      "users_rating": "number" // Rating given by IMDb users
    }
  ],
  "status": "string", // Current status of the item (e.g., ongoing, ended, etc.)
  "tagline": "string", // Tagline of the item
  "title": "string", // Title of the item
  "trailer": "string", // URL to the item's trailer
  "metacritic": {
    /* Information related to Metacritic platform */
    "id": "string", // Metacritic specific identifier
    "url": "string", // URL to the Metacritic page
    "users_rating": "number", // Rating given by Metacritic users
    "critics_rating": "number" // Rating given by Metacritic critics
  },
  "mojo": {
    /* Information related to Box Office Mojo platform */
    "rank": "number", // Ranking according to Box Office Mojo
    "url": "string", // URL to the Box Office Mojo page
    "lifetime_gross": "string" // Lifetime gross revenue (formatted as string with $)
  },
  "rotten_tomatoes": {
    /* Information related to Rotten Tomatoes platform */
    "id": "string", // Rotten Tomatoes specific identifier
    "url": "string", // URL to the Rotten Tomatoes page
    "users_rating": "number", // Rating given by Rotten Tomatoes users
    "critics_rating": "number" // Rating given by Rotten Tomatoes critics
  },
  "letterboxd": {
    /* Information related to Letterboxd platform */
    "id": "string", // Letterboxd specific identifier
    "url": "string", // URL to the Letterboxd page
    "users_rating": "number" // Rating given by Letterboxd users
  },
  "senscritique": {
    /* Information related to SensCritique platform */
    "id": "number", // SensCritique specific identifier
    "url": "string", // URL to the SensCritique page
    "users_rating": "number" // Rating given by SensCritique users
  },
  "updated_at": "string", // Timestamp of the last update
  "trakt": {
    /* Information related to Trakt platform */
    "id": "string", // Trakt specific identifier
    "url": "string", // URL to the Trakt page
    "users_rating": "number" // Rating given by Trakt users
  },
  "tmdb": {
    /* Information related to The Movie Database (TMDB) platform */
    "id": "number", // TMDB specific identifier
    "url": "string", // URL to the TMDB page
    "users_rating": "number" // Rating given by TMDB users
  },
  "popularity_average": "number", // Average popularity score across platforms (AlloCiné and IMDb)
  "ratings_average": "number" // Average rating score across platforms (all)
}
```

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
