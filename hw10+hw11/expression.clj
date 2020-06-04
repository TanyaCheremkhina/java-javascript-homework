(defn expression [func] (fn [& args] (fn [values] (apply func (mapv (fn [i] (i values)) args)))))
(defn constant [x] (constantly x))
(defn variable [x] (fn [values] (get values x)))
(def add (expression +))
(def subtract (expression -))
(def negate (expression -))
(def multiply (expression *))
(def med (expression (fn [& args] (nth (sort args) (long (/ (count args) 2))))))
(def avg (expression (fn [& args] (/ (apply + args) (count args)))))
(def divide (expression (fn [& args] (/ (double (first args)) (apply * (drop 1 args))))))
(def oper {'+ add '- subtract '* multiply '/ divide 'negate negate 'med med 'avg avg 'const constant 'var variable})
(def vars {'x "x" 'y "y" 'z "z"})
(defn parse [exprs] (defn toParse [args] (cond
                                           (= (type args) clojure.lang.PersistentList)
                                           (let [newArgs (mapv (fn [i] (toParse i)) (drop 1 args))
                                                 exp (get exprs (first args))] (apply exp newArgs))
                                           (isa? (type args) Number) ((get exprs 'const) args)
                                           :else ((get exprs 'var) (get vars args)))))

(defn parseFunction [input] ((parse oper) (read-string input)))
;hw10 -----------------> hw11
(defn proto-get [obj key]
  (cond (contains? obj key) (obj key)
        (contains? obj :prototype) (proto-get (obj :prototype) key)))
(defn proto-call [this key & args]
  (force (apply (proto-get this key) this args)))
(defn field [key]
  (fn [this] (proto-get this key)))
(defn method [key]
  (fn [this & args] (apply proto-call this key args)))

(def evaluate (method :evaluate))
(def toString (method :toString))
(def diff (method :diff))
(def _x (field :x))
(def _f (field :f))
(def _args (field :args))
(def _oper (field :oper))
(def Constant)
(def Variable)
(defn Constant [& args] {
                         :evaluate (fn [this vars] (first (_args this)))
                         :toString (fn [this] (format "%.1f" (double (first (_args this)))))
                         :diff     (constantly (delay (Constant 0)))
                         :args     args
                         })
(def ZERO (Constant 0))
(def ONE (Constant 1))
(defn Variable [& args] {
                         :evaluate (fn [this vars] (get vars (toString this)))
                         :toString (fn [this] (str (first (_args this))))
                         :args     args
                         :diff     (fn [this d] (if (= d (first (_args this))) ONE ZERO))
                         })
(def ExpressionProto {
                      :evaluate (fn [this vars] (apply (_f this) (mapv #(evaluate % vars) (_args this))))
                      :toString (fn [this]
                                  (str "(" (_oper this) " " (clojure.string/join " " (mapv toString (_args this))) ")"))
                      })
(defn ExprConstructor [this & args] (assoc this
                                      :args args))

(defn constructor [proto] (fn [& args] (apply ExprConstructor {:prototype proto} args)))
(defn makeProto [f oper dF] (constructor {
                                          :prototype ExpressionProto
                                          :f         f
                                          :oper      oper
                                          :diff      (fn [this d] (cond (= (count (_args this)) 1)
                                                        ((makeProto f oper dF) (diff (first (_args this)) d))
                                                        :else (dF (_args this)
                                                                  (mapv #(diff % d) (_args this))
                                                                  d)))
                                          }))

(def Add (makeProto + "+" (fn [x x' d] (apply Add x'))))
(def Subtract (makeProto - "-" (fn [x x' d] (apply Subtract x'))))
(def Multiply (makeProto * "*" (fn [x x' d] (let [u' (first x')
                                                  u (first x)
                                                  v (apply Multiply (drop 1 x))
                                                  v' (diff v d)]
                                              (Add (Multiply u' v) (Multiply v' u))))))
(defn div [& x] (/ (double (first x)) (apply * (drop 1 x))))
(def Divide (makeProto div "/" (fn [x x' d] (let [u' (first x')
                                                  u (first x)
                                                  v (apply Multiply (drop 1 x))
                                                  v' (diff v d)]
                                              (Divide (Subtract (Multiply u' v) (Multiply v' u)) (Multiply v v))))))
(def Negate (makeProto - "negate" (fn [])))
(def Sum (makeProto + "sum" (fn [x x' d] (apply Sum x'))))
(defn avgF [& x] (/ (apply + x) (count x)))
(def Avg (makeProto avgF "avg" (fn [x x' d] (let [sum' (apply Sum x')
                                                  n (Constant (count x))]
                                   (Divide sum' n)))))
(def exprs {'+ Add 'sum Sum 'avg Avg '- Subtract '* Multiply '/ Divide 'negate Negate 'var Variable 'const Constant})
(defn parseObject [input] ((parse exprs) (read-string input)))
