"use strict";

const db = require("../db");
const { NotFoundError} = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for Jobs. */
class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     **/
    static async create(data) {
        const result = await db.query(
            `INSERT INTO jobs 
                (title, salary, equity, company_handle)
                VALUES ($1, $2, $3, $4)
                RETURNING id, title, salary, equity, comany_handle AS "companyHandle"`,
            [
                data.title,
                data.salary,
                data.equity,
                data.companyHandle,
            ]
        )
        let job = result.row[0];
        return job;
    }
    /** Find all jobs (optional filter on searchFilters).
     *
     * searchFilters (all optional):
     * - minSalary
     * - hasEquity (true returns only jobs with equity > 0, other values ignored)
     * - title (will find case-insensitive, partial matches)
     *
     * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
     * */

    static async findAll(data = {}) {
        const { whereCols, values } = Job._sqlForPartialFilter(data);
        const jobRes = await db.query(
            `SELECT j.id,
                    j.title,
                    j.salary,
                    j.equity,
                    j.company_handle AS "companyHandle",
                    c.name AS "companyName"
            FROM jobs j 
            LEFT JOIN companies AS c ON c.handle = j.company_handle
            ${whereCols}
            ORDER BY title`,
            values
        );
        return jobRes.rows;
    }
    /** Given a job id, return data about job.
     *
     * Returns { id, title, salary, equity, companyHandle, company }
     *   where company is { handle, name, description, numEmployees, logoUrl }
     *
     * Throws NotFoundError if not found.
     **/

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

        if (!job) throw new NotFoundError(`No job with id: ${id}`);

        const companyRes = await db.query(
            `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
            FROM companies
            WHERE handle = $1`,
            [job.companyHandle]
        );
        
        delete job.companyHandle;
        job.company = companyRes.rows[0];
        
        return job;
    }
    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain
     * all the fields; this only changes provided ones.
     *
     * Data can include: { title, salary, equity }
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data, {}); 
        const idVarIdx = `$${values.length + 1}`;

        const querySql = `UPDATE jobs
                          SET ${setcols}
                          WHERE id = ${idVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;
        const result  = await db.query(querySql, [...values, id]);
        const job = result.row[0];
        
        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/
    static async remove(id) {
        const result = await db.query(
            `DELETE
                FROM jobs
                WHERE id = $1
                RETURNING id`,
            [id]
        );
        const job = result.row[0];
        
        if (!job) throw new NotFoundError(`No job: ${id}`);
    }

    /** Translate data to filter into SQL Format.
     * Takes in:
     *  filters: JS object with key-value pairs to filter in database
     *
     * Returns:
     *  whereCols: string that contains the where clause of the SQL query
     *             if filterBy has minEmployees, maxEmployees or name
     *             - empty string if the keys above are not present
     *  values: array of values to search by in the SQL query
     *          - empty array if keys are not present
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
        const { title, minSalary, hasEquity } = filters;

        if (!title && !minSalary && !hasEquity ) {
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

        if (hasEquity !== true) {
            whereClauses.push(`hasEquity > 0}`);
            
        }

        return {
            whereClauses: `WHERE ${whereClauses.join(" AND ")}`,
            values,
        };
    }
}

module.exports = Job;