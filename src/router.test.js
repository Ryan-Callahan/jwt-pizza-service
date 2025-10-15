const request = require('supertest');
const app = require('./service');

const testUserName = "testname";
const testUserEmail = "testemail";
const testUserPassword = "testpassword";

let authToken;
let currentUser;

beforeAll(async () => {
    const res = await registerNewUser(testUserName, testUserEmail, testUserPassword);
    currentUser = res.user;
    authToken = res.token;
});

// service tests
test("get / should return welcome message and version", async () => {
    const res = await request(app).get('/');
    expect(res.body.message).toBe("welcome to JWT Pizza");
});

// authRouter tests
test("register new user, log out, login, then log out", async () => {
    const name = "tn1"
    const email = "te1"
    const password = "tp1"
    let res = await registerNewUser(name, email, password);
    await logout(res.token);
    res = await loginUser(email, password);
    await logout(res.token);
});

// userRouter tests
test("get /api/user/me should return the current user", async () => {
    const res = await request(app).get('/api/user/me').set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200)
    const user = res.body;
    expect(user.name).toBe(testUserName)
    expect(user.email).toBe(testUserEmail)
});

test("updating a user should work", async () => {
    let res = await request(app).put(`/api/user/${currentUser.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
            name: "changed",
            email: "newemail",
            password: "newpassword"
        });
    expect(res.status).toBe(200);
});

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const [user, userToken] = await registerUser(request(app));
  let listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);

  // should work with query params
  listUsersRes = await request(app)
    .get(`/api/user?page=0&limit=20&name=${user.name}`)
    .set('Authorization', `Bearer ${userToken}`);
  expect(listUsersRes.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

// franchiseRouter tests
test("get franchises should work", async () => {
    const res = await request(app).get('/api/franchise/');
    expect(res.status).toBe(200);
});

test("getting a users franchise should work", async () => {
    const res = await request(app).get(`/api/franchise/${currentUser.id}`).set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
});

test("non-admin should not be able to create franchise", async () => {
    const res = await request(app).post("/api/franchise/").set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(403);
});

// orderRouter tests

test("get menu test", async () =>{
    const res = await request(app).get("/api/order/menu");
    expect(res.status).toBe(200);
})

afterAll(async () => {
    await logout(authToken)
});

async function registerNewUser(name, email, password) {
    const registerRes = await request(app).post('/api/auth').send({
        name: name,
        email: email,
        password: password
    });

    expect(registerRes.status).toBe(200);
    return registerRes.body;
}

async function loginUser(email, password) {
    const loginRes = await request(app).put('/api/auth').send({
        email: email,
        password: password
    });

    expect(loginRes.status).toBe(200);
    return loginRes.body;
}

async function logout(auth) {
    const logoutRes = await request(app).delete('/api/auth').set("Authorization", `Bearer: ${auth}`)

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("logout successful")
}