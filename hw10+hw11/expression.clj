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
(def ConstantProto {
                    :evaluate (fn [this vars] (first (_args this)))
                    :toString (fn [this] (format "%.1f" (double (first (_args this)))))
                    :diff     (constantly (delay (Constant 0)))
                    })
(def VariableProto {
                    :evaluate (fn [this vars] (get vars (toString this)))
                    :toString (fn [this] (str (first (_args this))))
                    :diff     (fn [this d] (if (= d (first (_args this))) (Constant 1) (Constant 0)))
                    })
(def ExpressionProto {
                      :evaluate (fn [this vars] (apply (_f this) (mapv #(evaluate % vars) (_args this))))
                      :toString (fn [this]
                                  (str "(" (_oper this) " " (clojure.string/join " " (mapv toString (_args this))) ")"))
                      })
(defn ExprConstructor [this & args] (assoc this :args args))
(defn constructor [proto] (fn [& args] (apply ExprConstructor {:prototype proto} args)))
(defn makeProto [f oper dF] {
                             :prototype ExpressionProto
                             :f         f
                             :oper      oper
                             :diff      (fn [this d]
                                          (cond (= (count (_args this)) 1)
                                                ((constructor (makeProto f oper dF)) (diff (first (_args this)) d))
                                                :else (dF this d)))
                             })
(def Constant (constructor ConstantProto))
(def Variable (constructor VariableProto))
(def Add (constructor (makeProto + "+" (fn [this d] (apply Add (mapv #(diff % d) (_args this)))))))
(def Subtract (constructor (makeProto - "-" (fn [this d] (apply Subtract (mapv #(diff % d) (_args this)))))))
(def Multiply (constructor (makeProto * "*" (fn [this d]
                                              (let [u (first (_args this)) v (apply Multiply (drop 1 (_args this)))]
                                                (Add (Multiply (diff u d) v) (Multiply (diff v d) u)))))))
(defn div [& x] (/ (double (first x)) (apply * (drop 1 x))))
(def Divide)
(def DivideProto (makeProto div "/" (fn [this d] (let [u (first (_args this)) v (apply Multiply (drop 1 (_args this)))]
                                                 (Divide (Subtract (Multiply (diff u d) v) (Multiply (diff v d) u))
                                                         (Multiply v v))))))
(def Divide (constructor DivideProto))
(def Negate (constructor (makeProto - "negate" (fn [this d] (Negate (diff (first (_args this)) d))))))
(def Sum (constructor (makeProto + "sum" (fn [this d] (apply Sum (mapv #(diff % d) (_args this)))))))
(defn avgF [& x] (/ (apply + x) (count x)))
(def Avg)
(def AvgProto (makeProto avgF "avg"
                         (fn [this d] (let [args (_args this) sum (apply Add args) n (Constant (count args))]
                                        (Divide (diff sum d) n)))))
(def Avg (constructor AvgProto))

(def exprs {'+ Add 'sum Sum 'avg Avg '- Subtract '* Multiply '/ Divide 'negate Negate 'var Variable 'const Constant})
(defn parseObject [input] ((parse exprs) (read-string input)))
