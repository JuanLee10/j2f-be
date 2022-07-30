"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSchema = require("../schemas/jobFilter.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET / =>
 *   { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 *
 * Can provide search filter in query:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0, other values ignored)
 * - title (will find case-insensitive, partial matches)
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  const validator = jsonschema.validate(req.query, jobFilterSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAll(req.query);
  return res.json({ jobs });
});

/** GET /[jobId] => { job }
 *
 * Returns { id, title, salary, equity, company }
 *   where company is { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Company.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[jobId]  { fld1, fld2, ... } => { job }
 *
 * Data can include: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */


router.patch("/:id", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.handle, req.body);
  return res.json({ job });
});

/** DELETE /[handle]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  await Job.remove(req.params.id);
  return res.json({ deleted: +req.params.id });
});


module.exports = router;
