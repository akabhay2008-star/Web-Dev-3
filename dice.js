// dice.js
// random dice generator using crypto module
// run: node dice.js
// or: node dice.js 5   (to roll 5 times)

const crypto = require("crypto");
const fs = require("fs");

let rolls = Number(process.argv[2]) || 1;

for (let i = 0; i < rolls; i++) {
  // gives a random number between 1 and 6
  let diceValue = crypto.randomInt(1, 7);
  console.log("Dice Rolled: " + diceValue);

  // bonus: saving the roll to a history file
  fs.appendFileSync("dice-history.txt", "Dice Rolled: " + diceValue + "\n");
}
