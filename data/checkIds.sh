COUNTER=0
BASE_URL=https://www.allocine.fr
MAX_INDEX=350000

if [[ $2 == "movie" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_films_ids.txt
  BASE_URL_ALLOCINE=/film/fichefilm_gen_cfilm=
  TEMP_FILE=temp_check_allocine_movie.txt
  BETASERIES_TYPE=movies/movie
elif [[ $2 == "tvshow" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_series_ids.txt
  BASE_URL_ALLOCINE=/series/ficheserie_gen_cserie=
  TEMP_FILE=temp_check_allocine_series.txt
  BETASERIES_TYPE=shows/display
elif [[ -z $1 ]]; then
  echo "Add 'check' or 'update' first"
  exit 1
else
  echo "Add 'movie' or 'tvshow' after 'check' or 'update'"
  exit 1
fi

function CheckID {
  local id=$1
  local file_id=$2

  if [[ $id != $file_id ]] && [[ $id != "null" ]]; then
    echo $id
  else
    echo $file_id
  fi
}

function isIDFound {
  local id=$1
  local file_id=$2

  if [[ $id != $file_id ]] && [[ $id != "null" ]]; then
    echo 1
  else
    echo 0
  fi
}

function getOtherIDs {
  curl -s $WIKI_URL > temp_WIKI_URL_DOWNLOADED

  if [[ $3 == "allocine" ]]; then
    ALLOCINE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.allocine.fr" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
    ALLOCINE_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.allocine.fr" | grep "Q21441764" | wc -l | awk '{print $1}')
    if [[ -z $ALLOCINE_ID ]] || [[ $ALLOCINE_ID_DEPRECATED -eq 1 ]]; then
      ALLOCINE_ID=null
    fi
    echo "AlloCiné ID: $ALLOCINE_ID"
  else
    if [[ $1 == "check_allocine" ]] || [[ $METACRITIC_ID_FROM_FILE == "null" ]]; then
      METACRITIC_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
      METACRITIC_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.metacritic.com" | grep "Q21441764" | wc -l | awk '{print $1}')
      if [[ -z $METACRITIC_ID ]] || [[ $METACRITIC_ID_DEPRECATED -eq 1 ]]; then
        METACRITIC_ID=null
      fi
    else
      METACRITIC_ID=null
    fi
    echo "Metacritic ID: $METACRITIC_ID"

    if [[ $1 == "check_allocine" ]] || [[ $ROTTEN_TOMATOES_ID_FROM_FILE == "null" ]]; then
      ROTTEN_TOMATOES_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
      ROTTEN_TOMATOES_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.rottentomatoes.com" | grep "Q21441764" | wc -l | awk '{print $1}')
      if [[ -z $ROTTEN_TOMATOES_ID ]] || [[ $ROTTEN_TOMATOES_ID_DEPRECATED -eq 1 ]]; then
        ROTTEN_TOMATOES_ID=null
      fi
    else
      ROTTEN_TOMATOES_ID=null
    fi
    echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"

    if [[ $1 == "check_allocine" ]] || [[ $LETTERBOXD_ID_FROM_FILE == "null" ]]; then
      LETTERBOXD_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://letterboxd.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
      LETTERBOXD_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://letterboxd.com" | grep "Q21441764" | wc -l | awk '{print $1}')
      if [[ -z $LETTERBOXD_ID ]] || [[ $LETTERBOXD_ID_DEPRECATED -eq 1 ]]; then
        LETTERBOXD_ID=null
      fi
    else
      LETTERBOXD_ID=null
    fi
    echo "Letterboxd ID: $LETTERBOXD_ID"

    if [[ $1 == "check_allocine" ]] || [[ $SENSCRITIQUE_ID_FROM_FILE == "null" ]]; then
      SENSCRITIQUE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
      SENSCRITIQUE_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.senscritique.com" | grep "Q21441764" | wc -l | awk '{print $1}')
      if [[ -z $SENSCRITIQUE_ID ]] || [[ $SENSCRITIQUE_ID_DEPRECATED -eq 1 ]]; then
        SENSCRITIQUE_ID=null
      fi
    else
      SENSCRITIQUE_ID=null
    fi
    echo "SensCritique ID: $SENSCRITIQUE_ID"
  fi
}

if [[ $1 == "check" ]]; then
  ### Re-check the IDs ###

  rm -f $FILMS_IDS_FILE_PATH_TEMP

  PROPERTY=P345
  TOTAL_LINES=$(wc -l <"${FILMS_IDS_FILE_PATH}")

  while IFS= read -r LINE <&3; do
    PERCENT=$(echo "scale=2; ($COUNTER / $TOTAL_LINES) * 100" | bc)
    URL=$(cat $FILMS_IDS_FILE_PATH | grep $LINE | cut -d',' -f1)

    if [[ $URL != "URL" ]]; then
      echo "$PERCENT: $URL"

      ALLOCINE_ID_FROM_FILE=$(echo $URL | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)
      IMDB_ID_FROM_FILE=$(echo $LINE | cut -d',' -f2)
      BETASERIES_ID_FROM_FILE=$(echo $LINE | cut -d',' -f3)
      THEMOVIEDB_ID_FROM_FILE=$(echo $LINE | cut -d',' -f4)
      METACRITIC_ID_FROM_FILE=$(echo $LINE | cut -d',' -f5)
      ROTTEN_TOMATOES_ID_FROM_FILE=$(echo $LINE | cut -d',' -f6)
      LETTERBOXD_ID_FROM_FILE=$(echo $LINE | cut -d',' -f7)
      SENSCRITIQUE_ID_FROM_FILE=$(echo $LINE | cut -d',' -f8)

      if [[ $3 == "allocine" ]] || [[ $IMDB_ID_FROM_FILE == "null" ]] || [[ $BETASERIES_ID_FROM_FILE == "null" ]] || [[ $THEMOVIEDB_ID_FROM_FILE == "null" ]] || [[ $METACRITIC_ID_FROM_FILE == "null" ]] || [[ $ROTTEN_TOMATOES_ID_FROM_FILE == "null" ]] || [[ $LETTERBOXD_ID_FROM_FILE == "null" ]] || [[ $SENSCRITIQUE_ID_FROM_FILE == "null" ]]; then
        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID_FROM_FILE%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')

        echo $WIKI_URL

        if [[ $WIKI_URL ]]; then
          getOtherIDs $1 $2 $3

          if [[ $3 == "allocine" ]]; then
            ALLOCINE_ID_TO_USE=$(CheckID "$ALLOCINE_ID" "$ALLOCINE_ID_FROM_FILE")
            FOUND=$(isIDFound "$ALLOCINE_ID" "$ALLOCINE_ID_FROM_FILE")

            echo "Found: $FOUND"

            if [[ $FOUND -eq 1 ]]; then
              echo "$BASE_URL_ALLOCINE$ALLOCINE_ID_TO_USE.html,$IMDB_ID_FROM_FILE,$BETASERIES_ID_FROM_FILE,$THEMOVIEDB_ID_FROM_FILE,$METACRITIC_ID_FROM_FILE,$ROTTEN_TOMATOES_ID_FROM_FILE,$LETTERBOXD_ID_FROM_FILE,$SENSCRITIQUE_ID_FROM_FILE,FALSE" >> $FILMS_IDS_FILE_PATH_TEMP
            fi
          else
            if { [[ $METACRITIC_ID != $METACRITIC_ID_FROM_FILE ]] && [[ $METACRITIC_ID != "null" ]]; } ||
              { [[ $ROTTEN_TOMATOES_ID != $ROTTEN_TOMATOES_ID_FROM_FILE ]] && [[ $ROTTEN_TOMATOES_ID != "null" ]]; } ||
              { [[ $LETTERBOXD_ID != $LETTERBOXD_ID_FROM_FILE ]] && [[ $LETTERBOXD_ID != "null" ]]; } ||
              { [[ $SENSCRITIQUE_ID != $SENSCRITIQUE_ID_FROM_FILE ]] && [[ $SENSCRITIQUE_ID != "null" ]]; }; then
              METACRITIC_ID_TO_USE=$(CheckID "$METACRITIC_ID" "$METACRITIC_ID_FROM_FILE")
              ROTTEN_TOMATOES_ID_TO_USE=$(CheckID "$ROTTEN_TOMATOES_ID" "$ROTTEN_TOMATOES_ID_FROM_FILE")
              LETTERBOXD_ID_TO_USE=$(CheckID "$LETTERBOXD_ID" "$LETTERBOXD_ID_FROM_FILE")
              SENSCRITIQUE_ID_TO_USE=$(CheckID "$SENSCRITIQUE_ID" "$SENSCRITIQUE_ID_FROM_FILE")

              echo "$URL,$IMDB_ID_FROM_FILE,$BETASERIES_ID_FROM_FILE,$THEMOVIEDB_ID_FROM_FILE,$METACRITIC_ID_TO_USE,$ROTTEN_TOMATOES_ID_TO_USE,$LETTERBOXD_ID_TO_USE,$SENSCRITIQUE_ID_TO_USE,FALSE" >> $FILMS_IDS_FILE_PATH_TEMP       
            fi
          fi
        fi
      fi
    fi

    ((COUNTER++))
  done 3<$FILMS_IDS_FILE_PATH
elif [[ $1 == "update" ]]; then
  ### Update the IDs ###

  if [ -f "$FILMS_IDS_FILE_PATH_TEMP" ]; then
      echo "Updating the dataset with the file: $FILMS_IDS_FILE_PATH_TEMP"
  else 
      echo "The temp file does not exist, abording"
      exit 1
  fi

  TOTAL_LINES=$(wc -l <"${FILMS_IDS_FILE_PATH_TEMP}")

  REGEX_IDS="^/.*\=[0-9]+\.html,tt[0-9]+,(.+?)+,[0-9]+,(.+?)+,(.+?)+,(.+?)+,(.+?)+,(TRUE|FALSE)$"
  WRONG_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS | wc -l | awk '{print $1}')
  if [[ $WRONG_LINES_NB -gt 1 ]]; then
    echo "WRONG_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
    echo "details:"
    cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS
    exit 1
  fi

  DUPLICATES_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | cut -d',' -f1 | uniq -cd && cat $FILMS_IDS_FILE_PATH | cut -d',' -f2 | sort | uniq -cd | awk '$1 > 3')
  if [[ $DUPLICATES_LINES_NB ]]; then
    echo "DUPLICATES_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
    echo "details:"
    echo $DUPLICATES_LINES_NB
    exit 1
  fi

  while IFS= read -r LINE; do
    PERCENT=$(echo "scale=2; ($COUNTER / $TOTAL_LINES) * 100" | bc)
    IMDB_ID=$(echo $LINE | cut -d',' -f2)

    if [[ $IMDB_ID == tt* ]]; then
      echo "$PERCENT: $LINE from $FILMS_IDS_FILE_PATH_TEMP"
    
      COUNT=$(grep -o ",$IMDB_ID," $FILMS_IDS_FILE_PATH | wc -l)

      if [[ $COUNT -gt 3 ]]; then
        echo "Count for $IMDB_ID is greater than 2. Exiting..."
        exit 1
      fi

      sed -i '' "/.*,$IMDB_ID,.*/ s@.*@$LINE@" $FILMS_IDS_FILE_PATH
    fi

    ((COUNTER++))
  done < "$FILMS_IDS_FILE_PATH_TEMP"
elif [[ $1 == "check_allocine" ]]; then
  rm -f $TEMP_FILE

  source .env

  for ((INDEX=1; INDEX<=MAX_INDEX; INDEX++))
  do
    URL="$BASE_URL_ALLOCINE$INDEX.html"
    URL_IN_FILE=$(grep -c "$URL" "$FILMS_IDS_FILE_PATH")

    if [ $URL_IN_FILE -eq 0 ]; then
    FULL_URL="$BASE_URL$URL"

    HTTP_RESPONSE=$(curl --write-out "%{http_code}" --silent --output /dev/null "$FULL_URL")

      if [ $HTTP_RESPONSE == 200 ]; then
        echo "$INDEX / $MAX_INDEX"

        PERCENTAGE=$(echo "scale=2; ($INDEX/$MAX_INDEX)*100" | bc)
        if [[ $PREVIOUS_PERCENTAGE != $PERCENTAGE ]]; then
          echo "Percent of advancement: $PERCENTAGE%"
        fi

        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY%20%22$INDEX%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
        if [[ $WIKI_URL ]]; then
          echo "WIKI_URL: $WIKI_URL"

          IMDB_ID=$(curl -s $WIKI_URL | grep "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -Eo "tt[0-9]+" | head -1)
          if [[ $IMDB_ID ]]; then
            echo "IMDb ID: $IMDB_ID"

            BETASERIES_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE" | cut -d'/' -f5 | sed 's/"//g')
            if [[ -z $BETASERIES_ID ]]; then
              BETASERIES_ID=null
            fi
            echo "BetaSeries ID: $BETASERIES_ID"

            getOtherIDs $1 $2 $3

            echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,FALSE" >> $TEMP_FILE
          fi
        fi
      fi
    fi

    PREVIOUS_PERCENTAGE=$PERCENTAGE
  done
fi