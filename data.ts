// jshint esversion: 6
mysql = require("mysql2/promise");
readline = require('readline');
inquirer = require("inquirer");

// make the connection
// it will probably finish by the time the user makes a choice
var connection = mysql.createConnection({
    host: "localhost",
  
    // Your port; if not 3306
    port: 8889,
  
    // Your username
    user: "root",
  
    // Your password
    password: "root",
    database: "bamazon",
  
    socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock"
});
connection.then(conn => {connection = conn; mainMenu();});

// function getAllItems (connection) {
//     await connection.query("select * from products"), (err, results) => {
//         if (err) {console.log(err); return;}
//         console.log("hi");
//         // console.log(connection);
//         console.log(results);
//         // process.exit();
//     };
// }
async function keypress() {
    process.stdin.setRawMode(true);
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
    }));
}

// qbasic style (kinda)
function print() {
    console.log([...arguments].join(' '));
}

// function which prompts the user for what action they should take
async function mainMenu () {
    console.log("started");
    print ("Welcome to Bamazon!");
    print ("We have many products available, from shoes, clothes, and hats to private islands and floating cities.")
    print ("Please select from the avaiable options below.");

    var answer = await inquirer.prompt([{
        name: "selection",
        type: "list",
        message: "",
        choices: [
            {name: "browse categories", value: "categories"},
            {name: "admin mode", value: "admin"},
            {name: "exit", value: "exit"}]  
    }]);
    if (answer.selection == "categories") await categories();
    print ("more");
    if (answer.selection == "admin") await admin();
    if (answer.selection == "exit") process.exit();
    
}

async function admin () {
    while (true) {
        var answer = await inquirer.prompt([{
            name: "selection",
            type: "list",
            message: "",
            choices: [
                {name: "add product", value: "add"},
                {name: "discontinue product", value: "remove"},
                {name: "restock procuct", value: "restock"},
                {name: "log out admin", value: "logout"}]    
        }]);
        print (answer.selection);
        if (answer.selection == "add") print ("add is not yet implemented.");
        if (answer.selection == "remove") print ("remove is not yet implemented.");
        if (answer.selection == "restock") print ("restock is not yet implemented.");
        if (answer.selection == "logout") break;    
    }
}

async function categories () {
    // get all departments from database
    print("categories");
    connection.query("select * from products", async (err, results) => {
        var categories = {};
        results.forEach(element => {
            // print (element.product_name);
            // build a list of items in this category
            if (!categories[element.department_name]){
                categories[element.department_name] = [element.product_name];
            }
            else {
                categories[element.department_name].push(element.product_name);
            }
        });
        // view all categories
        var answer = await inquirer.prompt([{
            type: "list",
            message: "available categories",
            name: "selection",
            choices: Object.keys(categories)
        }]);
        print ("next");
        categories[answer.selection].forEach((item) => {
            print(item.product_name);
        });
        // see the items in this category
        answer = await inquirer.prompt([{
            type: "list",
            message: "available items",
            name: "selection",
            choices: categories[answer.selection]
        }]);
        // got a selection, now view it
        viewItem(answer.selection);
        // if (err) {console.log(err); return;}
        // console.log("hi");
        // // console.log(connection);
        // console.log(results);
        // // process.exit();
        // // back to the main menu
        mainMenu();
    });
}

async function viewItem(item){
    connection.query("select * from products where product_name=" + '"' + item + '"')
        .then((err, results) =>{
            Object.keys(results).forEach((key) => {
                print (key, results[key]);
            });
        });
    await keypress();
}
