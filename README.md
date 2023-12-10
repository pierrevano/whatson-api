# What's on? API

Companion to [What's on?](https://github.com/pierrevano/whatson)

---

This API provides information on movies and tv shows.

## Endpoints

### **GET /**

Retrieves detailed information about either a movie or a tv show based on the provided query parameters.

#### Parameters:

- **item_type:** The type of the item (either movie or tv show)
- **popularity_filters:** Popularity filters by source
- **minimum_ratings:** Minimum ratings
- **seasons_number:** Number of seasons (5 means 5+)
- **status:** TV show's status filters (only valid for tv shows)
- **ratings_filters:** Ratings filters by source
- **page:** Page number
- **title:** Title of the movie or tv show
- **allocineId:** Allocine ID of the movie or tv show
- **betaseriesId:** BetaSeries ID of the movie or tv show
- **imdbId:** IMDb ID of the movie or tv show
- **themoviedbId:** The Movie Database ID of the movie or tv show
- **metacriticId:** Metacritic ID of the movie or tv show
- **rottentomatoesId:** Rotten Tomatoes ID of the movie or tv show

#### Responses:

- `200` A successful response

---

### **GET /{item_type}/{id}**

Provides detailed information about specific item (movie or tv show) by its unique identifier and type

#### Parameters:

- **item_type:** The type of the item (either movie or tv show)
- **id:** The unique identifier for the item (the movie DB ID)
- **ratings_filters:** Ratings filters by source

#### Responses:

- `200` A successful response

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
