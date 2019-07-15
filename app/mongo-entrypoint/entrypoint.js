var db = connect("mongodb://localhost/admin");

db.createUser(
    {
        user: "selavy",
        pwd: "selavy",
        roles: [ { role: "userAdminAnyDatabase", db: "selavy" } ]
    }
)