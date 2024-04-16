# What's on? API

Companion to [What's on?](https://github.com/pierrevano/whatson)

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

```
{
    "_id": "aHR0cHM6Ly93d3cuYWxsb2NpbmUuZnIvZmlsbS9maWNoZWZpbG1fZ2VuX2NmaWxtPTI3ODc0Mi5odG1s",
    "allocine": {
        "id": 278742,
        "url": "https://www.allocine.fr/film/fichefilm_gen_cfilm=278742.html",
        "users_rating": 4.5,
        "critics_rating": 4.2,
        "critics_number": 40,
        "critics_rating_details": [
            {
                "critic_name": "20 Minutes",
                "critic_rating": 5
            },
            {
                "critic_name": "CNews",
                "critic_rating": 5
            },
            {
                "critic_name": "CinemaTeaser",
                "critic_rating": 5
            },
            {
                "critic_name": "Closer",
                "critic_rating": 5
            },
            {
                "critic_name": "Dernières Nouvelles d'Alsace",
                "critic_rating": 5
            },
            {
                "critic_name": "Filmsactu",
                "critic_rating": 5
            },
            {
                "critic_name": "IGN France",
                "critic_rating": 5
            },
            {
                "critic_name": "L'Humanité",
                "critic_rating": 5
            },
            {
                "critic_name": "LCI",
                "critic_rating": 5
            },
            {
                "critic_name": "La Voix du Nord",
                "critic_rating": 5
            },
            {
                "critic_name": "Le Dauphiné Libéré",
                "critic_rating": 5
            },
            {
                "critic_name": "Le Journal du Dimanche",
                "critic_rating": 5
            },
            {
                "critic_name": "Le Journal du Geek",
                "critic_rating": 5
            },
            {
                "critic_name": "Le Parisien",
                "critic_rating": 5
            },
            {
                "critic_name": "Le Point",
                "critic_rating": 5
            },
            {
                "critic_name": "Les Echos",
                "critic_rating": 5
            },
            {
                "critic_name": "Mad Movies",
                "critic_rating": 5
            },
            {
                "critic_name": "Ouest France",
                "critic_rating": 5
            },
            {
                "critic_name": "Première",
                "critic_rating": 5
            },
            {
                "critic_name": "aVoir-aLire.com",
                "critic_rating": 5
            },
            {
                "critic_name": "Ecran Large",
                "critic_rating": 4
            },
            {
                "critic_name": "Elle",
                "critic_rating": 4
            },
            {
                "critic_name": "Franceinfo Culture",
                "critic_rating": 4
            },
            {
                "critic_name": "L'Ecran Fantastique",
                "critic_rating": 4
            },
            {
                "critic_name": "L'Obs",
                "critic_rating": 4
            },
            {
                "critic_name": "La Croix",
                "critic_rating": 4
            },
            {
                "critic_name": "Le Figaro",
                "critic_rating": 4
            },
            {
                "critic_name": "Les Fiches du Cinéma",
                "critic_rating": 4
            },
            {
                "critic_name": "Libération",
                "critic_rating": 4
            },
            {
                "critic_name": "Paris Match",
                "critic_rating": 4
            },
            {
                "critic_name": "Rolling Stone",
                "critic_rating": 4
            },
            {
                "critic_name": "Sud Ouest",
                "critic_rating": 4
            },
            {
                "critic_name": "Télé Loisirs",
                "critic_rating": 4
            },
            {
                "critic_name": "Les Inrockuptibles",
                "critic_rating": 3
            },
            {
                "critic_name": "Télérama",
                "critic_rating": 3
            },
            {
                "critic_name": "Cahiers du Cinéma",
                "critic_rating": 2
            },
            {
                "critic_name": "Critikat.com",
                "critic_rating": 2
            },
            {
                "critic_name": "Le Monde",
                "critic_rating": 2
            },
            {
                "critic_name": "Marianne",
                "critic_rating": 2
            },
            {
                "critic_name": "Le Figaro",
                "critic_rating": 1
            }
        ],
        "popularity": 10
    },
    "betaseries": {
        "id": "91505-dune-part-two",
        "url": "https://www.betaseries.com/film/91505-dune-part-two",
        "users_rating": 4.51
    },
    "id": 693134,
    "image": "https://fr.web.img4.acsta.net/pictures/24/01/26/10/18/5392835.jpg",
    "imdb": {
        "id": "tt15239678",
        "url": "https://www.imdb.com/title/tt15239678/",
        "users_rating": 8.7,
        "popularity": 2
    },
    "is_active": true,
    "item_type": "movie",
    "platforms_links": null,
    "seasons_number": null,
    "status": null,
    "title": "Dune : Deuxième Partie",
    "trailer": "https://www.dailymotion.com/embed/video/x8ltyzt",
    "metacritic": {
        "id": "dune-part-two",
        "url": "https://www.metacritic.com/movie/dune-part-two",
        "users_rating": 8.3,
        "critics_rating": 79
    },
    "mojo": {
        "rank": 150,
        "url": "https://www.boxofficemojo.com/title/tt15239678/",
        "lifetime_gross": "$684,517,808"
    },
    "rotten_tomatoes": {
        "id": "dune_part_two",
        "url": "https://www.rottentomatoes.com/m/dune_part_two",
        "users_rating": 95,
        "critics_rating": 93
    },
    "letterboxd": {
        "id": "dune-part-two",
        "url": "https://letterboxd.com/film/dune-part-two",
        "users_rating": 4.5
    },
    "senscritique": {
        "id": "45424060",
        "url": "https://www.senscritique.com/film/-/45424060",
        "users_rating": 7.8
    },
    "updated_at": "2024-04-16T06:12:02.170Z",
    "trakt": {
        "id": "dune-part-two-2023",
        "url": "https://trakt.tv/movies/dune-part-two-2023",
        "users_rating": 85
    },
    "tmdb": {
        "id": 693134,
        "url": "https://www.themoviedb.org/movie/693134",
        "users_rating": 8.308
    },
    "popularity_average": 6,
    "ratings_average": 4.3
}
```

---

Postman collection: https://documenter.getpostman.com/view/18186487/2s9Ykhg4MB
