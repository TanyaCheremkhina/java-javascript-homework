(defn expression [func] (fn [& args] (fn [values] (apply func (mapv (fn [i] (i values)) args)))))
(defn constant [x] (fn [values] x))
(defn variable [x] (fn [values] (get values x)))
(def add (expression +))
(def subtract (expression -))
(def negate (expression -))
(def multiply (expression *))
(def med (expression (fn [& args] (nth (sort args) (long (/ (count args) 2))))))
(def avg (expression (fn [& args] (/ (apply + args) (count args)))))
(def divide (expression (fn [& args] (/ (double (first args)) (apply * (drop 1 args))))))
(def oper {'+ add '- subtract '* multiply '/ divide 'negate negate 'med med 'avg avg})
(def vars {'x "x" 'y "y" 'z "z"})
(defn parse [args] (cond
                     (= (type args) clojure.lang.PersistentList)
                     (let [newArgs (mapv (fn [i] (parse i)) (drop 1 args))
                           exp (get oper (first args))] (apply exp newArgs))
                     (isa? (type args) Number) (constant args)
                     :else (variable (get vars args)))
  )
(defn parseFunction [input] (parse (read-string input)))
;hw10 -----------------> hw11
(defn proto-get [obj key]
  (cond (contains? obj key) (obj key)
        (contains? obj :prototype) (proto-get (obj :prototype) key)))
(defn proto-call [this key & args]
  (apply (proto-get this key) this args))
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
(defn Constant [])
(defn Variable [])
(def ConstantProto {
                    :evaluate (fn [this vars] (_x this))
                    :toString (fn [this] (format "%.1f" (_x this))) ;(format "%.1f" value)
                    :diff     (fn [this d] (Constant 0))
                    })
(def VariableProto {
                    :evaluate (fn [this vars] (get vars (toString this)))
                    :toString (fn [this] (str (_x this)))
                    :diff     (fn [this d] (cond (= d (_x this)) (Constant 1)
                                                 :else (Constant 0)))})
(defn Constant [x] {
                    :x         x
                    :prototype ConstantProto})
(defn Variable [x] {
                    :x         x
                    :prototype VariableProto})
(def ExpressionProto {
                      :evaluate (fn [this vars] (apply (_f this) (mapv #(evaluate % vars) (_args this))))
                      :toString (fn [this]                  ;                                  (cond (= (count (_args this)) 1) (toString (first (_args this)))
                                  (str "(" (_oper this) " " (clojure.string/join " " (mapv toString (_args this))) ")"))
                      })
(defn constructor [cons proto] (fn [& args] (apply cons {:prototype proto} args)))
(defn ExprConstructor [this & args] (assoc this :args args))
(defn makeProto [f oper dF] {
                             :prototype ExpressionProto
                             :f         f
                             :oper      oper
                             :diff      (fn [this d]
                                          (cond (= (count (_args this)) 1)
                                                ((constructor ExprConstructor (makeProto f oper dF)) (diff (first (_args this)) d))
                                                :else (dF this d)))
                             })

(def Add (constructor ExprConstructor (makeProto + "+" (fn [this d] (apply Add (mapv #(diff % d) (_args this)))))))
(def Subtract (constructor ExprConstructor (makeProto - "-" (fn [this d] (apply Subtract (mapv #(diff % d) (_args this)))))))
(def Multiply (constructor ExprConstructor (makeProto * "*" (fn [this d] (let [u (first (_args this)) v (apply Multiply (drop 1 (_args this)))]
                                                                           (Add (Multiply (diff u d) v)
                                                                                (Multiply (diff v d) u)))))))
(defn div [this vars] (let [args (_args this) u (evaluate (first args) vars) v (evaluate (apply Multiply (drop 1 args)) vars)] (/ (double u) v)))
(def Divide)
(def DivideProto (makeProto / "/" (fn [this d] (let [u (first (_args this)) v (apply Multiply (drop 1 (_args this)))]
                                                 (Divide (Subtract (Multiply (diff u d) v) (Multiply (diff v d) u))
                                                         (Multiply v v))))))
(def DivideProto (assoc DivideProto :prototype (assoc (DivideProto :prototype) :evaluate div)))
(def Divide (constructor ExprConstructor DivideProto))
(def Negate (constructor ExprConstructor (makeProto - "negate" (fn [this d] (Negate (diff (first (_args this)) d))))))
(def exprs {'+ Add '- Subtract '* Multiply '/ Divide 'negate Negate})

(defn parseObj [args] (cond
                        (= (type args) clojure.lang.PersistentList)
                        (let [newArgs (mapv (fn [i] (parseObj i)) (drop 1 args))
                              expr (get exprs (first args))] (apply expr newArgs))
                        (isa? (type args) Number) (Constant args)
                        :else (Variable (get vars args))))

(defn parseObject [input] (parseObj (read-string input)))
