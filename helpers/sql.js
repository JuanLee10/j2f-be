const { BadRequestError } = require("../expressError");

/**  Translates object data to update into SQL format
 *  Parameters:
 *    dataToUpdate: JS object with key-value pairs that will be updated
 *    jsToSql: JS object with JS name as key and column name as value
 * 
 *  Returns:
 *    setCols: string of column nmaes eqla to SQL parameter
 *    values: lists of values to update for the columnes given in setCols
 * 
*/
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
