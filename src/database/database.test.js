const { DB } = require('./database');
const {Role} = require("../model/model");

const defaultAdmin = { name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] };

test("addMenuItem", async () => {
    const testItem =  await DB.addMenuItem({title: "test", description: "test", image: "test", price: 5.99})
    expect(testItem.id).not.toBeUndefined()
});

test("addDinerOrder", async () => {
    const user = await DB.addUser(defaultAdmin);
    const addedOrder = await DB.addDinerOrder(user, {
        franchiseId: 1,
        storeId: 1,
        items: [{
            menuId: 1,
            description: "Veggie",
            price: 0.05
        }]
    })
    expect(addedOrder).not.toBeUndefined()
})

test("getOrders", async () => {
    const user = await DB.addUser(defaultAdmin);
    const orders = await DB.getOrders(user)
    expect(orders).not.toBeUndefined()
});