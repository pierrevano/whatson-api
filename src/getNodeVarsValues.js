/* This is a way to pass arguments to the script. */
const node_vars = process.argv.slice(2);

const getNodeVarsValues = {
  item_type: node_vars[0],
  get_ids: node_vars[1],
  get_db: node_vars[2],
  environment: node_vars[3],
  is_not_active: node_vars[4],
  check_db_ids: node_vars[5],
  index_to_start: node_vars[6],
  skip_already_added_documents: node_vars[7],
  force: node_vars[8],
  skip_mojo: node_vars[9],
  check_date: node_vars[10],
};

module.exports = { getNodeVarsValues };
