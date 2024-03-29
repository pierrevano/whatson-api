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
  check_data: node_vars[7],
  force: node_vars[8],
  skip_mojo: node_vars[9],
  skip_services: node_vars[10],
  delete_ids: node_vars[11],
  check_date: node_vars[12],
  check_id: node_vars[13],
};

module.exports = { getNodeVarsValues };
