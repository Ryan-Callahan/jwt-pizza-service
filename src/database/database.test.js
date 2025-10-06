const { DB } = require("./database")

test("add user", async () => {
    DB.addUser({name: "test-user", password: "test-password", email: "test-email", roles: []})
    const actualUser = await DB.getUser("test-email", "test-password")
    expect(actualUser.name).toEqual("test-user")
})
