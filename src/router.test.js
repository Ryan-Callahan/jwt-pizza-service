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

test("admin should be able to create and delete a franchise", async () => {
   const loginRes = await request(app).put("/api/auth/").send({ email: "a@jwt.com", password: "admin" });
   expect(loginRes.status).toBe(200);

   const franchise = await createFranchise({
       name: "testfranchise",
       admins: [{email: loginRes.body.user.email}]
   }, loginRes.body.token);

   await deleteFranchise(franchise.body.id, loginRes.body.token);
});

test("admin should be able to create and delete a franchise store", async () => {
    const loginRes = await request(app).put("/api/auth/").send({ email: "a@jwt.com", password: "admin" });
    expect(loginRes.status).toBe(200);

    const franchise = await createFranchise({
        name: "testfranchise",
        admins: [{email: loginRes.body.user.email}]
    }, loginRes.body.token);

    const createStoreRes = await request(app).post(`/api/franchise/${franchise.body.id}/store`)
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .send({ franchiseId: franchise.body.id, name: "test-store" })
    expect(createStoreRes.status).toBe(200);

    const deleteStoreRes = await request(app)
        .delete(`/api/franchise/${franchise.body.id}/store/${createStoreRes.body.id}`)
        .set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(deleteStoreRes.status).toBe(200);

    await deleteFranchise(franchise.body.id, loginRes.body.token);
})

// orderRouter tests


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

async function createFranchise(franchise, auth) {
    const createFranchiseRes = await request(app).post("/api/franchise/")
        .set("Authorization", `Bearer ${auth}`)
        .send(franchise);
    expect(createFranchiseRes.status).toBe(200);
    return createFranchiseRes;
}

async function deleteFranchise(franchiseId, auth) {
    const deleteFranchiseRes = await request(app)
        .delete(`/api/franchise/${franchiseId}`)
        .set("Authorization", `Bearer ${auth}`);
    expect(deleteFranchiseRes.status).toBe(200);

}
