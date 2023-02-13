SOURCE=$1
if [[ -z $SOURCE ]]; then
  node utils/updateData.js movie update_ids update_db
  node utils/updateData.js tvshow update_ids update_db
else
  node utils/updateData.js movie update_ids update_db local
  node utils/updateData.js tvshow update_ids update_db local
fi