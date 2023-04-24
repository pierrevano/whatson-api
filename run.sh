SOURCE=$1
PUSH=$2
if [[ -z $SOURCE ]]; then
  node utils/updateData.js movie update_ids update_db
  node utils/updateData.js tvshow update_ids update_db
else
  node utils/updateData.js movie update_ids update_db local
  node utils/updateData.js tvshow update_ids update_db local

  onlyIdsFiles=$(git diff -- . ':(exclude)src/assets/*_ids.txt' | wc -l | awk '{print $1}')
  if [[ $onlyIdsFiles -eq 0 && $PUSH == "push" ]]; then
    git add . && git commit -m "perf: update dataset" && git push origin main && git push bitbucket main
  else
    echo "Changes are more important than updating the ids files, check the diff first."
  fi
fi