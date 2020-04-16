// :NOTE: strict mode is switched off :(
"use strict";

const Expression = {
    evaluate : function(x, y, z) {
        const mArgs = this.args.map(i => i.evaluate(x, y, z));
        return this.f(mArgs);
    },
    toString : function () {
        let str = this.args.join(' ');
        if (this.args.length > 1) { str += ' ' + this.oper }
        return str;
    },
    diff : function(d) {
        // just declaration
    }
}

function Const(...args) {
    if (args.length !== 1) {
        throw new Error('In declaration of Const must be 1 argument');
    }
    const t = Object.create(Expression);
    t.args = args;
    t.evaluate = () => t.args[0];
    t.toString = () => args[0].toString();
    t.diff = (d) => new Const(0);
    return t;
}

const vars = ['x', 'y', 'z'];

function Variable(...args) {
    if (args.length !== 1) {
        throw new Error('In declaration of Variable must be 1 argument');
    }
    const t = Object.create(Expression);
    t.args = args;
    t.evaluate = (x, y, z) => {
        const mapa = new Map([
            [vars[0], x],
            [vars[1], y],
            [vars[2], z]
        ]);
        return mapa.get(t.args[0]);
    }
    t.toString = () => t.args[0];
    t.diff = (d) => new Const((d === t.args[0]) * 1);
    return t;
}

// :NOTE: this function doesn't assign prototype to object -> all functions are copied to each instance

let pi = new Const(Math.PI);
let e = new Const(Math.E);

function Operator(args, f, oper) {
    const t = Object.create(Expression);
    // console.log('ARGS = ', args);
    // console.log('len = ', args[0].length);
    if (args.length === 1 && args[0].length === undefined) {
        // return args[0];
    }
    t.args = args;
    t.f = f;
    t.oper = oper;
    return t;
}

function Log(...args) {
    if (args.length !== 2) {
        throw new Error('Invalid arguments for Log');
    }
    // console.log('args of Log = ', args);
    const getLog = function(args) {
        let x = args[0], y = args[1];
        x = Math.abs(x);
        y = Math.abs(y);
        return Math.log(y) / Math.log(x);
    }
    const t = Object.create(Operator(args, getLog, 'log'));
    // console.log('args of Log = ', args);
    // :NOTE: why `diff` function is defined separately
    // fixed, now dif is defined in Expression
    t.diff = function (d) {
        let right = args[1];
        let left = args[0];
        let rightLog = new Log(e, right);
        let leftLog = new Log(e, left);
        return new Divide(new Subtract(
            new Divide(new Multiply(leftLog, right.diff(d)), right),
            new Divide(new Multiply(rightLog, left.diff(d)), left)),
            new Multiply(leftLog, leftLog));
    }
    return t;
}

let l = new Log(new Const(2), new Variable('x'));
// console.log(l.evaluate(9, 0, 0));

function Power(...args) {
    if (args.length !== 2) {
        throw new Error('In declaration of Power must be 2 arguments');
    }
    const t = Object.create(Operator(args, args => Math.pow(args[0], args[1]), 'pow'));
    t.diff = function (d) {
        let left = args[0];
        let right = args[1];
        return new Multiply(
            new Power(left, new Subtract(right, new Const(1))),
            new Add(new Multiply(right, left.diff(d)),
                new Multiply(left, new Multiply(new Log(e, left), right.diff(d))))
        );
    }
    return t;
}

// console.log((new Power(new Const(-2), new Variable('x')).evaluate(1)));

const makeFunc = function (f) {
    return (args) => {
        let s = args[0];
        for (let i = 1; i < args.length; i++) {
            s = f(s, args[i]);
        }
        return s;
    }
};

function Add(...args) {
    const t = Object.create(Operator(args, makeFunc((a, b) => a + b), '+'));
    // console.log('t = ', t);
    t.diff = function(d) {
        const a = args.map(i => i.diff(d));
        return new Add(...a);
    }
    return t;
}

function Subtract(...args) {
    const t = Object.create(Operator(args, makeFunc((a, b) => a - b), '-'));
    t.diff = function(d) {
        const a = args.map(i => i.diff(d));
        return new Subtract(...a);
    }
    return t;
}

function Multiply(...args) {
    const t = Object.create(Operator(args, makeFunc((a, b) => a * b), '*'));
    t.diff = function (d) {
        let arr = [];
        for (let i = 0; i < t.args.length; i++) {
            let element = [...t.args];
            element[i] = element[i].diff(d);
            arr.push(new Multiply(...element));
        }
        return new Add(...arr);
    }
    return t;
}

let alpha = new Multiply(new Variable('x'));
// console.log(alpha.diff('x'));
let oneArg = new Divide(new Variable('x'), new Const(2));
// console.log(oneArg.diff('x').toString());

function Divide(...args) {
    const t = Object.create(Operator(args, makeFunc((a, b) => a / b), '/'))
    t.diff = function (d) {
        let right = t.args.slice(1);
        let left = t.args[0];
        // console.log('>>> left = ', left, 'right = ', right);
        return new Divide(
            new Subtract(
                new Multiply(left.diff(d), ...right),
                new Multiply(left, new Multiply(...right).diff(d))
            ),
            new Multiply(...right, ...right)
        )
    }
    return t;
}

function Negate(...args) {
    if (args.length !== 1) {
        throw new Error('In declaration of Negate must be 1 argument');

    }
    const t = Object.create(new Subtract(new Const(0), ...args));
    t.toString = function () {
        return args[0].toString() + " negate";
    }
    return t;
}

// console.log((new Negate(new Variable('x'))).diff('x').toString());
let s = new Subtract(new Const(0), new Variable('x'));
// console.log(s.diff('x').toString());

const binOperators = {
    "+": Add,
    "-": Subtract,
    "*": Multiply,
    "/": Divide,
    "pow" : Power,
    "log" : Log
};

const unOperators = {
    "negate": Negate
};

const constants = {
    "pi": pi,
    "e": e
};

const parse = function (input) {
    let tokens = input.split(' ');
    let stack = [];
    for (const i of tokens) {
        if (i === '') {
            // do nothing
        } else if (constants[i] !== undefined) {
            stack.push(new constants[i]);
        } else if (unOperators[i] !== undefined) {
            stack[stack.length - 1] = new unOperators[i](stack[stack.length - 1]);
        } else if (binOperators[i] === undefined) {
            if (isNaN(parseInt(i))) {
                stack.push(new Variable(i));
            } else {
                stack.push(new Const(parseInt(i)));
            }
        } else if (stack.length === 1) {
            if (i === "-") {
                stack[0] = new Negate(stack[0]);
            }
            stack.pop();
        } else {
            let a = stack[stack.length - 2];
            let b = stack[stack.length - 1];
            stack.pop();
            stack[stack.length - 1] = new binOperators[i](a, b);
        }
    }
    return stack[0];
};

