# Define the main variables
BASE_URL_ASSETS=https://whatson-assets.vercel.app
BROWSER_PATH="/Applications/Arc.app"
FILMS_ASSETS_PATH=./src/assets/
FILMS_FIRST_INDEX_NUMBER=1
FILMS_MAX_NUMBER=15
PAGES_MAX_NUMBER=20
PAGES_MIN_NUMBER=1
PROMPT=$3
PROMPT_SERVICE_NAME=$4
MIN_RATING=$5
IGNORE_NATIONALITY=$6
SECONDS=0
SOURCE=$1
TEMP_URLS_FILE_PATH=./temp_urls
TYPE=$2
URL_ESCAPE_FILE_PATH=./src/utils/urlEscape.sed
USER_AGENT="$((RANDOM % 1000000000000))"
REGEX_IDS="^\/\S+\/fiche\S+_gen_c\S+=[0-9]+\.html,tt[0-9]+,(\S+?),[0-9]+,(\S+?){3},([0-9]+|null),(\S+?),([0-9]+|null),(TRUE|FALSE)$"
REGEX_IDS_COMMAS="^([^,]*,){10}[^,]*$"
DEFAULT_FIRST_SHOW=/series/ficheserie_gen_cserie=28295.html
SEPARATOR="------------------------------------------------------------------------------------------------------------------------"

# Define alternative base variables
if [[ $TYPE == "movie" ]]; then
  BASE_URL=https://www.allocine.fr/film/aucinema/
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_FILE_NAME=films_ids.txt
  POPULARITY_FILE_NAME=popularity_ids_films.txt
  FILMS_NUMBER_HREF=/film/fichefilm_gen_cfilm=
  TITLE_TYPE=feature,tv_movie,tv_special,documentary,short
  BETASERIES_TYPE=movies/movie
  JQ_COMMAND_TYPE=".movie.resource_url"
  JQ_COMMAND_TYPE_TMDB=".movie.themoviedb_id"
  JQ_COMMAND_RESULTS=".movie_results"
  PROPERTY=P1265
  METACRITIC_TYPE=movie
  POPULARITY_ASSETS_PATH=./src/assets/popularity_ids_films.txt
  SKIP_IDS_FILE_PATH=./src/assets/skip_ids_films.txt
  TRAKT_PATH=".[0].movie.ids."
  IMDB_CHART_URL="https://www.imdb.com/chart/moviemeter/"
elif [[ $TYPE == "tvshow" ]]; then
  BASE_URL=https://www.allocine.fr/series/top/
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_FILE_NAME=series_ids.txt
  POPULARITY_FILE_NAME=popularity_ids_series.txt
  FILMS_NUMBER_HREF=/series/ficheserie_gen_cserie=
  TITLE_TYPE=tv_series,tv_episode,tv_special,tv_miniseries,documentary,tv_short
  BETASERIES_TYPE=shows/display
  JQ_COMMAND_TYPE=".show.resource_url"
  JQ_COMMAND_TYPE_TMDB=".show.themoviedb_id"
  JQ_COMMAND_RESULTS=".tv_results"
  PROPERTY=P1267
  METACRITIC_TYPE=tv
  POPULARITY_ASSETS_PATH=./src/assets/popularity_ids_series.txt
  SKIP_IDS_FILE_PATH=./src/assets/skip_ids_series.txt
  TRAKT_PATH=".[0].show.ids."
  IMDB_CHART_URL="https://www.imdb.com/chart/tvmeter/"
else
  echo "Item type should be either `movie` or `tvshow`"
  exit 1
fi

# Loading the env variables
if [[ $SOURCE != "circleci" ]]; then
  source .env
fi

echo "SOURCE: $SOURCE"
echo "WHATSON_API_URL: $WHATSON_API_URL"
echo $SEPARATOR

if [[ -z $BETASERIES_API_KEY ]]; then
  echo "Error: BETASERIES_API_KEY is not set. Please set it in the environment variables."
  exit 1
fi

# Check if What's on? API is up
while true; do
  status_code=$(curl -o /dev/null -s -w "%{http_code}" "$WHATSON_API_URL")

  if [[ "$status_code" -eq 200 ]]; then
    echo "Correct status code $status_code from $WHATSON_API_URL."
    echo $SEPARATOR
    break
  elif [[ "$status_code" -gt 500 ]]; then
    echo "Critical Error: Received status code $status_code from $WHATSON_API_URL. Aborting."
    echo $SEPARATOR
    exit 1
  else
    echo "Error: Received status code $status_code from $WHATSON_API_URL. Retrying..."
    echo $SEPARATOR
  fi

  sleep 5
done

if [[ $SOURCE == "circleci" ]]; then
  curl -s "$BASE_URL_ASSETS/$FILMS_FILE_NAME" > $FILMS_IDS_FILE_PATH
  echo "Downloading $BASE_URL_ASSETS/$FILMS_FILE_NAME to $FILMS_IDS_FILE_PATH"

  sed -i "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i -E "s/(,TRUE|,FALSE){1,}/,FALSE/g" $FILMS_IDS_FILE_PATH
else
  sed -i '' "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i '' -E "s/(,TRUE|,FALSE){1,}/,FALSE/g" $FILMS_IDS_FILE_PATH
fi

WRONG_LINES_NB=$(grep -E -v "$REGEX_IDS" $FILMS_IDS_FILE_PATH | wc -l)
WRONG_LINES_NB_COMMAS=$(grep -E -v "$REGEX_IDS_COMMAS" $FILMS_IDS_FILE_PATH | wc -l)
WRONG_LINES_NB_INVISIBLE=$(perl -lne 'print if m/[^\x20-\x7E]/ || /[^[:ascii:]]/ || /[[:^print:]]/' $FILMS_IDS_FILE_PATH | wc -l)
ERRORS_FOUND=0

if [[ $WRONG_LINES_NB -gt 1 ]]; then
  echo "WRONG_LINES_NB / Something's wrong in the IDs file: $FILMS_IDS_FILE_PATH. Wrong Lines Count: $WRONG_LINES_NB"
  grep -E -v "$REGEX_IDS" $FILMS_IDS_FILE_PATH | tail -1
  ERRORS_FOUND=1
elif [[ $WRONG_LINES_NB_COMMAS -gt 0 ]]; then
  echo "WRONG_LINES_NB_COMMAS / Something's wrong with commas in the file: $FILMS_IDS_FILE_PATH. Wrong Lines Commas Count: $WRONG_LINES_NB_COMMAS"
  grep -E -v "$REGEX_IDS_COMMAS" $FILMS_IDS_FILE_PATH | tail -1
  ERRORS_FOUND=1
elif [[ $WRONG_LINES_NB_INVISIBLE -gt 0 ]]; then
  echo "WRONG_LINES_NB_INVISIBLE / Something's wrong with invisible characters in the file: $FILMS_IDS_FILE_PATH. Wrong Lines Invisible Count: $WRONG_LINES_NB_INVISIBLE"
  perl -lne 'print if m/[^\x20-\x7E]/ || /[^[:ascii:]]/ || /[[:^print:]]/' $FILMS_IDS_FILE_PATH | tail -1
  ERRORS_FOUND=1
fi

if [[ $ERRORS_FOUND -eq 1 ]]; then
  exit 1
fi

DUPLICATES_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | cut -d',' -f1 | uniq -cd && cat $FILMS_IDS_FILE_PATH | cut -d',' -f2 | sort | uniq -cd | awk '$1 > 3')
if [[ $DUPLICATES_LINES_NB ]]; then
  echo "DUPLICATES_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
  echo "details:"
  echo $DUPLICATES_LINES_NB
  exit 1
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
  rm -f src/assets/.!*!films_ids.txt
  rm -f src/assets/.!*!series_ids.txt

  if [[ $SOURCE == "circleci" ]]; then
    sed -i "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH
  else
    sed -i '' "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH
  fi
}

update_imdb_popularity_flags () {
  local json

  json=$(curl -s -H "User-Agent: $USER_AGENT" "$IMDB_CHART_URL" | grep -o '<script id="__NEXT_DATA__" type="application/json">.*</script>' | sed 's/<script id="__NEXT_DATA__" type="application\/json">//; s/<\/script>//')
  if [[ -z $json ]]; then
    return
  fi

  json=$(echo "$json" | sed "s/<script>if(typeof uet === 'function'){ uet('be', 'LoadFooterJS', {wb: 1}); }<\/script>//")

  echo "$json" | jq -r '.props.pageProps.pageData.chartTitles.edges[]?.node.id | select(. != null)' > ./temp_imdb_chart_ids 2>/dev/null

  if [[ ! -s ./temp_imdb_chart_ids ]]; then
    rm -f ./temp_imdb_chart_ids
    return
 fi

  local ids_count
  ids_count=$(grep -c '^tt[0-9]\+' ./temp_imdb_chart_ids)
  if [[ $ids_count -ne 100 ]]; then
    rm -f ./temp_imdb_chart_ids
    return
  fi

  while IFS= read -r IMDB_CHART_ID; do
    if [[ $SOURCE == "circleci" ]]; then
      sed -i "/,$IMDB_CHART_ID,/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
    else
      sed -i '' "/,$IMDB_CHART_ID,/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
    fi
  done < ./temp_imdb_chart_ids

  rm -f ./temp_imdb_chart_ids
}

set_default_values_if_empty () {
  [[ -z $IMDB_ID ]] && IMDB_ID=null
  [[ -z $BETASERIES_ID ]] && BETASERIES_ID=null
  [[ -z $THEMOVIEDB_ID ]] && THEMOVIEDB_ID="noTheMovieDBId"
  [[ -z $METACRITIC_ID ]] && METACRITIC_ID=null
  [[ -z $ROTTEN_TOMATOES_ID ]] && ROTTEN_TOMATOES_ID=null
  [[ -z $LETTERBOXD_ID ]] && LETTERBOXD_ID=null
  [[ -z $SENSCRITIQUE_ID ]] && SENSCRITIQUE_ID=null
  [[ -z $TRAKT_ID ]] && TRAKT_ID=null
  [[ -z $THETVDB_ID ]] && THETVDB_ID=null
}

# A function that is called when the data is not found.
data_not_found () {
  IMDB_ID=null
  BETASERIES_ID=null
  THEMOVIEDB_ID="noTheMovieDBId"

  set_default_values_if_empty

  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,$TRAKT_ID,$THETVDB_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

betaseries_to_null () {
  set_default_values_if_empty

  echo "BetaSeries is null but the rest is fine."
  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,$TRAKT_ID,$THETVDB_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ✅"
}

# A function that is called when the data is found.
data_found () {
  set_default_values_if_empty

  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,$TRAKT_ID,$THETVDB_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ✅"
}

fetch_id () {
  local wiki_url=$1
  local service_url=$2
  local service_name=$3
  local nationality=$4
  local ignore_nationality=$5

  if [[ $ignore_nationality == "IGNORE_NATIONALITY" ]]; then
    nationality=null
  fi

  if [[ $wiki_url ]]; then
    id=$(curl -s $wiki_url | grep $service_url | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
    deprecated_id=$(curl -s $wiki_url | grep -A15 $service_url | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  else
    id=null
  fi

  if [[ -z $id ]] || [[ $deprecated_id -eq 1 ]]; then
    id=null
  fi

  CHECK_VALUE=$(eval echo \$$service_name"_CHECK")

  if { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; } && [[ $id == "null" ]] && \
    { [[ -z $(eval echo \$$service_name"_CHECK") ]] || [[ $(eval echo \$$service_name"_CHECK") == "null" ]]; } && \
    { [[ $service_name != "LETTERBOXD" ]] || [[ $TYPE != "tvshow" ]]; } && \
    [[ $nationality != "France" ]] && \
    [[ $STATUS != "À venir" ]] && \
    { [[ $PROMPT_SERVICE_NAME == $service_name ]] || [[ $PROMPT_SERVICE_NAME == "all" ]]; }; then
      open -a $BROWSER_PATH "https://www.allocine.fr$URL"
      open -a $BROWSER_PATH $service_url
      read -p "Enter the $service_name ID: " id
  fi

  if { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; } && [[ $CHECK_VALUE != "null" ]]; then
    echo "$CHECK_VALUE"
  else
    echo "$id"
  fi
}

fetch_from_trakt_search () {
  local imdb_id=$1
  local id_type=$2

  response=$(curl -s --location "https://api.trakt.tv/search/imdb/$imdb_id" \
    --header "trakt-api-key: $TRAKT_API_KEY" \
    --header "trakt-api-version: 2")

  response_length=$(echo "$response" | jq 'length')

  if [[ "$response_length" -gt 1 ]]; then
    id=null
  else
    id=$(echo "$response" | jq -r "$TRAKT_PATH$id_type")
  fi

  if [[ -z $id ]]; then
    id=null
  fi

  echo "$id"
}

get_other_ids () {
  METACRITIC_ID=$(fetch_id "$WIKI_URL" "https://www.metacritic.com" "METACRITIC" "$NATIONALITY" "$IGNORE_NATIONALITY")
  ROTTEN_TOMATOES_ID=$(fetch_id "$WIKI_URL" "https://www.rottentomatoes.com" "ROTTEN_TOMATOES" "$NATIONALITY" "$IGNORE_NATIONALITY")
  LETTERBOXD_ID=$(fetch_id "$WIKI_URL" "https://letterboxd.com" "LETTERBOXD")
  SENSCRITIQUE_ID=$(fetch_id "$WIKI_URL" "https://www.senscritique.com" "SENSCRITIQUE")
  TRAKT_ID=$(fetch_id "$WIKI_URL" "https://trakt.tv" "TRAKT")
  THETVDB_ID=$(fetch_id "$WIKI_URL" "https://thetvdb.com" "THETVDB")

  if [[ "$TRAKT_ID" == "null" && -n "$IMDB_ID" ]]; then
    TRAKT_ID=$(fetch_from_trakt_search "$IMDB_ID" "trakt")
  fi

  if [[ "$THETVDB_ID" == "null" && -n "$IMDB_ID" ]]; then
    THETVDB_ID=$(fetch_from_trakt_search "$IMDB_ID" "tvdb")
  fi

  echo "Metacritic ID: $METACRITIC_ID"
  echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"
  echo "Letterboxd ID: $LETTERBOXD_ID"
  echo "SensCritique ID: $SENSCRITIQUE_ID"
  echo "Trakt ID: $TRAKT_ID"
  echo "TheTVDB ID: $THETVDB_ID"
}

remove_files

rm -f $POPULARITY_ASSETS_PATH

curl -s -H "User-Agent: $USER_AGENT" $BASE_URL > temp_baseurl

# Get AlloCiné baseUrl number
FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
if [[ $FILMS_NUMBER -gt $FILMS_MAX_NUMBER ]]; then
  FILMS_NUMBER=$FILMS_MAX_NUMBER
fi

if [[ $FILMS_NUMBER -lt $FILMS_MAX_NUMBER ]]; then
  # Define AlloCiné baseUrl pages number to 1
  PAGES_NUMBER=1
else
  # Define AlloCiné baseUrl pages number
  PAGES_NUMBER=$(cat temp_baseurl | grep -Eo "\">[0-9]+</a></div></nav>" | cut -d'>' -f2 | cut -d'<' -f1)
  if [[ $PAGES_NUMBER -gt $PAGES_MAX_NUMBER ]]; then
    PAGES_NUMBER=$PAGES_MAX_NUMBER
  fi
fi

# Loop through all AlloCiné pages
for PAGES_INDEX_NUMBER in $( eval echo {$PAGES_MIN_NUMBER..$PAGES_NUMBER} )
do
  # Get AlloCiné first page
  if [[ $PAGES_INDEX_NUMBER -eq 1 ]]; then
    FILM_ID=1

    echo "Downloading from: $BASE_URL"
    echo $SEPARATOR

  # Get AlloCiné second until second to last page
  elif [[ $PAGES_INDEX_NUMBER -lt $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl

    echo $SEPARATOR
    echo "Downloading from: $BASE_URL?page=$PAGES_INDEX_NUMBER"
    echo $SEPARATOR

  # Get AlloCiné last page
  elif [[ $PAGES_INDEX_NUMBER -eq $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl

    echo $SEPARATOR
    echo "Downloading from: $BASE_URL?page=$PAGES_INDEX_NUMBER"
    echo $SEPARATOR

    FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
    if [[ $FILMS_NUMBER -gt 15 ]]; then
      FILMS_NUMBER=$FILMS_MAX_NUMBER
    fi
  fi

  FILMS_INDEX_NUMBER=$FILMS_FIRST_INDEX_NUMBER
  while [[ $FILMS_INDEX_NUMBER -le $FILMS_NUMBER ]]
  do
    # Get AlloCiné film url
    if [[ $PROMPT == "allocine" ]]; then
      echo "Enter the AlloCiné URL:"
      read URL
      URL=$(echo $URL | sed 's/https:\/\/www.allocine.fr//')

      URL_FOUND=$(grep $URL $FILMS_IDS_FILE_PATH | wc -l | awk '{print $1}')
      if [[ $URL_FOUND -eq 1 ]]; then
        echo "URL is already existing in $FILMS_IDS_FILE_PATH"
        grep $URL $FILMS_IDS_FILE_PATH
        exit 1
      fi
    else
      URL=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4)
    fi

    # Sometimes AlloCiné is displaying a default top series list starting by this ID. If `true`, aborting.
    if [[ $URL == $DEFAULT_FIRST_SHOW ]] && [[ $PAGES_INDEX_NUMBER -eq 1 ]] && [[ $FILMS_INDEX_NUMBER -eq 1 ]]; then
      echo "First URL is: $URL"
      echo "Not updating tvshows as the top list is not correct."

      curl -s "$BASE_URL_ASSETS/$POPULARITY_FILE_NAME" > $POPULARITY_ASSETS_PATH

      exit 1
    fi

    # Get id
    if [[ $PROMPT == "allocine" ]]; then
      FILM_ID=$(echo $URL | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)
    else
      FILM_ID=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)
    fi

    # Check if missing shows
    ALLOCINE_URL=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f1)

    if [[ $URL == $ALLOCINE_URL ]]; then
      if [[ $SOURCE == "circleci" ]]; then
        sed -i "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      else
        sed -i '' "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      fi
      cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html"

      MATCH_NUMBER=$(cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html" | wc -l | awk '{print $1}')
      if [[ $MATCH_NUMBER != 1 ]]; then
        exit 1
      fi

      FOUND=1
    else
      FOUND=0
    fi

    INDEX_POPULARITY=$[$INDEX_POPULARITY+1]

    # Get Allociné popularity number
    POPULARITY_NUMBER=$INDEX_POPULARITY
    echo "$POPULARITY_NUMBER,$ALLOCINE_URL" >> $POPULARITY_ASSETS_PATH

    # Add first line to URLs check file
    echo "first line" >> $TEMP_URLS_FILE_PATH

    IMDB_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f2)
    BETASERIES_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f3)
    THEMOVIEDB_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f4)
    METACRITIC_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f5)
    ROTTEN_TOMATOES_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f6)
    LETTERBOXD_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f7)
    SENSCRITIQUE_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f8)
    TRAKT_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f9)
    THETVDB_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f10)

    if [[ $FOUND -eq 0 ]] || [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; then
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

      if { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; } && [[ $THEMOVIEDB_CHECK ]]; then
        services=("imdb" "betaseries" "metacritic" "rottentomatoes" "letterboxd" "senscritique" "trakt" "thetvdb")
        DUPLICATE=1

        if [[ $MIN_RATING ]]; then
          if [[ $PAGES_INDEX_NUMBER -gt 1 ]]; then
            echo $SEPARATOR
            echo "First page has been checked, do you want to continue?"
            echo $SEPARATOR
            read answer
            if [[ $answer != "yes" && $answer != "y" ]]; then
              exit 0
            fi
          fi
          QUERY_WHATSON_API="$WHATSON_API_URL/$TYPE/$THEMOVIEDB_CHECK?ratings_filters=all&api_key=$INTERNAL_API_KEY"
          echo "Querying: $QUERY_WHATSON_API"

          ITEM=$(curl -s $QUERY_WHATSON_API)

          if [[ -z $ITEM ]]; then
            echo $SEPARATOR
            echo "Item not present in the API yet."
            echo $SEPARATOR
          else
            RATINGS_AVERAGE=$(echo $ITEM | jq '.ratings_average')
            LESS_OR_EQUAL=$(echo "$MIN_RATING<=$RATINGS_AVERAGE" | bc)
          fi
        fi

        for service in "${services[@]}"; do
          check_var="$(echo ${service}_CHECK | tr '[:lower:]' '[:upper:]')"

          if [[ ${!check_var} == "null" ]] &&
            { [[ $PROMPT_SERVICE_NAME == "$service" ]] || [[ $PROMPT_SERVICE_NAME == "all" ]]; }; then
            if [[ $ITEM ]] && { [[ -z $MIN_RATING ]] || [[ $LESS_OR_EQUAL -eq 1 ]]; }; then
              DUPLICATE=0
              echo "Found $URL to be rechecked."
              break
            else
              DUPLICATE=1
            fi
          fi
        done
      fi

      if [[ $DUPLICATE -eq 0 ]]; then
        curl -s https://www.allocine.fr$URL > temp_allocine_url
        echo "Downloading from: https://www.allocine.fr$URL"
        if [[ -z $URL ]]; then
          echo "No URL has been found! Script aborted."
          exit 1
        fi

        # Get title
        TITLE=$(cat temp_allocine_url | grep -m1 "<meta property=\"og:title\" content=\"" | cut -d'"' -f4 | sed 's/&#039;/'"'"'/' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        echo "Title: $TITLE"

        NATIONALITY=$(curl -s https://www.allocine.fr$URL | grep -A2 -m1 "what light" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        if [[ $TYPE == "movie" ]]; then
          echo "Nationality: $NATIONALITY"
        fi

        # Get original title for IMDb
        ORIGINAL_TITLE=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/&#039;/'"'"'/' | sed 's/\&amp;/\&/g' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        ORIGINAL_TITLE_NUMBER=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | wc -l | awk '{print $1}')
        if [[ $ORIGINAL_TITLE_NUMBER -gt 0 ]]; then
          TITLE=$ORIGINAL_TITLE
        fi

        # Get title encoded characters URL
        TITLE_URL_ENCODED=$(echo $TITLE | tr '[:upper:]' '[:lower:]' | sed -f $URL_ESCAPE_FILE_PATH)

        STATUS=$(curl -s https://www.allocine.fr$URL | grep "label-info-full label-status" | cut -d'>' -f2 | cut -d'<' -f1)
        if [[ $TYPE == "tvshow" ]]; then
          echo "Status: $STATUS"
        fi

        USERS_RATINGS_FOUND=$(curl -s https://www.allocine.fr$URL | grep "\"stareval-review" | wc -l | awk '{print $1}')
        if [[ $USERS_RATINGS_FOUND -ne 0 ]]; then
          USERS_RATINGS_FOUND=2
        else
          echo "No users ratings."
        fi

        if [[ $PROMPT == "stop" ]]; then
          if [[ $USERS_RATINGS_FOUND -eq 1 ]]; then
            USERS_RATINGS_FOUND=2
          fi
          if [[ $USERS_RATINGS_FOUND -lt 2 ]]; then
            echo "No users ratings."
          fi
        fi

        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY%20%22$FILM_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
        if [[ -z $WIKI_URL ]]; then
          if [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; then
            IMDB_ID=$IMDB_CHECK
            BETASERIES_ID=$BETASERIES_CHECK
            THEMOVIEDB_ID=$THEMOVIEDB_CHECK
            METACRITIC_ID=$METACRITIC_CHECK
            ROTTEN_TOMATOES_ID=$ROTTEN_TOMATOES_CHECK
            LETTERBOXD_ID=$LETTERBOXD_CHECK
            SENSCRITIQUE_ID=$SENSCRITIQUE_CHECK
            TRAKT_ID=$TRAKT_CHECK
            THETVDB_ID=$THETVDB_CHECK

            if [[ $IMDB_ID == "null" ]] || \
            [[ $METACRITIC_ID == "null" ]] || \
            [[ $ROTTEN_TOMATOES_ID == "null" ]] || \
            [[ $LETTERBOXD_ID == "null" ]] || \
            [[ $SENSCRITIQUE_ID == "null" ]] || \
            [[ $TRAKT_ID == "null" ]] || \
            [[ $THETVDB_ID == "null" ]]; then
              get_other_ids
            fi
          else
            IMDB_ID=null
            METACRITIC_ID=null
            ROTTEN_TOMATOES_ID=null
            LETTERBOXD_ID=null
            SENSCRITIQUE_ID=null
            TRAKT_ID=null
            THETVDB_ID=null
          fi
        else
          echo "wikiUrl: $WIKI_URL"

          IMDB_ID=$IMDB_CHECK
          if [[ -z $IMDB_ID ]]; then
            IMDB_ID=$(curl -s $WIKI_URL | grep -B50 "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -A50 "wikibase-statementview-rankselector" | grep -Eo ">tt[0-9]+<" | cut -d'<' -f1 | cut -d'>' -f2 | head -1)
          fi

          if [[ -z $IMDB_ID ]] || [[ $STATUS == "À venir" ]] || [[ $USERS_RATINGS_FOUND -lt 2 ]]; then
            IMDB_ID=null
          fi
          echo "IMDb ID: $IMDB_ID"

          get_other_ids
        fi

        if [[ $METACRITIC_ID == "null" ]] && [[ $ROTTEN_TOMATOES_ID == "null" ]] && [[ $LETTERBOXD_ID == "null" ]] && [[ $SENSCRITIQUE_ID == "null" ]] && [[ $TRAKT_ID == "null" ]] && [[ $THETVDB_ID == "null" ]]; then
          WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
          if [[ $WIKI_URL ]]; then
            get_other_ids
          fi
        fi

        KIDS_MOVIE=$(curl -s https://www.allocine.fr$URL | grep -E ">à partir de 3 ans<|>à partir de 6 ans<" | wc -l | awk '{print $1}')
        if [[ $IMDB_ID == "null" ]] && [[ $PROMPT == "stop" ]] && [[ $PROMPT_SERVICE_NAME == "imdb" ]]; then
          sed -i '' "/TRUE,TRUE,TRUE,/d" $SKIP_IDS_FILE_PATH

          MATCH_SKIP_NUMBER=$(cat $SKIP_IDS_FILE_PATH | grep ".*=$FILM_ID\.html" | wc -l | awk '{print $1}')
          if [[ $MATCH_SKIP_NUMBER -eq 1 ]]; then
            echo "ID: $FILM_ID skipped."
            sed -i '' "/.*=$FILM_ID\.html.*/ s/$/TRUE,/" $SKIP_IDS_FILE_PATH
            SKIP=1
          else
            SKIP=0
          fi

          if [[ $SKIP -eq 0 ]]; then
            if [[ $KIDS_MOVIE -eq 1 ]]; then
              echo "This is a kids movie."

              echo "Skipping: https://www.allocine.fr$URL"
              IMDB_ID="skip"
            else
              if [[ $STATUS == "À venir" ]] || [[ $USERS_RATINGS_FOUND -lt 2 ]]; then
                IMDB_ID=null
              else
                open -a $BROWSER_PATH "https://www.allocine.fr$URL"
                open -a $BROWSER_PATH "https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
                echo "Enter the IMDb ID:"
                read IMDB_ID
              fi
            fi

            if [[ $IMDB_ID == "skip" ]]; then
              echo $URL, >> $SKIP_IDS_FILE_PATH
              IMDB_ID=null
            else
              WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
              if [[ $WIKI_URL ]]; then
                get_other_ids
              fi
            fi
          else
            IMDB_ID=null
          fi
        fi

        if { [[ $IMDB_ID == "null" ]] && [[ -z $PROMPT ]]; } || { { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; } && [[ $KIDS_MOVIE -eq 1 ]] && [[ -z $MIN_RATING ]]; }; then
          data_not_found
        else
          if [[ $STATUS == "À venir" ]] || [[ $USERS_RATINGS_FOUND -lt 2 ]]; then
            IMDB_ID=null
          elif { [[ $IMDB_ID == "null" ]] || [[ -z $IMDB_ID ]]; } && { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; }; then
            open -a $BROWSER_PATH "https://www.allocine.fr$URL"
            open -a $BROWSER_PATH "https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
            echo "Enter the IMDb ID:"
            read IMDB_ID
          fi

          if [[ $IMDB_ID == "null" ]]; then
            data_not_found
          else
            echo "imdbId URL: https://www.imdb.com/title/$IMDB_ID/"

            BETASERIES_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE" | cut -d'/' -f5 | sed 's/"//g')
            echo "Downloading from: https://api.betaseries.com/$BETASERIES_TYPE?key=$BETASERIES_API_KEY&imdb_id=$IMDB_ID"
            echo "BetaSeries ID: $BETASERIES_ID"

            if [[ $BETASERIES_ID == "null" ]]; then
              BETASERIES_ID=$BETASERIES_CHECK

              if [[ -z $BETASERIES_ID ]]; then
                BETASERIES_ID=null
              fi
            fi

            if { [[ $BETASERIES_ID == "null" ]] && { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; }; } || { [[ $BETASERIES_ID == "null" ]] && [[ $IMDB_ID != "null" ]] && [[ $PROMPT == "stop" ]] && [[ $SKIP -eq 0 ]]; }; then
              open -a $BROWSER_PATH "https://www.allocine.fr$URL"
              open -a $BROWSER_PATH "https://betaseries.com"
              echo "Enter the BetaSeries ID:"
              read BETASERIES_ID
            fi

            THEMOVIEDB_ID=$(curl -s https://api.themoviedb.org/3/find/$IMDB_ID\?api_key=$THEMOVIEDB_API_KEY\&external_source=imdb_id | jq "$JQ_COMMAND_RESULTS" | jq '.[] .id')
            echo "Downloading from: https://api.themoviedb.org/3/find/$IMDB_ID?api_key=$THEMOVIEDB_API_KEY&external_source=imdb_id"

            if [[ -z $THEMOVIEDB_ID ]]; then
              THEMOVIEDB_ID=$THEMOVIEDB_CHECK
            fi

            if [[ -z $THEMOVIEDB_ID ]]; then
              THEMOVIEDB_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE_TMDB")

              if [[ $THEMOVIEDB_ID == "0" ]]; then
                THEMOVIEDB_ID=null
              fi

              echo "Downloading from: https://api.betaseries.com/$BETASERIES_TYPE?key=$BETASERIES_API_KEY&imdb_id=$IMDB_ID"
              echo "The Movie Database ID: $THEMOVIEDB_ID"
            fi

            if [[ -z $THEMOVIEDB_ID ]] || [[ $THEMOVIEDB_ID == "null" ]]; then
              if { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; } || { [[ $IMDB_ID != "null" ]] && [[ $PROMPT == "stop" ]] && [[ $SKIP -eq 0 ]]; }; then
                media_type=$(curl -s https://www.themoviedb.org/search/trending?query=$TITLE_URL_ENCODED | jq '.results[0].media_type' | cut -d'"' -f2)
                id=$(curl -s https://www.themoviedb.org/search/trending?query=$TITLE_URL_ENCODED | jq '.results[0].id')
                open -a $BROWSER_PATH "https://www.themoviedb.org/$media_type/$id"
                echo "Enter the The Movie Database ID:"
                read THEMOVIEDB_ID

                if [[ $THEMOVIEDB_ID != "null" ]] && [[ $BETASERIES_ID != "null" ]]; then
                  data_found
                elif [[ $THEMOVIEDB_ID != "null" ]] && [[ $BETASERIES_ID == "null" ]]; then
                  betaseries_to_null
                else
                  data_not_found
                fi
              else
                data_not_found
              fi
            elif [[ $BETASERIES_ID == "null" ]]; then
              betaseries_to_null
            else
              data_found
            fi
          fi
        fi

        echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,$TRAKT_ID,$THETVDB_ID,TRUE" >> $FILMS_IDS_FILE_PATH

        echo $SEPARATOR

        if [[ $PROMPT == "allocine" ]]; then
          exit 1
        fi

        count=$(grep -c '^'"$URL"',*' $FILMS_IDS_FILE_PATH)
        if [[ $count -eq 2 ]] && { [[ $PROMPT == "recheck" ]] || [[ $PROMPT == "allocine" ]]; }; then
            echo "Number of lines found for $URL: $count"

            grep '^'"$URL"',*' $FILMS_IDS_FILE_PATH

            FIRST_LINE_LENGTH=$(grep '^'"$URL"',*' $FILMS_IDS_FILE_PATH | head -1 | wc -c | awk '{print $1}')
            SECOND_LINE_LENGTH=$(grep '^'"$URL"',*' $FILMS_IDS_FILE_PATH | tail -1 | wc -c | awk '{print $1}')
            if [[ $FIRST_LINE_LENGTH -gt $SECOND_LINE_LENGTH ]]; then
              LINE_NUMBER_TO_REMOVE=2
            elif [[ $SECOND_LINE_LENGTH -gt $FIRST_LINE_LENGTH ]]; then
              LINE_NUMBER_TO_REMOVE=1
            elif [[ $FIRST_LINE_LENGTH -eq $SECOND_LINE_LENGTH ]]; then
              LINE_NUMBER_TO_REMOVE=2
            else
              echo "Which line to remove?"
              read LINE_NUMBER_TO_REMOVE
            fi

            if [[ $LINE_NUMBER_TO_REMOVE == "1" ]] || [[ $LINE_NUMBER_TO_REMOVE == "first" ]]; then
              awk '!flag && /.*='"$FILM_ID"'\.html.*$/ {flag=1; next} 1' $FILMS_IDS_FILE_PATH > temp_sed && mv temp_sed $FILMS_IDS_FILE_PATH
              echo "First match removed."
            else
              sed -i '' -e '$ d' $FILMS_IDS_FILE_PATH
              echo "Last line removed."
            fi

            new_count=$(grep -c '^'"$URL"',*' $FILMS_IDS_FILE_PATH)
            echo "Number of lines found for $URL: $new_count"
        fi
      fi
    fi

    FILMS_INDEX_NUMBER=$[$FILMS_INDEX_NUMBER+1] FILM_ID=$[$FILM_ID+1]
  done
done

update_imdb_popularity_flags

LOCAL_LINES=$(wc -l < "$FILMS_IDS_FILE_PATH" | awk '{print $1}')
REMOTE_LINES=$(curl -s "$BASE_URL_ASSETS/$FILMS_FILE_NAME" | wc -l | awk '{print $1}')
if [ "$LOCAL_LINES" -lt "$REMOTE_LINES" ]; then
  echo "Error: Local file has fewer lines ($LOCAL_LINES) than the remote file ($REMOTE_LINES)"
  exit 1
fi

if [[ -n $FILMS_ASSETS_PATH ]] && [[ $(wc -l < $FILMS_IDS_FILE_PATH | awk '{print $1}') -ge 6000 ]]; then
  remove_files

  cd $FILMS_ASSETS_PATH
  vercel --prod --token=$VERCEL_TOKEN
  echo "Uploading $FILMS_ASSETS_PATH to $BASE_URL_ASSETS"
else
  echo "The file either doesn't exist, is empty, or has fewer than 6000 lines."
fi

# Add ending message with duration
DATA_DURATION=$SECONDS
echo "Complete in $(($DATA_DURATION / 60)) minutes and $(($DATA_DURATION % 60)) seconds ✅"
echo $SEPARATOR