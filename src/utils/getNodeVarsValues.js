/* This is a way to pass arguments to the script. */
const node_vars = process.argv.slice(2);

/**
 * Maps positional CLI arguments to well-named switches used by the data ingestion scripts.
 *
 * @type {{
 *   item_type: string|undefined,
 *   get_ids: string|undefined,
 *   get_db: string|undefined,
 *   environment: string|undefined,
 *   is_not_active: string|undefined,
 *   check_db_ids: string|undefined,
 *   index_to_start: string|undefined,
 *   force: string|undefined,
 *   skip_mojo: string|undefined,
 *   skip_services: string|undefined,
 *   delete_ids: string|undefined,
 *   check_date: string|undefined,
 *   max_index: string|undefined,
 *   check_id: string|undefined
 * }}
 */
const getNodeVarsValues = {
  /*
   * Which item type should be updated?
   * Choose either `movie` or `tvshow`.
   */
  item_type: node_vars[0],

  /*
   * Should the dataset IDs be updated?
   * If not equal to `update_ids`, the dataset will not be updated.
   */
  get_ids: node_vars[1],

  /*
   * Should the remote database be updated?
   * If it is different from `update_db`, the script will be aborted.
   * This parameter allows you to update only the dataset IDs.
   */
  get_db: node_vars[2],

  /*
   * Which environment should be addressed?
   * Choose between `local` or `circleci`.
   */
  environment: node_vars[3],

  /*
   * Should active or inactive items be updated?
   * This parameter allows either updating the items
   * from the trending AlloCiné pages or all of the items.
   * It helps to improve performances when we need to
   * update only a subset of the items.
   * If not defined or set to `active`, only the
   * items marked as `IS_ACTIVE` to `TRUE` are updated.
   */
  is_not_active: node_vars[4],

  /* Should I check whether or not all remote
   * items are present locally?
   * Only runs if set to `check`. Otherwise, it is ignored.
   */
  check_db_ids: node_vars[5],

  /*
   * What's the index of the items to start at?
   * This parameter enables starting from a specific
   * item index number instead of going back to the first item.
   * If not defined, it defaults to `0`.
   */
  index_to_start: node_vars[6],

  /*
   * Should updating of items be forced or not?
   * To enhance performance, some items are only
   * updated when ratings from AlloCiné and IMDb differ.
   * Unless this parameter is set to `force`, items are only
   * updated when the above condition is met.
   */
  force: node_vars[7],

  /*
   * Do we want to skip getting the data
   * from Box Office Mojo?
   * This parameter is useful when debugging and
   * you want to avoid parsing the pages from this website.
   * If different from `skip_mojo`, the pages of
   * the Box Office Mojo website are normally parsed.
   */
  skip_mojo: node_vars[8],

  /*
   * Do we want to skip checking the
   * different services used for ratings?
   * This parameter is handy when debugging and
   * you want to avoid checking the services every time.
   * If different from `skip_services`, the services
   * are normally checked for any possible downtimes.
   */
  skip_services: node_vars[9],

  /*
   * Do we want to delete specific items from
   * the remote database? The complete AlloCiné URLs
   * to delete should be set in an array.
   * If the parameter is not set to `delete_ids` it is ignored.
   */
  delete_ids: node_vars[10],

  /*
   * Do we want to update only items
   * older than a specific date?
   * A number of days is expected in the parameter.
   * If set, only items older than `N` days are updated.
   * The item's `updated_at` date is used for this purpose.
   * If not set, it is ignored.
   */
  check_date: node_vars[11],

  /*
   * Do we want to limit the number of items
   * processed in a single batch? This parameter is used
   * to control the batch size during processing.
   * If not set, it is ignored.
   */
  max_index: node_vars[12],

  /*
   * Do we want to update a specific item
   * in the dataset? The ID to specify should
   * be an IMDb ID. If not set, it is ignored.
   */
  check_id: node_vars[13],
};

module.exports = { getNodeVarsValues };
