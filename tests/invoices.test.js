process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeEach(async () => {
  await db.query("BEGIN");

  const companyResult = await db.query(`
    INSERT INTO companies (code, name, description)
    VALUES ('testco', 'Test Company', 'A company for testing')
    RETURNING code, name, description
  `);
  testCompany = companyResult.rows[0];

  const invoiceResult = await db.query(`
    INSERT INTO invoices (comp_code, amt)
    VALUES ('testco', 100)
    RETURNING id, comp_code, amt, paid, add_date, paid_date
  `);
  testInvoice = invoiceResult.rows[0];
});

afterEach(async () => {
  await db.query("ROLLBACK");
});

afterAll(async () => {
  await db.end();
});

describe("GET /invoices", () => {
  test("Returns list of invoices", async () => {
    const res = await request(app).get("/invoices");
    expect(res.statusCode).toBe(200);
    expect(res.body.invoices).toEqual([
      { id: testInvoice.id, comp_code: testInvoice.comp_code }
    ]);
  });
});

describe("GET /invoices/:id", () => {
  test("Returns a single invoice with company info", async () => {
    const res = await request(app).get(`/invoices/${testInvoice.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.invoice).toMatchObject({
      id: testInvoice.id,
      amt: testInvoice.amt,
      paid: false,
      company: {
        code: testCompany.code,
        name: testCompany.name,
        description: testCompany.description
      }
    });
  });

  test("Responds with 404 for invalid invoice", async () => {
    const res = await request(app).get("/invoices/9999");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /invoices", () => {
  test("Creates a new invoice", async () => {
    const res = await request(app)
      .post("/invoices")
      .send({ comp_code: testCompany.code, amt: 200 });

    expect(res.statusCode).toBe(201);
    expect(res.body.invoice).toHaveProperty("id");
    expect(res.body.invoice.amt).toBe(200);
    expect(res.body.invoice.comp_code).toBe(testCompany.code);
  });

  test("Responds with error for missing fields", async () => {
    const res = await request(app).post("/invoices").send({});
    expect(res.statusCode).toBe(500); // Or 400, depending on your ExpressError handling
  });
});

describe("PUT /invoices/:id", () => {
  test("Updates an existing invoice", async () => {
    const res = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ amt: 150 });

    expect(res.statusCode).toBe(200);
    expect(res.body.invoice.amt).toBe(150);
  });

  test("Responds with 404 for invalid invoice", async () => {
    const res = await request(app)
      .put("/invoices/9999")
      .send({ amt: 150 });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /invoices/:id", () => {
  test("Deletes an invoice", async () => {
    const res = await request(app)
      .delete(`/invoices/${testInvoice.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "deleted" });
  });

  test("Responds with 404 for invalid invoice", async () => {
    const res = await request(app).delete("/invoices/9999");
    expect(res.statusCode).toBe(404);
  });
});
