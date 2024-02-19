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
- **senscritiqueId:** SensCritique ID of the movie or tv show

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
  "_id": "aHR0cHM6Ly93d3cuYWxsb2NpbmUuZnIvc2VyaWVzL2ZpY2hlc2VyaWVfZ2VuX2NzZXJpZT0yNTYzMy5odG1s",
  "allocine": {
    "id": 25633,
    "url": "https://www.allocine.fr/series/ficheserie_gen_cserie=25633.html",
    "users_rating": 4.2,
    "critics_rating": 3.5,
    "critics_number": 16,
    "critics_rating_details": [
      {
        "critic_name": "Ecran Large",
        "critic_rating": 4
      },
      {
        "critic_name": "Entertainment weekly",
        "critic_rating": 4
      },
      {
        "critic_name": "IGN France",
        "critic_rating": 4
      },
      {
        "critic_name": "Le Monde",
        "critic_rating": 4
      },
      {
        "critic_name": "Le Parisien",
        "critic_rating": 4
      },
      {
        "critic_name": "Les Inrockuptibles",
        "critic_rating": 4
      },
      {
        "critic_name": "Libération",
        "critic_rating": 4
      },
      {
        "critic_name": "Variety",
        "critic_rating": 4
      },
      {
        "critic_name": "Le Figaro",
        "critic_rating": 3.5
      },
      {
        "critic_name": "Numerama",
        "critic_rating": 3.5
      },
      {
        "critic_name": "Première",
        "critic_rating": 3.5
      },
      {
        "critic_name": "Empire",
        "critic_rating": 3
      },
      {
        "critic_name": "Numerama",
        "critic_rating": 3
      },
      {
        "critic_name": "The Hollywood Reporter",
        "critic_rating": 3
      },
      {
        "critic_name": "Rolling Stone",
        "critic_rating": 2
      },
      {
        "critic_name": "USA Today",
        "critic_rating": 2
      }
    ],
    "popularity": 4
  },
  "betaseries": {
    "id": "house-of-the-dragon",
    "url": "https://www.betaseries.com/serie/house-of-the-dragon",
    "users_rating": 4.33
  },
  "id": 94997,
  "image": "https://fr.web.img4.acsta.net/pictures/23/05/17/14/30/0480031.jpg",
  "imdb": {
    "id": "tt11198330",
    "url": "https://www.imdb.com/title/tt11198330/",
    "users_rating": 8.4,
    "popularity": 55
  },
  "is_active": true,
  "item_type": "tvshow",
  "platforms_links": [
    {
      "name": "Pass Warner",
      "link_url": "https://www.betaseries.com/link/22920/415/fr"
    }
  ],
  "seasons_number": 2,
  "status": "Ongoing",
  "title": "Game of Thrones: House of the Dragon",
  "trailer": "https://www.dailymotion.com/embed/video/x8csylj",
  "metacritic": {
    "id": "house-of-the-dragon",
    "url": "https://www.metacritic.com/tv/house-of-the-dragon",
    "users_rating": 5.4,
    "critics_rating": 69
  },
  "mojo": null,
  "rotten_tomatoes": {
    "id": "house_of_the_dragon",
    "url": "https://www.rottentomatoes.com/tv/house_of_the_dragon",
    "users_rating": 82,
    "critics_rating": 93
  },
  "updated_at": "2024-02-19T13:06:13.058Z",
  "letterboxd": null,
  "senscritique": {
    "id": "40572227",
    "url": "https://www.senscritique.com/serie/-/40572227",
    "users_rating": 7.5
  },
  "popularity_average": 29.5,
  "ratings_average": 3.9
}
```

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
