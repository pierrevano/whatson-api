COUNTER=0
BASE_URL=https://www.allocine.fr
MAX_INDEX=350000
PROPERTY=P345
REGEX_IDS="^\/.*\=([0-9]{1,5}|[0-3][0-9]{5})\.html,tt[0-9]+,(\S+?),[0-9]+,(\S+?){4},(TRUE|FALSE)$"
REGEX_IDS_COMMAS="^([^,]*,){9}[^,]*$"
BASE_URL_IMDB=https://www.imdb.com/title/
BASE_URL_LETTERBOXD=https://letterboxd.com/film/

if [[ $2 == "movie" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_films_ids.txt
  BASE_URL_ALLOCINE=/film/fichefilm_gen_cfilm=
  TEMP_FILE=temp_check_allocine_movie.txt
  BETASERIES_TYPE=movies/movie
  BASE_URL_BETASERIES=https://www.betaseries.com/film/
  BASE_URL_METACRITIC=https://www.metacritic.com/movie/
  BASE_URL_ROTTEN_TOMATOES=https://www.rottentomatoes.com/m/
  BASE_URL_SENSCRITIQUE=https://www.senscritique.com/film/-/
  BASE_URL_TRAKT=https://trakt.tv/movies/
elif [[ $2 == "tvshow" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_series_ids.txt
  BASE_URL_ALLOCINE=/series/ficheserie_gen_cserie=
  TEMP_FILE=temp_check_allocine_series.txt
  BETASERIES_TYPE=shows/display
  BASE_URL_BETASERIES=https://www.betaseries.com/serie/
  BASE_URL_METACRITIC=https://www.metacritic.com/tv/
  BASE_URL_ROTTEN_TOMATOES=https://www.rottentomatoes.com/tv/
  BASE_URL_SENSCRITIQUE=https://www.senscritique.com/serie/-/
  BASE_URL_TRAKT=https://trakt.tv/shows/
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

  ALLOCINE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.allocine.fr" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  ALLOCINE_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.allocine.fr" | wc -l | awk '{print $1}')
  if [[ $ALLOCINE_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    ALLOCINE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.allocine.fr" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  ALLOCINE_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.allocine.fr" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $ALLOCINE_ID ]] || [[ $ALLOCINE_ID_DEPRECATED -eq 1 ]]; then
    ALLOCINE_ID=null
  fi
  echo "AlloCiné ID: $ALLOCINE_ID"

  METACRITIC_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  METACRITIC_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | wc -l | awk '{print $1}')
  if [[ $METACRITIC_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    METACRITIC_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  METACRITIC_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.metacritic.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $METACRITIC_ID ]] || [[ $METACRITIC_ID_DEPRECATED -eq 1 ]]; then
    METACRITIC_ID=null
  fi
  echo "Metacritic ID: $METACRITIC_ID"

  ROTTEN_TOMATOES_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  ROTTEN_TOMATOES_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | wc -l | awk '{print $1}')
  if [[ $ROTTEN_TOMATOES_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    ROTTEN_TOMATOES_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  ROTTEN_TOMATOES_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.rottentomatoes.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $ROTTEN_TOMATOES_ID ]] || [[ $ROTTEN_TOMATOES_ID_DEPRECATED -eq 1 ]]; then
    ROTTEN_TOMATOES_ID=null
  fi
  if [[ $ROTTEN_TOMATOES_ID != "null" ]]; then
    STATUS_CODE=$(curl -I -s $BASE_URL_ROTTEN_TOMATOES$ROTTEN_TOMATOES_ID | grep HTTP/2 | awk '{print $2}')
    if [[ $STATUS_CODE -eq 404 ]]; then
        ROTTEN_TOMATOES_ID=null
    fi
  fi
  echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"

  LETTERBOXD_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://letterboxd.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  LETTERBOXD_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://letterboxd.com" | wc -l | awk '{print $1}')
  if [[ $LETTERBOXD_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    LETTERBOXD_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://letterboxd.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  LETTERBOXD_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://letterboxd.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $LETTERBOXD_ID ]] || [[ $LETTERBOXD_ID_DEPRECATED -eq 1 ]]; then
    LETTERBOXD_ID=null
  fi
  echo "Letterboxd ID: $LETTERBOXD_ID"

  SENSCRITIQUE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  SENSCRITIQUE_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | wc -l | awk '{print $1}')
  if [[ $SENSCRITIQUE_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    SENSCRITIQUE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  SENSCRITIQUE_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.senscritique.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $SENSCRITIQUE_ID ]] || [[ $SENSCRITIQUE_ID_DEPRECATED -eq 1 ]]; then
    SENSCRITIQUE_ID=null
  fi
  echo "SensCritique ID: $SENSCRITIQUE_ID"

  TRAKT_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  TRAKT_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | wc -l | awk '{print $1}')
  if [[ $TRAKT_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    TRAKT_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  TRAKT_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://trakt.tv" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ -z $TRAKT_ID ]] || [[ $TRAKT_ID_DEPRECATED -eq 1 ]]; then
    TRAKT_ID=null
  fi
  echo "Trakt ID: $TRAKT_ID"
}

if [[ $1 == "check" ]]; then
  rm -f $FILMS_IDS_FILE_PATH_TEMP

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
      TRAKT_ID_FROM_FILE=$(echo $LINE | cut -d',' -f9)

      WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID_FROM_FILE%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/' | head -1)
      if [[ $WIKI_URL ]]; then
        echo $WIKI_URL

        getOtherIDs $1 $2

        ALLOCINE_ID_TO_USE=$(CheckID "$ALLOCINE_ID" "$ALLOCINE_ID_FROM_FILE")
        FOUND_ALLOCINE=$(isIDFound "$ALLOCINE_ID" "$ALLOCINE_ID_FROM_FILE")

        METACRITIC_ID_TO_USE=$(CheckID "$METACRITIC_ID" "$METACRITIC_ID_FROM_FILE")
        FOUND_METACRITIC=$(isIDFound "$METACRITIC_ID" "$METACRITIC_ID_FROM_FILE")

        ROTTEN_TOMATOES_ID_TO_USE=$(CheckID "$ROTTEN_TOMATOES_ID" "$ROTTEN_TOMATOES_ID_FROM_FILE")
        FOUND_ROTTEN_TOMATOES=$(isIDFound "$ROTTEN_TOMATOES_ID" "$ROTTEN_TOMATOES_ID_FROM_FILE")

        LETTERBOXD_ID_TO_USE=$(CheckID "$LETTERBOXD_ID" "$LETTERBOXD_ID_FROM_FILE")
        FOUND_LETTERBOXD=$(isIDFound "$LETTERBOXD_ID" "$LETTERBOXD_ID_FROM_FILE")

        SENSCRITIQUE_ID_TO_USE=$(CheckID "$SENSCRITIQUE_ID" "$SENSCRITIQUE_ID_FROM_FILE")
        FOUND_SENSCRITIQUE=$(isIDFound "$SENSCRITIQUE_ID" "$SENSCRITIQUE_ID_FROM_FILE")

        TRAKT_ID_TO_USE=$(CheckID "$TRAKT_ID" "$TRAKT_ID_FROM_FILE")
        FOUND_TRAKT=$(isIDFound "$TRAKT_ID" "$TRAKT_ID_FROM_FILE")

        if [[ $FOUND_ALLOCINE -eq 1 ]] || [[ $FOUND_METACRITIC -eq 1 ]] || [[ $FOUND_ROTTEN_TOMATOES -eq 1 ]] || [[ $FOUND_LETTERBOXD -eq 1 ]] || [[ $FOUND_SENSCRITIQUE -eq 1 ]] || [[ $FOUND_TRAKT -eq 1 ]]; then
          echo "$BASE_URL_ALLOCINE$ALLOCINE_ID_TO_USE.html,$IMDB_ID_FROM_FILE,$BETASERIES_ID_FROM_FILE,$THEMOVIEDB_ID_FROM_FILE,$METACRITIC_ID_TO_USE,$ROTTEN_TOMATOES_ID_TO_USE,$LETTERBOXD_ID_TO_USE,$SENSCRITIQUE_ID_TO_USE,$TRAKT_ID_TO_USE,FALSE" >> $FILMS_IDS_FILE_PATH_TEMP
        fi
      fi
    fi

    ((COUNTER++))
  done 3<$FILMS_IDS_FILE_PATH
elif [[ $1 == "update" ]]; then
  if [ -f "$FILMS_IDS_FILE_PATH_TEMP" ]; then
    echo "Updating the dataset with the file: $FILMS_IDS_FILE_PATH_TEMP"
  else
    echo "The temp file does not exist, abording"
    exit 1
  fi

  TOTAL_LINES=$(wc -l <"${FILMS_IDS_FILE_PATH_TEMP}")

  WRONG_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS | wc -l | awk '{print $1}')
  WRONG_LINES_NB_COMMAS=$(cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS_COMMAS | wc -l | awk '{print $1}')
  if [[ $WRONG_LINES_NB -gt 1 ]] && [[ $WRONG_LINES_NB_COMMAS -gt 0 ]]; then
    echo "WRONG_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
    echo "details:"
    cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS | tail -1
    cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS_COMMAS | tail -1
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

  cat $FILMS_IDS_FILE_PATH | sort -V | uniq > ./temp_ids.txt
  cat ./temp_ids.txt > $FILMS_IDS_FILE_PATH
elif [[ $1 == "check_dataset" ]]; then
  ERROR=$(git diff --unified=0 -- $FILMS_IDS_FILE_PATH \
    | grep '^[+-]' \
    | grep -Ev '^(--- a/|\+\+\+ b/)' \
    | timeout 1800 awk -v baseurlAllocine="$BASE_URL" \
      -v baseurlImdb="$BASE_URL_IMDB" \
      -v baseurlBetaseries="$BASE_URL_BETASERIES" \
      -v baseurlMetacritic="$BASE_URL_METACRITIC" \
      -v baseurlLetterboxd="$BASE_URL_LETTERBOXD" \
      -v baseurlSenscritique="$BASE_URL_SENSCRITIQUE" \
      -v baseurlTrakt="$BASE_URL_TRAKT" -F',' '{
      sub(/^[+-]/,"")
      data[$1] = (data[$1] ? data[$1] FS : "") $0
    }
    END {
      urls[1]=baseurlAllocine
      urls[2]=baseurlImdb
      urls[3]=baseurlBetaseries
      urls[5]=baseurlMetacritic
      urls[7]=baseurlLetterboxd
      urls[8]=baseurlSenscritique
      urls[9]=baseurlTrakt

      for(key in data) {
        split(data[key], lines, FS)
        if (length(lines) <= 10) continue
        for(i=1; i<=10; i++) {
          if (lines[i] != "null" && lines[i+10] == "null" && lines[i] != "") {
            print "------------------------------------------------------------"
            print "In URL " key ", item at position " (i-1) " changed from string to null between '-' and '+' line."
            print "Details:"
            print "- " lines[1] "," lines[2] "," lines[3] "," lines[4] "," lines[5] "," lines[6] "," lines[7] "," lines[8] "," lines[9] "," lines[10]
            print "+ " lines[1+10] "," lines[2+10] "," lines[3+10] "," lines[4+10] "," lines[5+10] "," lines[6+10] "," lines[7+10] "," lines[8+10] "," lines[9+10] "," lines[10+10]
            print "------------------------------------------------------------"
            exit
          }

          for(j=1; j<=7; j++) {
            if (lines[j] != "null" && lines[j] != "") {
              if (j == 4) j=5
              url = urls[j] lines[j]

              cmd = ("curl -A \"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\" -o /dev/null -s -w \"%{http_code}\" " url)
              cmd | getline http_status_code
              close(cmd)

              if (http_status_code > 400) {
                print "------------------------------------------------------------"
                print "URL " url " returned an invalid HTTP status code: " http_status_code ". It should return 200."
                print "IMDb ID: " urls[2] lines[2]
                print lines[1] "," lines[2] "," lines[3] "," lines[5] "," lines[6] "," lines[7] "," lines[8] "," lines[9]
                print "------------------------------------------------------------"
                exit
              }
            }
          }
        }
      }
    }')

  if [[ $ERROR ]]; then
    echo "An error happened when updating the dataset, aborting."
    echo "$ERROR"
    exit 1
  fi
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

            getOtherIDs $1 $2

            echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,FALSE" >> $TEMP_FILE
          fi
        fi
      fi
    fi

    PREVIOUS_PERCENTAGE=$PERCENTAGE
  done
fi