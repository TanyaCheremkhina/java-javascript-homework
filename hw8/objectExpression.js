// :NOTE: strict mode is switched off :(
"use strict";
// fixed :)

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
    },
    prefix : function () {
        let str = '';
        let mArgs = this.args.map(i => i.prefix());
        if (this.args.length > 1) { str += '(' + this.oper + ' ' }
        str += mArgs.join(' ');
        if (this.args.length > 1) { str += ')'; }
        return str;
    },
    postfix : function () {
        let str = '';
        if (this.args.length > 1) { str += '('};
        let mArgs = this.args.map(i => i.postfix());
        str += mArgs.join(' ');
        if (this.args.length > 1) { str += ' ' + this.oper }
        if (this.args.length > 1) { str += ')'; }
        return str;
    },
    sign : 0
}

function Const(...args) {
    if (args.length !== 1) {
        throw new Error('In declaration of Const must be 1 argument');
    }
    const t = Object.create(Expression);
    t.args = args;
    t.evaluate = () => t.args[0];
    // t.toString = () => args[0].toString();
    t.diff = (d) => new Const(0);
    t.prefix = t.toString;
    t.postfix = t.toString;
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
    // t.toString = () => t.args[0];
    t.diff = (d) => new Const((d === t.args[0]) * 1);
    t.prefix = t.toString;
    t.postfix = t.toString;
    return t;
}

// :NOTE: this function doesn't assign prototype to object -> all functions are copied to each instance
// fixed, I hope

let pi = new Const(Math.PI);
let e = new Const(Math.E);

function Operator(args, f, oper) {
    if (args.length === 0 && polyOperators[oper] === undefined) {
        throw new Error("No arguments for operator " + oper);
    }
    const t = Object.create(Expression);
    t.args = args;
    t.f = f;
    t.oper = oper;
    return t;
}

function Log(...args) {
    if (args.length !== 2) {
        throw new Error('Invalid arguments for Log');
    }
    const getLog = function(args) {
        let x = args[0], y = args[1];
        x = Math.abs(x);
        y = Math.abs(y);
        return Math.log(y) / Math.log(x);
    }
    const t = Object.create(Operator(args, getLog, 'log'));
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

function Divide(...args) {
    const t = Object.create(Operator(args, makeFunc((a, b) => a / b), '/'))
    t.diff = function (d) {
        let right = t.args.slice(1);
        let left = t.args[0];
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
    const t = Object.create(new Multiply(new Const(-1), ...args));
    t.toString = function () {
        return args[0].toString() + " negate";
    }
    t.prefix = function () {
        return '(negate ' + args[0].prefix() + ')';
    }
    t.postfix = function () {
        return '(' + args[0].postfix() + ' negate)';
    }
    return t;
}

const binOperators = {
    "+": Add,
    "-": Subtract,
    "*": Multiply,
    "/": Divide,
    "pow": Power,
    "log": Log,
}
const polyOperators = {
    "sumexp" : Sumexp,
    "softmax" : Softmax
};
const unOperators = {
    "negate": Negate
};
const constants = {
    "pi": pi,
    "e": e
};
const allOperators = {...unOperators, ...binOperators, ...polyOperators};

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
        } else if (binOperators[i] !== undefined) {
            let a = stack[stack.length - 2];
            let b = stack[stack.length - 1];
            stack.pop();
            stack[stack.length - 1] = new binOperators[i](a, b);
        } else if (vars.includes(i)) {
            stack.push(new Variable(i));
        } else {
            stack.push(new Const(parseInt(i)));
        }
    }
    return stack[0];
};

// ---------------------- end of hw7
// In table I've got delay 0 for hw8, but it is first submit for hw8. I think there should be delay 1.

const sumexp = function (args) {
    let expArgs = 0;
    for (const i of args) {
        expArgs += Math.pow(Math.E, i);
    }
    return expArgs;
}

function Sumexp(...args) {
    const t = Object.create(Operator(args, sumexp, 'sumexp'));
    t.evaluate = function(x, y, z) {
        if (t.args.length === 0) {
            return 0;
        } else {
            return Object.getPrototypeOf(t).evaluate(x, y, z);
        }
    }
    t.diff = function (d) {
        if (args.length === 0) {
            return new Const(0);
        }
        let dExpArgs = args.map(i => new Multiply(i.diff(d), new Power(e, i)));
        return new Add(...dExpArgs);
    }
    t.postfix = function () {
        let str = '(';
        let a = args.map(i => i.postfix());
        return str + a.join(' ') + ' sumexp)';
    }
    return t;
}

const softmax = function (args) {
    let down = sumexp(args);
    return Math.pow(Math.E, args[0]) / down;
}

function Softmax(...args) {
    const t = Object.create(Operator(args, softmax, 'softmax'));
    t.diff = function (d) {
        let down = new Sumexp(...args);
        let num = new Sumexp(args[0]);
        return new Divide(
            new Subtract(new Multiply(num.diff(d), down), new Multiply(down.diff(d), num)),
            new Multiply(down, down));
    }
    t.postfix = function () {
        let str = '(';
        let a = args.map(i => i.postfix());
        return str + a.join(' ') + ' softmax)';
    }
    return t;
}

const isNumber = function (str) {
    if (str === '-' || str === '+') {
        return false;
    }
    let i = 0;
    if (str[0] === '-' || str[0] === '+') {
        i++;
    }
    while (i < str.length) {
        if (str[i] < '0' || str[i] > '9') {
            return false;
        }
        i++;
    }
    return true;
};

const mySplit = function (str) {
    let tokens = [];
    let cur = '';
    for (const i of str) {
        if (i === ' ') {
            if (cur.length > 0) {
                tokens.push(cur);
            }
            cur = '';
        } else if (i === '(' || i === ')') {
            if (cur.length > 0) {
                tokens.push(cur);
            }
            cur = '';
            tokens.push(i);
        } else {
            cur += i;
        }
    }
    if (cur.length !== 0) {
        tokens.push(cur);
    }
    if (tokens.length === 1) {
        let x = tokens[0];
        if (constants[x] !== undefined) {
            return [constants[x]];
        } else if (vars.includes(x)) {
            return [new Variable(x)];
        } else if (isNumber(x)) {
            return [new Const(parseInt(x))];
        } else {
            throw new Error("Invalid expression");
        }
    }
    if (tokens[0] !== '(' || tokens[tokens.length - 1] !== ')') {
        throw new Error("Expression must be in ( )");
    }
    return tokens;
};

const makeMessage = function (str, start) {
    return str + ", token number " + (start + 1);
}

const parsePostfix = function (tokens) {
    let start = 1;
    tokens = mySplit(tokens);
    if (tokens.length === 1) {
        return tokens[0];
    }
    const toParse = () => {
        let args = [];
        while (start < tokens.length) {
            let i = tokens[start];
            if (i === '(') {
                start++;
                args.push(toParse());
                continue;
            } else if (i === ')') {
                throw new Error(makeMessage("Unexpected ')'", start));
            } else if (constants[i] !== undefined) {
                args.push(new constants[i]);
            } else if (vars.includes(i)) {
                args.push(new Variable(i));
            } else if (isNumber(i)) {
                args.push(new Const(parseInt(i)));
            } else if (allOperators[i] !== undefined) {
                if (start + 1 === tokens.length || tokens[start + 1] !== ')') {
                    throw new Error(makeMessage("')' expected", start + 1));
                }
                arityCheck(args, i, start);
                start += 2;
                return allOperators[i](...args);
            } else {
                throw new Error(makeMessage("Undefined symbol in source: " + i, start));
            }
            start++;
        }
        throw new Error(makeMessage("Some troubles with braces", start));
    }
    let ans = toParse();
    finalCheck(start, tokens);
    return ans;
};

const arityCheck = function(args, op, start) {
    if (unOperators[op] !== undefined && args.length !== 1 ||
        binOperators[op] !== undefined && args.length !== 2) {
        throw new Error(makeMessage("Amount of arguments doesn't match to operator", start));
    }
}

const finalCheck = function(start, tokens) {
    if (start < tokens.length) {
        throw new Error(makeMessage("All expression must be in ( )", start));
    }
}

const parsePrefix = function (tokens) {
    let start = 1;
    tokens = mySplit(tokens);
    if (tokens.length === 1) {
        return tokens[0];
    }
    const toParse = () => {
        let args = [];
        let i = tokens[start];
        if (allOperators[i] === undefined) {
            throw new Error(makeMessage("Operator expected", start));
        }
        let op = i;
        start++;
        while (start < tokens.length) {
            i = tokens[start];
            if (i === '(') {
                start++;
                args.push(toParse());
                continue;
            } else if (i === ')') {
                start++;
                arityCheck(args, op, start);
                return allOperators[op](...args);
            } else if (constants[i] !== undefined) {
                args.push(constants[i]);
            } else if (vars.includes(i)) {
                args.push(new Variable(i));
            } else if (isNumber(i)) {
                args.push(new Const(parseInt(i)));
            } else {
                throw new Error(makeMessage("Unexpected symbol in source: " + i, start));
            }
            start++;
        }
        throw new Error(makeMessage("All expressions must be in ( )", start));
    }
    let ans = toParse();
    finalCheck(start, tokens);
    return ans;
}
