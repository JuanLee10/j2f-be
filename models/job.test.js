const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
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
  const newJob = {
    title: "new",
    salary: 500,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("works", async () => {
    const job = await Job.create(newJob);
    expect(job).toEqual({
      title: "new",
      salary: 500,
      equity: "0.5",
      companyHandle: "c1",
      id: expect.any(Number),
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'new'`
    );
    expect(result.rows).toEqual([
      {
        title: "new",
        salary: 500,
        equity: "0.5",
        companyHandle: "c1",
      },
    ]);
  });

  test("bad request if company handle doesn't exist", async () => {
    const newJobBadData = {
      title: "new",
      salary: 500,
      equity: 0.5,
      companyHandle: "notExist",
    };

    try {
      await Job.create(newJobBadData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/** ************************************ findAll */

describe("findAll", () => {
  test("works: no filter", async () => {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 100,
        equity: "0.1",
        companyHandle: "c1",
        "companyName": "C1",
        
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
        companyHandle: "c2",
        "companyName": "C2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);
  });

  test("works: filter", async () => {
    const filter = {
      title: "3",
    };
    let jobs = await Job.findAll(filter);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);

    const filter2 = {
      minSalary: 200,
    };
    jobs = await Job.findAll(filter2);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
        companyHandle: "c2",
        "companyName": "C2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);

    const filter3 = {
      hasEquity: false,
    };
    jobs = await Job.findAll(filter3);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 100,
        equity: "0.1",
        companyHandle: "c1",
        "companyName": "C1",
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
        companyHandle: "c2",
        "companyName": "C2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);

    // More complicated filtering
    const filter4 = {
      minSalary: 200,
      hasEquity: true,
    };
    jobs = await Job.findAll(filter4);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
        companyHandle: "c2",
        "companyName": "C2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);

    const filter5 = {
      title: "2",
      minSalary: 200,
      hasEquity: true,
    };
    jobs = await Job.findAll(filter5);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
        companyHandle: "c2",
        "companyName": "C2",
      },
    ]);
  });
});

/** ************************************ get */

describe("get", () => {
  test("works", async () => {
    const newJob = {
      title: "new",
      salary: 500,
      equity: 0.5,
      companyHandle: "c1",
    };

    const jobCreated = await Job.create(newJob);
    const { id } = jobCreated;

    const job = await Job.get(id);
    expect(job).toEqual({
      id,
      title: "new",
      salary: 500,
      equity: "0.5",
      company: {
      description: "Desc1",
      handle: "c1",
      logoUrl: "http://c1.img",
      name: "C1",
      numEmployees: 1,
    },
    });
  });

  test("not found if no such job", async () => {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
/** ************************************ findAllByCompanyHandle */

describe("findAllByCompanyHandle", () => {
  test("works", async () => {
    const jobs = await Job.findAllByCompanyHandle("c1");
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 100,
        equity: "0.1",
      },
    ]);

    const jobs2 = await Job.findAllByCompanyHandle("c2");
    expect(jobs2).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0.3",
      },
    ]);

    const jobs3 = await Job.findAllByCompanyHandle("c3");
    expect(jobs3).toEqual([]);
  });

  test("not found if no such job", async () => {
    try {
      await Job.findAllByCompanyHandle("Invalid Company Handle");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

// /************************************** update */

describe("update", () => {
  let updateData;
  let id;

  beforeEach(async () => {
    const newJob = {
      title: "newCreated",
      salary: 500,
      equity: 0.5,
      companyHandle: "c1",
    };

    updateData = {
      title: "newUpdate",
    };

    const jobCreated = await Job.create(newJob);
    id = jobCreated.id;
  });

  test("works", async () => {
    const job = await Job.update(id, updateData);
    expect(job).toEqual({
      id,
      title: "newUpdate",
      salary: 500,
      equity: "0.5",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${id}`
    );
    expect(result.rows).toEqual([
      {
        id,
        title: "newUpdate",
        salary: 500,
        equity: "0.5",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: null fields", async () => {
    const updateDataSetNulls = {
      title: "newUpdate",
      salary: null,
      equity: null,
    };

    const job = await Job.update(id, updateDataSetNulls);
    expect(job).toEqual({
      id,
      title: "newUpdate",
      salary: null,
      equity: null,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
          FROM jobs
          WHERE id = ${id}`
    );
    expect(result.rows).toEqual([
      {
        id,
        title: "newUpdate",
        salary: null,
        equity: null,
        companyHandle: "c1",
      },
    ]);
  });

  test("not found if no such job", async () => {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async () => {
    try {
      await Job.update(id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

// /************************************** remove */

describe("remove", () => {
  test("works", async () => {
    const newJob = {
      title: "newCreated",
      salary: 500,
      equity: 0.5,
      companyHandle: "c1",
    };

    const jobCreated = await Job.create(newJob);
    const { id } = jobCreated;

    await Job.remove(id);
    const res = await db.query(`SELECT id FROM jobs WHERE id=${id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async () => {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
