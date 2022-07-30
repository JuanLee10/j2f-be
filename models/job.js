const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if comapanyHandle doesn't exist
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const checkCompanyExists = await db.query(
      `SELECT handle
       FROM companies
       WHERE handle = $1`,
      [companyHandle]
    );
    if (checkCompanyExists.rows[0] === undefined) {
      throw new BadRequestError(`Company does not exist: ${companyHandle}`);
    }

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Takes in optional filter object which can include:
   *  { title, minSalary, hasEquity }
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(filters = {}) {
    const { whereClauses, values } = Job._sqlForPartialFilter(filters);
    const jobRes = await db.query(
      `SELECT id,
              title, 
              salary, 
              equity, 
              company_handle AS "companyHandle"
           FROM jobs
           ${whereClauses}
           ORDER BY title`,
      values
    );
    return jobRes.rows;
  }

  /** Given a job id, return data about the job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   * */

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
              title, 
              salary, 
              equity, 
              company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Given a company handle, return data about the jobs.
   *
   * Returns [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if company handle doesn't exist.
   *
   * Returns empty array if no job is found
   * */

  static async findAllByCompanyHandle(companyHandle) {
    const checkCompanyHandle = await db.query(
      `SELECT handle 
           FROM companies
           WHERE handle = $1`,
      [companyHandle]
    );

    if (checkCompanyHandle.rows[0] === undefined)
      throw new NotFoundError(`No company: ${companyHandle}`);

    const jobsRes = await db.query(
      `SELECT id,
              title, 
              salary, 
              equity
           FROM jobs
           WHERE company_handle = $1`,
      [companyHandle]
    );

    const jobs = jobsRes.rows;

    return jobs;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data);
    const idVarIdx = `$${values.length + 1}`;

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns id of job removed.
   *
   * Throws NotFoundError if job not found.
   * */

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }

  /** Translate data to filter into SQL Format.
   * Takes in:
   *  filterBy: JS object with key-value pairs to filter in database
   *
   * Returns:
   *  whereClauses: string that contains the where clause of the SQL query
   *             if filterBy has title, minSalary, or hasEquity
   *             - empty string if the keys above are not present
   *  values: array of values to search by in the SQL query
   *          - empty array if keys are not present
   *
   *  Example:
   * {
   *    whereCols: 'WHERE salary >= $1 AND equity > 0',
   *    values: [200]
   * }
   *
   */

  static _sqlForPartialFilter(filters) {
    if (Object.keys(filters).length === 0) {
      return {
        whereClauses: "",
        values: [],
      };
    }

    const whereClauses = [];
    const values = [];
    const { title, minSalary, hasEquity } = filters;

    // check for the case where hasEquity is false and title & minSalary are undefined
    if (!title && !minSalary && !hasEquity) {
      return {
        whereClauses: "",
        values: [],
      };
    }

    if (title !== undefined) {
      whereClauses.push(`title ILIKE $${whereClauses.length + 1}`);
      values.push(`%${title}%`);
    }

    if (minSalary !== undefined) {
      whereClauses.push(`salary >= $${whereClauses.length + 1}`);
      values.push(minSalary);
    }

    if (hasEquity === true) {
      whereClauses.push(`equity > 0`);
    }

    return {
      whereClauses: `WHERE ${whereClauses.join(" AND ")}`,
      values,
    };
  }
}

module.exports = Job;