import {z} from "zod";
import {tool} from "@langchain/core/tools";
const hasher = {};
const calculate = tool(
    async function({operation , a, b}){        
        switch( operation ){
            case "add": {
                console.log("ADding")
                return a+b;}
            case "sub": return a-b;
            case "multiply": return a*b;
            case "divide": return a/b;
            default: return "unknown operation :"+operation
        }
    },
    //define tool description and schema
    {
        name: "calculator",
        description: "compute a and b based on operations",
        schema: z.object({
            operation: z.enum(["add","sub","multiply","divide"]),
            a: z.number().describe("first number"),
            b: z.number().describe("second number")
        })
    }
);

const findRandomValueOfThatNumber = tool(
    async function ({number}){
        if (number in hasher) {
            console.log(hasher);
    // Return the value using bracket notation
    return hasher[number];
  } else {
    // Return a message or null if the key doesn't exist
    return `Key '${number}' not found.`;
  }
},{
    name: "findNumberValue",
    description: "finds the value of the number from a hashmap",
    schema: z.object({
        number: z.number().describe("value to find in hashmap")
    })
});

(function (count){
 for (let i = 1; i <= count; i++) {
    // Generates a random number between 0 and 99
    const randomValue = Math.floor(Math.random() * 100);
    hasher[i] = randomValue;
  }
})(25);

export const tools = [calculate, findRandomValueOfThatNumber];
