# PropCalc2

`propcalc2` is a checker for classical 2nd-order propositional logic.
It was born out of an attempt to formalize some of the notions in Chapter VII of
_Gödel, Escher, Bach_, and my desire to better understand System F.

Technically, propositional calculus is isomorphic to the simply typed lambda
calculus, but proving theorems in the STLC is just no fun.
Because it lacks parametric polymorphism, we need to prove theorems for every
possible input type we might conceive of.
For instance, a proof of `A & B => B & A` cannot be used to show that `~A & B =>
B & ~A`.
With the polymorphism of System F we get the second result for free.

## Overview

For a more hands-on introduction inspired by Chapter VII of _GEB_, see [the tutorial](./tutorial.pc2).

The syntax is heavily borrowed from Rust, but with more of a "logic" feel rather
than a "programming" one.
Here's a short example, showing that conjunction is commutative:

```rust
// A few basic axioms
let both: forall P, Q; P => Q => P & Q = $trust_me;

let proj_l: forall P, Q; P & Q => P = $trust_me;

let proj_r: forall P, Q; P & Q => Q = $trust_me;

// Our first theorem: conjunction is commutative.
let and_comm: forall P, Q; P & Q => Q & P = <P, Q>{
    supposing(p_and_q) {
        let p = proj_l<P, Q>(p_and_q);
        let q = proj_r<P, Q>(p_and_q);

        both<Q, P>(q, p)
    }
};
```

Axioms are just theorems proved _by intimidation_ with the use of the
`$trust_me` keyword.

In the spirit of Hofstadter's "fantasy rule", abstractions are written as

```rust
supposing(a, b, c) {
    // ...
}
```

By _supposing_ certain premises and drawing some conclusion, we prove an
implication: that the premises imply the conclusion.

System F (and 2nd-order propositional logic) also introduce abstractions over
_propositions_ (or types), and applications of terms to propositions.
These are written using the angle brackets (`<`, `>`) common to a large number
of programming languages.
To abstract over propositions named `P` and `Q` in a term `t`, we write `<P, Q>t`.
The names `P` and `Q` then refer to propositions within `t`.
To _use_ this term, we need to apply it to suitable propositions, and this is
also accomplished with angle brackets.
For instance, to apply the term `u = <P, Q>t` to propositions `P` and `~Q => P`,
we write `u<P, ~Q => P>`.

## Writing proofs interactively

`propcalc2` is lean and mean.
At times, too lean and excessively mean.
For instance, any kind of error (including a simple syntax error) drops you into
an advanced "hard mode" where you must diagnose the issue without any location
information.
At times like this, reach for the only luxuries available in this unforgiving
landscape: `$trust_me` and `$check`.

We've already introduced `$trust_me`, which does what it says on the tin: it
strong-arms the type checker into accepting it as a proof of any proposition.

`$check(t)` prints the type of the term `t`.
Together these allow us to prove theorems interactively.
Here's an example of how these two can be used to prove a somewhat tricky
`mk_pair` term that constructs a pair in the classic way.

```rust
// The "higher-rank type" makes this one a little intimidating.
let mk_pair: forall F, S; F => S => (forall R; (F => S => R) => R) = <F, S>{
    supposing(fst, snd) {
        $trust_me
    }
};
```

We know that the body of this `supposing` term needs to have a `forall R; ...`
prop whose body is an implication, so let's add a prop abstraction and another
`supposing` term:

```rust
let mk_pair: forall F, S; F => S => (forall R; (F => S => R) => R) = <F, S>{
    supposing(fst, snd) {
        <R>supposing(quux) {
            $trust_me
        }
    }
};
```

But now we might feel stuck.
_What is `quux`, and what are we to do with it?_
So we add a couple of `$check`s:

```rust
let mk_pair: forall F, S; F => S => (forall R; (F => S => R) => R) = <F, S>{
    supposing(fst, snd) {
        <R>supposing(quux) {
            $check(fst);
            $check(snd);
            $check(quux);
            $trust_me
        }
    }
};
```

Running `propcalc2` on this file reports:

```
F
S
F => S => R
all good =)
```

So `fst: F`, `snd: S` (no surprises there), and `quux: F => S => R`.
We want an `R`, and we can get one by applying `quux` to `fst` and `snd`.
At the same time, let's rename it appropriately (`sel` for "selector"):

```rust
let mk_pair: forall F, S; F => S => (forall R; (F => S => R) => R) = <F, S>{
    supposing(fst, snd) {
        <R>supposing(sel) {
            sel(fst, snd)
        }
    }
};
```

## Details

### Currying

Programs in `propcalc2` are desugared to a simpler, more austere "core form".
The most relevant step in this process is "currying", which transforms all
abstractions and applications so they only mention a single parameter or operand.
For instance,

```rust
let and_comm: forall P, Q; P & Q => Q & P = <P, Q>{
    supposing(p_and_q) {
        let p = proj_l<P, Q>(p_and_q);
        let q = proj_r<P, Q>(p_and_q);
        both<Q, P>(q, p)
    }
}
```

is transformed to something like

```rust
let and_comm: forall P; forall Q; P & Q => Q & P = <P>{
    <Q>{
        supposing(p_and_q) {
            let p = proj_l<P><Q>(p_and_q);
            let q = proj_r<P><Q>(p_and_q);
            both<Q><P>(q)(p)
        }
    }
}
```

The upshot is that abstractions (including type abstractions) may be partially
applied (no eta-expansion required!).

### More about `$trust_me`

The term `$trust_me` has the `any`/`⊥` type, which is a subtype of every other
type.
Expressed more "logically", this means that `$trust_me` acts as a proof of _any_
proposition.

## Where to learn more

I learned about System F and many other topics in type theory from Benjamin
Pierce's _Types and Programming Languages_, and about bidirectional type
checking from David Christiansen's excellent
[tutorial](https://davidchristiansen.dk/tutorials/nbe/).
