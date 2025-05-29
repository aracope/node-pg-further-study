process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let testCompany;

beforeEach(async () => {
  await db.query("BEGIN");

  const result = await db.query(`
    INSERT INTO companies (code, name, description)
    VALUES ('testco', 'Test Company', 'A company for testing')
    RETURNING code, name, description
  `);
  testCompany = result.rows[0];
});

afterEach(async () => {
  await db.query("ROLLBACK");
});

afterAll(async () => {
  await db.end();
});

describe("GET /companies", () => {
  test("Returns list of companies", async () => {
    const res = await request(app).get("/companies");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      companies: [
        { code: testCompany.code, name: testCompany.name }
      ]
    });
  });
});

describe("GET /companies/:code", () => {
  test("Returns a single company", async () => {
    const res = await request(app).get(`/companies/${testCompany.code}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.company).toMatchObject({
      code: testCompany.code,
      name: testCompany.name,
      description: testCompany.description
    });
  });

  test("Responds with 404 for invalid company", async () => {
    const res = await request(app).get("/companies/nope");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /companies", () => {
  test("Creates a new company", async () => {
    const res = await request(app)
      .post("/companies")
      .send({
        code: "newco",
        name: "NewCo",
        description: "The newest of cos"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      company: {
        code: "newco",
        name: "NewCo",
        description: "The newest of cos"
      }
    });
  });

  test("Responds with 400 for duplicate code", async () => {
    const res = await request(app)
      .post("/companies")
      .send({
        code: testCompany.code,
        name: "Duplicate",
        description: "Should not be created"
      });

    expect(res.statusCode).toBe(400);
  });
});

describe("PUT /companies/:code", () => {
  test("Updates a company", async () => {
    const res = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({
        name: "UpdatedCo",
        description: "Updated description"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      company: {
        code: testCompany.code,
        name: "UpdatedCo",
        description: "Updated description"
      }
    });
  });

  test("Responds with 404 for invalid company", async () => {
    const res = await request(app)
      .put("/companies/nope")
      .send({
        name: "Nope",
        description: "Does not exist"
      });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /companies/:code", () => {
  test("Deletes a company", async () => {
    const res = await request(app)
      .delete(`/companies/${testCompany.code}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "deleted" });
  });

  test("Responds with 404 for invalid company", async () => {
    const res = await request(app)
      .delete("/companies/nope");
    expect(res.statusCode).toBe(404);
  });
});

