function Const(val) {
    this.value = val;
    this.evaluate = (x, y = 0, z = 0) => this.value;
    this.toString = function () {
        return this.value.toString();
    };
    this.prefix = () => this.toString();
    this.diff = () => new Const(0);
}

const vars = ['x', 'y', 'z'];

function Variable(s) {
    this.str = s;
    this.evaluate = (x, y = 0, z = 0) => {
        if (s === vars[0]) {
            return x;
        } else if (s === vars[1]) {
            return y;
        } else {
            return z;
        }
    };
    this.toString = function () {
        return this.str;
    };
    this.prefix = () => this.toString();
    this.diff = function (d) {
        if (d === this.str) {
            return new Const(1);
        }
        return new Const(0);
    }
}

function BinFunc(left, right, f, oper) {
    this.left = left;
    this.right = right;
    this.oper = oper;
    this.getLeft = () => this.left;
    this.getRight = () => this.right;
    this.evaluate = (x, y, z) => f(this.left.evaluate(x, y, z), this.right.evaluate(x, y, z));
    this.toString = function () {
        return this.left.toString() + " " + this.right.toString() + " " + this.oper;
    };
    this.prefix = function() {
        return '(' + this.oper + ' ' + this.left.prefix() + ' ' + this.right.prefix() + ')';
    };

}

getLog = function(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    return Math.log(y) / Math.log(x);
};

function Log(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => getLog(a, b), "log"]);
    this.diff = function (d) {
        let rightLog = new Log(e, right);
        let leftLog = new Log(e, left);
        return new Divide(new Subtract(
            new Divide(new Multiply(leftLog, right.diff(d)), right),
            new Divide(new Multiply(rightLog, left.diff(d)), left)),
        new Multiply(leftLog, leftLog));
    }
}

function Power(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => Math.pow(a, b), "pow"]);
    this.diff = function (d) {
        return new Multiply(
            new Power(left, new Subtract(right, new Const(1))),
            new Add(new Multiply(right, left.diff(d)),
                new Multiply(left, new Multiply(new Log(e, left), right.diff(d)))));

    }
}

function Add(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => a + b, "+"]);
    this.diff = function(d) {
        return new Add(this.left.diff(d), this.right.diff(d));
    }
}
function Subtract(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => a - b, "-"]);
    this.diff = function(d) {
        return new Subtract(this.left.diff(d), this.right.diff(d));
    }
}
function Multiply(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => a * b, "*"]);
    this.diff = function (d) {
        return new Add(new Multiply(this.left.diff(d), this.right), new Multiply(this.left, this.right.diff(d)));
    }
}
function Divide(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => a / b, "/"]);
    this.diff = function (d) {
        return new Divide(
            new Subtract(
                new Multiply(this.left.diff(d), this.right),
                new Multiply(this.left, this.right.diff(d))
            ),
            new Multiply(this.right, this.right)
        )
    }
}

function Negate(value) {
    this.value = value;
    this.toString = function () {
        return this.value.toString() + " negate";
    };
    this.prefix = function () {
        return "(negate " + this.value.prefix() + ")";
    };
    this.diff = function (d) {
        return new Multiply(new Const(-1), this.value.diff(d));
    };
    this.evaluate = function (x, y, z) {
        return -1 * this.value.evaluate(x, y, z);
    }
}

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

let pi = new Const(Math.PI);
let e = new Const(Math.E);

const constants = {
    "pi": pi,
    "e": e
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
    return tokens;
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

function parsePrefix(tokens) {
    let start = 0, balance = 0;
    tokens = mySplit(tokens);
    const toParse = () => {
        let operators = [], args = [];
        while (start < tokens.length) {
            let i = tokens[start];
            if (i === '(') {
                balance++;
                start++;
                args.push(toParse(tokens));
            } else if (i === ')') {
                balance--;
                if (balance < 0 || args.length !== 1 || operators.length !== 0) {
                    throw new Error("Unexpected ')'");
                }
                return args[0];
            } else if (constants[i] !== undefined) {
                args.push(constants[i]);
            } else if (vars.includes(i)) {
                args.push(new Variable(i));
            } else if (isNumber(i)) {
                args.push(new Const(parseInt(i)));
            } else if (unOperators[i] !== undefined || binOperators[i] !== undefined) {
                operators.push(i);
            } else {
                throw new Error("Undefined symbol in source: " + i);
            }
            while (operators.length > 0 && args.length > 0 && unOperators[operators[operators.length - 1]] !== undefined) {
                let op = operators[operators.length - 1];
                operators.pop();
                args[args.length - 1] = new unOperators[op](args[args.length - 1]);
            }
            if (args.length > 2 || operators.length === 0 && args.length === 2) {
                throw new Error("Not enough operators, extra args: " + args[0] + ", " + args[1]);
            }
            if (args.length === 2 && operators.length > 0) {
                let op = operators[operators.length - 1];
                operators.pop();
                args = [new binOperators[op](args[0], args[1])];
            }
            start++;
        }
        if (args.length === 0) {
            throw new Error("No arguments");
        }
        if (operators.length !== 0) {
            throw new Error("Not enough arguments for operators " + operators);
        }
        if (balance > 0) {
            throw new Error("Some extra '('");
        }
        return args[0];
    };
    return toParse();
}
