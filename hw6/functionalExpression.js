"use strict";

let vars = ['x', 'y', 'z'];

const variable = s => (x, y = 0, z = 0) => {
    if (s === vars[0]) {
        return x;
    } else if (s === vars[1]) {
        return y;
    } else {
        return z;
    }
};

const cnst = value => () => value;

const tripleOperator = function(f) {
    return (...args) => {
        return (x, y = 0, z = 0) => f(evaluate(args)(x, y, z));
    }
};

const makeFunc = function (f) {
    return (args) => {
        let s = args[0];
        (args.slice(1)).map(x => {s = f(s, x)})
        return s;
    }
};

const evaluate = args => (x, y, z) => {
    let a = [];
    for (let i = 0; i < args.length; i++) {
        a.push(args[i](x, y, z));
    }
    return a;
};

const sin = tripleOperator(val => Math.sin(val));
const cos = tripleOperator(val => Math.cos(val));
const negate = tripleOperator(val => -val);
const subtract = tripleOperator(makeFunc((a, b) => a - b));
const add = tripleOperator(makeFunc((a, b) => a + b));
const multiply = tripleOperator(makeFunc((a, b) => a * b));
const divide = tripleOperator(makeFunc((a, b) => a / b));

const e = cnst(Math.E);
const pi = cnst(Math.PI);

const topFromStack = function (stack, k) {
    let args = [];
    while (k-- > 0) {
        args.push(stack[stack.length - 1]);
        stack.pop();
    }
    return args.reverse();
};

const avg5 = tripleOperator(args => {
    let a = 0;
    for (let i = 0; i < args.length; i++) {
        a += args[i];
    }
    return a / 5;
});

const med3 = tripleOperator(args => {
    args.sort((a, b) => a - b);
    return args[1];
});

const arity = new Map([
    ["avg5", 5],
    ["med3", 3],
    ["+", 2],
    ["-", 2],
    ["*", 2],
    ["/", 2],
    ["negate", 1],
    ["sin", 1],
    ["cos", 1],
    ]
)

const operators = new Map([
    ["avg5", avg5],
    ["med3", med3],
    ["+", add],
    ["-", subtract],
    ["*", multiply],
    ["/", divide],
    ["negate", negate],
    ["sin", sin],
    ["cos", cos],
]);

const constants = new Map([
    ["pi", pi],
    ["e", e]
]);

const parse = function (input) {
    let tokens = input.split(' ');
    let stack = [];
    for (const i of tokens) {
        if (i === '') {
            // do nothing
        } else if (constants.get(i) !== undefined) {
            stack.push(constants.get(i));
        } else if (operators.get(i) !== undefined) {
            stack.push(operators.get(i)(...topFromStack(stack, arity.get(i))));
        } else if (vars.includes(i)) {
                stack.push(variable(i));
        } else {
            stack.push(cnst(parseInt(i)));
        }
    }
    return stack[0];
};


for (let i = 1; i <= 10; i++) {
    console.log(parse("x x * 2 x * - 1 +")(i));
}
