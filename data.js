// jshint esversion: 6
mysql = require("mysql2/promise");
readline = require('readline');
inquirer = require("inquirer");
chalk = require("chalk");
pressAnyKey = require('press-any-key');

var _hr_ = "===================================";

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

class Order {
    constructor (name, quantity, price) {
        this.name = name;
        this.quantity = quantity;
        this.price = price;
    }
}
var cart = {};

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
    print ();
    print ("Welcome to Bamazon!");
    print ("We have many products available, from shoes, clothes, and hats to private islands and floating cities.");
    print ("Please select from the avaiable options below.");

    var answer = await inquirer.prompt([{
        name: "selection",
        type: "list",
        message: "",
        choices: [
            {name: "browse items", value: "categories"},
            {name: "view cart and checkout", value: "cart"},
            {name: "admin mode", value: "admin"},
            {name: "exit", value: "exit"}]
    }]);

    if (answer.selection == "categories") categories();
    if (answer.selection == "cart") checkout();
    if (answer.selection == "admin") admin();
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
    mainMenu();
}

async function categories () {
    // get all departments from database
    print("categories");
    connection.query("select * from products", async (err, results) => {
        var categories = {};
        results.forEach(element => {
            // get all category names
            if (!categories[element.department_name]){
                // haven't seen this category before - add first item to it
                categories[element.department_name] = [element.product_name];
            }
            else {
                // build a list of items in this category
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
    });
}

async function viewItem(item){
    print ('viewing item');
    var query = "select * from products where product_name=" + '"' + item + '"';
    connection.query(query, async (err, results) =>{
        if (err) {print (err); return;}
        // display each column name and value for this item
        item = results[0];
        // initialize cart quantity for this item
        if (!cart[item.product_name]) {
            product_available = item.product_quantity;
        }
        else {
            product_available = item.product_quantity - cart[item.product_name].quantity;
        }
        // calculate remaining items (including those in your cart)
        // basic version -->
        // Object.keys(results).forEach((key) => {
        //     print (key, results[key]);
        // });
        // more attractive version -->
        print (_hr_);
        print (chalk.blue.bgWhite("Product name: ".padEnd(32)) + chalk.red.bgWhite(item.product_name.padEnd(16)));
        print (chalk.blue.bgWhite("Department: ".padEnd(32)) + chalk.red.bgWhite(item.department_name.padEnd(16)));
        print (chalk.blue.bgWhite("Price: ".padEnd(32)) + chalk.red.bgWhite(formatPrice(item.price).padEnd(16)));
        print (chalk.blue.bgWhite("Quantity available: ".padEnd(32)) + chalk.red.bgWhite(product_available.toString().padEnd(16)));
        print ();
        print (chalk.red.bgWhite(item.description));
        print (_hr_);
        print ();
        print (chalk.blue.bgWhite("Add to cart?"));
        var answer = await inquirer.prompt ({
            name: 'selection',
            type: "list",
            choices: ["buy", "cancel"]
        })
        if (answer.selection == "buy") {
            // get valid quantity
            var ordered = false;
            while (!ordered) {
                var order_quantity = await inquirer.prompt({
                    message: "How many? (max "+ product_available + ")",
                    name: "number",
                    type: "input"
                })
                order_quantity = order_quantity.number
                if (order_quantity == 0) {
                    // cancel
                    print (chalk.white.bgRed("Order cancelled."));
                    ordered = true;
                }
                else if (order_quantity <= item.product_quantity) {
                    // valid order.
                    cart[item.product_name] = new Order(item.product_name, parseInt(order_quantity), parseFloat(item.price));
                    print (chalk.white.bgRed(order_quantity + " " + plural(item.product_name) + " added to cart."));
                    ordered = true;
                }
                else {
                    print ("Sorry, we cannot fulfill such a large order.");
                    print ("Please enter a lesser quantity.");
                    print ();
                }
            }
        }
        else {
            print (chalk.white.bgRed("Order cancelled."));
        }
        // go back to the main menu
        pressAnyKey().then(mainMenu);
    });
}

async function checkout() {
    // list items
    print (chalk.red.bgWhite("Your shopping cart --->"))
    print (_hr_);
    print ();
    print ("  " + chalk.red.bgWhite("Item") + "                           :  " + chalk.red.bgWhite("Quantity") + "  :  " + chalk.red.bgWhite("$ Each") + "       :  " + chalk.red.bgWhite("$ Total"));
    Object.keys(cart).forEach((item) => {
        print();
        print (item.padEnd(32), ":  " + cart[item].quantity.toString().padEnd(10) + ": " + formatPrice(cart[item].price).padEnd(14) + ":  " + formatPrice(cart[item].price * cart[item].quantity));
    })
    print ();
    var subtotal = Object.keys(cart).reduce((sum, item) => {return parseFloat(cart[item].price) * parseFloat(cart[item].quantity) + sum}, 0);
    print ("Subtotal:                                         " + formatPrice(subtotal));
    print ();
    print ("Tax: 7%");
    print ("Shipping: FREE!");
    print (_hr_);
    var total = subtotal * 1.07;
    print ("Total: " + formatPrice(total));
    print ();
    var next = await inquirer.prompt({
        message: "",
        type: "list",
        choices: [
            {name: "place order", value: "order"}, 
            {name: "edit items", value: "edit"},
            {name: "back to shopping", value: "back"}],
        name: "choice"
    })
    if (next.choice == "back") {
        mainMenu();
        return;
    }
    else if (next.choice == "edit") {
        // remove items
    }
    else if (next.choice == "order") {
        print ("How will you be paying today?");
        print ("We accept Visa, Mastercard, Paypal, Bitcoin, Ethereum, envelopes of cash, and made-up random numbers.");
        print ();
        await inquirer.prompt ({
            type: "input",
            message: "Please enter your payment details: ",
            name: "whatever"
        });
        print ("Sounds good!");
        print ();
        // obtain address.
        var address = ""
        while (address == "") {
            address = await inquirer.prompt({
                type: "input",
                message: "Please enter your shipping address.",
                name: "address"
            })
            address = address.address;
            var yn = await inquirer.prompt({
                type: "list",
                message: "You entered: " + address + ".  Is this correct?",
                choices: ["yes", "no"],
                name: "answer"
            })
            yn = yn.answer;
            if (yn == "n") {
                address = "";
                print ("Try again.");
            }
        }
        // got address, on to update the database
        Object.keys(cart).forEach((item) => {
            print ("Processing: " + cart[item].name);
            connection.query(
                "select product_quantity from products where product_name=?",
                [cart[item].name], (err, result) => {
                    if (err) console.log("error:", err)
                    else {
                        connection.execute(
                            "update products set product_quantity=? where product_name=?",
                            [result.product_quantity - cart[item].quantity, cart[item].product_name]
                        );
                        print ("Processed order: " + cart[item].name + ".")
                    }
                }
            )
        })
        print ();
        // finished!
        print ("Thank you, your order will be processed immediately.  Expect delivery in 1-3 days.");
        print ("Your tracking number is " + randomHexNumber(8));
        print ();
        pressAnyKey("Press any key to continue").then(mainMenu);
        return;
    }
}

function inCart (itemName) {
    // how many of this item are in the cart already?
    var number = 0;
    cart.forEach((item) => {
        if (item.name == itemName) number += item.quantity;
    });
}

function plural (item) {
    if (typeof(item) != "string") return "";
    var lastLetter = item[item.length - 1];
    if ("sxfhoz".includes(lastLetter)) {
        return item + "es";
    }
    return item + "s";
}

function formatPrice (dollars) {
    // format an arbitrary number into a dollar amount, with commas
    // it works, don't worry about how
    dollars = parseFloat(dollars);
    cents = (dollars - parseInt(dollars)).toString().slice(2, 4).padEnd(2, "0");
    dollars = parseInt(dollars).toString().split('');
    var commaSegs = [];
    for (i = dollars.length; i > 0; i -= 3) {
        commaSegs.push(dollars.splice(Math.max(0, i - 3), Math.min(i, 3)));
    }
    dollars = commaSegs.reduce((sum, value) => {return value.join('') + "," + sum}, "");
    dollars = "$" + dollars.slice(0, dollars.length - 1) + "." + cents;
    return dollars;
}

function randomHexNumber(length) {
    // get a random hexadecimal number of the specified length
    var returnVal = "";
    for (i = 0; i < length; i++) {
        returnVal += "1234567890abcdef"[Math.floor(Math.random() * 16)]
    }
    return returnVal;
}
