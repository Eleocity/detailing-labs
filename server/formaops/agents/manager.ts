/**
 * The FormaOps Manager agent (docs/formaops/AGENTS.md, phases 4-5).
 * Interprets a natural-language request and drafts a ChangeRequest via its
 * tools — it cannot approve or execute anything itself (see tools.ts's
 * header comment on the non-negotiable boundary).
 *
 * `handleIncomingMessage` is the single channel-agnostic entry point: an
 * SMS webhook and a web chat box both call this exact function with the
 * same shape, so the agent's behavior can never drift between channels.
 * This is deliberate, not incidental — see docs/formaops/DECISIONS.md open
 * decision #2: SMS must be a first-class input channel from day one, not
 * bolted onto a web-only agent later. It also means SMS wiring is now
 * "write a Twilio webhook that resolves a phone number to a user, then
 * calls this function" — no agent logic to duplicate when that's built.
 *
 * Never throws. Every failure mode (budget exceeded, OpenAI error, no
 * usable output) degrades to a plain-text reply explaining what happened
 * and pointing at /admin/change-requests as a fallback that always works,
 * since it never calls OpenAI. This matches the "fail gracefully" decision
 * for the budget cutoff, applied consistently to every failure, not just
 * that one.
 */
import { Agent, run } from "@openai/agents";
import { buildManagerTools, type ManagerToolContext } from "./tools";
import { isBudgetExceeded, recordUsage } from "./budget";

const MODEL = process.env.FORMAOPS_AGENT_MODEL || "gpt-5-mini";

const BUDGET_REACHED_REPLY =
  "AI budget reached for this month — head to /admin/change-requests to submit this yourself instead, it works the same as always.";

const INSTRUCTIONS = `
You are the FormaOps assistant for a mobile detailing business. A staff
member is texting or chatting with you to request a business change — for
example a price change, a change to standing hours, or adding/removing an
included service from a package.

Your ONLY job is to turn their request into a draft proposal using your
tools. You cannot make any change yourself: every proposal tool just
creates a PENDING request that a separate person must review and approve
before anything actually changes. Always make that clear in your reply.

Rules:
- Call get_pricing / get_hours to check the real current value before
  proposing a change — never guess a starting price, current hours, or a
  package's current included-service list.
- If the request is ambiguous (which package, which value, which day,
  whether an item is already included), ask a short clarifying question
  instead of guessing.
- If the request isn't about pricing, hours, or a package's included
  services, say plainly you can only help with those right now.
- After successfully proposing a change, state plainly what you proposed
  and that it is now awaiting approval. Never say or imply the change is
  already live.
- If a tool reports it could not propose the change (e.g. a permission
  problem), relay that plainly — do not retry silently or invent a
  different outcome.
- Keep replies short. This may be read over SMS.
`.trim();

export function buildManagerAgent(ctx: ManagerToolContext) {
  return new Agent({
    name: "FormaOps Manager",
    model: MODEL,
    instructions: INSTRUCTIONS,
    tools: buildManagerTools(ctx),
  });
}

export async function handleIncomingMessage(input: {
  db: any;
  businessId: number;
  actingUserId: number;
  channel: "web_chat" | "sms";
  text: string;
}): Promise<{ reply: string }> {
  if (await isBudgetExceeded(input.db, input.businessId)) {
    return { reply: BUDGET_REACHED_REPLY };
  }

  try {
    const agent = buildManagerAgent(input);
    const result = await run(agent, input.text);

    const usage = result.state?.usage;
    if (usage) {
      await recordUsage(input.db, input.businessId, {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      });
    }

    return {
      reply:
        result.finalOutput ??
        "Sorry, I didn't get a usable response — try rephrasing.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      reply: `Sorry, something went wrong talking to the AI (${message}). Try /admin/change-requests instead.`,
    };
  }
}
