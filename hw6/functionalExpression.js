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

//:NOTE: Operations of any arity are required
const tripleOperation = function (f) {
    return (...args) => {
        return (x, y = 0, z = 0) => {
            let s = args[0](x, y, z);
            for (let i = 1; i < args.length; i++) {
                s = f(s, args[i](x, y, z));
            }
            return s;
        }
    }
};

const tripleUnOperation = function (f) {
    return a => (x, y = 0, z = 0) => f(a(x, y, z));
};

const cnst = value => x => value;

const evaluate = args => (x, y, z) => {
    let a = [];
    for (let i = 0; i < args.length; i++) {
        a.push(args[i](x, y, z));
    }
    return a;
};


const sin = tripleUnOperation(val => Math.sin(val));
const cos = tripleUnOperation(val => Math.cos(val));
const negate = tripleUnOperation(val => -val);
const subtract = tripleOperation((a, b) => a - b);
const add = tripleOperation((a, b) => a + b);
const multiply = tripleOperation((a, b) => a * b);
const divide = tripleOperation((a, b) => a / b);
const e = cnst(Math.E);
const pi = cnst(Math.PI);

const topFromStack = function (stack, k) {
    let args = [];
    while (k-- > 0) {
        args.push(stack[stack.length - 1]);
        stack.pop();
    }
    return args;
};

const triplePolyOperator = function(f) {
    return (...args) => {
        if (args.length === 1) {
            args = args[0];
        }
        return (x, y = 0, z = 0) => f(evaluate(args)(x, y, z));
    }
};

const avg5 = triplePolyOperator(args => {
    let a = 0;
    for (let x = 0; x < args.length; x++) {
        a += args[x];
    }
    return a / 5;
});

const med3 = triplePolyOperator(args => {
    args.sort((a, b) => a - b);
    return args[1];
});

const argsOperators = new Map([
    ["avg5", avg5],
    ["med3", med3]
]);

const binOperators = new Map([
    ["+", add],
    ["-", subtract],
    ["*", multiply],
    ["/", divide]
]);

const unOperators = new Map([
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
        } else if (unOperators.get(i) !== undefined) {
            stack[stack.length - 1] = unOperators.get(i)(stack[stack.length - 1]);
        } else if (argsOperators.get(i) !== undefined) {
            stack.push(argsOperators.get(i)(topFromStack(stack, parseInt(i[i.length - 1]))));
        } else if (binOperators.get(i) === undefined) {
            if (isNaN(parseInt(i))) {
                stack.push(variable(i));
            } else {
                stack.push(cnst(parseInt(i)));
            }
        } else if (stack.length === 1) {
            if (i === "-") {
                stack[0] = negate(stack[0]);
            }
            stack.pop();
        } else {
            let a = stack[stack.length - 2];
            let b = stack[stack.length - 1];
            stack.pop();
            stack[stack.length - 1] = binOperators.get(i)(a, b);
        }
    }
    return stack[0];
};

for (let i = 1; i <= 10; i++) {
    console.log(parse("x x * 2 x * - 1 +")(i));
}