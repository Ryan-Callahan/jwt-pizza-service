const request = require('supertest');
const app = require('./service');
const { DB } = require('./database/database');

DB.getUser.mockResolvedValue({ id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] });
DB.isLoggedIn.mockResolvedValue(true);

// franchiseRouter tests

test("admin should be able to create and delete a franchise", async () => {
    const loginRes = await request(app).put("/api/auth/").send({ email: "testadmin", password: "admin" });
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

    DB.getFranchise.mockResolvedValueOnce({
        id: "1",
        name: "testfranchise",
        admins: [{ id: 1, name: '常用名字', email: 'a@jwt.com' }]
    });
    const createStoreRes = await request(app).post(`/api/franchise/${franchise.body.id}/store`)
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .send({ franchiseId: franchise.body.id, name: "test-store" })
    expect(createStoreRes.status).toBe(200);

    DB.getFranchise.mockResolvedValueOnce({
        id: "1",
        name: "testfranchise",
        admins: [{ id: 1, name: '常用名字', email: 'a@jwt.com' }]
    });
    const deleteStoreRes = await request(app)
        .delete(`/api/franchise/${franchise.body.id}/store/${createStoreRes.body.id}`)
        .set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(deleteStoreRes.status).toBe(200);

    await deleteFranchise(franchise.body.id, loginRes.body.token);
});

// orderRouter tests

test("add an item to the menu", async () => {
    const loginRes = await request(app).put("/api/auth/").send({ email: "a@jwt.com", password: "admin" });
    expect(loginRes.status).toBe(200);

    const orderRes = await request(app).put("/api/order/menu")
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .send({ title:"Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 });

    expect(orderRes.status).toBe(200);
});

test("Get the orders for the authenticated user", async () => {
    const loginRes = await request(app).put("/api/auth/").send({ email: "a@jwt.com", password: "admin" });
    expect(loginRes.status).toBe(200);

    const orderRes = await request(app).get("/api/order/").set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(orderRes.status).toBe(200);
});

test("Create a order for the authenticated user", async () => {
    const loginRes = await request(app).put("/api/auth/").send({ email: "a@jwt.com", password: "admin" });
    expect(loginRes.status).toBe(200);

    const mockOrder = {
        franchiseId: 1,
        storeId:1,
        items:[{ menuId: 1, description: "Veggie", price: 0.05 }]
    }
    DB.addDinerOrder.mockResolvedValue(mockOrder)
    const orderRes = await request(app).post("/api/order/")
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .send(mockOrder);
    expect(orderRes.status).toBe(200);
});

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

jest.mock('./database/database', () => ({
    DB: {
        getMenu: jest.fn(),
        addMenuItem: jest.fn(),
        addUser: jest.fn(),
        getUser: jest.fn(),
        updateUser: jest.fn(),
        loginUser: jest.fn(),
        isLoggedIn: jest.fn(),
        logoutUser: jest.fn(),
        getOrders: jest.fn(),
        addDinerOrder: jest.fn(),
        createFranchise: jest.fn(),
        deleteFranchise: jest.fn(),
        getFranchises: jest.fn(),
        getUserFranchises: jest.fn(),
        getFranchise: jest.fn(),
        createStore: jest.fn(),
        deleteStore: jest.fn(),
    },
    Role: {
        Admin: "admin",
        Franchisee: "franchisee"
    }
}));