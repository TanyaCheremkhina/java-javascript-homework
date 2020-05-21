(defn projector [i] (fn [args] {
                                :pre  [(< 0 (count args)) (<= 0 i) (< i (count (nth args 0)))]
                                :post [(= (count %) (count args))]
                                } (mapv (fn [j] (nth j i)) args)))

(defn checkForEvery [f] (fn [args] {
                                    :pre [(or (= (type args) clojure.lang.PersistentVector)
                                              (seq? args))]
                                    } ((defn check [i]
                                         (cond
                                           (= i (count args)) true
                                           :else (and (f (nth args i) (first args)) (recur (inc i))))) 0)))

(def checkLength (checkForEvery (fn [x y] (= (count x) (count y)))))
(def checkNumbers (checkForEvery (fn [x & y] (isa? (type x) Number))))
(def checkVectors (checkForEvery (fn [x & y] (and (= (type x) clojure.lang.PersistentVector) (checkNumbers x)))))
(def checkMatrix (checkForEvery (fn [x & y] (and (checkVectors x) (checkLength x)))))
(def checkV (checkForEvery (fn [x & y] (and (= (type x) clojure.lang.PersistentVector)))))

(defn checkTensors [args] (or (checkNumbers args) (and (checkV args) (checkLength args) (recur (into [] (apply concat args))))))

(defn toVector [args] (mapv identity args))

(defn myMapping [f args] (mapv (fn [i] (apply f ((projector i) args))) (range (count (first args)))))

(defn vf [f] (fn [& args] {
                           :pre  [(checkVectors args) (checkLength args)]
                           :post [(= (count (first args)) (count %))]
                           } (myMapping f args)))
(def v+ (vf +))
(def v- (vf -))
(def v* (vf *))

(defn mf [f] (fn [& args] {
                           :pre  [(checkMatrix args) (checkLength args)]
                           :post [(= (count (first args)) (count %)) (checkLength %)]
                           } (myMapping (vf f) args)))
(def m+ (mf +))
(def m- (mf -))
(def m* (mf *))

(defn tf [f] (fn [& args] {
                           :pre [(checkTensors args) (checkLength args)]
                           :post [(= (count (first args)) (count %)) ]
                           } (cond (checkVectors args) (apply (vf f) args)
                                   (checkMatrix args) (apply (mf f) args)
                                   :else (myMapping (tf f) args))))

(def t+ (tf +))
(def t* (tf *))
(def t- (tf -))

(defn v*s [v & s] {
                   :pre  [(checkVectors [v]) (or (= (count s) 0) (checkNumbers s))]
                   :post [(= (count v) (count %))]
                   } (let [x (apply * s)] (mapv (fn [i] (* i x)) v)))


(defn m*s [m & s] {
                   :pre  [(< 0 (count m)) (checkMatrix [m]) (or (= (count s) 0) (checkNumbers s))]
                   :post [(= (count m) (count %))]
                   } (let [x (apply * s)] (mapv (fn [i] (v*s i x)) m)))

(defn m*v [m v] {
                 :pre  [(checkMatrix [m]) (checkVectors [v]) (= (count (nth m 0)) (count v))]
                 :post [(= (count %) (count m))]
                 } (mapv (fn [i] (apply + (v* (nth m i) v))) (range (count m))))

(defn m*m [& args] {
                    :pre  [(checkMatrix [(first args)])
                           (or (= (count args) 1)
                               (and (checkMatrix [(second args)])
                                    (= (count (second args)) (count (nth (first args) 0)))))]
                    :post [(checkMatrix [%])
                           (or (and (= (count args) 1) (= % (first args)))
                               (and (= (count (nth (last args) 0))
                                       (count (nth % 0))) (= (count %) (count (first args)))))]
                    } (reduce (fn [a b] (mapv (fn [i] (mapv
                            (fn [j] (apply + (v* ((projector j) b) (nth a i))))
                            (range (count (nth b 0))))) (range (count a)))) args))

(defn transpose [m] {
                     :pre  [(checkMatrix [m])]
                     :post [(checkMatrix [%]) (= (count (first m)) (count %)) (= (count m) (count (first %)))]
                     } (mapv (fn [i] ((projector i) m)) (range (count (nth m 0)))))

(defn det [args a b] {
                      :pre [(checkMatrix [args]) (= (count args) 2) (= (count (first args)) 3)]
                      } (- (* (nth (nth args 0) a) (nth (nth args 1) b))
                           (* (nth (nth args 0) b) (nth (nth args 1) a))))

(defn vect [& args] {
                     :pre [(checkMatrix [args]) (= (count (nth args 0)) 3)]
                     } (cond
                         (= (count args) 3) (vect (vect (nth args 0) (nth args 1)) (nth args 2))
                         (= (count args) 2) (vector (det args 1 2) (- (det args 0 2)) (det args 0 1))
                         (= (count args) 1) (nth args 0)
                         :else [0 0 0]))
(defn scalar [& args] {
                       :pre [(checkMatrix [args])]
                       } (apply + (apply v* args)))
