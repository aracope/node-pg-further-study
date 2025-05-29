const express = require("express");
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require("slugify");

// GET /companies => { companies: [{code, name}, ...] }
router.get("/", async function (req, res, next) {
  try {
    const results = await db.query("SELECT code, name FROM companies");
    return res.json({ companies: results.rows });
  } catch (err) {
    return next(err);
  }
});

// GET /companies/:code => { company: {code, name, description} }
router.get("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;

    const result = await db.query(
      `SELECT code, name, description FROM companies WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Company not found: ${code}`, 404);
    }

    const company = result.rows[0];

    const invoicesRes = await db.query(
      `SELECT id FROM invoices WHERE comp_code = $1`,
      [code]
    );

    company.invoices = invoicesRes.rows.map(inv => inv.id);

    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

// POST /companies => { company: {code, name, description} }
router.post("/", async function (req, res, next) {
  try {
    const { name, description } = req.body;
    const code = slugify(name, { lower: true, strict: true });

    const result = await db.query(
      "INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description",
      [code, name, description]
    );

    return res.status(201).json({ company: result.rows[0] });
  } catch (err) {
      if (err.code === '23505') { // Unique violation in Postgres
    return next(new ExpressError("Company code already exists", 400));
  }
  return next(err);
  }
});

// PUT /companies/:code => { company: {code, name, description} }
router.put("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    const result = await db.query(
      "UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description",
      [name, description, code]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Company not found: ${code}`, 404);
    }

    return res.json({ company: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// DELETE /companies/:code => { status: "deleted" }
router.delete("/:code", async function (req, res, next) {
  try {
    const { code } = req.params;

    const result = await db.query(
      "DELETE FROM companies WHERE code=$1 RETURNING code",
      [code]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Company not found: ${code}`, 404);
    }

    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;