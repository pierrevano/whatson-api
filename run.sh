SOURCE=$1
PUSH=$2
if [[ -z $SOURCE ]]; then
  node data/updateData.js movie update_ids update_db
  node data/updateData.js tvshow update_ids update_db
else
  node data/updateData.js movie update_ids update_db local
  node data/updateData.js tvshow update_ids update_db local

  onlyIdsFiles=$(git diff -- . ':(exclude)src/assets/*_ids.txt' | wc -l | awk '{print $1}')
  if [[ $onlyIdsFiles -eq 0 && $PUSH == "push" ]]; then
    git update-index --no-assume-unchanged src/assets/*_ids.txt
    git add . && git commit -m "perf: update dataset" && git push origin main && git push bitbucket main
    git update-index --assume-unchanged src/assets/*_ids.txt
  else
    echo "Changes are more important than updating the ids files, check the diff first."
  fi
fi