const request = require('supertest');
const app = require('./service');

const testUserName = "testname";
const testUserEmail = "testemail";
const testUserPassword = "testpassword";

test("get / should return welcome message and version", async () => {
    const res = await request(app).get('/');
    expect(res.body.message).toBe("welcome to JWT Pizza");
});

test("get /api/user/me should return the current user", async () => {
    const auth = await login();
    const res = await request(app).get('/api/user/me').set("Authorization", `Bearer ${auth}`);
    expect(res.status).toBe(200)
    const user = res.body;
    expect(user.name).toBe(testUserName)
    expect(user.email).toBe(testUserEmail)
})

test("login", login);

async function login() {
    const loginRes = await request(app).post('/api/auth').send({
        name: testUserName,
        email: testUserEmail,
        password: testUserPassword
    });

    expect(loginRes.status).toBe(200);
    return loginRes.body.token;
}