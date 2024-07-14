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

#### Parameters:

- **item_type:** The type of the item (movie or tvshow)
- **popularity_filters:** Popularity filters by source (allocine_popularity or imdb_popularity)
- **minimum_ratings:** Minimum ratings (0,1,2,2.5,3,3.5,4,4.5)
- **platforms:** Platforms filters (URI encoded platforms names)
- **release_date:** Release date filters (new,all) (only valid for movies)
- **seasons_number:** Number of seasons (1,2,3,4,5 and 5 means 5+) (only valid for tvshows)
- **status:** TV show's status filters (canceled,ended,ongoing,pilot,soon,unknown) (only valid for tvshows)
- **ratings_filters:** Ratings filters by source (allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users)
- **page:** Page number
- **limit:** Page items limit

##### Search

The query parameters provided below are solely for item search purposes and must be unique.

- **title:** Title of the movie or tvshow
- **allocineId:** AlloCiné ID of the movie or tvshow
- **betaseriesId:** BetaSeries ID of the movie or tvshow
- **imdbId:** IMDb ID of the movie or tvshow
- **letterboxdId:** Letterboxd ID of the movie
- **metacriticId:** Metacritic ID of the movie or tvshow
- **rottentomatoesId:** Rotten Tomatoes ID of the movie or tvshow
- **senscritiqueId:** SensCritique ID of the movie or tvshow
- **traktId:** Trakt ID of the movie or tvshow
- **tmdbId:** The Movie Database ID of the movie or tvshow

#### Responses:

- `200` A successful response

---

### **GET /{item_type}/{id}**

Provides detailed information about specific item (movie or tvshow) by its unique identifier and type

#### Parameters:

- **item_type:** The type of the item (movie or tvshow)
- **id:** The unique identifier for the item (The Movie Database ID)
- **ratings_filters:** Ratings filters by source (allocine_critics,allocine_users,betaseries_users,imdb_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users)

#### Responses:

- `200` A successful response

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
