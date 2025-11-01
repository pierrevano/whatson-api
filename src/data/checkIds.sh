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

check_id_consistency () {
  local provider=$1
  local file_value=$2
  local media_type=$3

  local property_id
  case $provider in
    "IMDb")
      property_id="P345"
      ;;
    "Metacritic")
      property_id="P1712"
      ;;
    "Rotten Tomatoes")
      property_id="P1258"
      ;;
    "Letterboxd")
      property_id="P6127"
      ;;
    "SensCritique")
      property_id="P10100"
      ;;
    "Trakt")
      if [[ $media_type == "tvshow" ]]; then
        property_id="P8013"
      else
        property_id="P12492"
      fi
      ;;
    "TheTVDB")
      if [[ $media_type == "tvshow" ]]; then
        property_id="P4835"
      else
        property_id="P12196"
      fi
      ;;
    *)
      echo "null"
      return
      ;;
  esac

  local fetched_value
  fetched_value=$(jq -r --arg property "$property_id" '.entities[]?.claims[$property][]? | select(.rank != "deprecated") | .mainsnak.datavalue.value' <<< "$WIKIDATA_ENTITY_JSON" | head -n1)

  if [[ -z $fetched_value ]] || [[ $fetched_value == "null" ]]; then
    echo "null"
    return
  fi

  case $provider in
    "Metacritic"|"Rotten Tomatoes")
      if [[ $fetched_value == */* ]]; then
        fetched_value=${fetched_value#*/}
      fi
      ;;
    "Trakt")
      if [[ $media_type == "tvshow" && $fetched_value == */* ]]; then
        fetched_value=${fetched_value#*/}
      fi
      ;;
  esac

  local should_check=0
  if [[ $CHECK_OTHER_IDS_STRICT -eq 1 ]] && [[ -n $file_value ]] && [[ $file_value != "null" ]]; then
    should_check=1
  fi

  if [[ $should_check -eq 1 ]]; then
    if [[ $provider == "IMDb" ]]; then
      local deprecated_count
      deprecated_count=$(jq -r --arg property "$property_id" '[.entities[]?.claims[$property][]? | select(.rank == "deprecated")] | length' <<< "$WIKIDATA_ENTITY_JSON")
      if [[ $deprecated_count -gt 0 ]]; then
        echo "IMDb redirection detected for $WIKI_URL. Aborting." >&2
        terminal-notifier -title "checkIds.sh" -message "Deprecation detected!"
        return 1
      fi
    fi

    if [[ $file_value != $fetched_value ]]; then
      echo "$provider mismatch detected for $WIKI_URL. Local: $file_value / Wikidata: $fetched_value" >&2
      terminal-notifier -title "checkIds.sh" -message "Mismatch detected!"
      return 1
    fi
  fi

  echo "$fetched_value"
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
  WIKIDATA_ENTITY_ID=${WIKI_URL##*/}
  WIKIDATA_ENTITY_ID=${WIKIDATA_ENTITY_ID%%#*}
  WIKIDATA_ENTITY_ID=${WIKIDATA_ENTITY_ID%%\?*}

  WIKIDATA_ENTITY_JSON=$(curl -fs "https://www.wikidata.org/wiki/Special:EntityData/${WIKIDATA_ENTITY_ID}.json")
  echo "https://www.wikidata.org/wiki/Special:EntityData/${WIKIDATA_ENTITY_ID}.json"
  sleep 1 # Sleep for 1 second to avoid rate limiting

  check_id_consistency "IMDb" "$IMDB_ID_FROM_FILE" $2 > /dev/null || exit 1

  METACRITIC_ID=$(check_id_consistency "Metacritic" "$METACRITIC_ID_FROM_FILE" $2) || exit 1
  if [[ -z $METACRITIC_ID ]]; then
    METACRITIC_ID=null
  fi
  echo "Metacritic ID: $METACRITIC_ID"

  ROTTEN_TOMATOES_ID=$(check_id_consistency "Rotten Tomatoes" "$ROTTEN_TOMATOES_ID_FROM_FILE" $2) || exit 1
  if [[ -z $ROTTEN_TOMATOES_ID ]]; then
    ROTTEN_TOMATOES_ID=null
  fi
  if [[ $ROTTEN_TOMATOES_ID != "null" ]]; then
    STATUS_CODE=$(curl -I -s $BASE_URL_ROTTEN_TOMATOES$ROTTEN_TOMATOES_ID | grep HTTP/2 | awk '{print $2}')
    if [[ $STATUS_CODE -eq 404 ]]; then
        ROTTEN_TOMATOES_ID=null
    fi
  fi
  echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"

  LETTERBOXD_ID=$(check_id_consistency "Letterboxd" "$LETTERBOXD_ID_FROM_FILE" $2) || exit 1
  if [[ -z $LETTERBOXD_ID ]]; then
    LETTERBOXD_ID=null
  fi
  echo "Letterboxd ID: $LETTERBOXD_ID"

  SENSCRITIQUE_ID=$(check_id_consistency "SensCritique" "$SENSCRITIQUE_ID_FROM_FILE" $2) || exit 1
  if [[ -z $SENSCRITIQUE_ID ]]; then
    SENSCRITIQUE_ID=null
  fi
  echo "SensCritique ID: $SENSCRITIQUE_ID"

  TRAKT_ID=$(check_id_consistency "Trakt" "$TRAKT_ID_FROM_FILE" $2) || exit 1
  if [[ -z $TRAKT_ID ]]; then
    TRAKT_ID=null
  fi
  if [[ $TRAKT_ID == "null" ]] && [[ $TRAKT_ID_FROM_FILE == "null" ]]; then
    TRAKT_ID=$(fetch_from_trakt_search "$IMDB_ID_FROM_FILE" "trakt")
  fi
  echo "Trakt ID: $TRAKT_ID"

  THETVDB_ID=$(check_id_consistency "TheTVDB" "$THETVDB_ID_FROM_FILE" $2) || exit 1
  if [[ -z $THETVDB_ID ]]; then
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

  if [[ $3 == "all_ids" ]]; then
    SOURCE_ARRAY_FILE=${4:-./temp_mojo_box_office.json}
    TEMP_IMDB_IDS_FILE=./temp_imdb_ids.txt

    if [[ ! -f $SOURCE_ARRAY_FILE ]]; then
      echo "Source array file $SOURCE_ARRAY_FILE not found. Aborting."
      exit 1
    fi

    # Extract IMDb IDs from the source array and use them to filter the IDs file.
    jq -r '.[] | select(.IMDB_ID != null and .IMDB_ID != "null") | .IMDB_ID' "$SOURCE_ARRAY_FILE" | sort -u > "$TEMP_IMDB_IDS_FILE"

    if [[ ! -s $TEMP_IMDB_IDS_FILE ]]; then
      echo "No IMDb IDs found in $SOURCE_ARRAY_FILE. Aborting."
      rm -f "$TEMP_IMDB_IDS_FILE"
      exit 1
    fi

    rm -f "$FILMS_IDS_ACTIVE_FILE_PATH"
    awk -F',' 'NR==FNR { ids[$1]=1; next } FNR==1 { next } ($2 in ids)' "$TEMP_IMDB_IDS_FILE" "$FILMS_IDS_FILE_PATH" > "$FILMS_IDS_ACTIVE_FILE_PATH"
    rm -f "$TEMP_IMDB_IDS_FILE"

    if [[ ! -s $FILMS_IDS_ACTIVE_FILE_PATH ]]; then
      echo "No matching IMDb IDs found in $SOURCE_ARRAY_FILE. Aborting."
      exit 0
    fi

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

      PROPERTY_ID=P345
      ITEM_ID=$IMDB_ID_FROM_FILE

      IMDB_OCCURRENCES=$(grep -c -F ",$IMDB_ID_FROM_FILE," "$FILE_PATH")
      if [[ $IMDB_OCCURRENCES -gt 1 ]]; then
        PROPERTY_ID=$PROPERTY
        ITEM_ID=$ALLOCINE_ID_FROM_FILE
      fi

      WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY_ID%20%22$ITEM_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/' | head -1)
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
      elif [[ $IMDB_OCCURRENCES -gt 1 ]]; then
        echo "Wikidata entry not found for duplicated IMDb id $IMDB_ID_FROM_FILE. Aborting."
        exit 1
      fi
    fi

    ((COUNTER++))
  done 3<$FILE_PATH
elif [[ $1 == "update" ]]; then
  if [ -f "$FILMS_IDS_FILE_PATH_TEMP" ]; then
    echo "Updating the dataset with the file: $FILMS_IDS_FILE_PATH_TEMP"
  else
    echo "The temp file does not exist, aborting."
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
        echo "Count for $IMDB_ID is greater than 2. Exiting."
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

  if [[ $3 == "all_ids" ]]; then
    SOURCE_ARRAY_FILE=${4:-./temp_mojo_box_office.json}
    TEMP_IMDB_IDS_FILE=./temp_imdb_ids.txt

    if [[ ! -f $SOURCE_ARRAY_FILE ]]; then
      echo "Source array file $SOURCE_ARRAY_FILE not found. Aborting."
      exit 1
    fi

    # Extract IMDb IDs from the source array and use them to filter the IDs file.
    jq -r '.[] | select(.IMDB_ID != null and .IMDB_ID != "null") | .IMDB_ID' "$SOURCE_ARRAY_FILE" | sort -u > "$TEMP_IMDB_IDS_FILE"

    if [[ ! -s $TEMP_IMDB_IDS_FILE ]]; then
      echo "No IMDb IDs found in $SOURCE_ARRAY_FILE. Aborting."
      rm -f "$TEMP_IMDB_IDS_FILE"
      exit 1
    fi

    rm -f "$FILMS_IDS_ACTIVE_FILE_PATH"
    awk -F',' 'NR==FNR { ids[$1]=1; next } FNR==1 { next } ($2 in ids)' "$TEMP_IMDB_IDS_FILE" "$FILMS_IDS_FILE_PATH" > "$FILMS_IDS_ACTIVE_FILE_PATH"
    rm -f "$TEMP_IMDB_IDS_FILE"

    if [[ ! -s $FILMS_IDS_ACTIVE_FILE_PATH ]]; then
      echo "No matching IMDb IDs found in $SOURCE_ARRAY_FILE. Aborting."
      exit 0
    fi

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