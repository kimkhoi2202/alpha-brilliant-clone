import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "../../lib/cn";
import { iconButtonClass } from "../chrome/icon-button";
import { Button, type ButtonVariant } from "../ui";

/* -------------------------------------------------------------------------------------------------
 * Calculator engine (pure, no eval)
 *
 * This is an EXPRESSION calculator: keystrokes build a list of tokens that is
 * rendered verbatim (e.g. `6² + 5²`) and only collapsed to a number on "=".
 *
 * The token list is the single source of truth the reducer edits; evaluation is
 * a self-contained, safe pipeline, never `eval`/`Function`:
 *
 *   tokens → toRpn() (shunting-yard) → evalRpn()
 *
 * supporting numbers, decimals, binary `+ − × ÷` with precedence, prefix `√`,
 * postfix `²`, and unary minus.
 * ---------------------------------------------------------------------------------------------- */

type Operator = "+" | "−" | "×" | "÷";

type NumToken = { type: "num"; text: string };
type OpToken = { type: "op"; op: Operator };
type SqToken = { type: "sq" };
type SqrtToken = { type: "sqrt" };
/** One piece of the expression as typed (a number, operator, `²`, or `√`). */
type Token = NumToken | OpToken | SqToken | SqrtToken;

interface CalcState {
  /** The expression being built, in input order. */
  tokens: Token[];
  /** The expression string that produced a result (the recap line after "="). */
  lastExpression: string | null;
  /** True right after "="; the next digit starts fresh, operators continue. */
  justEvaluated: boolean;
  /** Latched on divide-by-zero / invalid input; the next input recovers. */
  error: boolean;
}

type CalcAction =
  | { type: "digit"; digit: string }
  | { type: "dot" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "toggleSign" }
  | { type: "sqrt" }
  | { type: "square" };

/** Max digits in a single number token (sign and dot excluded). */
const MAX_DIGITS = 14;

const INITIAL_STATE: CalcState = {
  tokens: [],
  lastExpression: null,
  justEvaluated: false,
  error: false,
};

const ERROR_STATE: CalcState = {
  tokens: [],
  lastExpression: null,
  justEvaluated: false,
  error: true,
};

const num = (text: string): NumToken => ({ type: "num", text });

const lastToken = (tokens: Token[]): Token | undefined => tokens[tokens.length - 1];

/** Trim floating-point noise (0.1 + 0.2) and reject non-finite results. */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  return String(Number.parseFloat(value.toPrecision(12)));
}

/** Render tokens to the single-line expression shown in the readout. */
function renderTokens(tokens: Token[]): string {
  let out = "";
  for (const token of tokens) {
    switch (token.type) {
      case "num":
        out += token.text;
        break;
      case "op":
        out += ` ${token.op} `;
        break;
      case "sq":
        out += "²";
        break;
      case "sqrt":
        out += "√";
        break;
    }
  }
  return out;
}

/* --- Evaluation: shunting-yard → RPN → evaluate (no eval) ------------------------------------- */

interface RpnNum {
  kind: "num";
  value: number;
}
type RpnOp =
  | { kind: "bin"; op: Operator }
  | { kind: "sqrt" }
  | { kind: "neg" }
  | { kind: "sq" };
type Rpn = RpnNum | RpnOp;

type StackOp =
  | { kind: "bin"; op: Operator; prec: number }
  | { kind: "sqrt"; prec: number }
  | { kind: "neg"; prec: number };

const BINARY_PREC: Record<Operator, number> = { "+": 1, "−": 1, "×": 2, "÷": 2 };
const SQRT_PREC = 4;
const NEG_PREC = 3;

function stackOpToRpn(op: StackOp): Rpn {
  if (op.kind === "bin") return { kind: "bin", op: op.op };
  if (op.kind === "sqrt") return { kind: "sqrt" };
  return { kind: "neg" };
}

/** Convert the token list to Reverse Polish Notation; throws on malformed input. */
function toRpn(tokens: Token[]): Rpn[] {
  const output: Rpn[] = [];
  const stack: StackOp[] = [];
  // True when the next token must be an operand (start, after a binary operator,
  // or after `√`). Drives unary-vs-binary detection for `+`/`−`.
  let expectOperand = true;

  for (const token of tokens) {
    if (token.type === "num") {
      if (!expectOperand) throw new Error("unexpected number");
      const value = Number.parseFloat(token.text);
      if (!Number.isFinite(value)) throw new Error("invalid number");
      output.push({ kind: "num", value });
      expectOperand = false;
    } else if (token.type === "sqrt") {
      if (!expectOperand) throw new Error("unexpected √");
      stack.push({ kind: "sqrt", prec: SQRT_PREC });
    } else if (token.type === "sq") {
      // Postfix square binds tightest, so it can be emitted immediately.
      if (expectOperand) throw new Error("unexpected ²");
      output.push({ kind: "sq" });
    } else if (expectOperand) {
      // Unary position: `−` negates, `+` is a no-op; binary `× ÷` are invalid.
      if (token.op === "−") {
        stack.push({ kind: "neg", prec: NEG_PREC });
      } else if (token.op !== "+") {
        throw new Error("unexpected operator");
      }
    } else {
      const prec = BINARY_PREC[token.op];
      while (stack.length > 0 && stack[stack.length - 1].prec >= prec) {
        const popped = stack.pop();
        if (popped) output.push(stackOpToRpn(popped));
      }
      stack.push({ kind: "bin", op: token.op, prec });
      expectOperand = true;
    }
  }

  if (expectOperand) throw new Error("incomplete expression");
  while (stack.length > 0) {
    const popped = stack.pop();
    if (popped) output.push(stackOpToRpn(popped));
  }
  return output;
}

/** Evaluate an RPN stream to a number; throws on divide-by-zero / malformed input. */
function evalRpn(rpn: Rpn[]): number {
  const stack: number[] = [];
  for (const item of rpn) {
    if (item.kind === "num") {
      stack.push(item.value);
      continue;
    }
    if (item.kind === "sq") {
      const a = stack.pop();
      if (a === undefined) throw new Error("malformed expression");
      stack.push(a * a);
      continue;
    }
    if (item.kind === "sqrt") {
      const a = stack.pop();
      if (a === undefined) throw new Error("malformed expression");
      if (a < 0) throw new Error("√ of a negative");
      stack.push(Math.sqrt(a));
      continue;
    }
    if (item.kind === "neg") {
      const a = stack.pop();
      if (a === undefined) throw new Error("malformed expression");
      stack.push(-a);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error("malformed expression");
    if (item.op === "÷" && b === 0) throw new Error("divide by zero");
    const result =
      item.op === "+"
        ? a + b
        : item.op === "−"
          ? a - b
          : item.op === "×"
            ? a * b
            : a / b;
    if (!Number.isFinite(result)) throw new Error("non-finite result");
    stack.push(result);
  }
  if (stack.length !== 1) throw new Error("malformed expression");
  return stack[0];
}

function evaluate(tokens: Token[]): number {
  return evalRpn(toRpn(tokens));
}

/* --- Reducer transitions (pure) -------------------------------------------------------------- */

/** Append a digit to a number token, respecting leading-zero and length rules. */
function appendDigit(token: NumToken, digit: string): NumToken {
  const sign = token.text.startsWith("-") ? "-" : "";
  const digits = sign ? token.text.slice(1) : token.text;
  const next = digits === "" || digits === "0" ? digit : digits + digit;
  if (next.replace(".", "").length > MAX_DIGITS) return token;
  return num(sign + next);
}

function inputDigit(state: CalcState, digit: string): CalcState {
  // Errors and a finished result both start a brand-new expression.
  if (state.error || state.justEvaluated) {
    return { ...INITIAL_STATE, tokens: [num(digit)] };
  }
  const tokens = state.tokens.slice();
  const last = lastToken(tokens);
  if (last?.type === "num") {
    const replaced = appendDigit(last, digit);
    if (replaced === last) return state;
    tokens[tokens.length - 1] = replaced;
  } else {
    tokens.push(num(digit));
  }
  return { ...INITIAL_STATE, tokens };
}

function inputDot(state: CalcState): CalcState {
  if (state.error || state.justEvaluated) {
    return { ...INITIAL_STATE, tokens: [num("0.")] };
  }
  const tokens = state.tokens.slice();
  const last = lastToken(tokens);
  if (last?.type === "num") {
    if (last.text.includes(".")) return state;
    const text = last.text === "" || last.text === "-" ? `${last.text}0.` : `${last.text}.`;
    tokens[tokens.length - 1] = num(text);
  } else {
    tokens.push(num("0."));
  }
  return { ...INITIAL_STATE, tokens };
}

function inputOperator(state: CalcState, operator: Operator): CalcState {
  if (state.error) return state;
  const tokens = state.tokens.slice();
  const last = lastToken(tokens);
  // A binary operator needs a left-hand operand and can't follow a lone `√`.
  if (tokens.length === 0 || last?.type === "sqrt") return state;
  if (last?.type === "op") {
    tokens[tokens.length - 1] = { type: "op", op: operator };
  } else {
    tokens.push({ type: "op", op: operator });
  }
  return { ...INITIAL_STATE, tokens };
}

function inputSquare(state: CalcState): CalcState {
  if (state.error) return state;
  const last = lastToken(state.tokens);
  // `²` applies to the current number/term (incl. a fresh result).
  if (last?.type === "num" || last?.type === "sq") {
    return { ...INITIAL_STATE, tokens: [...state.tokens, { type: "sq" }] };
  }
  return state;
}

function inputSqrt(state: CalcState): CalcState {
  if (state.error || state.justEvaluated) {
    return { ...INITIAL_STATE, tokens: [{ type: "sqrt" }] };
  }
  const last = lastToken(state.tokens);
  // `√` starts a term: at the beginning, after an operator, or stacked on `√`.
  if (!last || last.type === "op" || last.type === "sqrt") {
    return { ...INITIAL_STATE, tokens: [...state.tokens, { type: "sqrt" }] };
  }
  return state;
}

function toggleSign(state: CalcState): CalcState {
  if (state.error) return state;
  const tokens = state.tokens.slice();
  const last = lastToken(tokens);
  if (last?.type !== "num" || last.text === "0" || last.text === "0." || last.text === "") {
    return state;
  }
  const text = last.text.startsWith("-") ? last.text.slice(1) : `-${last.text}`;
  tokens[tokens.length - 1] = num(text);
  return { ...INITIAL_STATE, tokens };
}

function backspace(state: CalcState): CalcState {
  if (state.error) return INITIAL_STATE;
  const tokens = state.tokens.slice();
  const last = lastToken(tokens);
  if (!last) return INITIAL_STATE;
  if (last.type === "num") {
    const sign = last.text.startsWith("-") ? "-" : "";
    const digits = (sign ? last.text.slice(1) : last.text).slice(0, -1);
    if (digits === "") tokens.pop();
    else tokens[tokens.length - 1] = num(sign + digits);
  } else {
    tokens.pop();
  }
  return { ...INITIAL_STATE, tokens };
}

function equals(state: CalcState): CalcState {
  if (state.error || state.justEvaluated || state.tokens.length === 0) return state;
  const expression = renderTokens(state.tokens);
  let value: number;
  try {
    value = evaluate(state.tokens);
  } catch {
    return ERROR_STATE;
  }
  const text = formatNumber(value);
  if (text === "Error") return ERROR_STATE;
  return {
    tokens: [num(text)],
    lastExpression: expression,
    justEvaluated: true,
    error: false,
  };
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "digit":
      return inputDigit(state, action.digit);
    case "dot":
      return inputDot(state);
    case "operator":
      return inputOperator(state, action.operator);
    case "equals":
      return equals(state);
    case "clear":
      return INITIAL_STATE;
    case "backspace":
      return backspace(state);
    case "toggleSign":
      return toggleSign(state);
    case "sqrt":
      return inputSqrt(state);
    case "square":
      return inputSquare(state);
  }
}

/* -------------------------------------------------------------------------------------------------
 * UI
 * ---------------------------------------------------------------------------------------------- */

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <path d="M8 6.5h8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01M16 18h4-4Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * A single readout line kept to ONE line: it never wraps and, when the content
 * overflows, auto-scrolls to the end so the most recent input stays visible. Its
 * scrollbar is hidden so long expressions read tidily with no layout shift.
 */
function ReadoutLine({
  text,
  live,
  className,
}: {
  text: string;
  live?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [text]);
  return (
    <div
      ref={ref}
      aria-live={live ? "polite" : undefined}
      className={cn(
        "w-full overflow-x-auto whitespace-nowrap text-right leading-none tabular-nums",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {text}
    </div>
  );
}

interface KeyProps {
  children: ReactNode;
  onPress: () => void;
  ariaLabel: string;
  variant?: ButtonVariant;
  /** Highlight the pending operator. */
  active?: boolean;
  /** Run the satisfying 3D press-down lip (used for "="). */
  clicky?: boolean;
  className?: string;
}

/** One keypad key: the app Button squared off into a tidy grid cell. */
function Key({
  children,
  onPress,
  ariaLabel,
  variant = "secondary",
  active = false,
  clicky = false,
  className,
}: KeyProps) {
  return (
    <Button
      variant={variant}
      pill={false}
      clicky={clicky}
      onPress={onPress}
      aria-label={ariaLabel}
      className={cn(
        "h-12 min-h-0 w-full min-w-0 rounded-xl px-0 text-lg font-semibold tabular-nums",
        // No focus ring / outline on any keypad key: clicking or focusing a key
        // shows nothing (the panel holds the invisible keyboard focus). The pending
        // operator is cued by a subtle brightness instead of the old gray ring.
        "outline-none focus:outline-none focus-visible:outline-none",
        "focus:ring-0 focus-visible:ring-0 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0",
        active && "brightness-125",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export interface LessonCalculatorProps {
  /** Extra classes for the positioned wrapper (defaults pin it bottom-right). */
  className?: string;
}

/**
 * A pop-up expression calculator pinned to the bottom-right of the lesson stage,
 * mirroring Koji on the bottom-left. An icon-only trigger opens a compact,
 * non-blocking floating keypad panel (a plain positioned div, not a modal
 * popover) that opens up-and-left and leaves the rest of the lesson fully
 * interactive. Built for a Pythagorean-theorem course, so it ships √ and x²
 * alongside the usual keys and shows the full expression (e.g. `6² + 5²`) until
 * you press "=".
 */
export function LessonCalculator({ className }: LessonCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useReducer(calcReducer, INITIAL_STATE);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  // Rolling buffer of the most recent letter keystrokes so that typing "sqrt"
  // on the focused panel applies √ (the same action as the √ button). It is
  // reset on any non-letter key and after a brief idle (see onKeyDown).
  const letterBufferRef = useRef("");
  const letterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus the panel when it opens so the user can immediately type (digits,
  // operators, the "sqrt" letters, Enter) with no second click. Deferred one frame
  // so the `inert` attribute (cleared once `open` is true) is gone before we focus -
  // an inert element can't take focus - and `preventScroll` keeps the page from
  // jumping to the bottom-right panel. Enter then computes in the calc while it
  // holds focus, which is the intended behavior.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // While open, a pointerdown anywhere outside the panel and the trigger returns
  // keyboard focus to the lesson (so the lesson's Enter works again) by blurring the
  // panel's invisible focus - WITHOUT closing the calc. Only the × button, the
  // trigger toggle, and Esc close it. The panel is non-blocking (no underlay /
  // interact-outside), so the click still reaches the lesson regardless.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const panel = dialogRef.current;
      const target = event.target as Node | null;
      if (!panel || !target) return;
      if (panel.contains(target) || triggerWrapperRef.current?.contains(target)) {
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      if (active && panel.contains(active)) active.blur();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Apply a keypad action, then pull keyboard focus back onto the PANEL on the next
  // frame (so it wins over react-aria focusing the pressed key). The panel holds
  // focus *invisibly* - its outline and every key's focus ring are suppressed - so
  // the calc can be typed into without any "focused calculator" UI. The lesson's
  // Enter handler bails for keydowns inside the panel, so Enter computes here and
  // does NOT advance the lesson; focus only leaves the calc when the user clicks
  // the lesson, at which point Enter drives the lesson again.
  const run = useCallback((action: CalcAction) => {
    dispatch(action);
    requestAnimationFrame(() => dialogRef.current?.focus());
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;

      // Typing the letters s-q-r-t in order (case-insensitive) applies √, exactly
      // like pressing the √ button. We keep a short rolling buffer of recent
      // single letters and fire the √ action once it ends with "sqrt". Like every
      // other calc key, letters also stopPropagation so they don't leak to the
      // lesson/page. Letters combined with ⌘/Ctrl/Alt are left to the browser.
      if (/^[a-z]$/i.test(key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        if (letterTimerRef.current !== null) {
          clearTimeout(letterTimerRef.current);
          letterTimerRef.current = null;
        }
        const buffer = (letterBufferRef.current + key.toLowerCase()).slice(-8);
        if (buffer.endsWith("sqrt")) {
          letterBufferRef.current = "";
          run({ type: "sqrt" });
        } else {
          letterBufferRef.current = buffer;
          // Drop stale letters after a brief idle so they don't accumulate.
          letterTimerRef.current = setTimeout(() => {
            letterBufferRef.current = "";
            letterTimerRef.current = null;
          }, 1000);
        }
        return;
      }
      // Any non-letter key breaks an in-progress "sqrt" sequence.
      if (letterTimerRef.current !== null) {
        clearTimeout(letterTimerRef.current);
        letterTimerRef.current = null;
      }
      letterBufferRef.current = "";

      // Every key the calc handles also stops propagation so it can't leak to the
      // lesson - especially Enter, which must compute here, not advance the lesson.
      if (key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        event.stopPropagation();
        run({ type: "digit", digit: key });
        return;
      }
      if (key === ".") {
        event.preventDefault();
        event.stopPropagation();
        run({ type: "dot" });
        return;
      }
      if (key === "^") {
        // Convenience: `^` types a square (²).
        event.preventDefault();
        event.stopPropagation();
        run({ type: "square" });
        return;
      }
      const opForKey: Record<string, Operator> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
      if (key in opForKey) {
        event.preventDefault();
        event.stopPropagation();
        run({ type: "operator", operator: opForKey[key] });
        return;
      }
      if (key === "Enter" || key === "=") {
        // The panel holds the (invisible) focus, so Enter computes here.
        if (key === "Enter" && event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        run({ type: "equals" });
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        run({ type: "backspace" });
        return;
      }
      if (key === "Delete") {
        event.preventDefault();
        event.stopPropagation();
        run({ type: "clear" });
      }
    },
    [run],
  );

  const expression = renderTokens(state.tokens);
  const display = state.error ? "Error" : state.tokens.length === 0 ? "0" : expression;
  const recap = state.justEvaluated && state.lastExpression ? `${state.lastExpression} =` : "\u00A0";
  // Shrink the font as the expression grows; horizontal scroll handles the rest.
  const displaySize =
    display.length > 16 ? "text-lg" : display.length > 11 ? "text-2xl" : "text-[26px]";
  const last = lastToken(state.tokens);
  const pendingOp = last?.type === "op" ? last.op : null;

  const digitKey = (digit: string) => (
    <Key
      ariaLabel={digit}
      className="text-foreground"
      onPress={() => run({ type: "digit", digit })}
    >
      {digit}
    </Key>
  );

  const operatorKey = (operator: Operator, ariaLabel: string) => (
    <Key
      variant="accent"
      active={pendingOp === operator}
      ariaLabel={ariaLabel}
      onPress={() => run({ type: "operator", operator })}
    >
      {operator}
    </Key>
  );

  return (
    <>
      <div
        ref={triggerWrapperRef}
        className={cn(
          // Mirror Koji (bottom-1 left-1 … lg:bottom-2 lg:left-2) on the right.
          // On small screens the centered footer CTA goes full-width, so lift the
          // trigger above it; from sm up the corner is clear again.
          "absolute bottom-[4.5rem] right-1 z-40 sm:bottom-1 lg:bottom-2 lg:right-2",
          className,
        )}
      >
        <Button
          isIconOnly
          variant="accent"
          aria-label="Calculator"
          aria-expanded={open}
          onPress={() => setOpen((value) => !value)}
          className="size-11 shadow-[0_5px_18px_-6px_rgba(0,0,0,0.6)]"
        >
          {/* The circular frame is rotation-symmetric, so spinning the inner icon
              wrapper reads as the whole button turning while the shadow stays put.
              The wrapper fills the button and pivots on its own center
              (origin-center) so the spin stays perfectly in place; the two icons
              share one centered grid cell and crossfade so the glyph morphs
              mid-turn. 0↔-180° turns the spin one way on open, reversing on close. */}
          <span
            className={cn(
              "grid size-full origin-center place-items-center transition-transform duration-300 ease-out",
              open ? "-rotate-180" : "rotate-0",
              "motion-reduce:rotate-0 motion-reduce:transition-none",
            )}
          >
            <CalculatorIcon
              className={cn(
                "col-start-1 row-start-1 size-5 transition-opacity duration-200 ease-out",
                open ? "opacity-0" : "opacity-100",
                "motion-reduce:transition-none",
              )}
            />
            <CloseIcon
              className={cn(
                "col-start-1 row-start-1 size-5 transition-opacity duration-200 ease-out",
                open ? "opacity-100" : "opacity-0",
                "motion-reduce:transition-none",
              )}
            />
          </span>
        </Button>
      </div>

      {/*
        Non-blocking floating panel — a plain absolutely-positioned div, NOT a
        modal/portal popover. It renders no full-screen underlay and installs no
        interact-outside handler, so pointer events outside it pass straight through
        to the lesson and the page stays fully interactive while the calculator is
        open. It sits just above the trigger (trigger height 44px + a 12px gap),
        right-aligned to it, and is shown/hidden purely by `open`. When closed it is
        `inert` + pointer-events-none; only the trigger and the header × close it.

        The panel itself holds keyboard focus so the calc can be TYPED into, but
        invisibly: `outline-none` here + the keys' suppressed focus rings mean there
        is no "focused calculator" UI. `onMouseDown` preventDefault stops the pressed
        key / backdrop from grabbing focus, then we focus the panel so its onKeyDown
        (digits, + − × ÷, ., =/Enter, Backspace, Esc) handles typing. `role="dialog"`
        is non-modal here, so `data-lesson-calculator` lets the lesson's Enter handler
        tell this always-mounted panel from a real modal AND bail when a keypress
        starts inside it (so a calc Enter computes instead of advancing the lesson).
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Calculator"
        data-lesson-calculator
        inert={!open}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          // Keep keyboard focus on the PANEL (not the pressed key), so typing works
          // with no per-key focus ring: block the default focus-on-mousedown, then
          // focus the panel itself (run() re-affirms this after react-aria presses).
          event.preventDefault();
          dialogRef.current?.focus();
        }}
        className={cn(
          "absolute bottom-[8rem] right-1 z-50 w-[280px] sm:bottom-[3.75rem] lg:bottom-[4rem] lg:right-2",
          "origin-bottom-right rounded-2xl border border-border bg-overlay p-3",
          "shadow-[0_18px_50px_rgba(0,0,0,0.55)] outline-none focus:outline-none focus-visible:outline-none",
          "transition duration-150 ease-out motion-reduce:transition-none",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="mb-2 flex items-center justify-between pl-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Calculator
          </span>
          <button
            type="button"
            aria-label="Close calculator"
            onClick={() => setOpen(false)}
            className={iconButtonClass({ size: "size-8" })}
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="mb-3 rounded-xl border border-border/60 bg-[#2b2b2f] px-3 py-2">
          <div className="flex h-4 items-center">
            <ReadoutLine text={recap} className="text-xs text-muted" />
          </div>
          <div className="mt-0.5 flex h-9 items-center">
            <ReadoutLine
              live
              text={display}
              className={cn(
                "font-bold",
                displaySize,
                state.error ? "text-danger" : "text-foreground",
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Key variant="tertiary" ariaLabel="All clear" onPress={() => run({ type: "clear" })}>
            AC
          </Key>
          <Key variant="tertiary" ariaLabel="Backspace" onPress={() => run({ type: "backspace" })}>
            ⌫
          </Key>
          <Key variant="tertiary" ariaLabel="Square root" onPress={() => run({ type: "sqrt" })}>
            √
          </Key>
          <Key variant="tertiary" ariaLabel="Square" onPress={() => run({ type: "square" })}>
            x²
          </Key>

          {digitKey("7")}
          {digitKey("8")}
          {digitKey("9")}
          {operatorKey("÷", "Divide")}

          {digitKey("4")}
          {digitKey("5")}
          {digitKey("6")}
          {operatorKey("×", "Multiply")}

          {digitKey("1")}
          {digitKey("2")}
          {digitKey("3")}
          {operatorKey("−", "Subtract")}

          <Key variant="tertiary" ariaLabel="Plus or minus" onPress={() => run({ type: "toggleSign" })}>
            ±
          </Key>
          {digitKey("0")}
          <Key
            variant="secondary"
            ariaLabel="Decimal point"
            className="text-foreground"
            onPress={() => run({ type: "dot" })}
          >
            .
          </Key>
          {operatorKey("+", "Add")}

          <Key
            variant="primary"
            clicky
            ariaLabel="Equals"
            className="col-span-4"
            onPress={() => run({ type: "equals" })}
          >
            =
          </Key>
        </div>
      </div>
    </>
  );
}
