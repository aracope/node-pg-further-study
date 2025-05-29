const express = require("express");
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError");

// GET /invoices - returns {invoices: [{id, comp_code}, ...]}
router.get("/", async function (req, res, next) {
  try {
    const results = await db.query("SELECT id, comp_code FROM invoices");
    return res.json({ invoices: results.rows });
  } catch (err) {
    return next(err);
  }
});

// GET /invoices/:id - returns {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}
router.get("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;

    const invResult = await db.query(
      `SELECT id, amt, paid, add_date, paid_date, comp_code FROM invoices WHERE id = $1`,
      [id]
    );

    const invoice = invResult.rows[0];

    if (!invoice) {
      throw new ExpressError(`Invoice not found: ${id}`, 404);
    }

    const compResult = await db.query(
      `SELECT code, name, description FROM companies WHERE code = $1`,
      [invoice.comp_code]
    );

    invoice.company = compResult.rows[0];
    delete invoice.comp_code;

    return res.json({ invoice });
  } catch (err) {
    return next(err);
  }
});

// POST /invoices - adds an invoice and returns it
router.post("/", async function (req, res, next) {
  try {
    const { comp_code, amt } = req.body;

    const result = await db.query(
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2)
       RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    );

    return res.status(201).json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PUT /invoices/:id - updates an invoice
router.put("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;
    const { amt } = req.body;

    const result = await db.query(
      `UPDATE invoices SET amt=$1 WHERE id=$2
       RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Invoice not found: ${id}`, 404);
    }

    return res.json({ invoice: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// DELETE /invoices/:id - deletes an invoice
router.delete("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM invoices WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Invoice not found: ${id}`, 404);
    }

    return res.json({ status: "deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;