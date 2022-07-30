const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** ************************************ create */

describe("create", () => {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async () => {
    const company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`
    );
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async () => {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/** ************************************ findAll */

describe("findAll", () => {
  test("works: no filter", async () => {
    const companies = await Company.findAll();
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });

  test("works: filter", async () => {
    const filter = {
      name: "c1",
    };
    let companies = await Company.findAll(filter);
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    ]);

    const filter2 = {
      minEmployees: 3,
    };
    companies = await Company.findAll(filter2);
    expect(companies).toEqual([
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);

    const filter3 = {
      maxEmployees: 2,
    };
    companies = await Company.findAll(filter3);
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    ]);

    // More complicated filtering
    const filter4 = {
      minEmployees: 2,
      maxEmployees: 3,
    };
    companies = await Company.findAll(filter4);
    expect(companies).toEqual([
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
});

/** ************************************ get */

describe("get", () => {
  test("works", async () => {
    const company = await Company.get("c1");
    expect(company).toEqual({
      handle: "c1",
      name: "C1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
      jobs: [
        {
          id: expect.any(Number),
          title: "j1",
          salary: 100,
          equity: "0.1",
        },
      ],
    });
  });

  test("not found if no such company", async () => {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/** ************************************ update */

describe("update", () => {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async () => {
    const company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        handle: "c1",
        name: "New",
        description: "New Description",
        num_employees: 10,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("works: null fields", async () => {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    const company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        handle: "c1",
        name: "New",
        description: "New Description",
        num_employees: null,
        logo_url: null,
      },
    ]);
  });

  test("not found if no such company", async () => {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async () => {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/** ************************************ remove */

describe("remove", () => {
  test("works", async () => {
    await Company.remove("c1");
    const res = await db.query(
      "SELECT handle FROM companies WHERE handle='c1'"
    );
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async () => {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/** ************************************ _sqlForPartialFilter */

describe("sqlForPartialFilter", () => {
  test("works with valid data", () => {
    const filterBy = { minEmployees: 3, name: "searchBy" };

    const { whereClauses, values } = Company._sqlForPartialFilter(filterBy);

    expect(whereClauses).toEqual("WHERE num_employees >= $1 AND name ILIKE $2");
    expect(values).toEqual([3, "%searchBy%"]);

    const filterBy2 = { minEmployees: 1, maxEmployees: 5, name: "searchTerm" };

    const result = Company._sqlForPartialFilter(filterBy2);
    const whereClauses2 = result.whereClauses;
    const values2 = result.values;

    expect(whereClauses2).toEqual(
      "WHERE num_employees >= $1 AND num_employees <= $2 AND name ILIKE $3"
    );
    expect(values2).toEqual([1, 5, "%searchTerm%"]);
  });

  test("works even if filterBy is an empty object", () => {
    const filterBy = {};

    const { whereClauses, values } = Company._sqlForPartialFilter(filterBy);

    expect(whereClauses).toEqual("");
    expect(values).toEqual([]);
  });

  test("fails: minEmployees must be smaller than maxEmployees", () => {
    const filter = {
      minEmployees: 2,
      maxEmployees: 1,
    };

    try {
      const { whereClauses, values } = Company._sqlForPartialFilter(filter);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});