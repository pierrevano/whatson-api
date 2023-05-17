# Defining the variables used in the script.
FILMS_FIRST_INDEX_NUMBER=1
FILMS_MAX_NUMBER=15
IMDB_NOT_FOUND_PATH=temp_not_found
PAGES_MAX_NUMBER=15
PAGES_MIN_NUMBER=1
PROMPT=$3
SECONDS=0
SOURCE=$1
TEMP_URLS_FILE_PATH=./temp_urls
TYPE=$2
URL_ESCAPE_FILE_PATH=./utils/urlEscape.sed

# Defining alternative base variables
if [[ $TYPE == "movie" ]]; then
  BASE_URL=https://www.allocine.fr/film/aucinema/
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_NUMBER_HREF=/film/fichefilm_gen_cfilm=
  TITLE_TYPE=feature,tv_movie,tv_special,documentary,short
  BETASERIES_TYPE=movies/movie
  JQ_COMMAND_TYPE=".movie.resource_url"
  JQ_COMMAND_RESULTS=".movie_results"
  PROPERTY=P1265
  METACRITIC_TYPE=movie
  FALSE_NUMBER=2
  TRUE_OR_FALSE_NUMBER=3
else
  BASE_URL=https://www.allocine.fr/series/top/
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_NUMBER_HREF=/series/ficheserie_gen_cserie=
  TITLE_TYPE=tv_series,tv_episode,tv_special,tv_miniseries,documentary,tv_short
  BETASERIES_TYPE=shows/display
  JQ_COMMAND_TYPE=".show.resource_url"
  JQ_COMMAND_RESULTS=".tv_results"
  PROPERTY=P1267
  METACRITIC_TYPE=tv
  FALSE_NUMBER=4
  TRUE_OR_FALSE_NUMBER=5
fi

if [[ $SOURCE == "circleci" ]]; then
  sed -i "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i "/IS_ACTIVE_1$/! s/$/,FALSE/g" $FILMS_IDS_FILE_PATH
else
  sed -i '' "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i '' "/IS_ACTIVE_1$/! s/$/,FALSE/g" $FILMS_IDS_FILE_PATH
fi

WRONG_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | grep -E -v "^/.*\=[0-9]+\.html,tt[0-9]+,(.+?)+,[0-9]+,(.+?)+,(.+?)+(,(TRUE|FALSE)){1,5}$" | wc -l | awk '{print $1}')
if [[ $WRONG_LINES_NB -gt 1 ]]; then
  echo "Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
  echo "details:"
  cat $FILMS_IDS_FILE_PATH | grep -E -v "^/.*\=[0-9]+\.html,tt[0-9]+,(.+?)+,[0-9]+,(.+?)+,(.+?)+(,(TRUE|FALSE)){1,5}$"
  exit
fi

DUPLICATES_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | cut -d',' -f1 | uniq -cd && cat $FILMS_IDS_FILE_PATH | cut -d',' -f2 | uniq -cd && cat $FILMS_IDS_FILE_PATH | cut -d',' -f4 | uniq -cd)
if [[ $DUPLICATES_LINES_NB ]]; then
  echo "Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
  echo "details:"
  echo $DUPLICATES_LINES_NB
  exit
fi

# Loading the env variables
if [[ $SOURCE != "circleci" ]]; then
  source .env
fi
echo "SOURCE: $SOURCE"
echo "BETASERIES_API_KEY: $BETASERIES_API_KEY"
echo "THEMOVIEDB_API_KEY: $THEMOVIEDB_API_KEY"
echo "----------------------------------------------------------------------------------------------------"
if [[ -z $BETASERIES_API_KEY ]]; then
  exit
fi

# Sorting the ids in the file and removing duplicates.
sort_ids () {
  cat $FILMS_IDS_FILE_PATH | sort -V | uniq > ./temp_ids.txt
  cat ./temp_ids.txt > $FILMS_IDS_FILE_PATH
}

# A function that removes temporary files.
remove_files () {
  sort_ids

  rm -f ./temp_*
}

# A function that is called when the data is not found.
data_not_found () {
  IMDB_ID="noImdbId"
  BETASERIES_ID="noBetaseriesId"
  THEMOVIEDB_ID="noTheMovieDBId"

  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

betaseries_to_null () {
  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

# A function that is called when the data is found.
data_found () {
  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ✅"
}

remove_files

# Downloading base URL
curl -s $BASE_URL > temp_baseurl

# Get AlloCiné baseUrl number
FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
if [[ $FILMS_NUMBER -gt 15 ]]; then
  FILMS_NUMBER=$FILMS_MAX_NUMBER
fi

if [[ $FILMS_NUMBER -lt 15 ]]; then
  # Define AlloCiné baseUrl pages number to 1
  PAGES_NUMBER=1
else
  # Define AlloCiné baseUrl pages number
  PAGES_NUMBER=$(cat temp_baseurl | grep -Eo "\">[0-9]+</a></div></nav>" | cut -d'>' -f2 | cut -d'<' -f1)
  if [[ $PAGES_NUMBER -gt 15 ]]; then
    PAGES_NUMBER=$PAGES_MAX_NUMBER
  fi
fi

# Loop through all AlloCiné pages
for PAGES_INDEX_NUMBER in $( eval echo {$PAGES_MIN_NUMBER..$PAGES_NUMBER} )
do
  # Get AlloCiné first page
  if [[ $PAGES_INDEX_NUMBER -eq 1 ]]; then
    FILM_ID=1
  # Get AlloCiné second until second to last page
  elif [[ $PAGES_INDEX_NUMBER -lt $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl
  # Get AlloCiné last page
  elif [[ $PAGES_INDEX_NUMBER -eq $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl

    FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
    if [[ $FILMS_NUMBER -gt 15 ]]; then
      FILMS_NUMBER=$FILMS_MAX_NUMBER
    fi
  fi

  FILMS_INDEX_NUMBER=$FILMS_FIRST_INDEX_NUMBER
  while [[ $FILMS_INDEX_NUMBER -le $FILMS_NUMBER ]]
  do
    # Get AlloCiné film url
    URL=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4)

    # Get id
    FILM_ID=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)

    # Check if missing shows
    ALLOCINE_URL=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f1)
    if [[ $URL == $ALLOCINE_URL ]]; then
      if [[ $SOURCE == "circleci" ]]; then
        sed -i "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      else
        sed -i '' "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      fi
      cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html"
      cat $FILMS_IDS_FILE_PATH | grep "TRUE$" | wc -l | awk '{print $1}'

      MATCH_NUMBER=$(cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html" | wc -l | awk '{print $1}')
      if [[ $MATCH_NUMBER != 1 ]]; then
        exit
      fi

      FOUND=1
    else
      FOUND=0
    fi

    # Add first line to URLs check file
    echo "first line" >> $TEMP_URLS_FILE_PATH

    if [[ $FOUND -eq 0 ]]; then
      URL_FILE=$TEMP_URLS_FILE_PATH
      while IFS= read -r TEMP_URLS <&3; do
        if [[ $URL == $TEMP_URLS ]]; then
          DUPLICATE=1
          break
        else
          DUPLICATE=0
        fi
      done 3<$URL_FILE

      echo $URL >> $TEMP_URLS_FILE_PATH

      if [[ $DUPLICATE -eq 0 ]]; then
        curl -s https://www.allocine.fr$URL > temp_allocine_url
        echo "Downloading from: https://www.allocine.fr$URL"
        if [[ -z $URL ]]; then
          echo "No URL has been found! Script aborded."
          exit
        fi

        # Get title
        TITLE=$(cat temp_allocine_url | grep -m1 "<meta property=\"og:title\" content=\"" | cut -d'"' -f4 | sed 's/&#039;/'"'"'/' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        echo "Title: $TITLE"

        # Get original title for IMDb
        ORIGINAL_TITLE=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/&#039;/'"'"'/' | sed 's/\&amp;/\&/g' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        ORIGINAL_TITLE_NUMBER=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | wc -l | awk '{print $1}')
        if [[ $ORIGINAL_TITLE_NUMBER -gt 0 ]]; then
          TITLE=$ORIGINAL_TITLE
        fi

        # Get title encoded characters URL
        TITLE_URL_ENCODED=$(echo $TITLE | tr '[:upper:]' '[:lower:]' | sed -f $URL_ESCAPE_FILE_PATH)

        METACRITIC_ID=""
        ROTTEN_TOMATOES_ID=""

        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY%20%22$FILM_ID%22.%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22en%22.%20%7D%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
        if [[ -z $WIKI_URL ]]; then
          echo "No wiki URL!"

          for itemIndex in 1 2 3
          do
            if [[ $TYPE == "movie" ]]; then
              # Get release date
              CREATION_YEAR=$(cat temp_allocine_url | grep -A6 "date blue-link" | grep "[0-9][0-9][0-9][0-9]" | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//' | cut -d' ' -f3)
              # Get IMDb release date
              IMDB_YEAR=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex "([0-9][0-9][0-9][0-9])</span>" | tail -1 | cut -d'<' -f2 | grep -Eo "([0-9]+)")
              echo "Downloading from: https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
            else
              CREATION_YEAR=$(cat temp_allocine_url | grep -A6 "meta-body-item meta-body-info" | grep -Eo "[0-9][0-9][0-9][0-9]" | head -1 | tail -1)
              IMDB_YEAR=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex "([0-9][0-9][0-9][0-9]" | tail -1 | cut -d'<' -f2 | grep -Eo "[0-9]+" | head -1)
            fi
            IMDB_YEAR_P1=$((IMDB_YEAR + 1))
            echo "IMDb year +1: $IMDB_YEAR_P1"

            if [[ $CREATION_YEAR == $IMDB_YEAR ]] || [[ $CREATION_YEAR == $IMDB_YEAR_P1 ]]; then
              break
            fi
          done

          echo "Creation year: $CREATION_YEAR - IMDb year: $IMDB_YEAR"
          echo "Creation year: $CREATION_YEAR - IMDb year +1: $IMDB_YEAR_P1"
          if [[ $CREATION_YEAR == $IMDB_YEAR ]]; then
            if [[ $TYPE == "movie" ]]; then
              echo "itemIndex: $itemIndex"
              IMDB_ID=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex -B5 "([0-9][0-9][0-9][0-9])" | tail -3 | grep "/title/tt" | cut -d'/' -f3)
              echo "IMDb ID: $IMDB_ID"
            else
              IMDB_ID=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex -B5 "([0-9][0-9][0-9][0-9]" | tail -3 | grep "/title/tt" | cut -d'/' -f3)
            fi
          elif [[ $CREATION_YEAR == $IMDB_YEAR_P1 ]]; then
            ALLOCINE_DIRECTOR=$(cat temp_allocine_url | grep -A1 "light\">De</span>" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1)
            IMDB_DIRECTOR=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex -A2 "Director" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1)

            echo "Allocine director: $ALLOCINE_DIRECTOR - IMDb director: $IMDB_DIRECTOR"
            if [[ $ALLOCINE_DIRECTOR == $IMDB_DIRECTOR ]]; then
              if [[ $TYPE == "movie" ]]; then
                IMDB_ID=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex -B5 "([0-9][0-9][0-9][0-9])" | tail -3 | grep "/title/tt" | cut -d'/' -f3)
              else
                IMDB_ID=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED\&title_type\=$TITLE_TYPE | grep -m$itemIndex -B5 "([0-9][0-9][0-9][0-9]" | tail -3 | grep "/title/tt" | cut -d'/' -f3)
              fi
            else
              echo "Downloading from: https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"

              IMDB_ID="noImdbId"
            fi
          else
            echo "Downloading from: https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"

            IMDB_ID="noImdbId"
          fi
        else
          echo "wikiUrl: $WIKI_URL"

          IMDB_ID=$(curl -s $WIKI_URL | grep "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -Eo "tt[0-9]+" | head -1)
          echo "IMDb ID: $IMDB_ID"

          METACRITIC_ID=$(curl -s $WIKI_URL | grep "https://www.metacritic.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
          echo "Metacritic ID: $METACRITIC_ID"

          ROTTEN_TOMATOES_ID=$(curl -s $WIKI_URL | grep "https://www.rottentomatoes.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
          echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"
        fi

        if [[ -z $IMDB_ID ]]; then
          IMDB_ID="noImdbId"
        fi

        if [[ -z $METACRITIC_ID ]]; then
          DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          FIRST_THREE_LETTERS_TITLE=$(echo "$TITLE_URL_ENCODED" | cut -c1-3)
          METACRITIC_ID=$(curl -s "https://www.metacritic.com/search/all/$TITLE_URL_ENCODED/results?cats%5B$METACRITIC_TYPE%5D=1&search_type=advanced&sort=relevancy" -H "$DATE" | grep "<a href=\"/$METACRITIC_TYPE/$FIRST_THREE_LETTERS_TITLE" | head -1 | cut -d'/' -f3 | cut -d'"' -f1)

          if [[ -z $METACRITIC_ID ]]; then
            METACRITIC_ID=null
          fi
        fi

        if [[ -z $ROTTEN_TOMATOES_ID ]]; then
          ROTTEN_TOMATOES_ID=null
        fi

        if [[ $IMDB_ID == "noImdbId" ]] && [[ -z $PROMPT ]]; then
          echo "IMDb ID not found: $IMDB_ID"
          echo "https://www.allocine.fr$URL" >> $IMDB_NOT_FOUND_PATH
          echo "Downloading from: https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE" >> $IMDB_NOT_FOUND_PATH
          echo "----------------------------------------------------------------------------------------------------"

          data_not_found
        else
          if [[ $IMDB_ID == "noImdbId" ]] && [[ $PROMPT == "prompt" ]]; then
            open -a "/Applications/Brave Browser.app" "https://www.allocine.fr$URL"
            open -a "/Applications/Brave Browser.app" "https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
            echo "Enter the IMDb id:"
            read IMDB_ID
          fi

          echo "imdbId URL: https://www.imdb.com/title/$IMDB_ID/"

          BETASERIES_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE" | cut -d'/' -f5 | sed 's/"//g')
          echo "Downloading from: https://api.betaseries.com/$BETASERIES_TYPE?key=$BETASERIES_API_KEY&imdb_id=$IMDB_ID"
          echo "Betaseries ID: $BETASERIES_ID"

          THEMOVIEDB_ID=$(curl -s https://api.themoviedb.org/3/find/$IMDB_ID\?api_key=$THEMOVIEDB_API_KEY\&external_source=imdb_id | jq "$JQ_COMMAND_RESULTS" | jq '.[] .id')
          echo "Downloading from: https://api.themoviedb.org/3/find/$IMDB_ID?api_key=$THEMOVIEDB_API_KEY&external_source=imdb_id"

          if [[ -z $THEMOVIEDB_ID ]]; then
            data_not_found
          elif [[ $BETASERIES_ID == "null" ]]; then
            betaseries_to_null
          else
            data_found
          fi
        fi

        echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,TRUE" >> $FILMS_IDS_FILE_PATH

        echo "----------------------------------------------------------------------------------------------------"
      fi
    fi

    FILMS_INDEX_NUMBER=$[$FILMS_INDEX_NUMBER+1] FILM_ID=$[$FILM_ID+1]
  done
done

remove_files

if [[ $SOURCE == "circleci" ]]; then
  sed -i -E "s/(,TRUE|,FALSE){1}(,FALSE){$FALSE_NUMBER}/,FALSE/g" $FILMS_IDS_FILE_PATH
  sed -i -E "s/(,TRUE|,FALSE){$TRUE_OR_FALSE_NUMBER}/,TRUE/g" $FILMS_IDS_FILE_PATH
else
  sed -i '' -E "s/(,TRUE|,FALSE){1}(,FALSE){$FALSE_NUMBER}/,FALSE/g" $FILMS_IDS_FILE_PATH
  sed -i '' -E "s/(,TRUE|,FALSE){$TRUE_OR_FALSE_NUMBER}/,TRUE/g" $FILMS_IDS_FILE_PATH
fi

# Add ending message with duration
DATA_DURATION=$SECONDS
echo "Complete in $(($DATA_DURATION / 60)) minutes and $(($DATA_DURATION % 60)) seconds ✅"
echo "----------------------------------------------------------------------------------------------------"