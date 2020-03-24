function Const(val) {
    this.value = val;
    this.evaluate = (x, y = 0, z = 0) => this.value;
    this.toString = function () {
        return this.value.toString();
    };
    this.diff = () => new Const(0);
}

function Variable(s) {
    this.str = s;
    this.evaluate = (x, y = 0, z = 0) => {
        if (s === 'x') {
            return x;
        } else if (s === 'y') {
            return y;
        } else {
            return z;
        }
    };
    this.toString = function () {
        return this.str;
    };
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
}

function Add(left, right) {
    BinFunc.apply(this, [left, right, (a, b) => a + b, "+", (a, b) => a + b]);
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
    Subtract.apply(this, [new Const(0), value]);
    this.toString = function () {
        return this.right.toString() + " negate";
    }
}

const binOperators = {
    "+": Add,
    "-": Subtract,
    "*": Multiply,
    "/": Divide
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

