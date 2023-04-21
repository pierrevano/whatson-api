/* This is a way to pass arguments to the script. */
const node_vars = process.argv.slice(2);

const getNodeVarsValues = {
  item_type: node_vars[0],
  get_ids: node_vars[1],
  get_db: node_vars[2],
  environment: node_vars[3],
  is_not_active: node_vars[4],
  index_to_start: node_vars[5],
  skip_already_added_documents: node_vars[6],
};

module.exports = { getNodeVarsValues };
