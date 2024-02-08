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
- **letterboxdId:** Letterboxd ID of the movie

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

Example of an item returned:

```
{
    "_id": "aHR0cHM6Ly93d3cuYWxsb2NpbmUuZnIvc2VyaWVzL2ZpY2hlc2VyaWVfZ2VuX2NzZXJpZT03MTU3Lmh0bWw=",
    "allocine": {
        "id": 7157,
        "url": "https://www.allocine.fr/series/ficheserie_gen_cserie=7157.html",
        "users_rating": 4.6,
        "critics_rating": 4.1,
        "critics_number": 7,
        "critics_rating_details": [
            {
                "critic_name": "Entertainment weekly",
                "critic_rating": 5
            },
            {
                "critic_name": "The Hollywood Reporter",
                "critic_rating": 5
            },
            {
                "critic_name": "Variety",
                "critic_rating": 5
            },
            {
                "critic_name": "Hitfix",
                "critic_rating": 4
            },
            {
                "critic_name": "Pittsburg Post-Gazette",
                "critic_rating": 4
            },
            {
                "critic_name": "TV Squad",
                "critic_rating": 4
            },
            {
                "critic_name": "Wall Street Journal",
                "critic_rating": 1.5
            }
        ],
        "popularity": 34
    },
    "betaseries": {
        "id": "gameofthrones",
        "url": "https://www.betaseries.com/serie/gameofthrones",
        "users_rating": 4.67
    },
    "id": 1399,
    "image": "https://fr.web.img5.acsta.net/pictures/23/01/03/14/13/0717778.jpg",
    "imdb": {
        "id": "tt0944947",
        "url": "https://www.imdb.com/title/tt0944947/",
        "users_rating": 9.2,
        "popularity": 13
    },
    "is_active": true,
    "item_type": "tvshow",
    "platforms_links": [
        {
            "name": "Pass Warner",
            "link_url": "https://www.betaseries.com/link/1161/415/fr"
        },
        {
            "name": "Prime Video",
            "link_url": "https://www.betaseries.com/link/1161/3/fr"
        }
    ],
    "seasons_number": 8,
    "status": "Ended",
    "title": "Game of Thrones",
    "trailer": "https://www.dailymotion.com/embed/video/x86esn8",
    "metacritic": {
        "id": "game-of-thrones",
        "url": "https://www.metacritic.com/tv/game-of-thrones",
        "users_rating": 8.4,
        "critics_rating": 86
    },
    "mojo": null,
    "rotten_tomatoes": {
        "id": "game_of_thrones",
        "url": "https://www.rottentomatoes.com/tv/game_of_thrones",
        "users_rating": 85,
        "critics_rating": 88
    },
    "popularity_average": 23.5,
    "ratings_average": 4.4
}
```

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
