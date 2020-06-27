h(X, K, MAX_N) :- X =< MAX_N, assert(divisor(X, K)), assert(composite(X)), X1 is X + K, h(X1, K, MAX_N).
init(N, MAX_N) :- prime(N), A is N * N, h(A, N, MAX_N).
init(N, MAX_N) :- N1 is N + 1, N1 * N1 =< MAX_N, init(N1, MAX_N).
init(MAX_N) :- init(2, MAX_N).
composite(1).
prime(N) :- not(composite(N)).
divisor(A, A) :- prime(A).
prime_divisors(X, []) :- 1 = X, !.
prime_divisors(N, [H | T]) :- number(H), prime_divisors(N, [H | T], H).
prime_divisors(N, [H | T]) :- number(N), divisor(N, H), A is div(N, H), prime_divisors(A, T), !. 
prime_divisors(X, [], _) :- 1 = X, !.
prime_divisors(N, [H | T], M) :- H >= M, prime(H), prime_divisors(N1, T, H), N is N1 * H, !. 
len(N, K, L) :- N < K, L = 1.
len(N, K, L) :- N >= K, N1 is div(N, K), len(N1, K, L1), L is L1 + 1, !.
my_check(A, B, LA, LB, K) :- LA is LB + 1, A1 is div(A, K), A1 = B.
my_check(A, B, LA, LB, K) :- LA = LB, A = B.
my_check(A, B, LA, LB, K) :- LA > LB + 1, 
										 LA1 is LA - 1,
										 LB1 is LB + 1,
										 A1 is div(A, K),
										 M is mod(A, K),
										 B1 is B * K + M,
										 %print(A1), print(' '), print(B1), print('\n'),
										 my_check(A1, B1, LA1, LB1, K), !.

palindrome(N, K) :- len(N, K, L), 
										my_check(N, 0, L, 0, K).
prime_palindrome(N, K) :- palindrome(N, K), prime(N).
