# Defining the variables used in the script.
BASE_URL=https://www.allocine.fr/film/aucinema/
DELETE_NO_DATA=$1
FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
FILMS_FIRST_INDEX_NUMBER=1
FILMS_MAX_NUMBER=15
IS_ACTIVE=TRUE
PAGES_MAX_NUMBER=15
PAGES_MIN_NUMBER=1
SECONDS=0
TEMP_URLS_FILE_PATH=./temp_urls
URL_ESCAPE_FILE_PATH=./utils/urlEscape.sed

# A function that removes temporary files.
remove_files () {
  rm -f ./temp_*

  if [[ $DELETE_NO_DATA == "delete" ]]; then
    echo "Deleting no data lines"
    echo "----------------------------------------------------------------------------------------------------"
    sed -i '' "/noImdbId,noBetaseriesId/d" $FILMS_IDS_FILE_PATH
    sed -i '' "/,null/d" $FILMS_IDS_FILE_PATH
  fi
}

# A function that is called when the data is not found.
data_not_found () {
  IMDB_ID="noImdbId"
  BETASERIES_ID="noBetaseriesId"

  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

# A function that is called when the data is found.
data_found () {
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ✅"
}

remove_files

sed -i '' "s/,$IS_ACTIVE//g" $FILMS_IDS_FILE_PATH

# Download top films AlloCiné page
curl -s $BASE_URL > temp_baseurl

# Get AlloCiné baseUrl films number
FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"/film/fichefilm_gen_cfilm=" | wc -l | awk '{print $1}')
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

    FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"/film/fichefilm_gen_cfilm=" | wc -l | awk '{print $1}')
    if [[ $FILMS_NUMBER -gt 15 ]]; then
      FILMS_NUMBER=$FILMS_MAX_NUMBER
    fi
  fi

  FILMS_INDEX_NUMBER=$FILMS_FIRST_INDEX_NUMBER
  while [[ $FILMS_INDEX_NUMBER -le $FILMS_NUMBER ]]
  do
    # Get AlloCiné film url
    URL=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"/film/fichefilm_gen_cfilm=" | tail -1 | head -1 | cut -d'"' -f4)

    # Get id
    FILM_ID=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"/film/fichefilm_gen_cfilm=" | tail -1 | head -1 | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)

    # Check if missing shows
    ALLOCINE_URL=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f1)
    if [[ $URL == $ALLOCINE_URL ]]; then
      sed -i '' "/.*$FILM_ID\.html.*[a-z0-9]$/ s/$/,$IS_ACTIVE/" $FILMS_IDS_FILE_PATH
      
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

        # Get creation date
        CREATION_YEAR=$(cat temp_allocine_url | grep -A6 "date blue-link" | grep "[0-9][0-9][0-9][0-9]" | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//' | cut -d' ' -f3)

        WIKI_DATA=0
        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP1265%20%22$FILM_ID%22.%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22en%22.%20%7D%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
        if [[ -z $WIKI_URL ]]; then
          echo "No wiki URL!"

          IMDB_YEAR=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED | grep -Eo "([0-9][0-9][0-9][0-9])</span>" | cut -d"<" -f1)
          echo "Downloading from: https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED"

          echo "Creation year: $CREATION_YEAR - IMDb year: $IMDB_YEAR"
          if [[ $CREATION_YEAR == $IMDB_YEAR ]]; then
            IMDB_ID=$(curl -s https://www.imdb.com/search/title/\?title\=$TITLE_URL_ENCODED | grep -m1 -B5 "([0-9][0-9][0-9][0-9])" | grep "/title/tt" | cut -d'/' -f3)
          else
            IMDB_ID="noImdbId"
          fi
        else
          echo "wikiUrl: $WIKI_URL"

          IMDB_ID=$(curl -s $WIKI_URL | grep "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -Eo "tt[0-9]+" | head -1)
          echo "IMDb ID: $IMDB_ID"

          WIKI_DATA=1
        fi

        if [[ $IMDB_ID == "noImdbId" ]]; then
            data_not_found
        fi

        if [[ -z $IMDB_ID ]]; then
            data_not_found
        fi

        if [[ $IMDB_ID != "noImdbId" ]] && [[ $IMDB_ID ]]; then
          echo "imdbId URL: https://www.imdb.com/title/$IMDB_ID/"

          BETASERIES_ID=$(curl -s https://api.betaseries.com/movies/movie\?key\=7f7fef35706f\&imdb_id\=$IMDB_ID | jq '.movie.resource_url' | cut -d'/' -f5 | sed 's/"//g')
          echo "Downloading from: https://api.betaseries.com/movies/movie\?key\=7f7fef35706f\&imdb_id\=$IMDB_ID"
          
          data_found
        fi

        echo "$URL,$IMDB_ID,$BETASERIES_ID,$IS_ACTIVE" >> $FILMS_IDS_FILE_PATH

        echo "----------------------------------------------------------------------------------------------------"
      fi
    fi

    FILMS_INDEX_NUMBER=$[$FILMS_INDEX_NUMBER+1] FILM_ID=$[$FILM_ID+1]
  done
done

# remove_files

# Add ending message with duration
DATA_DURATION=$SECONDS
echo "Complete in $(($DATA_DURATION / 60)) minutes and $(($DATA_DURATION % 60)) seconds ✅"