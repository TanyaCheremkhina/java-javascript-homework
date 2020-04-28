"use strict";

function Expression(...args) {
    this.args = args;
    this.evaluate = function(x, y, z) {
        const mArgs = this.args.map(i => i.evaluate(x, y, z));
        return this.f(mArgs);
    }
    this.toString = function () {
        let str = this.args.join(' ');
        if (this.args.length > 1) { str += ' ' + this.oper }
        return str;
    }
    this.prefix = function () {
        let str = '';
        let mArgs = this.args.map(i => i.prefix());
        if (this.args.length > 1) { str += '(' + this.oper + ' ' }
        str += mArgs.join(' ');
        if (this.args.length > 1) { str += ')'; }
        return str;
    }
    this.postfix = function () {
        let str = '';
        if (this.args.length > 1) { str += '('}
        let mArgs = this.args.map(i => i.postfix());
        str += mArgs.join(' ');
        if (this.args.length > 1) { str += ' ' + this.oper }
        if (this.args.length > 1) { str += ')'; }
        return str;
    }
}

function Const(...args) {
    if (args.length !== 1) {
        throw new Error('In declaration of Const must be 1 argument');
    }
    let t = {};
    Expression.apply(t, args);
    t.evaluate = () => t.args[0];
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
    const t = {};
    Expression.apply(t, args);
    t.evaluate = (x, y, z) => {
        const mapa = new Map([
            [vars[0], x],
            [vars[1], y],
            [vars[2], z]
        ]);
        return mapa.get(t.args[0]);
    }
    t.diff = (d) => new Const((d === t.args[0]) * 1);
    t.prefix = t.toString;
    t.postfix = t.toString;
    return t;
}

const arity = new Map([
        ["+", 2],
        ["-", 2],
        ["*", 2],
        ["/", 2],
        ["negate", 1],
        ["pow", 2],
        ["log", 2]
    ]
)

let pi = new Const(Math.PI);
let e = new Const(Math.E);

function OperatorConstructor(func, oper, diffFunc) {
    function Constructor() {
        Expression.apply(this, arguments);
        if (arity.get(oper) === 1 || arity.get(oper) === -1) {
            this.toString = function () {
                return this.args.join(' ').toString() + ' ' + oper;
            }
            this.prefix = function () {
                return '(' + oper + ' ' + this.args.map(i => i.prefix()).join(' ') + ')';
            }
            this.postfix = function () {
                return '(' + this.args.map(i => i.postfix()).join(' ') + ' ' + oper + ')';
            }
        }
    }
    Constructor.prototype.f = func;
    Constructor.prototype.oper = oper;
    Constructor.prototype.diff = diffFunc;

    return Constructor;
}

const Log = OperatorConstructor(function(args) {
        let x = args[0], y = args[1];
        x = Math.abs(x);
        y = Math.abs(y);
        return Math.log(y) / Math.log(x);
    }, 'log',
    function (d) {
        let right = this.args[1];
        let left = this.args[0];
        let rightLog = new Log(e, right);
        let leftLog = new Log(e, left);
        return new Divide(new Subtract(
            new Divide(new Multiply(leftLog, right.diff(d)), right),
            new Divide(new Multiply(rightLog, left.diff(d)), left)),
            new Multiply(leftLog, leftLog));
    }
)

const Power = OperatorConstructor(args => Math.pow(args[0], args[1]), 'pow',
    function (d) {
        let left = this.args[0];
        let right = this.args[1];
        return new Multiply(
            new Power(left, new Subtract(right, new Const(1))),
            new Add(new Multiply(right, left.diff(d)),
                new Multiply(left, new Multiply(new Log(e, left), right.diff(d))))
        );
    }
);

const makeFunc = function (f) {
    return (args) => {
        let s = args[0];
        for (let i = 1; i < args.length; i++) {
            s = f(s, args[i]);
        }
        return s;
    }
};

const Add = OperatorConstructor(makeFunc((a, b) => a + b), '+',
    function(d) {
        return new Add(...(this.args.map(i => i.diff(d))));
    });

const Subtract = OperatorConstructor(makeFunc((a, b) => a - b), '-',
    function(d) {
        return new Subtract(...this.args.map(i => i.diff(d)));
    }
);
const Multiply = OperatorConstructor(makeFunc((a, b) => a * b), '*',
    function (d) {
        let arr = [];
        for (let i = 0; i < this.args.length; i++) {
            let element = [...this.args];
            element[i] = element[i].diff(d);
            arr.push(new Multiply(...element));
        }
        return new Add(...arr);
    }
);
const Divide = OperatorConstructor(makeFunc((a, b) => a / b), '/',
    function (d) {
        let right = this.args.slice(1);
        let left = this.args[0];
        return new Divide(
            new Subtract(
                new Multiply(left.diff(d), ...right),
                new Multiply(left, new Multiply(...right).diff(d))
            ),
            new Multiply(...right, ...right)
        );
    }
);
const Negate = OperatorConstructor(x => (-1 * x), 'negate',
    function (d) {
        return new Negate(this.args[0].diff(d));
    }
);

const topFromStack = function (stack, k) {
    let args = [];
    while (k-- > 0) {
        args.push(stack[stack.length - 1]);
        stack.pop();
    }
    return args.reverse();
}

const constants = new Map([
    ["pi", pi],
    ["e", e]
]);
const allOperators = new Map([
    ["+", Add],
    ["-", Subtract],
    ["*", Multiply],
    ["/", Divide],
    ["pow", Power],
    ["log", Log],
    ["negate", Negate]
]);

const parse = function (input) {
    let tokens = input.split(' ');
    let stack = [];
    for (const i of tokens) {
        if (i === '') {
            // do nothing
        } else if (constants.get(i) !== undefined) {
            stack.push(new constants.get(i));
        } else if (allOperators.get(i) !== undefined) {
            stack.push(new (allOperators.get(i))(...topFromStack(stack, arity.get(i))));
        } else if (vars.includes(i)) {
            stack.push(new Variable(i));
        } else {
            stack.push(new Const(parseInt(i)));
        }
    }
    return stack[0];
};


// ---------------------- end of hw7

const sumexp = function (args) {
    let expArgs = 0;
    for (const i of args) {
        expArgs += Math.pow(Math.E, i);
    }
    return expArgs;
}

const Sumexp = OperatorConstructor(sumexp, 'sumexp',
    function (d) {
        if (this.args.length === 0) {
            return new Const(0);
        }
        let dExpArgs = this.args.map(i => new Multiply(i.diff(d), new Power(e, i)));
        return new Add(...dExpArgs);
    }
)

const softmax = function (args) {
    let down = sumexp(args);
    return Math.pow(Math.E, args[0]) / down;
}

const Softmax = OperatorConstructor(softmax, 'softmax',
    function (d) {
        let down = new Sumexp(...this.args);
        let num = new Sumexp(this.args[0]);
        return new Divide(
            new Subtract(new Multiply(num.diff(d), down), new Multiply(down.diff(d), num)),
            new Multiply(down, down));
    }
)

arity.set('sumexp', -1);
arity.set('softmax', -1);
allOperators.set('sumexp', Sumexp);
allOperators.set('softmax', Softmax);

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
            throw new Error("Invalid expression: undefined variable or invalid number, token number 1");
        }
    }
    if (tokens[0] !== '(' || tokens[tokens.length - 1] !== ')') {
        throw new Error("All expression must be in ( )");
    }
    return tokens;
};

const makeMessage = function (str, start) {
    return str + ", token number " + (start + 1);
}

const arityCheck = function(args, op, pos) {
    if (arity.get(op) > 0 && args.length !== arity.get(op)) {
        throw new Error(makeMessage("Amount of arguments doesn't match to operator", pos));
    }
}

const finalCheck = function(start, tokens, pos) {
    if (start < tokens.length) {
        throw new Error(makeMessage("Expression after this token is not in braces", pos));
    }
}

const parsePrefix = function (tokens, rev = 0) {
    let start = 1;
    if (typeof tokens === 'string') {
        tokens = mySplit(tokens);
        if (tokens.length === 1) {
            return tokens[0];
        }
    }
    const pos = () => start * (1 - rev) + (tokens.length - start) * rev;
    const toParse = () => {
        let args = [];
        let i = tokens[start];
        if (allOperators.get(i) === undefined) {
            throw new Error(makeMessage("Operator expected", pos()));
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
                arityCheck(args, op, pos());
                if (rev === 1) {
                    args = args.reverse();
                }
                return new (allOperators.get(op))(...args);
            } else if (constants.get(i) !== undefined) {
                args.push(constants.get(i));
            } else if (vars.includes(i)) {
                args.push(new Variable(i));
            } else if (isNumber(i)) {
                args.push(new Const(parseInt(i)));
            } else {
                throw new Error(makeMessage("Unexpected symbol in source: " + i, pos()));
            }
            start++;
        }
        throw new Error(makeMessage("All expressions must be in ( )", pos()));
    }
    let ans = toParse();
    finalCheck(start, tokens, pos());
    return ans;
}


const parsePostfix = function (tokens) {
    let rTokens = mySplit(tokens).reverse().map(i => {
        if (i === '(') {
            return ')';
        } else if (i === ')') {
            return '(';
        } else {
            return i;
        }
    });
    let str = rTokens.join(' ');
    return parsePrefix(str, 1);
}
