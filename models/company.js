const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

const Job = require("./job");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Takes in optional filter object which can include:
   *  {name, minEmployees, maxEmployees }
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filterBy) {
    const { whereClauses, values } = Company._sqlForPartialFilter(filterBy);
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
          ${whereClauses} 
           ORDER BY name`,
      values
    );
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   * */

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    // Get all the jobs for this company
    company.jobs = await Job.findAllByCompanyHandle(handle);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = `$${values.length + 1}`;

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   * */

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /** Translate data to filter into SQL Format.
   * Takes in:
   *  filterBy: JS object with key-value pairs to filter in database
   *
   * Returns:
   *  whereCols: string that contains the where clause of the SQL query
   *             if filterBy has minEmployees, maxEmployees or name
   *             - empty string if the keys above are not present
   *  values: array of values to search by in the SQL query
   *          - empty array if keys are not present
   *
   *  Example:
   * {
   *    whereCols: "WHERE num_employees >= $1 AND name ILIKE $2",
   *    values: [4, '%searchTerm%']
   * }
   *
   */

  static _sqlForPartialFilter(filters = {}) {
    if (Object.keys(filters).length === 0) {
      return {
        whereClauses: "",
        values: [],
      };
    }

    const whereClauses = [];
    const values = [];
    const { minEmployees, maxEmployees, name } = filters;

    if (minEmployees && maxEmployees && +minEmployees > +maxEmployees) {
      throw new BadRequestError(
        `Min employees: ${minEmployees} cannot be larger than max 
        employees: ${maxEmployees}`
      );
    }

    if (minEmployees !== undefined) {
      whereClauses.push(`num_employees >= $${whereClauses.length + 1}`);
      values.push(minEmployees);
    }

    if (maxEmployees !== undefined) {
      whereClauses.push(`num_employees <= $${whereClauses.length + 1}`);
      values.push(maxEmployees);
    }

    if (name !== undefined) {
      whereClauses.push(`name ILIKE $${whereClauses.length + 1}`);
      values.push(`%${name}%`);
    }

    return {
      whereClauses: `WHERE ${whereClauses.join(" AND ")}`,
      values,
    };
  }
}

module.exports = Company;
