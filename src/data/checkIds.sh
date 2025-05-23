COUNTER=0
BASE_URL=https://www.allocine.fr
GET_IDS_FILE_PATH=./src/data/getIds.sh
MAX_INDEX=350000
PROPERTY=P345
REGEX_IDS="^\/\S+\/fiche\S+_gen_c\S+=[0-9]+\.html,tt[0-9]+,(\S+?),[0-9]+,(\S+?){3},([0-9]+|null),(\S+?),([0-9]+|null),(TRUE|FALSE)$"
REGEX_IDS_COMMAS="^([^,]*,){10}[^,]*$"
BASE_URL_IMDB=https://www.imdb.com/title/
BASE_URL_LETTERBOXD=https://letterboxd.com/film/
BASE_URL_TVTIME=https://www.tvtime.com/show/

if [[ $2 == "movie" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_IDS_ACTIVE_FILE_PATH=./temp_films_ids_active.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_films_ids.txt
  BASE_URL_ALLOCINE=/film/fichefilm_gen_cfilm=
  TEMP_FILE=temp_check_allocine_movie.txt
  BETASERIES_TYPE=movies/movie
  BASE_URL_BETASERIES=https://www.betaseries.com/film/
  BASE_URL_METACRITIC=https://www.metacritic.com/movie/
  BASE_URL_ROTTEN_TOMATOES=https://www.rottentomatoes.com/m/
  BASE_URL_SENSCRITIQUE=https://www.senscritique.com/film/-/
  BASE_URL_TRAKT=https://trakt.tv/movies/
  PROPERTY=P1265
  TRAKT_PATH=".[0].movie.ids."
elif [[ $2 == "tvshow" ]]; then
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_IDS_ACTIVE_FILE_PATH=./temp_series_ids_active.txt
  FILMS_IDS_FILE_PATH_TEMP=./temp_new_series_ids.txt
  BASE_URL_ALLOCINE=/series/ficheserie_gen_cserie=
  TEMP_FILE=temp_check_allocine_series.txt
  BETASERIES_TYPE=shows/display
  BASE_URL_BETASERIES=https://www.betaseries.com/serie/
  BASE_URL_METACRITIC=https://www.metacritic.com/tv/
  BASE_URL_ROTTEN_TOMATOES=https://www.rottentomatoes.com/tv/
  BASE_URL_SENSCRITIQUE=https://www.senscritique.com/serie/-/
  BASE_URL_TRAKT=https://trakt.tv/shows/
  PROPERTY=P1267
  TRAKT_PATH=".[0].show.ids."
elif [[ -z $1 ]]; then
  echo "Add 'check' or 'update' first"
  exit 1
else
  echo "Add 'movie' or 'tvshow' after 'check' or 'update'"
  exit 1
fi

if [[ $SOURCE != "circleci" ]]; then
  source .env
fi

check_id () {
  local id=$1
  local file_id=$2

  if [[ $id != $file_id ]] && [[ $id != "null" ]]; then
    echo $id
  else
    echo $file_id
  fi
}

is_id_found () {
  local id=$1
  local file_id=$2

  if [[ $id != $file_id ]] && [[ $id != "null" ]]; then
    echo 1
  else
    echo 0
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
  curl -s $WIKI_URL > temp_WIKI_URL_DOWNLOADED

  METACRITIC_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  METACRITIC_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | wc -l | awk '{print $1}')
  if [[ $METACRITIC_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    METACRITIC_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.metacritic.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  METACRITIC_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.metacritic.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  if [[ -z $METACRITIC_ID ]] || [[ $METACRITIC_ID_DEPRECATED -eq 1 ]]; then
    METACRITIC_ID=null
  fi
  echo "Metacritic ID: $METACRITIC_ID"

  ROTTEN_TOMATOES_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  ROTTEN_TOMATOES_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | wc -l | awk '{print $1}')
  if [[ $ROTTEN_TOMATOES_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    ROTTEN_TOMATOES_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.rottentomatoes.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  ROTTEN_TOMATOES_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.rottentomatoes.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
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
  LETTERBOXD_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://letterboxd.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  if [[ -z $LETTERBOXD_ID ]] || [[ $LETTERBOXD_ID_DEPRECATED -eq 1 ]]; then
    LETTERBOXD_ID=null
  fi
  echo "Letterboxd ID: $LETTERBOXD_ID"

  SENSCRITIQUE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  SENSCRITIQUE_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | wc -l | awk '{print $1}')
  if [[ $SENSCRITIQUE_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    SENSCRITIQUE_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://www.senscritique.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  SENSCRITIQUE_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://www.senscritique.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  if [[ -z $SENSCRITIQUE_ID ]] || [[ $SENSCRITIQUE_ID_DEPRECATED -eq 1 ]]; then
    SENSCRITIQUE_ID=null
  fi
  echo "SensCritique ID: $SENSCRITIQUE_ID"

  TRAKT_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  TRAKT_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | wc -l | awk '{print $1}')
  if [[ $TRAKT_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    TRAKT_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://trakt.tv" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  TRAKT_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://trakt.tv" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  if [[ -z $TRAKT_ID ]] || [[ $TRAKT_ID_DEPRECATED -eq 1 ]]; then
    TRAKT_ID=null
  fi
  if [[ $TRAKT_ID == "null" ]] && [[ $TRAKT_ID_FROM_FILE == "null" ]]; then
    TRAKT_ID=$(fetch_from_trakt_search "$IMDB_ID_FROM_FILE" "trakt")
  fi
  echo "Trakt ID: $TRAKT_ID"

  THETVDB_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://thetvdb.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  THETVDB_ID_NUMBER=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://thetvdb.com" | wc -l | awk '{print $1}')
  if [[ $THETVDB_ID_NUMBER -eq 2 ]] && [[ $2 == "tvshow" ]]; then
    THETVDB_ID=$(cat temp_WIKI_URL_DOWNLOADED | grep "https://thetvdb.com" | tail -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  fi
  THETVDB_ID_DEPRECATED=$(cat temp_WIKI_URL_DOWNLOADED | grep -A15 "https://thetvdb.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
  if [[ -z $THETVDB_ID ]] || [[ $THETVDB_ID_DEPRECATED -eq 1 ]]; then
    THETVDB_ID=null
  fi
  if [[ $THETVDB_ID == "null" ]] && [[ $THETVDB_ID_FROM_FILE == "null" ]]; then
    THETVDB_ID=$(fetch_from_trakt_search "$IMDB_ID_FROM_FILE" "tvdb")
  fi
  echo "THETVDB ID: $THETVDB_ID"
}

if [[ $1 == "check" ]]; then
  rm -f $FILMS_IDS_FILE_PATH_TEMP

  FILE_PATH="$FILMS_IDS_FILE_PATH"

  if [[ $3 == "active" ]]; then
    grep ",TRUE$" $FILMS_IDS_FILE_PATH > $FILMS_IDS_ACTIVE_FILE_PATH
    FILE_PATH="$FILMS_IDS_ACTIVE_FILE_PATH"
  fi

  TOTAL_LINES=$(wc -l <"${FILE_PATH}")

  while IFS= read -r LINE <&3; do
    PERCENT=$(echo "scale=2; ($COUNTER / $TOTAL_LINES) * 100" | bc)
    URL=$(cat $FILE_PATH | grep $LINE | cut -d',' -f1)

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
      THETVDB_ID_FROM_FILE=$(echo $LINE | cut -d',' -f10)

      WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID_FROM_FILE%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/' | head -1)
      if [[ $WIKI_URL ]]; then
        echo $WIKI_URL

        get_other_ids $1 $2

        METACRITIC_ID_TO_USE=$(check_id "$METACRITIC_ID" "$METACRITIC_ID_FROM_FILE")
        FOUND_METACRITIC=$(is_id_found "$METACRITIC_ID" "$METACRITIC_ID_FROM_FILE")

        ROTTEN_TOMATOES_ID_TO_USE=$(check_id "$ROTTEN_TOMATOES_ID" "$ROTTEN_TOMATOES_ID_FROM_FILE")
        FOUND_ROTTEN_TOMATOES=$(is_id_found "$ROTTEN_TOMATOES_ID" "$ROTTEN_TOMATOES_ID_FROM_FILE")

        LETTERBOXD_ID_TO_USE=$(check_id "$LETTERBOXD_ID" "$LETTERBOXD_ID_FROM_FILE")
        FOUND_LETTERBOXD=$(is_id_found "$LETTERBOXD_ID" "$LETTERBOXD_ID_FROM_FILE")

        SENSCRITIQUE_ID_TO_USE=$(check_id "$SENSCRITIQUE_ID" "$SENSCRITIQUE_ID_FROM_FILE")
        FOUND_SENSCRITIQUE=$(is_id_found "$SENSCRITIQUE_ID" "$SENSCRITIQUE_ID_FROM_FILE")

        TRAKT_ID_TO_USE=$(check_id "$TRAKT_ID" "$TRAKT_ID_FROM_FILE")
        FOUND_TRAKT=$(is_id_found "$TRAKT_ID" "$TRAKT_ID_FROM_FILE")

        THETVDB_ID_TO_USE=$(check_id "$THETVDB_ID" "$THETVDB_ID_FROM_FILE")
        FOUND_THETVDB=$(is_id_found "$THETVDB_ID" "$THETVDB_ID_FROM_FILE")

        if [[ $FOUND_METACRITIC -eq 1 ]] || [[ $FOUND_ROTTEN_TOMATOES -eq 1 ]] || [[ $FOUND_LETTERBOXD -eq 1 ]] || [[ $FOUND_SENSCRITIQUE -eq 1 ]] || [[ $FOUND_TRAKT -eq 1 ]] || [[ $FOUND_THETVDB -eq 1 ]]; then
          echo "$BASE_URL_ALLOCINE$ALLOCINE_ID_FROM_FILE.html,$IMDB_ID_FROM_FILE,$BETASERIES_ID_FROM_FILE,$THEMOVIEDB_ID_FROM_FILE,$METACRITIC_ID_TO_USE,$ROTTEN_TOMATOES_ID_TO_USE,$LETTERBOXD_ID_TO_USE,$SENSCRITIQUE_ID_TO_USE,$TRAKT_ID_TO_USE,$THETVDB_ID_TO_USE,FALSE" >> $FILMS_IDS_FILE_PATH_TEMP
        fi
      fi
    fi

    ((COUNTER++))
  done 3<$FILE_PATH
elif [[ $1 == "update" ]]; then
  if [ -f "$FILMS_IDS_FILE_PATH_TEMP" ]; then
    echo "Updating the dataset with the file: $FILMS_IDS_FILE_PATH_TEMP"
  else
    echo "The temp file does not exist, abording"
  fi

  TOTAL_LINES=$(wc -l <"${FILMS_IDS_FILE_PATH_TEMP}")

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
  echo "Movies to exclude: $EXCLUDED_IDS_MOVIE"
  echo "TV Shows to exclude: $EXCLUDED_IDS_TVSHOW"

  git update-index --no-assume-unchanged $FILMS_IDS_FILE_PATH

  ERROR=$(
    if [ -n "$3" ]; then
      git diff "HEAD~$3" HEAD --unified=0 -- "$FILMS_IDS_FILE_PATH"
    else
      git diff --unified=0 -- "$FILMS_IDS_FILE_PATH"
    fi \
    | grep '^[+-]' \
    | grep -Ev '^(--- a/|\+\+\+ b/)' \
    | timeout 3600 awk -v baseurlAllocine="$BASE_URL" \
      -v baseurlImdb="$BASE_URL_IMDB" \
      -v baseurlBetaseries="$BASE_URL_BETASERIES" \
      -v baseurlMetacritic="$BASE_URL_METACRITIC" \
      -v baseurlRottenTomatoes="$BASE_URL_ROTTEN_TOMATOES" \
      -v baseurlLetterboxd="$BASE_URL_LETTERBOXD" \
      -v baseurlSenscritique="$BASE_URL_SENSCRITIQUE" \
      -v baseurlTrakt="$BASE_URL_TRAKT" \
      -v baseurlTvtime="$BASE_URL_TVTIME" \
      -v filmIdsFilePath="$FILMS_IDS_FILE_PATH" \
      -v isTvshow="$2" \
      -v skipValues="$4" -F',' '{
      sub(/^[+-]/,"")
      data[$1] = (data[$1] ? data[$1] FS : "") $0
    }
    END {
      urls[1]=baseurlAllocine
      urls[2]=baseurlImdb
      urls[3]=baseurlBetaseries
      urls[5]=baseurlMetacritic
      urls[6]=baseurlRottenTomatoes
      urls[7]=baseurlLetterboxd
      urls[8]=baseurlSenscritique
      urls[9]=baseurlTrakt

      if (isTvshow == "tvshow") {
        urls[10] = baseurlTvtime
      }

      split(skipValues, skipArray, ",")

      print "Only last values changed for: " filmIdsFilePath

      for (key in data) {
        split(data[key], lines, FS)

        if (lines[1] == lines[1+11] && lines[2] == lines[2+11] && lines[3] == lines[3+11] && lines[4] == lines[4+11] && lines[5] == lines[5+11] && lines[6] == lines[6+11] && lines[7] == lines[7+11] && lines[8] == lines[8+11] && lines[9] == lines[9+11] && lines[10] != lines[10+11] && lines[11] != lines[11+11]) continue

        for(i=1; i<=11; i++) {
          print "Other values changed for: " filmIdsFilePath

          if (lines[i] != "null" && lines[i+11] == "null") {
            print "------------------------------------------------------------"
            print "In URL " key ", item at position " (i-1) " changed from string to null between '-' and '+' line."
            print "Details:"
            print "- " lines[1] "," lines[2] "," lines[3] "," lines[4] "," lines[5] "," lines[6] "," lines[7] "," lines[8] "," lines[9] "," lines[10] "," lines[11]
            print "+ " lines[1+11] "," lines[2+11] "," lines[3+11] "," lines[4+11] "," lines[5+11] "," lines[6+11] "," lines[7+11] "," lines[8+11] "," lines[9+11] "," lines[10+11] "," lines[11+11]
            print "------------------------------------------------------------"
            exit
          }

          for(j=1; j<=11; j++) {
            if (lines[j] != "null" && lines[j] != "") {
              if (j == 4) j=5
              url = urls[j] lines[j]

              shouldSkip = 0
              for (k in skipArray) {
                if (url == skipArray[k]) {
                  shouldSkip = 1
                  break
                }
              }

              cmd = ("curl -A \"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\" -o /dev/null -s -w \"%{http_code}\" " url)
              cmd | getline http_status_code
              close(cmd)

              if (http_status_code != 000 && http_status_code != 200 && !(http_status_code >= 300 && http_status_code < 400) && shouldSkip != 1) {
                print "------------------------------------------------------------"
                print "URL " url " returned an invalid HTTP status code: " http_status_code ". It should return 200."
                print "IMDb ID: " urls[2] lines[2]
                print lines[1] "," lines[2] "," lines[3] "," lines[4] "," lines[5] "," lines[6] "," lines[7] "," lines[8] "," lines[9] "," lines[10] "," lines[11]
                print "------------------------------------------------------------"
                exit
              }
            }
          }
        }
      }
    }')

  case "$ERROR" in
    "Only last values changed for: ./src/assets/films_ids.txt")
      echo "$ERROR"
      git update-index --assume-unchanged src/assets/films_ids.txt
      ;;

    "Only last values changed for: ./src/assets/series_ids.txt")
      echo "$ERROR"
      git update-index --assume-unchanged src/assets/series_ids.txt
      ;;

    *------------------------------------------------------------*)
      echo "$ERROR"
      exit 1
      ;;
  esac
elif [[ $1 == "check_imdb" ]]; then
  rm -f $FILMS_IDS_FILE_PATH_TEMP

  FILE_PATH="$FILMS_IDS_FILE_PATH"

  if [[ $3 == "active" ]]; then
    grep ",TRUE$" $FILMS_IDS_FILE_PATH > $FILMS_IDS_ACTIVE_FILE_PATH
    FILE_PATH="$FILMS_IDS_ACTIVE_FILE_PATH"
  fi

  TOTAL_LINES=$(wc -l <"${FILE_PATH}")

  while IFS= read -r LINE <&3; do
    PERCENT=$(echo "scale=2; ($COUNTER / $TOTAL_LINES) * 100" | bc)
    URL=$(cat $FILE_PATH | grep $LINE | cut -d',' -f1)

    if [[ $URL != "URL" ]]; then
      echo "$PERCENT: $URL"

      ALLOCINE_ID_FROM_FILE=$(echo $URL | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)
      IMDB_ID_FROM_FILE=$(echo $LINE | cut -d',' -f2)

      WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY%20%22$ALLOCINE_ID_FROM_FILE%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
      if [[ $WIKI_URL ]]; then
        echo $WIKI_URL

        IMDB_ID=$(curl -s $WIKI_URL | grep -B50 "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -A50 "wikibase-statementview-rankselector" | grep -Eo ">tt[0-9]+<" | cut -d'<' -f1 | cut -d'>' -f2 | head -1)
        IMDB_ID_DEPRECATED=$(curl -s $WIKI_URL | grep -A15 "https://www.imdb.com" | grep -Eo "/Q21441764|/Q45403344" | wc -l | awk '{print $1}')
        if [[ -z $IMDB_ID ]] || [[ $IMDB_ID_DEPRECATED -eq 1 ]]; then
          IMDB_ID=null
        fi
        FOUND_IMDB_DIFFERENT=$(is_id_found "$IMDB_ID" "$IMDB_ID_FROM_FILE")

        if [[ $FOUND_IMDB_DIFFERENT -eq 1 ]]; then
          echo "$WIKI_URL; $IMDB_ID_FROM_FILE; $IMDB_ID" >> $FILMS_IDS_FILE_PATH_TEMP
        fi
      fi
    fi

    ((COUNTER++))
  done 3<$FILE_PATH
fi